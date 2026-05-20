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

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      // Zip Slip Prevention: ensure paths do not contain '..' or are absolute
      const sanitizedPath = path.normalize(entry.entryName);
      if (sanitizedPath.includes('..') || path.isAbsolute(sanitizedPath)) {
        throw new BadRequestException(`Malicious path detected in ZIP: ${entry.entryName}`);
      }

      // Zip Bomb Prevention: Track total uncompressed size
      totalUncompressedSize += entry.header.size;
      if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) {
        throw new BadRequestException('ZIP extraction exceeds maximum allowed size (Zip Bomb Protection)');
      }

      // Skip binaries or extremely large individual files
      if (entry.header.size > 5 * 1024 * 1024) continue; // 5MB per file limit
      
      validFileCount++;
    }

    // Register the repository in the DB
    const repository = await this.prisma.repository.create({
      data: {
        userId,
        name: repoName,
        status: 'pending',
        fileCount: validFileCount,
        chunkCount: 0,
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
}
