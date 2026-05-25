import { describe, expect, it } from 'vitest';
import { buildGroupInviteEmailBodies } from './group-invite.template';

describe('buildGroupInviteEmailBodies', () => {
  it('includes invite URL and query-style link matching InvitePage', () => {
    const url =
      'http://localhost:5173/group-invite?inviteId=11111111-1111-4111-8111-111111111111&email=pat%40example.com&confirmation=false';
    const { html, text, subject } = buildGroupInviteEmailBodies({
      inviteUrl: url,
      groupName: 'Team A',
    });
    expect(subject).toContain('Team A');
    expect(html).toContain('http://localhost:5173/group-invite?');
    expect(html).toContain('inviteId=');
    expect(html).toContain('email=');
    expect(html).toContain('confirmation=false');
    expect(text).toContain(url);
  });
});
