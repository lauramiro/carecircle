import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class GmailMailerService {
  private readonly logger = new Logger(GmailMailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly appConfig: AppConfigService) {}

  isConfigured(): boolean {
    const c = this.appConfig.config;
    return Boolean(c.GMAIL_USER?.trim() && c.GMAIL_APP_PASSWORD?.trim());
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const c = this.appConfig.config;
    const user = c.GMAIL_USER?.trim();
    const pass = c.GMAIL_APP_PASSWORD?.trim();
    if (!user || !pass) {
      throw new Error('gmail_not_configured');
    }
    console.log('getTransporter user:', user);
    console.log('getTransporter pass:', pass);
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendMail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const c = this.appConfig.config;
    const user = c.GMAIL_USER?.trim();
    const fromAddress = (c.MAIL_FROM ?? user)?.trim();
    if (!fromAddress) {
      throw new Error('mail_from_missing');
    }
    const fromName = c.MAIL_FROM_NAME?.trim();
    const from = fromName
      ? `"${fromName.replace(/"/g, '')}" <${fromAddress}>`
      : fromAddress;

    const transport = this.getTransporter();
    const info = await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    this.logger.log(`invite_mail_sent messageId=${String(info.messageId)}`);
  }
}
