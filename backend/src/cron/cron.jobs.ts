import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SmsDispatchService } from '../alerts/sms-dispatch.service';
import { ChecklistMaterializationService } from '../checklist/checklist-materialization.service';
import { MedicationLowStockAlertService } from '../checklist/medication-low-stock-alert.service';
import { OverdueDetectionService } from '../checklist/overdue-detection.service';
import { AppConfigService } from '../config/app-config.service';
import { InsightsService } from '../insights/insights.service';

@Injectable()
export class ChecklistMaterializationCron {
  private readonly logger = new Logger(ChecklistMaterializationCron.name);

  constructor(
    private readonly materialization: ChecklistMaterializationService,
    private readonly appConfig: AppConfigService,
  ) {}

  /** Every 6 hours — materialize the next batch of future checklist items for pending schedules. */
  @Cron('0 */6 * * *')
  async runEverySixHours(): Promise<void> {
    this.logger.log('Checklist materialization cron triggered (every 6 hours)');
    if (!this.appConfig.cronsEnabled) return;
    try {
      await this.materialization.extendPendingSchedules(50);
    } catch (err) {
      this.logger.warn('materialization_cron_failed', err);
    }
  }

  /** Every hour — same as above, but runs more often so perpetual meds stay ~14 days ahead. */
  @Cron('0 */1 * * *')
  async runHorizonCheck(): Promise<void> {
    this.logger.log('Checklist horizon cron triggered (every hour)');
    if (!this.appConfig.cronsEnabled) return;
    try {
      await this.materialization.extendPendingSchedules(20);
    } catch (err) {
      this.logger.warn('horizon_cron_failed', err);
    }
  }
}

@Injectable()
export class OverdueDetectionCron {
  private readonly logger = new Logger(OverdueDetectionCron.name);

  constructor(
    private readonly overdueDetection: OverdueDetectionService,
    private readonly appConfig: AppConfigService,
  ) {}

  /** Every minute — detect overdue checklist items and enqueue push alerts. */
  @Cron('* * * * *')
  async runEveryMinute(): Promise<void> {
    this.logger.log('Overdue detection cron triggered (every minute)');
    if (!this.appConfig.cronsEnabled) return;
    try {
      await this.overdueDetection.runTick();
    } catch (err) {
      this.logger.warn('overdue_cron_failed', err);
    }
  }
}

@Injectable()
export class SmsDispatchCron {
  private readonly logger = new Logger(SmsDispatchCron.name);

  constructor(
    private readonly smsDispatch: SmsDispatchService,
    private readonly appConfig: AppConfigService,
  ) {}

  /** Every minute — send SMS fallbacks for alerts whose push grace period has elapsed. */
  @Cron('* * * * *')
  async runEveryMinute(): Promise<void> {
    this.logger.log('SMS dispatch cron triggered (every minute)');
    if (!this.appConfig.cronsEnabled) return;
    try {
      await this.smsDispatch.runTick();
    } catch (err) {
      this.logger.warn('sms_cron_failed', err);
    }
  }
}

@Injectable()
export class LowStockAlertCron {
  private readonly logger = new Logger(LowStockAlertCron.name);

  constructor(
    private readonly lowStockAlerts: MedicationLowStockAlertService,
    private readonly appConfig: AppConfigService,
  ) {}

  /** Every 5 minutes - retry low-stock alerts that may have missed realtime delivery. */
  @Cron('*/5 * * * *')
  async runEveryFiveMinutes(): Promise<void> {
    this.logger.log('Low stock alert cron triggered (every 5 minutes)');
    if (!this.appConfig.cronsEnabled) return;
    try {
      await this.lowStockAlerts.runPendingLowStockAlerts(100);
    } catch (err) {
      this.logger.warn('low_stock_alert_cron_failed', err);
    }
  }
}

@Injectable()
export class WeeklyDigestCron {
  private readonly logger = new Logger(WeeklyDigestCron.name);

  constructor(
    private readonly insightsService: InsightsService,
    private readonly appConfig: AppConfigService,
  ) {}

  /** Every Monday at 8 AM. */
  @Cron('0 8 * * 1') // At 08:00 on Monday.
  async runEveryMonday(): Promise<void> {
    this.logger.log('Weekly digest cron triggered (Every Monday 8AM)');
    if (!this.appConfig.cronsEnabled) return;
    try {
      await this.insightsService.generateAllWeeklyDigests();
    } catch (err) {
      this.logger.warn('weekly_digest_cron_failed', err);
    }
  }
}
