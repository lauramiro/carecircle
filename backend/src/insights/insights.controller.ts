import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InsightsService } from './insights.service';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import { WeeklyInsightGenerationService } from './weekly-insight-generation.service';

@Controller('insights')
export class InsightsController {
  private readonly logger = new Logger(InsightsController.name);

  constructor(
    private readonly supabase: SupabaseAdminClient,
    private readonly weeklyInsightGenerationService: WeeklyInsightGenerationService,
    private readonly insightsService: InsightsService,
  ) {}

  /**
   * Returns the newest weekly digest and filters out cards dismissed by `userId`.
   *
   * Dismissal is per-user rather than per-group, so the user ID is supplied at
   * the boundary and applied only to the card list. The digest metadata remains
   * visible even when all cards have been dismissed.
   *
   * @param groupId Care group route parameter whose latest digest is requested.
   * @param userId Query parameter identifying the user whose dismissed cards
   * should be filtered from the response.
   * @returns Latest digest payload from `InsightsService`.
   * @throws Error Propagates service or Supabase errors when the digest cannot be read.
   */
  @Get(':groupId/latest')
  async getLatest(
    @Param('groupId') groupId: string,
    @Query('userId') userId: string,
  ) {
    return this.insightsService.getLatestInsights(groupId, userId);
  }

  /**
   * Returns historical weekly digests for a care group, excluding the latest.
   *
   * The archive endpoint supports review and comparison without duplicating the
   * current digest panel that the frontend already fetches via `/latest`.
   *
   * @param groupId Care group route parameter whose archived digests are requested.
   * @returns Historical digest list from `InsightsService`, excluding latest.
   * @throws Error Propagates service or Supabase errors when archived digests
   * cannot be read.
   */
  @Get(':groupId/archive')
  async getArchive(@Param('groupId') groupId: string) {
    return this.insightsService.getArchivedDigests(groupId);
  }

  /**
   * Records a user-level dismissal for a single insight card.
   *
   * The service treats duplicate dismissals as idempotent so clients can safely
   * retry after transient network failures.
   *
   * @param cardId Insight-card route parameter to dismiss.
   * @param userId Request body field identifying the dismissing user.
   * @returns `{ success: true }` after the dismissal is stored.
   * @throws Error Propagates service errors when the dismissal cannot be saved.
   */
  @Post('cards/:cardId/dismiss')
  async dismiss(
    @Param('cardId') cardId: string,
    @Body('userId') userId: string,
  ) {
    await this.insightsService.dismissInsight(userId, cardId);
    return { success: true };
  }

  /**
   * Development/manual trigger for generating a weekly digest for one group.
   *
   * This route is useful when validating prompt output and database writes
   * without waiting for the scheduled digest cron. Keep it out of public UI
   * flows unless an explicit admin permission layer is added.
   *
   * @param groupId Care group route parameter to generate a digest for.
   * @returns `{ success: true }` after generation completes.
   * @throws Error Propagates AI, Supabase, or insight-generation failures.
   */
  @Post('debug/generate/:groupId')
  async debugGenerate(@Param('groupId') groupId: string) {
    await this.insightsService.generateWeeklyDigest(groupId);
    return { success: true };
  }

  private async resolvePatientId(groupId: string): Promise<string> {
    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('id')
      .eq('group_id', groupId)
      .single();

    if (error || !data?.id) {
      throw new HttpException(
        'Group not found or patient id not resolved',
        HttpStatus.NOT_FOUND,
      );
    }

    return data.id as string;
  }

  /**
   * Returns active rule-based/legacy AI insights for the patient in a group.
   *
   * This endpoint resolves group-to-patient ownership first so callers do not
   * need to know internal patient IDs, then reads only active insight rows for
   * the patient profile currently associated with that care circle.
   *
   * @param groupId Care group route parameter used to resolve the patient.
   * @returns Object containing up to 50 active AI insight rows.
   * @throws HttpException when the group cannot be resolved or Supabase fails.
   */
  @Get('group/:groupId')
  async getInsightsForGroup(@Param('groupId') groupId: string) {
    try {
      const patientId = await this.resolvePatientId(groupId);
      const { data, error } = await this.supabase
        .getClient()
        .from('ai_insights')
        .select(
          'insight_type, observation, suggested_action, severity, generated_at',
        )
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) {
        this.logger.error('Supabase query failed:', error);
        throw new HttpException(
          'Failed to fetch insights',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return { insights: data ?? [] };
    } catch (err) {
      this.logger.error('Failed to get insights for patient', err);
      throw new HttpException(
        'Failed to get insights',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
