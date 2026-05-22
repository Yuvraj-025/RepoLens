import { Module } from '@nestjs/common';
import { ParsingService } from './parsing.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ParsingService],
  exports: [ParsingService],
})
export class ParsingModule {}
