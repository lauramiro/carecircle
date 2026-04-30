import { describe, expect, it } from 'vitest';
import { getGroupById, getGroups, inviteMember } from './groups.service';

describe('groups service', () => {
  it('returns group summaries', async () => {
    const groups = await getGroups();

    expect(groups.length).toBeGreaterThanOrEqual(4);
    expect(groups[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      role: expect.stringMatching(/Admin|Member/),
      createdAt: expect.any(String),
      memberCount: expect.any(Number),
    });
  });

  it('returns a group detail by id', async () => {
    const group = await getGroupById('group-care-001');

    expect(group).toMatchObject({
      id: 'group-care-001',
      name: 'Dad Care Circle',
      members: expect.any(Array),
    });
  });

  it('returns null for unknown group ids', async () => {
    await expect(getGroupById('missing-group')).resolves.toBeNull();
  });

  it('sends an invite payload', async () => {
    await expect(
      inviteMember({ groupId: 'group-care-001', email: 'john@example.com' }),
    ).resolves.toMatchObject({
      groupId: 'group-care-001',
      email: 'john@example.com',
    });
  });
});
