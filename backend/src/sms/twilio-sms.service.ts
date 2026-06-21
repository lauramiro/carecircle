import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class TwilioSmsService {
  private readonly logger = new Logger(TwilioSmsService.name);

  constructor(private readonly appConfigService: AppConfigService) {}

  isConfigured(): boolean {
    const appConfig = this.appConfigService.config;
    return Boolean(
      appConfig.TWILIO_ACCOUNT_SID &&
      appConfig.TWILIO_AUTH_TOKEN &&
      appConfig.TWILIO_FROM_NUMBER,
    );
  }

  async sendSms(
    to: string,
    body: string,
  ): Promise<{ sid: string } | { error: string }> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'Twilio credentials or from-number missing; SMS not sent',
      );
      return { error: 'twilio_not_configured' };
    }

    const appConfig = this.appConfigService.config;
    const client = twilio(
      appConfig.TWILIO_ACCOUNT_SID,
      appConfig.TWILIO_AUTH_TOKEN,
    );
    try {
      const msg = await client.messages.create({
        to,
        from: appConfig.TWILIO_FROM_NUMBER,
        body,
      });
      this.logger.log(
        `twilio_message_created status=${msg.status} sid=${msg.sid}`,
      );
      return { sid: msg.sid };
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String(err.code)
          : 'unknown';
      this.logger.warn(`twilio_send_failed code=${code}`);
      return { error: 'twilio_send_failed' };
    }
  }
}
