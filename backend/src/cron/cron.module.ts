import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsModule } from '../alerts/alerts.module';
import { ChecklistModule } from '../checklist/checklist.module';
import { AppConfigModule } from '../config/app-config.module';
import {
  ChecklistMaterializationCron,
  OverdueDetectionCron,
  SmsDispatchCron,
} from './cron.jobs';

@Module({
  imports: [ScheduleModule.forRoot(), AppConfigModule, ChecklistModule, AlertsModule],
  providers: [ChecklistMaterializationCron, OverdueDetectionCron, SmsDispatchCron],
})
export class CronModule {}
