import { Controller, Post, Get, Delete, Body, Param, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { Throttle } from '@nestjs/throttler';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('query')
  @Throttle({ global: { limit: 10, ttl: 60000 } })
  async queryRepository(
    @Body() body: { repositoryId: string; query: string },
    @Request() req: any,
    @Res() res: Response,
  ) {
    return this.chatService.streamChatResponse(
      req.user.id,
      body.repositoryId,
      body.query,
      res,
    );
  }

  @Get('history/:repositoryId')
  async getChatHistory(
    @Param('repositoryId') repositoryId: string,
    @Request() req: any,
  ) {
    return this.chatService.getChatHistory(repositoryId, req.user.id);
  }

  @Delete('history/:repositoryId')
  async clearChatHistory(
    @Param('repositoryId') repositoryId: string,
    @Request() req: any,
  ) {
    return this.chatService.clearChatHistory(repositoryId, req.user.id);
  }
}
