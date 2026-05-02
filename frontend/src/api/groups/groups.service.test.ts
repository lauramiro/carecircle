import { describe, expect, it } from 'vitest';
import {
  addGPContact,
  getGroupById,
  getGroups,
  inviteMember,
  removeGPContact,
  updateGPContact,
} from './groups.service';

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

  it('adds, updates, and removes GP contacts', async () => {
    const addedContact = await addGPContact('group-care-003', {
      gpName: 'Dr. Test GP',
      phoneNumber: '+44 20 0000 0000',
      practiceName: 'Test Practice',
    });

    expect(addedContact).toMatchObject({
      id: expect.any(String),
      gpName: 'Dr. Test GP',
    });

    const updatedContact = await updateGPContact('group-care-003', addedContact.id, {
      gpName: 'Dr. Updated GP',
      phoneNumber: '+44 20 0000 9999',
      practiceName: 'Updated Practice',
    });

    expect(updatedContact).toMatchObject({
      id: addedContact.id,
      gpName: 'Dr. Updated GP',
      phoneNumber: '+44 20 0000 9999',
    });

    await expect(
      removeGPContact('group-care-003', addedContact.id),
    ).resolves.toBeUndefined();
  });
});
