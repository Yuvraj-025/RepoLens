import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as AdmZip from 'adm-zip';
import * as path from 'path';
import { ParsingService } from '../parsing/parsing.service';
import { EmbeddingService } from '../embedding/embedding.service';

@Injectable()
export class RepositoryService {
  constructor(
    private prisma: PrismaService,
    private parsingService: ParsingService,
    private embeddingService: EmbeddingService,
  ) {}

  async uploadRepository(file: Express.Multer.File, userId: string) {
    const repoName = file.originalname.replace('.zip', '');
    
    // Secure ZIP Extraction logic
    let zip;
    try {
      zip = new AdmZip(file.buffer);
    } catch (e) {
      throw new BadRequestException('Invalid ZIP file format');
    }

    const zipEntries = zip.getEntries();
    
    // Determine if all files share a single top-level directory
    let commonRoot: string | null = null;
    let hasMultipleRoots = false;
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const pPath = entry.entryName.replace(/\\/g, '/');
      const parts = pPath.split('/');
      if (parts.length === 1) {
        hasMultipleRoots = true;
        break;
      }
      const root = parts[0];
      if (commonRoot === null) {
        commonRoot = root;
      } else if (commonRoot !== root) {
        hasMultipleRoots = true;
        break;
      }
    }
    const prefixToRemove = (!hasMultipleRoots && commonRoot) ? commonRoot + '/' : '';

    let totalUncompressedSize = 0;
    const MAX_UNCOMPRESSED_SIZE = 200 * 1024 * 1024; // 200 MB limit
    let validFileCount = 0;

    const filesToCreate = [];

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      // Zip Slip Prevention: ensure paths do not contain '..' or are absolute (checked on original name)
      const originalSanitized = path.normalize(entry.entryName);
      if (originalSanitized.includes('..') || path.isAbsolute(originalSanitized)) {
        throw new BadRequestException(`Malicious path detected in ZIP: ${entry.entryName}`);
      }

      let posixEntryName = entry.entryName.replace(/\\/g, '/');
      if (prefixToRemove && posixEntryName.startsWith(prefixToRemove)) {
        posixEntryName = posixEntryName.substring(prefixToRemove.length);
      }

      const sanitizedPath = path.normalize(posixEntryName);

      const posixPath = sanitizedPath.replace(/\\/g, '/');
      // Ignore common build directories and hidden folders
      if (posixPath.includes('node_modules/') || posixPath.includes('/.git') || posixPath.startsWith('.git') || posixPath.includes('dist/') || posixPath.includes('build/') || posixPath.includes('__pycache__/')) {
        continue;
      }

