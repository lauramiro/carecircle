import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class GmailMailerService {
  private readonly logger = new Logger(GmailMailerService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.appConfig.config.RESEND_API_KEY?.trim());
  }

  async sendMail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const c = this.appConfig.config;
    const apiKey = c.RESEND_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('resend_not_configured');
    }

    const fromName = c.MAIL_FROM_NAME?.trim();
    const fromAddress = c.MAIL_FROM?.trim() ?? 'onboarding@resend.dev';
    const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      throw new Error(`resend_send_failed: ${error.message}`);
    }

    this.logger.log(`invite_mail_sent id=${data?.id ?? 'unknown'}`);
  }
}
