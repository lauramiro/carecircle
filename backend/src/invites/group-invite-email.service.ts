import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { buildGroupInviteEmailBodies } from '../email/templates/group-invite.template';
import { GmailMailerService } from '../email/gmail-mailer.service';
import {
  normalizeInviteEmail,
  SendGroupInviteEmailDto,
} from './dto/send-group-invite-email.dto';

@Injectable()
export class GroupInviteEmailService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly mailer: GmailMailerService,
  ) {}

  private defaultFrontendUrl(): string {
    return (
      this.appConfig.config.FRONTEND_PUBLIC_URL?.trim() ||
      'http://localhost:5173'
    );
  }

  /** Same query keys as `InvitePage` / `buildMemberInvitePath` (confirmation=false for new invites). */
  buildGroupInviteUrl(inviteId: string, email: string): string {
    const base = this.defaultFrontendUrl().replace(/\/$/, '');
    const q = new URLSearchParams({
      inviteId,
      email,
      confirmation: 'false',
    });
    return `${base}/group-invite?${q.toString()}`;
  }

  async sendInviteEmail(dto: SendGroupInviteEmailDto): Promise<{ ok: true }> {
    if (!this.mailer.isConfigured()) {
      throw new ServiceUnavailableException('invite_email_requires_gmail_env');
    }

    const emailNorm = normalizeInviteEmail(dto.email);
    const groupName = dto.groupName.trim();
    const inviteUrl = this.buildGroupInviteUrl(dto.inviteId, emailNorm);
    const bodies = buildGroupInviteEmailBodies({
      inviteUrl,
      groupName: groupName || null,
    });
    const params = {
      to: emailNorm,
      subject: bodies.subject,
      html: bodies.html,
      text: bodies.text,
    };
    console.log('sendInviteEmail params:', params);
    try {
      await this.mailer.sendMail(params);
    } catch (err) {
      console.error('sendInviteEmail error:', err);
      throw new BadRequestException('mail_transport_failed');
    }

    return { ok: true };
  }
}
