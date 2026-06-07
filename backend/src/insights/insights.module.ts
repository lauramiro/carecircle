import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { AiModule } from '../ai/ai.module';
import { SupabaseAdminModule } from '../integrations/supabase-admin.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AiModule, SupabaseAdminModule, AlertsModule],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
