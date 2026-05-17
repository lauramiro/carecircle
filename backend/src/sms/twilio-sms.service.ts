import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';
import { AppConfigService } from '../config/app-config.service';

/**
 * Twilio SMS delivery. Credentials must come from environment only (CC-100).
 * Avoid logging message bodies or phone numbers in production logs.
 */
@Injectable()
export class TwilioSmsService {
  private readonly logger = new Logger(TwilioSmsService.name);

  constructor(private readonly appConfigService: AppConfigService) {}

  isConfigured(): boolean {
    const c = this.appConfigService.config;
    return Boolean(c.TWILIO_ACCOUNT_SID && c.TWILIO_AUTH_TOKEN && c.TWILIO_FROM_NUMBER);
  }

  /**
   * Sends an SMS. On failure, logs a short error code only — not the message body.
   */
  async sendSms(to: string, body: string): Promise<{ sid: string } | { error: string }> {
    const c = this.appConfigService.config;
    if (!c.TWILIO_ACCOUNT_SID || !c.TWILIO_AUTH_TOKEN || !c.TWILIO_FROM_NUMBER) {
      this.logger.warn('Twilio credentials or from-number missing; SMS not sent');
      return { error: 'twilio_not_configured' };
    }

    const client = twilio(c.TWILIO_ACCOUNT_SID, c.TWILIO_AUTH_TOKEN);
    try {
      const msg = await client.messages.create({
        to,
        from: c.TWILIO_FROM_NUMBER,
        body,
      });
      this.logger.log(`twilio_message_created status=${msg.status} sid=${msg.sid}`);
      return { sid: msg.sid as string };
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'unknown';
      this.logger.warn(`twilio_send_failed code=${code}`);
      return { error: 'twilio_send_failed' };
    }
  }
}
