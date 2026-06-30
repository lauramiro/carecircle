import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class GmailMailerService {
  private readonly logger = new Logger(GmailMailerService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.appConfig.config.BREVO_API_KEY?.trim());
  }

  async sendMail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const c = this.appConfig.config;
    const apiKey = c.BREVO_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('brevo_not_configured');
    }

    const fromAddress = c.MAIL_FROM?.trim();
    const fromName = c.MAIL_FROM_NAME?.trim();
    if (!fromAddress) {
      throw new Error('mail_from_missing');
    }

    const body = {
      sender: { name: fromName ?? fromAddress, email: fromAddress },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
      textContent: params.text,
    };

    const res = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      this.logger.error(
        `brevo_send_failed status=${res.status} detail=${detail}`,
      );
      throw new Error(`brevo_send_failed: ${res.status}`);
    }

    const data = (await res.json()) as { messageId?: string };
    this.logger.log(
      `invite_mail_sent messageId=${data.messageId ?? 'unknown'}`,
    );
  }
}
