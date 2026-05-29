import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY || '';
  private readonly embeddingModel = (process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004').replace(/^"|"$/g, '');

  constructor(private prisma: PrismaService) { }

  private getModelNameAndPath(): { name: string; path: string } {
    const name = this.embeddingModel.startsWith('models/')
      ? this.embeddingModel.substring(7)
      : this.embeddingModel;
    return {
      name,
      path: `models/${name}`
    };
  }

  /**
   * Generates a 768-dimensional vector embedding for a single query text.
   */
  async getQueryEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY environment variable is not configured');
    }

    const { name: modelName, path: modelPath } = this.getModelNameAndPath();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelPath,
          content: {
            parts: [{ text }],
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Gemini Embedding API query error: ${response.status} - ${errText}`);
        throw new InternalServerErrorException(`Failed to retrieve embedding from Gemini: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.embedding || !result.embedding.values) {
        this.logger.error(`Gemini response format error: ${JSON.stringify(result)}`);
        throw new InternalServerErrorException('Invalid response structure from Gemini Embedding API');
      }

      return result.embedding.values.slice(0, 768);
    } catch (error: any) {
      this.logger.error(`Error fetching query embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates embeddings in batches of 50 for a set of text chunks.
   */
  async getEmbeddingsForBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY environment variable is not configured');
    }

    const { name: modelName, path: modelPath } = this.getModelNameAndPath();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:batchEmbedContents?key=${this.apiKey}`;
    const requests = texts.map(text => ({
      model: modelPath,
      content: {
        parts: [{ text }],
      },
    }));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Gemini batch embedding API error: ${response.status} - ${errText}`);
        throw new InternalServerErrorException(`Failed to retrieve batch embeddings: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.embeddings || !Array.isArray(result.embeddings)) {
        this.logger.error(`Gemini batch response format error: ${JSON.stringify(result)}`);
        throw new InternalServerErrorException('Invalid response structure from Gemini Batch Embedding API');
      }

      return result.embeddings.map((emb: any) => emb.values.slice(0, 768));
    } catch (error: any) {
      this.logger.error(`Error fetching batch embeddings: ${error.message}`);
      throw error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async runWithRetry<T>(fn: () => Promise<T>, retries = 5, initialDelay = 1000): Promise<T> {
    let currentDelay = initialDelay;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const isRateLimit =
          error.message?.includes('Too Many Requests') ||
          error.message?.includes('429') ||
          error.message?.includes('RESOURCE_EXHAUSTED');
        if (isRateLimit && attempt < retries) {
          this.logger.warn(
            `Rate limit hit (429). Retrying attempt ${attempt}/${retries} after ${currentDelay}ms...`,
          );
          await this.delay(currentDelay);
          currentDelay *= 2;
        } else {
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Processes all unembedded chunks for a repository, calls Gemini API, and saves vectors to PostgreSQL.
   */
  async generateEmbeddingsForRepository(repositoryId: string): Promise<number> {
    const chunks = await this.prisma.chunk.findMany({
      where: {
        repositoryId,
        isEmbedded: false,
      },
      orderBy: [
        { filePath: 'asc' },
        { startLine: 'asc' }
      ],
    });

    if (chunks.length === 0) {
      return 0;
    }

    let successfullyEmbedded = 0;

    for (const chunk of chunks) {
      try {
        const embedding = await this.runWithRetry(() => this.getQueryEmbedding(chunk.content));

        const vectorStr = `[${embedding.join(',')}]`;
        await this.prisma.$executeRawUnsafe(
          `UPDATE "Chunk" SET "embedding" = $1::vector, "isEmbedded" = true WHERE "id" = $2::uuid`,
          vectorStr,
          chunk.id
        );

        successfullyEmbedded++;

        // Slow down processing: wait 1 second (1000ms) between chunk embeddings
        await this.delay(1000);
      } catch (error: any) {
        this.logger.error(`Failed to process embedding for chunk ${chunk.id}: ${error.message}`);
        throw error;
      }
    }

    return successfullyEmbedded;
  }
}
