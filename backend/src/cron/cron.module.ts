import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsModule } from '../alerts/alerts.module';
import { ChecklistModule } from '../checklist/checklist.module';
import { AppConfigModule } from '../config/app-config.module';
import { InsightsModule } from '../insights/insights.module';
import {
  ChecklistMaterializationCron,
  OverdueDetectionCron,
  SmsDispatchCron,
  WeeklyDigestCron,
} from './cron.jobs';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AppConfigModule,
    ChecklistModule,
    AlertsModule,
    InsightsModule,
  ],
  providers: [
    ChecklistMaterializationCron,
    OverdueDetectionCron,
    SmsDispatchCron,
    WeeklyDigestCron,
  ],
})
export class CronModule {}
