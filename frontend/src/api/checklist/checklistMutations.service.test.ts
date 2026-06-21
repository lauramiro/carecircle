import { beforeEach, describe, expect, it, vi } from 'vitest';
import { markChecklistItemGiven } from './checklistMutations.service';

const getUserMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const uploadMock = vi.hoisted(() => vi.fn());
const getPublicUrlMock = vi.hoisted(() => vi.fn());
const callRpcMock = vi.hoisted(() => vi.fn());

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
  },
}));

vi.mock('@lib/supabaseRpc', () => ({
  callRpc: callRpcMock,
}));


describe('markChecklistItemGiven', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: 'carer-1' } },
    });
    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://storage.example/proof.jpg' },
    });
  });

  it('creates exactly one confirmation when two carers confirm the same item concurrently', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    callRpcMock
      .mockResolvedValueOnce({ data: 'item-1', error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'medication_confirmations') {
        return { insert };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const input = {
      itemId: 'item-1',
      notes: '',
      asLate: false,
      overdueHours: 0,
      overdueMinutes: 0,
      photoFile: new File(['proof'], 'proof.jpg', { type: 'image/jpeg' }),
    };

    await expect(
      Promise.allSettled([
        markChecklistItemGiven(input),
        markChecklistItemGiven(input),
      ]),
    ).resolves.toEqual([
      expect.objectContaining({ status: 'fulfilled' }),
      expect.objectContaining({
        status: 'rejected',
        reason: expect.objectContaining({
          message: 'checklist_item_already_confirmed',
        }),
      }),
    ]);
    expect(callRpcMock).toHaveBeenCalledWith('mark_checklist_item_given', {
      p_item_id: 'item-1',
      p_given_at: expect.any(String),
      p_given_notes: null,
      p_overdue_hours: null,
      p_overdue_minutes: null,
    });
    expect(insert).toHaveBeenCalledOnce();
  });
});