      // Zip Bomb Prevention: Track total uncompressed size
      totalUncompressedSize += entry.header.size;
      if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) {
        throw new BadRequestException('ZIP extraction exceeds maximum allowed size (Zip Bomb Protection)');
      }

      const ext = path.extname(sanitizedPath).toLowerCase();
      const isBinaryOrLock = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.mp4', '.zip', '.tar', '.gz', '.ico', '.svg', '.min.js', '.lock'].includes(ext) || sanitizedPath.endsWith('package-lock.json') || sanitizedPath.endsWith('yarn.lock');
      const isTooLarge = entry.header.size > 200 * 1024; // 200KB limit for text content
      
      let content = '';
      let lineCount = 0;

      // Only extract text content if it's a valid text file under the size limit
      if (!isBinaryOrLock && !isTooLarge && entry.header.size <= 5 * 1024 * 1024) {
        const rawContent = entry.getData().toString('utf-8');
        // Prevent Postgres "invalid byte sequence for encoding UTF8: 0x00" 
        // by detecting null bytes. If present, it's likely a binary file.
        if (rawContent.includes('\0')) {
          content = ''; // Treat as binary, skip content
        } else {
          content = rawContent;
          lineCount = content.split('\n').length;
        }
      }

      let fileDate = new Date();
      if (entry.header && entry.header.time) {
        // adm-zip uses 'time' or sometimes 'mtime' (in entry object itself), header.time is a date object or timestamp
        fileDate = new Date(entry.header.time);
      }

      validFileCount++;
      filesToCreate.push({
        filePath: posixPath,
        language: ext.replace('.', '') || (isBinaryOrLock ? 'binary' : 'text'),
        lineCount: lineCount,
        sizeBytes: entry.header.size,
        content: content,
        modifiedAt: fileDate
      });
    }

    // Determine primary language based on bytes
    const languageCounts: Record<string, number> = {};
    for (const file of filesToCreate) {
      if (file.language !== 'binary' && file.language !== 'text') {
        languageCounts[file.language] = (languageCounts[file.language] || 0) + file.sizeBytes;
      }
    }
    
    let primaryLanguage = 'unknown';
    let maxBytes = 0;
    for (const [lang, bytes] of Object.entries(languageCounts)) {
      if (bytes > maxBytes) {
        maxBytes = bytes;
        primaryLanguage = lang;
      }
    }

    // Register the repository in the DB
    const repository = await this.prisma.repository.create({
      data: {
        userId,
        name: repoName,
        status: 'processing', // Mark as processing initially
        fileCount: validFileCount,
        chunkCount: 0,
        primaryLanguage,
        files: {
          create: filesToCreate
        }
      }
    });

    try {
      // 1. Chunking
      const chunks = await this.parsingService.chunkRepositoryFiles(repository.id);

      // 2. Embedding
      if (chunks.length > 0) {
        await this.embeddingService.generateEmbeddingsForRepository(repository.id);
      }

      // 3. Mark as ready
      const updated = await this.prisma.repository.update({
        where: { id: repository.id },
        data: {
          status: 'ready',
          chunkCount: chunks.length
        }
      });
      return { repositoryId: updated.id, status: updated.status };
    } catch (error) {
      await this.prisma.repository.update({
        where: { id: repository.id },
        data: {
          status: 'error'
        }
      }).catch(() => {});
      throw error;
    }
  }

  async getRepositories(userId: string) {
    return this.prisma.repository.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getRepository(id: string, userId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id, userId }
    });
    if (!repository) {
      throw new NotFoundException('Repository not found');
    }
    return repository;
  }

  async deleteRepository(id: string, userId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id, userId }
    });
    if (!repository) {
      throw new NotFoundException('Repository not found');
    }
    await this.prisma.repository.delete({ where: { id } });
    return { success: true };
  }

  async getRepositoryFiles(id: string, userId: string) {
    await this.getRepository(id, userId); // Ensures user owns the repo
    return this.prisma.repositoryFile.findMany({
      where: { repositoryId: id },
      select: {
        id: true,
        filePath: true,
        language: true,
        lineCount: true,
        sizeBytes: true,
        modifiedAt: true,
      },
      orderBy: { filePath: 'asc' }
    });
  }

  async getRepositoryFile(id: string, fileId: string, userId: string) {
    await this.getRepository(id, userId); // Ensures user owns the repo
    const file = await this.prisma.repositoryFile.findFirst({
      where: { id: fileId, repositoryId: id }
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async getRepositorySummary(id: string, userId: string) {
    const repo = await this.prisma.repository.findFirst({
      where: { id, userId }
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    if (repo.summary) {
      return { summary: repo.summary };
    }

    const files = await this.prisma.repositoryFile.findMany({
      where: { repositoryId: id },
      select: { filePath: true, language: true, sizeBytes: true, lineCount: true },
      orderBy: { sizeBytes: 'desc' }
    });

    const readmeFile = await this.prisma.repositoryFile.findFirst({
      where: {
        repositoryId: id,
        filePath: {
          mode: 'insensitive',
          equals: 'readme.md'
        }
      },
      select: { content: true }
    });

    const packageJsonFile = await this.prisma.repositoryFile.findFirst({
      where: {
        repositoryId: id,
        filePath: {
          mode: 'insensitive',
          equals: 'package.json'
        }
      },
      select: { content: true }
    });

    const topFilesText = files
      .slice(0, 30)
      .map(f => `- ${f.filePath} (${f.language}, ${f.lineCount} lines)`)
      .join('\n');

    const systemPrompt = `You are a highly skilled software architect. Your goal is to analyze the codebase repository structure and details, and generate a clear, comprehensive summary and insight report for a developer.

Repository Name: ${repo.name}
Total Files: ${repo.fileCount}
Primary Language: ${repo.primaryLanguage || 'Unknown'}

Top Files in Repository:
${topFilesText}

${readmeFile?.content ? `Here is the README.md content:\n\`\`\`markdown\n${readmeFile.content.substring(0, 4000)}\n\`\`\`\n` : ''}
${packageJsonFile?.content ? `Here is the package.json content:\n\`\`\`json\n${packageJsonFile.content.substring(0, 2000)}\n\`\`\`\n` : ''}

Based on this information, generate a professional, retro-terminal styled analysis. Structure it with these sections:
1. **[SYSTEM_OVERVIEW]**: A 2-3 sentence high-level description of what the project is and what it accomplishes.
2. **[TECH_STACK]**: Bullet points of key languages, frameworks, main dependencies (especially from package.json), and databases used.
3. **[ARCHITECTURAL_BREAKDOWN]**: How the codebase is organized, explaining key directories and files.
4. **[DEVELOPMENT_INSIGHTS]**: 2-3 practical tips or notes for developers starting to work on this repository (e.g. entry points, structure patterns).

Format the entire output in clean Markdown. Keep the headers exactly like:
# SYSTEM_OVERVIEW
# TECH_STACK
# ARCHITECTURAL_BREAKDOWN
# DEVELOPMENT_INSIGHTS`;

    const apiKey = process.env.GEMINI_API_KEY || '';
    const chatModel = (process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash').replace(/^"|"$/g, '');
    const modelName = chatModel.startsWith('models/') ? chatModel.substring(7) : chatModel;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    let summaryText = '';
    try {
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: systemPrompt }],
          }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API returned ${geminiRes.status}: ${errText}`);
      }

      const resJson = await geminiRes.json();
      summaryText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!summaryText) {
        throw new Error('No summary text generated by Gemini.');
      }
    } catch (error: any) {
      summaryText = `### ERROR GENERATING SYSTEM INSIGHTS\nFailed to generate repository summary: ${error.message}`;
      return { summary: summaryText };
    }

    await this.prisma.repository.update({
      where: { id },
      data: { summary: summaryText }
    }).catch(err => console.error('Failed to save repo summary:', err));

    return { summary: summaryText };
  }
}
