import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get(':groupId/latest')
  async getLatest(
    @Param('groupId') groupId: string,
    @Query('userId') userId: string,
  ) {
    return this.insightsService.getLatestInsights(groupId, userId);
  }

  @Get(':groupId/archive')
  async getArchive(@Param('groupId') groupId: string) {
    return this.insightsService.getArchivedDigests(groupId);
  }

  @Post('cards/:cardId/dismiss')
  async dismiss(
    @Param('cardId') cardId: string,
    @Body('userId') userId: string,
  ) {
    await this.insightsService.dismissInsight(userId, cardId);
    return { success: true };
  }

  @Post('debug/generate/:groupId')
  async debugGenerate(@Param('groupId') groupId: string) {
    await this.insightsService.generateWeeklyDigest(groupId);
    return { success: true };
  }
}
