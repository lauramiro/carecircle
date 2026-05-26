import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@lib/supabaseClient';
import { rowToChecklistItem, type ChecklistItem } from '@lib/checklist';
import type { ChecklistItemPatch } from '@api/checklist/checklist.types';
import type { ChecklistItemRow } from '@lib/supabaseTables';

interface UseChecklistSubscriptionResult {
  items: ChecklistItem[];
  isSubscribed: boolean;
  error: string | null;
  patchItem: (id: string, patch: ChecklistItemPatch) => void;
}

export type { ChecklistItemPatch } from '@api/checklist/checklist.types';

function itemFromRealtimeRow(row: ChecklistItemRow): ChecklistItem {
  return rowToChecklistItem(row);
}

export function useChecklistSubscription(
  checklistId: string,
  _checklistDate: string,
  initialItems: ChecklistItem[],
  onItemsChange?: (items: ChecklistItem[]) => void,
): UseChecklistSubscriptionResult {
  const [items, setItems] = useState(initialItems);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(initialItems);
  const onItemsChangeRef = useRef(onItemsChange);

  onItemsChangeRef.current = onItemsChange;

  useEffect(() => {
    itemsRef.current = initialItems;
    setItems(initialItems);
  }, [initialItems]);

  const commitItems = useCallback((updater: (prev: ChecklistItem[]) => ChecklistItem[]) => {
    const next = updater(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
    onItemsChangeRef.current?.(next);
  }, []);

  const patchItem = useCallback(
    (id: string, patch: ChecklistItemPatch) => {
      commitItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [commitItems],
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
              prev.map((item) =>
                item.id === row.id ? itemFromRealtimeRow(row) : item,
              ),
            );
            return;
          }

          if (payload.eventType === 'INSERT') {
            const row = payload.new as ChecklistItemRow;
            const inserted = itemFromRealtimeRow(row);
            commitItems((prev) => {
              if (prev.some((item) => item.id === inserted.id)) {
                return prev;
              }
              return [...prev, inserted];
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
  }, [checklistId, commitItems]);

  return { items, isSubscribed, error, patchItem };
}
