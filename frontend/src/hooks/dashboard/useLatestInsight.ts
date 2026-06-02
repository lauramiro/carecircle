import { useCallback, useEffect, useState } from 'react';
import { getLatestInsightForPatient } from '../../api/insights/insights.service';
import type { AiInsight } from '../../api/insights/insights.types';
import { useAuth } from '../../contexts/AuthContext';

function storageKey(userId: string): string {
  return `carecircle:dismissed-insights:${userId}`;
}

function loadDismissed(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(parsed)) return new Set<string>(parsed as string[]);
  } catch {
    // corrupted entry — ignore
  }
  return new Set<string>();
}

function saveDismissed(userId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
  } catch {
    // storage full or unavailable — fail silently
  }
}

interface UseLatestInsightResult {
  insight: AiInsight | null;
  loading: boolean;
  error: string | null;
  dismiss: (id: string) => void;
}

export function useLatestInsight(patientId: string): UseLatestInsightResult {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [rawInsight, setRawInsight] = useState<AiInsight | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dismissed IDs from localStorage once userId is known
  useEffect(() => {
    if (userId) {
      setDismissed(loadDismissed(userId));
    }
  }, [userId]);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getLatestInsightForPatient(patientId)
      .then(data => { if (active) setRawInsight(data); })
      .catch(() => { if (active) setError('Failed to load insight.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [patientId]);

  const dismiss = useCallback((id: string) => {
    if (!userId) return;
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(userId, next);
      return next;
    });
  }, [userId]);

  // If the latest insight has been dismissed, show nothing
  const insight = rawInsight && !dismissed.has(rawInsight.id) ? rawInsight : null;

  return { insight, loading, error, dismiss };
}
