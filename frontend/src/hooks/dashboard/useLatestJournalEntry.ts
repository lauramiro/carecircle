import { useEffect, useState } from 'react';
import { getLatestJournalEntry } from '../../api/journal/journal.service';
import type { JournalEntry } from '../../api/journal/journal.types';

interface UseLatestJournalEntryResult {
  entry: JournalEntry | null;
  loading: boolean;
  error: string | null;
}

export function useLatestJournalEntry(groupId: string): UseLatestJournalEntryResult {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getLatestJournalEntry(groupId)
      .then(data => { if (active) setEntry(data); })
      .catch(() => { if (active) setError('Failed to load journal entry.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [groupId]);

  return { entry, loading, error };
}
