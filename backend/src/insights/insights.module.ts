import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { AiModule } from '../ai/ai.module';
import { SupabaseAdminModule } from '../integrations/supabase-admin.module';
import { AlertsModule } from '../alerts/alerts.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WeeklyInsightGenerationService } from './weekly-insight-generation.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AiModule,
    SupabaseAdminModule,
    AlertsModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService, WeeklyInsightGenerationService],
  exports: [InsightsService, WeeklyInsightGenerationService],
})
export class InsightsModule {}
