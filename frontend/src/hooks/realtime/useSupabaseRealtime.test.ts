import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const channelState = vi.hoisted(() => ({
  postgresChange: null as ((payload: unknown) => void) | null,
  subscribeCallback: null as ((status: string) => void) | null,
  subscribeCount: 0,
}));

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn((_event, _filter, handler: (payload: unknown) => void) => {
        channelState.postgresChange = handler;
        return {
          subscribe: vi.fn((callback: (status: string) => void) => {
            channelState.subscribeCallback = callback;
            channelState.subscribeCount += 1;
            callback('SUBSCRIBED');
            return { unsubscribe: vi.fn() };
          }),
        };
      }),
    })),
    removeChannel: vi.fn(),
  },
}));

import { useSupabaseRealtime } from './useSupabaseRealtime';

describe('useSupabaseRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelState.postgresChange = null;
    channelState.subscribeCallback = null;
    channelState.subscribeCount = 0;
  });

  it('subscribes and forwards INSERT payloads', () => {
    const onInsert = vi.fn();

    renderHook(() =>
      useSupabaseRealtime({
        channelName: 'journal-group-1',
        table: 'handover_journal_entries',
        filter: 'group_id=eq.group-1',
        onInsert,
      }),
    );

    expect(channelState.postgresChange).not.toBeNull();

    act(() => {
      channelState.postgresChange?.({
        eventType: 'INSERT',
        new: { id: 'entry-1', group_id: 'group-1' },
      });
    });

    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'INSERT' }),
    );
  });

  it('marks subscribed after SUBSCRIBED status', () => {
    const { result } = renderHook(() =>
      useSupabaseRealtime({
        channelName: 'appointments-patient-1',
        table: 'appointments',
        filter: 'patient_id=eq.patient-1',
      }),
    );

    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('reconnects with backoff after channel error', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useSupabaseRealtime({
        channelName: 'shifts-group-1',
        table: 'weekly_shift_assignments',
        filter: 'group_id=eq.group-1',
      }),
    );

    expect(result.current.isSubscribed).toBe(true);

    act(() => {
      channelState.subscribeCallback?.('CHANNEL_ERROR');
    });

    expect(result.current.isSubscribed).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(channelState.subscribeCount).toBeGreaterThan(1);

    vi.useRealTimers();
  });
});
