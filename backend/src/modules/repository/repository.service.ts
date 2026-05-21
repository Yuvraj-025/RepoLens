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
        status: 'ready', // Marked as ready so we can view files in the explorer immediately
        fileCount: validFileCount,
        chunkCount: 0,
        primaryLanguage,
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
}
