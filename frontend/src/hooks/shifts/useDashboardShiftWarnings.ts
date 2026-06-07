import { useEffect, useState } from 'react';
import { getWeeklyShiftWarnings } from '../../api/shifts/shift.service';
import type { ShiftWarningSummary } from '../../api/shifts/shift.types';

interface UseDashboardShiftWarningsResult {
  warnings: ShiftWarningSummary[];
  loading: boolean;
  error: string | null;
}

export function useDashboardShiftWarnings(): UseDashboardShiftWarningsResult {
  const [warnings, setWarnings] = useState<ShiftWarningSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadWarnings() {
      try {
        setLoading(true);
        setError(null);
        const nextWarnings = await getWeeklyShiftWarnings();
        if (!active) return;
        setWarnings(nextWarnings);
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load weekly shift warnings',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadWarnings();

    return () => {
      active = false;
    };
  }, []);

  return { warnings, loading, error };
}