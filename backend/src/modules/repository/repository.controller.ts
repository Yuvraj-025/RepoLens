import { Controller, Post, Get, Param, Delete, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RepositoryService } from './repository.service';
import { Request } from '@nestjs/common';

@Controller('repository')
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRepository(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
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
}
