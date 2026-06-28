import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { resolve4 } from 'node:dns/promises';
import { AppConfigService } from '../config/app-config.service';

const GMAIL_SMTP_HOST = 'smtp.gmail.com';

@Injectable()
export class GmailMailerService {
  private readonly logger = new Logger(GmailMailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly appConfig: AppConfigService) {}

  isConfigured(): boolean {
    const c = this.appConfig.config;
    return Boolean(c.GMAIL_USER?.trim() && c.GMAIL_APP_PASSWORD?.trim());
  }

  /**
   * nodemailer's `service: 'Gmail'` shorthand resolves both A and AAAA
   * records for smtp.gmail.com and picks a random address from the
   * combined pool — Render has no outbound IPv6 route, so roughly half
   * of all sends fail with ENETUNREACH. Pre-resolving the IPv4 address
   * ourselves and connecting to that literal IP (with `tls.servername`
   * set for correct cert/SNI validation) sidesteps nodemailer's resolver
   * entirely.
   *
   * Port 465 (implicit TLS) also times out outbound from Render — likely
   * blocked at the network layer, a common cloud-host restriction to
   * curb spam. Port 587 (STARTTLS) is far more commonly left open, so we
   * connect there instead and let nodemailer upgrade the connection.
   */
  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;
    const c = this.appConfig.config;
    const user = c.GMAIL_USER?.trim();
    const pass = c.GMAIL_APP_PASSWORD?.trim();
    if (!user || !pass) {
      throw new Error('gmail_not_configured');
    }
    const [address] = await resolve4(GMAIL_SMTP_HOST);
    this.transporter = nodemailer.createTransport({
      host: address,
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { servername: GMAIL_SMTP_HOST },
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

    const transport = await this.getTransporter();
    const info = (await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    })) as { messageId: string };
    this.logger.log(`invite_mail_sent messageId=${String(info.messageId)}`);
  }
}
