import { useCallback, useEffect, useState } from 'react';
import { getLatestJournalEntry } from '../../api/journal/journal.service';
import type { JournalEntry } from '../../api/journal/journal.types';
import { useSupabaseRealtime } from '../realtime/useSupabaseRealtime';

interface UseLatestJournalEntryResult {
  entry: JournalEntry | null;
  loading: boolean;
  error: string | null;
}

export function useLatestJournalEntry(groupId: string): UseLatestJournalEntryResult {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async (options?: { silent?: boolean }) => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await getLatestJournalEntry(groupId);
      setEntry(data);
    } catch {
      if (!options?.silent) setError('Failed to load journal entry.');
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  const refreshFromRealtime = useCallback(() => {
    void loadLatest({ silent: true });
  }, [loadLatest]);

  useSupabaseRealtime({
    channelName: groupId ? `dashboard-journal-${groupId}` : 'dashboard-journal-disabled',
    table: 'handover_journal_entries',
    filter: groupId ? `group_id=eq.${groupId}` : undefined,
    enabled: Boolean(groupId),
    onInsert: refreshFromRealtime,
    onUpdate: refreshFromRealtime,
    onDelete: refreshFromRealtime,
  });

  return { entry, loading, error };
}
