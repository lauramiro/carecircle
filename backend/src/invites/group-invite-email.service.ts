import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { buildGroupInviteEmailBodies } from '../email/templates/group-invite.template';
import { GmailMailerService } from '../email/gmail-mailer.service';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import {
  normalizeInviteEmail,
  SendGroupInviteEmailDto,
} from './dto/send-group-invite-email.dto';

@Injectable()
export class GroupInviteEmailService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly mailer: GmailMailerService,
    private readonly supabase: SupabaseAdminClient,
  ) {}

  private defaultFrontendUrl(): string {
    return (
      this.appConfig.config.FRONTEND_PUBLIC_URL?.trim() ||
      'http://localhost:5173'
    );
  }

  /** Same query keys as `InvitePage` / `buildMemberInvitePath` (confirmation=false for new invites). */
  buildGroupInviteUrl(inviteId: string, email: string): string {
    return this.buildGroupInviteRedirectUrl(inviteId, email, 'false');
  }

  buildGroupInviteRedirectUrl(
    inviteId: string,
    email: string,
    confirmation: 'true' | 'false',
  ): string {
    const base = this.defaultFrontendUrl().replace(/\/$/, '');
    const q = new URLSearchParams({
      inviteId,
      email,
      confirmation,
    });
    return `${base}/group-invite?${q.toString()}`;
  }

  async buildGroupInviteMagicLink(
    inviteId: string,
    email: string,
  ): Promise<string> {
    const redirectTo = this.buildGroupInviteRedirectUrl(
      inviteId,
      email,
      'true',
    );
    const { data, error } = await this.supabase
      .getClient()
      .auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      });

    if (error) {
      throw new ServiceUnavailableException('invite_magic_link_failed');
    }

    const actionLink = data.properties?.action_link;
    if (!actionLink) {
      throw new ServiceUnavailableException('invite_magic_link_missing');
    }

    return actionLink;
  }

  async sendInviteEmail(dto: SendGroupInviteEmailDto): Promise<{ ok: true }> {
    if (!this.mailer.isConfigured()) {
      throw new ServiceUnavailableException('invite_email_requires_gmail_env');
    }

    const emailNorm = normalizeInviteEmail(dto.email);
    const groupName = dto.groupName.trim();
    const inviteUrl = await this.buildGroupInviteMagicLink(
      dto.inviteId,
      emailNorm,
    );
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
    try {
      await this.mailer.sendMail(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`mail_transport_failed: ${msg}`);
    }

    return { ok: true };
  }
}
