import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ParsingService {
  constructor(private prisma: PrismaService) {}

  chunkFile(
    fileId: string,
    filePath: string,
    content: string,
    language: string,
    repositoryId: string,
  ) {
    const lines = content.split('\n');
    const totalLines = lines.length;
    const chunkSize = 60;
    const overlap = 10;
    const chunks = [];

    if (totalLines <= chunkSize) {
      chunks.push({
        id: randomUUID(),
        repositoryId,
        fileId,
        filePath,
        language,
        startLine: 1,
        endLine: totalLines,
        content: content,
        isEmbedded: false,
      });
      return chunks;
    }

    let start = 0;
    while (start < totalLines) {
      const end = Math.min(start + chunkSize, totalLines);
      const chunkLines = lines.slice(start, end);
      const chunkContent = chunkLines.join('\n');
      chunks.push({
        id: randomUUID(),
        repositoryId,
        fileId,
        filePath,
        language,
        startLine: start + 1,
        endLine: end,
        content: chunkContent,
        isEmbedded: false,
      });
      
      start += (chunkSize - overlap);
      
      if (start >= totalLines - overlap && end === totalLines) {
        break;
      }
    }
    return chunks;
  }

  async chunkRepositoryFiles(repositoryId: string) {
    // Get all files for the repository that have text content
    const files = await this.prisma.repositoryFile.findMany({
      where: {
        repositoryId,
        content: {
          not: '',
        },
      },
    });

    const allChunks = [];
    for (const file of files) {
      const fileChunks = this.chunkFile(
        file.id,
        file.filePath,
        file.content,
        file.language,
        repositoryId,
      );
      allChunks.push(...fileChunks);
    }

    if (allChunks.length > 0) {
      // Save chunks to the database in bulk
      await this.prisma.chunk.createMany({
        data: allChunks,
      });
    }

    return allChunks;
  }
}
