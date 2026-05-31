import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const channelState = vi.hoisted(() => ({
  postgresChange: null as ((payload: unknown) => void) | null,
}));

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn((_event, _filter, handler: (payload: unknown) => void) => {
        channelState.postgresChange = handler;
        return {
          subscribe: vi.fn((callback: (status: string) => void) => {
            callback('SUBSCRIBED');
            return { unsubscribe: vi.fn() };
          }),
        };
      }),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../../api/journal/journal.service', () => ({
  getLatestJournalEntry: vi.fn(),
}));

import { getLatestJournalEntry } from '../../api/journal/journal.service';
import { useLatestJournalEntry } from './useLatestJournalEntry';

const mockGetLatest = vi.mocked(getLatestJournalEntry);

describe('useLatestJournalEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelState.postgresChange = null;
    mockGetLatest.mockResolvedValue(null);
  });

  it('refetches when a realtime INSERT arrives', async () => {
    mockGetLatest
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'entry-1',
        groupId: 'group-1',
        authorId: 'user-1',
        authorName: 'Alex',
        content: 'Handover note',
        createdAt: '2026-05-31T12:00:00.000Z',
        updatedAt: '2026-05-31T12:00:00.000Z',
      });

    const { result } = renderHook(() => useLatestJournalEntry('group-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entry).toBeNull();
    expect(mockGetLatest).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(channelState.postgresChange).not.toBeNull());

    act(() => {
      channelState.postgresChange?.({
        eventType: 'INSERT',
        new: { id: 'entry-1', group_id: 'group-1' },
      });
    });

    await waitFor(() =>
      expect(result.current.entry).toEqual(
        expect.objectContaining({ id: 'entry-1', content: 'Handover note' }),
      ),
    );
    expect(mockGetLatest).toHaveBeenCalledTimes(2);
  });
});
