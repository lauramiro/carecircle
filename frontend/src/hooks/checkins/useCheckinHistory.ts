import { useCallback, useEffect, useState } from 'react';
import { getCheckinHistory } from '../../api/checkins/checkins.service';
import type { WellbeingCheckin } from '../../api/checkins/checkins.types';

export type HistoryWindow = 7 | 30;

export interface UseCheckinHistoryResult {
  checkins: WellbeingCheckin[];
  loading: boolean;
  error: string | null;
  days: HistoryWindow;
  setDays: (w: HistoryWindow) => void;
  /** Total number of check-ins in the current window */
  count: number;
}

export function useCheckinHistory(
  patientId: string,
  groupId: string,
): UseCheckinHistoryResult {
  const [checkins, setCheckins] = useState<WellbeingCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<HistoryWindow>(7);

  const load = useCallback(
    async (days: HistoryWindow, signal: AbortSignal) => {
      if (!patientId || !groupId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await getCheckinHistory(patientId, groupId, days);
        if (signal.aborted) return;
        setCheckins(result);
      } catch (err) {
        if (signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [patientId, groupId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(days, controller.signal);
    return () => controller.abort();
  }, [load, days]);

  return {
    checkins,
    loading,
    error,
    days,
    setDays,
    count: checkins.length,
  };
}
