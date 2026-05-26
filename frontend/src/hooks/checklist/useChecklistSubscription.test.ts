import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChecklistItem } from '@lib/checklist';

const channelHandlers = vi.hoisted(() => ({
  postgresChange: null as ((payload: unknown) => void) | null,
}));

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn((_event, _filter, handler: (payload: unknown) => void) => {
        channelHandlers.postgresChange = handler;
        return {
          subscribe: vi.fn(),
        };
      }),
    })),
    removeChannel: vi.fn(),
  },
}));

import { useChecklistSubscription } from './useChecklistSubscription';

function buildItem(id: string, status: ChecklistItem['status'] = 'due'): ChecklistItem {
  return {
    id,
    medication_id: `med-${id}`,
    medication_name: `Medication ${id}`,
    dosage: '1',
    dosage_unit: 'tablet',
    scheduled_time: '08:00',
    time_window: {
      time_of_day: '08:00',
      window_start: '08:00',
      window_end: '09:00',
    },
    status,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('useChecklistSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelHandlers.postgresChange = null;
  });

  it('notifies parent when realtime updates an item', async () => {
    const initialItems = [buildItem('item-1', 'due')];
    const onItemsChange = vi.fn();

    renderHook(() =>
      useChecklistSubscription('checklist-1', '2026-01-01', initialItems, onItemsChange),
    );

    await waitFor(() => expect(channelHandlers.postgresChange).not.toBeNull());

    act(() => {
      channelHandlers.postgresChange?.({
        eventType: 'UPDATE',
        new: {
          id: 'item-1',
          checklist_id: 'checklist-1',
          medication_id: 'med-item-1',
          medication_name: 'Medication item-1',
          dose: 1,
          dosage_unit: 'tablet',
          scheduled_time: '08:00',
          window_start: '08:00',
          window_end: '09:00',
          status: 'given',
          given_at: '2026-01-01T08:05:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T08:05:00.000Z',
        },
      });
    });

    expect(onItemsChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'item-1', status: 'given' }),
    ]);
  });

  it('notifies parent when patchItem applies an optimistic update', () => {
    const initialItems = [buildItem('item-1', 'due')];
    const onItemsChange = vi.fn();

    const { result } = renderHook(() =>
      useChecklistSubscription('checklist-1', '2026-01-01', initialItems, onItemsChange),
    );

    act(() => {
      result.current.patchItem('item-1', { status: 'given', given_at: '2026-01-01T08:05:00.000Z' });
    });

    expect(result.current.items[0]?.status).toBe('given');
    expect(onItemsChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'item-1', status: 'given' }),
    ]);
  });
});
