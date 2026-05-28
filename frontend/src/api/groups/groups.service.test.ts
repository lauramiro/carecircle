import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}));

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-123' } } }),
    },
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
    from: fromMock,
  },
}));

vi.mock('./groups.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./groups.service')>();
  const mock = await import('./groups.mock');
  return {
    ...actual,
    getGroups: mock.getGroups,
    getUserGroupDetails: mock.getUserGroupDetails,
  };
});

import axios from 'axios';
import { supabase } from '../../lib/supabaseClient';
import {
  addGPContact,
  getUserGroupDetails,
  getGroups,
  inviteMember,
  removeGPContact,
  updateGPContact,
} from './groups.service';

function mockPatientLookup(patientId = 'patient-1') {
  fromMock.mockImplementation((table: string) => {
    if (table === 'patients') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: patientId }, error: null }),
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

describe('groups service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    fromMock.mockReset();
  });

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
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { ok: true } });

    await expect(
      inviteMember({
        groupId: 'group-care-001',
        email: 'John@Example.com',
        groupName: "Dad's Circle",
      }),
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

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/invites/group/send-email'),
      {
        inviteId: 'invite-uuid-mock',
        groupId: 'group-care-001',
        email: 'john@example.com',
        groupName: "Dad's Circle",
      },
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
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
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.post).mockRejectedValueOnce({
      response: { data: { message: 'Resend rejected the request' } },
    });

    await expect(
      inviteMember({
        groupId: 'group-care-001',
        email: 'John@Example.com',
        groupName: 'Test',
      }),
    ).rejects.toThrow('Resend rejected the request');
  });

  it('adds, updates, and removes GP contacts via gp_contacts table', async () => {
    const gpRow = {
      id: 'gp-new-1',
      name: 'Dr. Test GP',
      phone: '+44 20 0000 0000',
      address: 'Test Practice',
      specialty: 'General Practice',
      email: null,
    };

    const updatedRow = {
      ...gpRow,
      name: 'Dr. Updated GP',
      phone: '+44 20 0000 9999',
      address: 'Updated Practice',
    };

    let gpUpdateCalls = 0;

    fromMock.mockImplementation((table: string) => {
      if (table === 'patients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'patient-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'gp_contacts') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: gpRow, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockImplementation(async () => {
                      gpUpdateCalls += 1;
                      if (gpUpdateCalls === 1) {
                        return { data: updatedRow, error: null };
                      }
                      return { data: { id: gpRow.id }, error: null };
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const addedContact = await addGPContact('group-care-001', {
      gpName: 'Dr. Test GP',
      phoneNumber: '+44 20 0000 0000',
      practiceName: 'Test Practice',
    });

    expect(addedContact).toMatchObject({
      id: 'gp-new-1',
      gpName: 'Dr. Test GP',
      phoneNumber: '+44 20 0000 0000',
      practiceName: 'Test Practice',
    });

    const updatedContact = await updateGPContact('group-care-001', addedContact.id, {
      gpName: 'Dr. Updated GP',
      phoneNumber: '+44 20 0000 9999',
      practiceName: 'Updated Practice',
    });

    expect(updatedContact).toMatchObject({
      id: 'gp-new-1',
      gpName: 'Dr. Updated GP',
      phoneNumber: '+44 20 0000 9999',
      practiceName: 'Updated Practice',
    });

    await expect(removeGPContact('group-care-001', addedContact.id)).resolves.toBeUndefined();
  });

  it('throws when adding a GP contact without a name', async () => {
    mockPatientLookup();

    await expect(
      addGPContact('group-care-001', { phoneNumber: '+44 20 0000 0000' }),
    ).rejects.toThrow('GP name is required');
  });

  it('throws when no patient exists for the care group', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'patients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(
      addGPContact('group-care-001', { gpName: 'Dr. Test GP' }),
    ).rejects.toThrow('Patient not found for this care group');
  });
});
