import { Module } from '@nestjs/common';
import { RepositoryController } from './repository.controller';
import { RepositoryService } from './repository.service';
import { ParsingModule } from '../parsing/parsing.module';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
  imports: [ParsingModule, EmbeddingModule],
  controllers: [RepositoryController],
  providers: [RepositoryService],
  exports: [RepositoryService],
})
export class RepositoryModule {}
