import { Controller, Get, Param,Post, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import { WeeklyInsightGenerationService } from './weekly-insight-generation.service';

@Controller('insights')
export class InsightsController {
  private readonly logger = new Logger(InsightsController.name);
  private readonly weeklyInsightGenerationService: WeeklyInsightGenerationService;

  constructor(private readonly supabase: SupabaseAdminClient, weeklyInsightGenerationService: WeeklyInsightGenerationService) {
    this.weeklyInsightGenerationService = weeklyInsightGenerationService;
  }

  private async resolvePatientId(groupId: string): Promise<string> {
    const { data, error } = await this.supabase.getClient()
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

    return data.id;
  }
  


  @Get('group/:groupId')
  async getInsightsForGroup(@Param('groupId') groupId: string) {
    try {
      const patientId = await this.resolvePatientId(groupId);
      const { data, error } = await this.supabase.getClient()
        .from('ai_insights')
        .select('insight_type, observation, suggested_action, severity, generated_at')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) {
        this.logger.error('Supabase query failed:', error);
        throw new HttpException('Failed to fetch insights', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return { insights: data ?? [] };
    } catch (err) {
      this.logger.error('Failed to get insights for patient', err as any);
      throw new HttpException('Failed to get insights', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
