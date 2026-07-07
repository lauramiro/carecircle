import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  assertGroupMemberIfTokenPresent,
  extractBearerToken,
} from '../common/auth/group-membership.util';
import { DismissInsightDto } from '../common/dto/group-id.dto';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  private readonly logger = new Logger(InsightsController.name);

  constructor(
    private readonly supabase: SupabaseAdminClient,
    private readonly insightsService: InsightsService,
  ) {}

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
    @Body() dto: DismissInsightDto,
  ) {
    await this.insightsService.dismissInsight(dto.userId, cardId);
    return { success: true };
  }

  @Post(['generate/:groupId', 'debug/generate/:groupId'])
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async generateWeeklyDigest(@Param('groupId') groupId: string) {
    await this.insightsService.generateWeeklyDigest(groupId);
    return { success: true };
  }

  @Get('group/:groupId')
  async getInsightsForGroup(
    @Param('groupId') groupId: string,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    try {
      await assertGroupMemberIfTokenPresent(
        this.supabase,
        groupId,
        extractBearerToken(authorizationHeader),
      );

      const result =
        await this.insightsService.getActiveAiInsightsForGroup(groupId);

      if (result === null) {
        throw new HttpException(
          'Group not found or patient id not resolved',
          HttpStatus.NOT_FOUND,
        );
      }

      return result;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Failed to get insights for patient', err);
      throw new HttpException(
        'Failed to get insights',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
