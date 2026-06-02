import { Controller, Post, Get, Param, Delete, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RepositoryService } from './repository.service';
import { Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

@Controller('repository')
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Post('import-github')
  @Throttle({ global: { limit: 3, ttl: 60 } })
  async importGithubRepository(
    @Body() body: { githubUrl: string },
    @Request() req: any,
  ) {
    return this.repositoryService.importGithubRepository(body.githubUrl, req.user.id);
  }


  @Post('upload')
  @Throttle({ global: { limit: 3, ttl: 60 } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadRepository(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: 'application/zip' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.repositoryService.uploadRepository(file, req.user.id);
  }

  @Get()
  async getRepositories(@Request() req: any) {
    return this.repositoryService.getRepositories(req.user.id);
  }

  @Get(':id')
  async getRepository(@Param('id') id: string, @Request() req: any) {
    return this.repositoryService.getRepository(id, req.user.id);
  }

  @Delete(':id')
  async deleteRepository(@Param('id') id: string, @Request() req: any) {
    return this.repositoryService.deleteRepository(id, req.user.id);
  }

  @Get(':id/files')
  async getRepositoryFiles(@Param('id') id: string, @Request() req: any) {
    return this.repositoryService.getRepositoryFiles(id, req.user.id);
  }

  @Get(':id/files/:fileId')
  async getRepositoryFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Request() req: any,
  ) {
    return this.repositoryService.getRepositoryFile(id, fileId, req.user.id);
  }
}
