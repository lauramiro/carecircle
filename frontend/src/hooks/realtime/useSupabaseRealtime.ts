import { useEffect, useRef, useState } from 'react';
import { supabase } from '@lib/supabaseClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;

export type RealtimeChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

export interface UseSupabaseRealtimeOptions {
  channelName: string;
  table: string;
  filter?: string;
  enabled?: boolean;
  onInsert?: (payload: RealtimeChangePayload) => void;
  onUpdate?: (payload: RealtimeChangePayload) => void;
  onDelete?: (payload: RealtimeChangePayload) => void;
}

export interface UseSupabaseRealtimeResult {
  isSubscribed: boolean;
  error: string | null;
}

export function useSupabaseRealtime({
  channelName,
  table,
  filter,
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
}: UseSupabaseRealtimeOptions): UseSupabaseRealtimeResult {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handlersRef = useRef({ onInsert, onUpdate, onDelete });
  handlersRef.current = { onInsert, onUpdate, onDelete };

  useEffect(() => {
    if (!enabled || !channelName || !table) {
      setIsSubscribed(false);
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const removeChannel = () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setError('Lost real-time connection. Refresh to reconnect.');
        return;
      }

      reconnectAttempts += 1;
      const delay = BASE_BACKOFF_MS * 2 ** (reconnectAttempts - 1);
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => {
        removeChannel();
        subscribe();
      }, delay);
    };

    const subscribe = () => {
      if (cancelled) return;

      setIsSubscribed(false);

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filter ? { filter } : {}),
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              handlersRef.current.onInsert?.(payload as RealtimeChangePayload);
              return;
            }
            if (payload.eventType === 'UPDATE') {
              handlersRef.current.onUpdate?.(payload as RealtimeChangePayload);
              return;
            }
            if (payload.eventType === 'DELETE') {
              handlersRef.current.onDelete?.(payload as RealtimeChangePayload);
            }
          },
        )
        .subscribe((status) => {
          if (cancelled) return;

          if (status === 'SUBSCRIBED') {
            setIsSubscribed(true);
            setError(null);
            reconnectAttempts = 0;
          }

          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsSubscribed(false);
            scheduleReconnect();
          }
        });
    };

    subscribe();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      removeChannel();
    };
  }, [channelName, table, filter, enabled]);

  return { isSubscribed, error };
}
