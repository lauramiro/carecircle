import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseAdminModule } from '../integrations/supabase-admin.module';
import { WeeklyInsightGenerationService } from './weekly-insight-generation.service';
import { InsightsController } from './insights.controller';

@Module({
  imports: [ScheduleModule.forRoot(), SupabaseAdminModule],
  controllers: [InsightsController],
  providers: [WeeklyInsightGenerationService],
  exports: [WeeklyInsightGenerationService],
})
export class InsightsModule {}
