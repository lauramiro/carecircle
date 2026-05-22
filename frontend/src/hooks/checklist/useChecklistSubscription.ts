import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabaseClient';
import { rowToChecklistItem, type ChecklistItem } from '@lib/checklist';
import { withDisplayStatus } from '@lib/checklistStatus';
import type { ChecklistItemPatch } from '@api/checklist/checklist.types';
import type { ChecklistItemRow } from '@lib/supabaseTables';

interface UseChecklistSubscriptionResult {
  items: ChecklistItem[];
  isSubscribed: boolean;
  error: string | null;
  patchItem: (id: string, patch: ChecklistItemPatch) => void;
}

export type { ChecklistItemPatch } from '@api/checklist/checklist.types';

function itemFromRealtimeRow(row: ChecklistItemRow, checklistDate: string): ChecklistItem {
  return withDisplayStatus(rowToChecklistItem(row), checklistDate);
}

export function useChecklistSubscription(
  checklistId: string,
  checklistDate: string,
  initialItems: ChecklistItem[],
  onItemsChange?: (items: ChecklistItem[]) => void,
): UseChecklistSubscriptionResult {
  const [items, setItems] = useState(initialItems);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const applyDisplayStatus = useCallback(
    (list: ChecklistItem[]) => list.map((item) => withDisplayStatus(item, checklistDate)),
    [checklistDate],
  );

  const commitItems = useCallback(
    (updater: (prev: ChecklistItem[]) => ChecklistItem[]) => {
      setItems((prev) => {
        const next = updater(prev);
        onItemsChange?.(next);
        return next;
      });
    },
    [onItemsChange],
  );

  const patchItem = useCallback(
    (id: string, patch: ChecklistItemPatch) => {
      commitItems((prev) =>
        applyDisplayStatus(prev.map((item) => (item.id === id ? { ...item, ...patch } : item))),
      );
    },
    [applyDisplayStatus, commitItems],
  );

  useEffect(() => {
    if (!checklistId) return;

    setIsSubscribed(false);
    setError(null);

    const channel = supabase
      .channel(`checklist-${checklistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items',
          filter: `checklist_id=eq.${checklistId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const row = payload.new as ChecklistItemRow;
            commitItems((prev) =>
              applyDisplayStatus(
                prev.map((item) =>
                  item.id === row.id ? itemFromRealtimeRow(row, checklistDate) : item,
                ),
              ),
            );
            return;
          }

          if (payload.eventType === 'INSERT') {
            const row = payload.new as ChecklistItemRow;
            const inserted = withDisplayStatus(rowToChecklistItem(row), checklistDate);
            commitItems((prev) => {
              if (prev.some((item) => item.id === inserted.id)) {
                return applyDisplayStatus(prev);
              }
              return applyDisplayStatus([...prev, inserted]);
            });
            return;
          }

          if (payload.eventType === 'DELETE') {
            commitItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsSubscribed(true);
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsSubscribed(false);
          setError('Lost real-time connection. Refresh to reconnect.');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [checklistId, checklistDate, applyDisplayStatus, commitItems]);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => applyDisplayStatus(prev));
    }, 60_000);
    return () => clearInterval(interval);
  }, [applyDisplayStatus]);

  return { items, isSubscribed, error, patchItem };
}
