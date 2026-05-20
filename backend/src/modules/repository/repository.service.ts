import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as AdmZip from 'adm-zip';
import * as path from 'path';

@Injectable()
export class RepositoryService {
  constructor(private prisma: PrismaService) {}

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
    let totalUncompressedSize = 0;
    const MAX_UNCOMPRESSED_SIZE = 200 * 1024 * 1024; // 200 MB limit
    let validFileCount = 0;

    const filesToCreate = [];

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      // Zip Slip Prevention: ensure paths do not contain '..' or are absolute
      const sanitizedPath = path.normalize(entry.entryName);
      if (sanitizedPath.includes('..') || path.isAbsolute(sanitizedPath)) {
        throw new BadRequestException(`Malicious path detected in ZIP: ${entry.entryName}`);
      }

      // Ignore common build directories and hidden folders
      if (sanitizedPath.includes('node_modules/') || sanitizedPath.includes('.git/') || sanitizedPath.includes('dist/') || sanitizedPath.includes('build/') || sanitizedPath.includes('__pycache__/')) {
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
        content = entry.getData().toString('utf-8');
        lineCount = content.split('\n').length;
      }

      let fileDate = new Date();
      if (entry.header && entry.header.time) {
        // adm-zip uses 'time' or sometimes 'mtime' (in entry object itself), header.time is a date object or timestamp
        fileDate = new Date(entry.header.time);
      }

      validFileCount++;
      filesToCreate.push({
        filePath: sanitizedPath,
        language: ext.replace('.', '') || (isBinaryOrLock ? 'binary' : 'text'),
        lineCount: lineCount,
        sizeBytes: entry.header.size,
        content: content,
        modifiedAt: fileDate
      });
    }

    // Register the repository in the DB
    const repository = await this.prisma.repository.create({
      data: {
        userId,
        name: repoName,
        status: 'ready', // Marked as ready so we can view files in the explorer immediately
        fileCount: validFileCount,
        chunkCount: 0,
        files: {
          create: filesToCreate
        }
      }
    });

    return { repositoryId: repository.id, status: repository.status };
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
}
