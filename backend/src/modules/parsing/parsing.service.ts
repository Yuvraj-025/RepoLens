import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ParsingService {
  constructor(private prisma: PrismaService) { }

  chunkFile(
    fileId: string,
    filePath: string,
    content: string,
    language: string,
    repositoryId: string,
  ) {
    const lines = content.split('\n');
    const totalLines = lines.length;
    const chunkSize = 50;
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

  async chunkRepositoryFiles(repositoryId: string): Promise<number> {
    // Get all files for the repository that have text content, sorted alphabetically by path
    const files = await this.prisma.repositoryFile.findMany({
      where: {
        repositoryId,
        content: {
          not: '',
        },
      },
      orderBy: {
        filePath: 'asc',
      },
    });

    let totalChunksCount = 0;
    for (const file of files) {
      const fileChunks = this.chunkFile(
        file.id,
        file.filePath,
        file.content,
        file.language,
        repositoryId,
      );

      if (fileChunks.length > 0) {
        const remainingCap = 500 - totalChunksCount;
        if (remainingCap <= 0) {
          break;
        }

        const chunksToAdd = fileChunks.slice(0, remainingCap);
        await this.prisma.chunk.createMany({
          data: chunksToAdd,
        });

        totalChunksCount += chunksToAdd.length;

        // Update repository chunkCount in database incrementally
        await this.prisma.repository.update({
          where: { id: repositoryId },
          data: { chunkCount: totalChunksCount },
        });

        // Add a 200ms delay to make chunking visible on UI
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return totalChunksCount;
  }
}
