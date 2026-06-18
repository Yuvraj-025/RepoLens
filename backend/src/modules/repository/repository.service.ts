import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { ParsingService } from '../parsing/parsing.service';
import { EmbeddingService } from '../embedding/embedding.service';

const ZIP_WORKER_CODE = `
const { parentPort, workerData } = require('worker_threads');
const AdmZip = require('adm-zip');
const path = require('path');

try {
  const { buffer } = workerData;
  const zip = new AdmZip(Buffer.from(buffer));
  const zipEntries = zip.getEntries();
  
  // Determine if all files share a single top-level directory
  let commonRoot = null;
  let hasMultipleRoots = false;
  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    const pPath = entry.entryName.replace(/\\\\/g, '/');
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

    // Zip Slip Prevention
    const originalSanitized = path.normalize(entry.entryName);
    if (originalSanitized.includes('..') || path.isAbsolute(originalSanitized)) {
      throw new Error('Malicious path detected in ZIP: ' + entry.entryName);
    }

    let posixEntryName = entry.entryName.replace(/\\\\/g, '/');
    if (prefixToRemove && posixEntryName.startsWith(prefixToRemove)) {
      posixEntryName = posixEntryName.substring(prefixToRemove.length);
    }

    const sanitizedPath = path.normalize(posixEntryName);
    const posixPath = sanitizedPath.replace(/\\\\/g, '/');
    
    // Ignore common build directories and hidden folders
    if (
      posixPath.includes('node_modules/') || 
      posixPath.includes('/.git') || 
      posixPath.startsWith('.git') || 
      posixPath.includes('dist/') || 
      posixPath.includes('build/') || 
      posixPath.includes('__pycache__/')
    ) {
      continue;
    }

    // Zip Bomb Prevention
    totalUncompressedSize += entry.header.size;
    if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) {
      throw new Error('ZIP extraction exceeds maximum allowed size (Zip Bomb Protection)');
    }

    const ext = path.extname(sanitizedPath).toLowerCase();
    const baseName = path.basename(sanitizedPath).toLowerCase();

    // Whitelist of code extensions and common extensionless filenames
    const CODE_EXTENSIONS = new Set([
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
      '.py', '.pyw',
      '.go',
      '.rs',
      '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hh',
      '.java', '.kt', '.kts', '.scala',
      '.cs', '.fs',
      '.rb',
      '.php',
      '.swift',
      '.sh', '.bash', '.zsh', '.bat', '.cmd',
      '.html', '.css', '.scss', '.sass', '.less',
      '.sql',
      '.yaml', '.yml', '.toml', '.json', '.xml',
      '.md', '.markdown'
    ]);

    const isCodeFile = CODE_EXTENSIONS.has(ext) || ['dockerfile', 'makefile', 'gemfile', 'rakefile', 'procfile', 'pipfile'].includes(baseName);
    const isBinaryOrLock = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.mp4', '.zip', '.tar', '.gz', '.ico', '.svg', '.min.js', '.lock'].includes(ext) || sanitizedPath.endsWith('package-lock.json') || sanitizedPath.endsWith('yarn.lock');
    const isTooLarge = entry.header.size > 200 * 1024; // 200KB limit for text content
    
    let content = '';
    let lineCount = 0;

    // Only extract text content if it's a valid code file under the size limit
    if (isCodeFile && !isBinaryOrLock && !isTooLarge) {
      const rawContent = entry.getData().toString('utf-8');
      if (rawContent.includes('\\0')) {
        content = ''; // Treat as binary
      } else {
        content = rawContent;
        lineCount = content.split('\\n').length;
      }
    }

    let fileDate = new Date();
    if (entry.header && entry.header.time) {
      fileDate = new Date(entry.header.time);
    }

    validFileCount++;
    // Safe constraints validation (truncate long strings to prevent DB crashes)
    const truncatedPath = posixPath.substring(0, 1024);
    let truncatedLang = ext.replace('.', '').substring(0, 50) || (isBinaryOrLock ? 'binary' : 'text');
    if (truncatedLang.length > 50) truncatedLang = truncatedLang.substring(0, 50);

    filesToCreate.push({
      filePath: truncatedPath,
      language: truncatedLang,
      lineCount: lineCount,
      sizeBytes: entry.header.size,
      content: content,
      modifiedAt: fileDate
    });
  }

  parentPort.postMessage({ success: true, filesToCreate, validFileCount });
} catch (err) {
  parentPort.postMessage({ success: false, error: err.message });
}
`;

@Injectable()
export class RepositoryService {
  constructor(
    private prisma: PrismaService,
    private parsingService: ParsingService,
    private embeddingService: EmbeddingService,
  ) { }

