import { Controller, Get, Param, Request } from '@nestjs/common';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get(':id')
  async getRepositorySummary(@Param('id') id: string, @Request() req: any) {
    return this.insightsService.getRepositorySummary(id, req.user.id);
  }
}
