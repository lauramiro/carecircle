/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it, vi } from 'vitest';
import { GroupInviteEmailService } from './group-invite-email.service';

describe('GroupInviteEmailService', () => {
  const supabase = {
    getClient: vi.fn(() => ({
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({
            data: {
              properties: {
                action_link: 'https://auth.example/magic-link',
              },
            },
            error: null,
          }),
        },
      },
    })),
  };

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
      supabase as never,
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
      supabase as never,
    );

    await svc.sendInviteEmail({
      inviteId: '11111111-1111-4111-8111-111111111111',
      groupId: '22222222-2222-4222-8222-222222222222',
      email: 'a@b.com',
      groupName: 'Sunrise Circle',
    });

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0][0].html).toContain(
      'https://auth.example/magic-link',
    );
    const html = sendMail.mock.calls[0][0].html as string;
    expect(html).toContain('Sunrise Circle');
  });

  it('generates a magic link that redirects back to invite confirmation mode', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: {
        properties: {
          action_link: 'https://auth.example/magic-link',
        },
      },
      error: null,
    });
    const appConfig = {
      config: { FRONTEND_PUBLIC_URL: 'https://app.example' },
    };
    const svc = new GroupInviteEmailService(
      appConfig as never,
      { isConfigured: () => true, sendMail: vi.fn() } as never,
      {
        getClient: () => ({
          auth: { admin: { generateLink } },
        }),
      } as never,
    );

    await expect(
      svc.buildGroupInviteMagicLink(
        '33333333-3333-4333-8333-333333333333',
        'invitee@example.com',
      ),
    ).resolves.toBe('https://auth.example/magic-link');
    expect(generateLink).toHaveBeenCalledWith({
      type: 'magiclink',
      email: 'invitee@example.com',
      options: {
        redirectTo:
          'https://app.example/group-invite?inviteId=33333333-3333-4333-8333-333333333333&email=invitee%40example.com&confirmation=true',
      },
    });
  });
});