  async uploadRepository(file: Express.Multer.File, userId: string) {
    // Enforce 5MB limit on incoming buffer for backend safety (e.g. GitHub imports)
    if (file.buffer && file.buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('Repository ZIP file size exceeds the 5MB limit');
    }

    // Truncate repository name to fit VarChar(255) DB column limit
    const repoName = file.originalname.replace('.zip', '').substring(0, 255);

    // Spawn worker thread for non-blocking ZIP parsing
    let result: { filesToCreate: any[]; validFileCount: number };
    try {
      result = await new Promise<{ filesToCreate: any[]; validFileCount: number }>((resolve, reject) => {
        const worker = new Worker(ZIP_WORKER_CODE, {
          eval: true,
          workerData: { buffer: file.buffer },
        });
        worker.on('message', (message) => {
          if (message.success) {
            resolve(message);
          } else {
            reject(new BadRequestException(message.error));
          }
        });
        worker.on('error', (err: any) => reject(new BadRequestException(err?.message || 'Worker thread error')));
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    } catch (e: any) {
      throw e instanceof BadRequestException ? e : new BadRequestException(e.message || 'Invalid ZIP file format');
    }

    const { filesToCreate, validFileCount } = result;

    // Determine primary language based on the single largest code file
    const PROGRAMMING_LANGUAGES = new Set([
      'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
      'py', 'pyw', 'go', 'rs', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'hh',
      'java', 'kt', 'kts', 'scala', 'cs', 'fs', 'rb', 'php', 'swift', 'sh', 'sql'
    ]);

    let primaryLanguage = 'unknown';
    let maxSizeBytes = -1;
    for (const file of filesToCreate) {
      if (PROGRAMMING_LANGUAGES.has(file.language.toLowerCase())) {
        if (file.sizeBytes > maxSizeBytes) {
          maxSizeBytes = file.sizeBytes;
          primaryLanguage = file.language;
        }
      }
    }

    // Fall back to largest non-binary, non-text file if no main programming languages match
    if (primaryLanguage === 'unknown') {
      for (const file of filesToCreate) {
        if (file.language !== 'binary' && file.language !== 'text') {
          if (file.sizeBytes > maxSizeBytes) {
            maxSizeBytes = file.sizeBytes;
            primaryLanguage = file.language;
          }
        }
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

    // Start background processing asynchronously without blocking the client
    this.processRepositoryBackground(repository.id).catch((err) => {
      console.error(`Error starting background processing for repository ${repository.id}:`, err);
    });

    return { repositoryId: repository.id, status: repository.status };
  }

  async processRepositoryBackground(repositoryId: string): Promise<void> {
    try {
      // 1. Chunking (which already updates chunkCount incrementally!)
      const chunkCount = await this.parsingService.chunkRepositoryFiles(repositoryId);
      if (chunkCount === 0) {
        throw new Error("No code files found to chunk");
      }

      // 2. Embedding (which embeds 1 chunk per second!)
      await this.embeddingService.generateEmbeddingsForRepository(repositoryId);

      // 3. Mark as ready since chunking and embedding succeeded
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: {
          status: 'ready'
        }
      });
    } catch (error: any) {
      console.error(`Background processing failed for repository ${repositoryId}: ${error.message}`);
      
      // Update repository status to error
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: {
          status: 'error'
        }
      }).catch(() => {});
    }
  }

  async importGithubRepository(githubUrl: string, userId: string) {
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new BadRequestException('Invalid GitHub repository URL');
    }

    const owner = match[1];
    // Strip trailing slashes, fragments, query params or .git extension
    const repo = match[2].split(/[?#]/)[0].replace(/\/+$/, '').replace('.git', '');

    let buffer: Buffer;
    try {
      // Fetch public repository ZIP archive
      const headers: Record<string, string> = {
        'User-Agent': 'RepoLens-NestJS-Backend',
      };

      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/zipball`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status} ${response.statusText}`);
      }

      // Pre-check Content-Length if present
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(contentLength) && contentLength > 5 * 1024 * 1024) {
          throw new BadRequestException('Repository ZIP file size exceeds the 5MB limit');
        }
      }

      if (!response.body) {
        throw new Error('Response body is empty or not readable');
      }

      const limit = 5 * 1024 * 1024;
      if (typeof (response.body as any).getReader === 'function') {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let totalLength = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalLength += value.length;
            if (totalLength > limit) {
              await reader.cancel().catch(() => {});
              throw new BadRequestException('Repository ZIP file size exceeds the 5MB limit');
            }
            chunks.push(value);
          }
        }
        const arrayBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          arrayBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        buffer = Buffer.from(arrayBuffer);
      } else {
        const chunks: Buffer[] = [];
        let totalLength = 0;
        for await (const chunk of (response.body as any)) {
          totalLength += chunk.length;
          if (totalLength > limit) {
            throw new BadRequestException('Repository ZIP file size exceeds the 5MB limit');
          }
          chunks.push(chunk as Buffer);
        }
        buffer = Buffer.concat(chunks);
      }
    } catch (e: any) {
      throw e instanceof BadRequestException ? e : new BadRequestException(`Failed to download repository from GitHub: ${e.message}`);
    }

    // Mock Express.Multer.File to invoke standard upload repository pipeline
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: `${repo}.zip`,
      encoding: '7bit',
      mimetype: 'application/zip',
      buffer: buffer,
      size: buffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    return this.uploadRepository(mockFile, userId);
  }


  async getRepositories(userId: string) {
    const repositories = await this.prisma.repository.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const result = [];
    for (const repo of repositories) {
      if (repo.status === 'processing') {
        const embeddedCount = await this.prisma.chunk.count({
          where: { repositoryId: repo.id, isEmbedded: true }
        });
        result.push({ ...repo, embeddedCount });
      } else {
        result.push({
          ...repo,
          embeddedCount: repo.status === 'ready' ? repo.chunkCount : 0
        });
      }
    }
    return result;
  }

  async getRepository(id: string, userId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id, userId }
    });
    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    const embeddedCount = await this.prisma.chunk.count({
      where: { repositoryId: id, isEmbedded: true }
    });

    return {
      ...repository,
      embeddedCount,
    };
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
