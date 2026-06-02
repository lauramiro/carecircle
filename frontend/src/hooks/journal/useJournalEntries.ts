import { useCallback, useEffect, useState } from 'react';
import {
  createJournalEntry,
  getJournalEntriesByGroup,
  updateJournalEntry,
} from '../../api/journal/journal.service';
import type { JournalEntry } from '../../api/journal/journal.types';
import { useSupabaseRealtime } from '../realtime/useSupabaseRealtime';

interface UseJournalEntriesResult {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  isSubmitting: boolean;
  updatingEntryId: string | null;
  addEntry: (content: string) => Promise<void>;
  editEntry: (entryId: string, content: string) => Promise<void>;
}

export function useJournalEntries(groupId: string | undefined): UseJournalEntriesResult {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingEntryId, setUpdatingEntryId] = useState<string | null>(null);

  const loadEntries = useCallback(async (options?: { silent?: boolean }) => {
    if (!groupId) {
      setEntries([]);
      setError('Group ID is missing.');
      setLoading(false);
      return;
    }

    try {
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }
      const result = await getJournalEntriesByGroup(groupId);
      setEntries(result);
    } catch {
      if (!options?.silent) {
        setError('Unable to load handover journal entries. Please try again.');
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const refreshFromRealtime = useCallback(() => {
    void loadEntries({ silent: true });
  }, [loadEntries]);

  useSupabaseRealtime({
    channelName: groupId ? `journal-${groupId}` : 'journal-disabled',
    table: 'handover_journal_entries',
    filter: groupId ? `group_id=eq.${groupId}` : undefined,
    enabled: Boolean(groupId),
    onInsert: refreshFromRealtime,
    onUpdate: refreshFromRealtime,
    onDelete: refreshFromRealtime,
  });

  async function addEntry(content: string) {
    if (!groupId) throw new Error('Group ID is missing.');

    setIsSubmitting(true);
    try {
      const createdEntry = await createJournalEntry(groupId, content);
      setEntries((currentEntries) => [createdEntry, ...currentEntries]);
      setError(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function editEntry(entryId: string, content: string) {
    setUpdatingEntryId(entryId);
    try {
      const updatedEntry = await updateJournalEntry(entryId, content);
      setEntries((currentEntries) =>
        currentEntries.map((entry) => (entry.id === entryId ? updatedEntry : entry)),
      );
      setError(null);
    } finally {
      setUpdatingEntryId(null);
    }
  }

  return { entries, loading, error, isSubmitting, updatingEntryId, addEntry, editEntry };
}