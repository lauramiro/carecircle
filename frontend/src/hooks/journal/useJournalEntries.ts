import { useEffect, useState } from 'react';
import { createJournalEntry, getJournalEntriesByGroup } from '../../api/journal/journal.service';
import type { JournalEntry } from '../../api/journal/journal.types';

interface UseJournalEntriesResult {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  isSubmitting: boolean;
  addEntry: (content: string) => Promise<void>;
}

export function useJournalEntries(groupId: string | undefined): UseJournalEntriesResult {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadEntries() {
      if (!groupId) {
        setEntries([]);
        setError('Group ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await getJournalEntriesByGroup(groupId);
        if (!active) return;
        setEntries(result);
      } catch {
        if (active) setError('Unable to load handover journal entries. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEntries();

    return () => {
      active = false;
    };
  }, [groupId]);

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

  return { entries, loading, error, isSubmitting, addEntry };
}