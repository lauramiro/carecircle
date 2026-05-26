import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WeeklyInsightGenerationService } from './weekly-insight-generation.service';
import { InsightsController } from './insights.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [InsightsController],
  providers: [WeeklyInsightGenerationService],
  exports: [WeeklyInsightGenerationService],
})
export class InsightsModule {}
