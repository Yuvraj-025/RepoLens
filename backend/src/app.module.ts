import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { RepositoryModule } from './modules/repository/repository.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ParsingModule } from './modules/parsing/parsing.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { ChatModule } from './modules/chat/chat.module';
import { InsightsModule } from './modules/insights/insights.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60, // 1 minute in seconds
        limit: 100, // 100 requests globally per minute per IP
      },
    ]),
    PrismaModule,
    AuthModule,
    RepositoryModule,
    ParsingModule,
    EmbeddingModule,
    ChatModule,
    InsightsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
