import { Module, forwardRef } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { AlertsModule } from '../alerts/alerts.module';
import {
  ChecklistMaterializationService,
  ChecklistReconciliationService,
} from './checklist-materialization.service';
import { OverdueDetectionService } from './overdue-detection.service';
import { ChecklistAckAlertSubscriber } from './checklist-ack-alert.subscriber';

@Module({
  imports: [AppConfigModule, forwardRef(() => AlertsModule)],
  providers: [
    ChecklistMaterializationService,
    ChecklistReconciliationService,
    OverdueDetectionService,
    ChecklistAckAlertSubscriber,
  ],
  exports: [
    ChecklistMaterializationService,
    ChecklistReconciliationService,
    OverdueDetectionService,
  ],
})
export class ChecklistModule {}
