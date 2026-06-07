import { describe, expect, it, vi } from 'vitest';
import { GroupInviteEmailService } from './group-invite-email.service';

describe('GroupInviteEmailService', () => {
  it('buildGroupInviteUrl matches InvitePage search params', () => {
    const appConfig = {
      config: {
        FRONTEND_PUBLIC_URL: 'https://example.com/',
      },
    };
    const mailer = { isConfigured: () => true, sendMail: vi.fn() };
    const svc = new GroupInviteEmailService(
      appConfig as never,
      mailer as never,
    );
    const url = svc.buildGroupInviteUrl(
      '33333333-3333-4333-8333-333333333333',
      'invitee@example.com',
    );
    expect(url).toBe(
      'https://example.com/group-invite?inviteId=33333333-3333-4333-8333-333333333333&email=invitee%40example.com&confirmation=false',
    );
  });

  it('sendInviteEmail sends mail using groupName from dto', async () => {
    const appConfig = {
      config: { FRONTEND_PUBLIC_URL: 'http://localhost:5173' },
    };
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const mailer = { isConfigured: () => true, sendMail };
    const svc = new GroupInviteEmailService(
      appConfig as never,
      mailer as never,
    );

    await svc.sendInviteEmail({
      inviteId: '11111111-1111-4111-8111-111111111111',
      groupId: '22222222-2222-4222-8222-222222222222',
      email: 'a@b.com',
      groupName: 'Sunrise Circle',
    });

    expect(sendMail).toHaveBeenCalledOnce();
    const html = sendMail.mock.calls[0][0].html as string;
    expect(html).toContain('Sunrise Circle');
  });
});
