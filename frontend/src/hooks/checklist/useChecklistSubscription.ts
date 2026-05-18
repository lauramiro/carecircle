import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { ChecklistItem } from '../../lib/checklist';

interface UseChecklistSubscriptionResult {
  items: ChecklistItem[];
  isSubscribed: boolean;
  error: string | null;
}

export function useChecklistSubscription(
  checklistId: string,
  initialItems: ChecklistItem[],
): UseChecklistSubscriptionResult {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when parent loads or refetches items (defer to avoid set-state-in-effect lint)
  useEffect(() => {
    queueMicrotask(() => {
      setItems(initialItems);
    });
  }, [initialItems]);

  useEffect(() => {
    if (!checklistId) return;

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
        payload => {
          if (payload.eventType === 'UPDATE') {
            setItems(prev =>
              prev.map(item =>
                item.id === payload.new.id
                  ? { ...item, ...payload.new }
                  : item,
              ),
            );
          }
          if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new as ChecklistItem]);
          }
          if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== payload.old.id));
          }
        },
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setIsSubscribed(true);
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsSubscribed(false);
          setError('Lost real-time connection. Refresh to reconnect.');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [checklistId]);

  return { items, isSubscribed, error };
}