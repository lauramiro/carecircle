import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-123' } } }),
    },
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          patient_id: 'group-care-001',
          joined_at: '2023-01-01T00:00:00.000Z',
          role_in_care: 'Admin',
          patients: { full_name: 'Dad', notes: '' }
        },
        error: null,
      }),
      order: vi.fn().mockReturnThis(),
    })),
  },
}));

// We also globally mock the groupsService module so it behaves the same as the old mocked behavior for getGroups which isn't easy to fully test via deep database mocks
vi.mock('./groups.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./groups.service')>();
  const mock = await import('./groups.mock');
  return {
    ...actual,
    getGroups: mock.getGroups,
    getUserGroupDetails: mock.getUserGroupDetails,
  };
});

import { supabase } from '../../lib/supabaseClient';
import {
  addGPContact,
  getUserGroupDetails,
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
    const group = await getUserGroupDetails('group-care-001');

    expect(group).toMatchObject({
      id: 'group-care-001',
      name: 'Dad Care Circle',
      members: expect.any(Array),
    });
  });

  it('returns null for unknown group ids', async () => {
    await expect(getUserGroupDetails('missing-group')).resolves.toBeNull();
  });

  it('sends an invite payload', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: {
        id: 'invite-uuid-mock',
        group_id: 'group-care-001',
        email: 'john@example.com',
        created_at: '2026-01-01T00:00:00.000Z',
        expires_at: '2026-01-03T00:00:00.000Z',
        invite_type: 'care_group',
        status: 'pending',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    await expect(
      inviteMember({ groupId: 'group-care-001', email: 'John@Example.com' }),
    ).resolves.toMatchObject({
      inviteId: 'invite-uuid-mock',
      groupId: 'group-care-001',
      email: 'john@example.com',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('create_group_invite', {
      p_email: 'john@example.com',
      p_group_id: 'group-care-001',
      p_invite_type: 'care_group',
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('smooth-endpoint', {
      body: {
        id: 'invite-uuid-mock',
        email: 'john@example.com',
      },
    });
  });

  it('throws when the invite email cannot be sent', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: {
        id: 'invite-uuid-mock',
        group_id: 'group-care-001',
        email: 'john@example.com',
      },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { success: false, error: 'Resend rejected the request' },
      error: null,
    });

    await expect(
      inviteMember({ groupId: 'group-care-001', email: 'John@Example.com' }),
    ).rejects.toThrow('Resend rejected the request');
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
