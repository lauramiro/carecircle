import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { AlertRepository } from '../integrations/repositories/alert.repository';
import { ChecklistRepository } from '../integrations/repositories/checklist.repository';
import { TwilioSmsService } from '../sms/twilio-sms.service';

type SmsLogEntry = { phone: string; success: boolean; sid?: string; error?: string };

@Injectable()
export class SmsDispatchService {
  private readonly logger = new Logger(SmsDispatchService.name);

  constructor(
    private readonly alertRepo: AlertRepository,
    private readonly checklistRepo: ChecklistRepository,
    private readonly twilio: TwilioSmsService,
    private readonly appConfig: AppConfigService,
  ) {}

  async runTick(): Promise<void> {
    const alerts = await this.alertRepo.findSmsDueAlerts(20);

    for (const alert of alerts) {
      console.log('processAlert', alert.id);
      try {
        await this.processAlert(alert);
      } catch (err) {
        this.logger.warn(`sms_alert_failed alertId=${alert.id}`, err);
      }
    }
  }

  private async processAlert(alert: {
    id: string;
    checklist_item_id: string;
    sms_body: string;
    sms_phone_numbers: string[];
  }): Promise<void> {
    const item = await this.checklistRepo.findById(alert.checklist_item_id);
    if (item && (item.status === 'given' || item.status === 'skipped' || item.skip_reason)) {
      await this.alertRepo.cancelOpenAlert(alert.checklist_item_id, 'acknowledged');
      return;
    }

    const smsLog: SmsLogEntry[] = [];

    for (const phone of alert.sms_phone_numbers) {
      smsLog.push(await this.sendAndLog(phone, alert.sms_body));
    }

    const devNumber = this.appConfig.config.TWILIO_DEV_TEST_TO_NUMBER?.trim();
    if (devNumber && !alert.sms_phone_numbers.includes(devNumber)) {
      const result = await this.sendAndLog(devNumber, alert.sms_body);
      smsLog.push(result);
      if (result.success) {
        this.logger.log(`sms_dev_test_sent alertId=${alert.id} to=${devNumber} sid=${result.sid}`);
      } else {
        this.logger.warn(`sms_dev_test_failed alertId=${alert.id} to=${devNumber} error=${result.error}`);
      }
    }

    const allFailed = smsLog.length > 0 && smsLog.every((e) => !e.success);
    await this.alertRepo.markSmsSent(alert.id, {
      smsSentAt: new Date().toISOString(),
      smsDeliveryLog: smsLog,
      status: allFailed ? 'sms_failed' : 'sms_sent',
    });

    this.logger.log(`sms_dispatched alertId=${alert.id} phones=${alert.sms_phone_numbers.length}`);
  }

  private async sendAndLog(phone: string, body: string): Promise<SmsLogEntry> {
    const result = await this.twilio.sendSms(phone, body);
    if ('sid' in result) {
      return { phone, success: true, sid: result.sid };
    }
    return { phone, success: false, error: result.error };
  }
}
