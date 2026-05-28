import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { Response } from 'express';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY || '';
  private readonly chatModel = (process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash').replace(/^"|"$/g, '');

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Main RAG execution flow: retrieves relevant chunks, queries Gemini, streams SSE chunks, and saves history.
   */
  async streamChatResponse(
    userId: string,
    repositoryId: string,
    query: string,
    res: Response,
  ) {
    // 1. Verify repository ownership
    const repo = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    // Write SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.embeddingService.getQueryEmbedding(query);
    } catch (err: any) {
      this.logger.error(`Query embedding generation failed: ${err.message}`);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate query embedding.' })}\n\n`);
      res.end();
      return;
    }

    // 2. Perform Cosine Similarity vector search via pgvector
    let chunks: any[] = [];
    try {
      const vectorStr = `[${queryEmbedding.join(',')}]`;
      chunks = await this.prisma.$queryRawUnsafe(
        `SELECT "id", "filePath", "startLine", "endLine", "content", "language"
         FROM "Chunk"
         WHERE "repositoryId" = $1::uuid AND "isEmbedded" = true
         ORDER BY "embedding" <=> $2::vector
         LIMIT 5`,
        repositoryId,
        vectorStr
      );
    } catch (err: any) {
      this.logger.error(`Vector search database query failed: ${err.message}`);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Database search error.' })}\n\n`);
      res.end();
      return;
    }

    const sources = chunks.map(c => ({
      chunkId: c.id,
      filePath: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
    }));

    // Send the citations first
    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    if (chunks.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'content', content: 'No relevant source code chunks found. Ensure the repository has been indexed properly.' })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    // Load last 6 messages (3 turns) for context memory
    let historyContext = 'None';
    try {
      const history = await this.prisma.chatHistory.findMany({
        where: { repositoryId, userId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
      history.reverse();
      if (history.length > 0) {
        historyContext = history.map(h => `User: ${h.userQuery}\nAssistant: ${h.aiResponse}`).join('\n\n');
      }
    } catch (err: any) {
      this.logger.error(`Failed to load chat history for context: ${err.message}`);
    }

    // 3. Construct prompt
    const contextText = chunks
      .map((c, i) => `Code Block #${i + 1} (File: ${c.filePath}, Lines: ${c.startLine}-${c.endLine}):\n${c.content}`)
      .join('\n\n');

    const systemInstructionText = `You are RepoLens, a retro-themed AI codebase chat and analysis platform.
You are helping a developer understand their uploaded repository.
Answer the user's question about the codebase in a detailed, structured, and highly informative manner.

Rules:
1. Provide a comprehensive explanation of the files, structures, algorithms, and logical flows.
2. Structure your response with clear headings, detailed bullet points, and code snippets where appropriate.
3. Base your answer strictly on the provided source code chunks. If the context does not contain the answer, say "I cannot find the answer in the provided codebase context." and do not speculate.
4. Cite the filenames and line ranges clearly when explaining specific sections of the code.

Codebase Context:
${contextText}

Previous Chat History:
${historyContext}`;

    // 4. Connect to Gemini stream endpoint
    const modelName = this.chatModel.startsWith('models/') 
      ? this.chatModel.substring(7) 
      : this.chatModel;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${this.apiKey}`;

    let isClientClosed = false;
    let reader: ReadableStreamDefaultReader | null = null;

    res.on('close', () => {
      isClientClosed = true;
      if (reader) {
        reader.cancel().catch(() => {});
      }
    });

    try {
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: query }],
          }],
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        this.logger.error(`Gemini stream call failed: ${geminiRes.status} - ${errText}`);
        res.write(`data: ${JSON.stringify({ type: 'error', message: `Gemini API returned code ${geminiRes.status}` })}\n\n`);
        res.end();
        return;
      }

      reader = geminiRes.body.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';
      let streamBuffer = '';

      while (true) {
        if (isClientClosed) break;
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        
        const regex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
        while (true) {
          if (isClientClosed) break;
          const match = regex.exec(streamBuffer);
          if (!match) break;

          let textVal = match[1];
          try {
            textVal = JSON.parse(`"${textVal}"`);
          } catch (e) {}

          aiResponseText += textVal;
          res.write(`data: ${JSON.stringify({ type: 'content', content: textVal })}\n\n`);

          // Consume matched part of the stream buffer
          streamBuffer = streamBuffer.slice(match.index + match[0].length);
          regex.lastIndex = 0; // Reset index since buffer was sliced
        }
      }

      if (reader) {
        reader.releaseLock();
      }

      if (!isClientClosed) {
        // 5. Persist ChatHistory
        await this.prisma.chatHistory.create({
          data: {
            repositoryId,
            userId,
            userQuery: query,
            aiResponse: aiResponseText,
            sourcesJson: sources,
          },
        });

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    } catch (err: any) {
      this.logger.error(`Error during stream execution: ${err.message}`);
      if (!isClientClosed) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream disrupted.' })}\n\n`);
      }
    } finally {
      res.end();
    }
  }


  async getChatHistory(repositoryId: string, userId: string) {
    // Verify repository ownership
    const repo = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    return this.prisma.chatHistory.findMany({
      where: { repositoryId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async clearChatHistory(repositoryId: string, userId: string) {
    // Verify repository ownership
    const repo = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    await this.prisma.chatHistory.deleteMany({
      where: { repositoryId },
    });

    return { success: true };
  }
}
