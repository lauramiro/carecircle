import { useEffect, useMemo, useState } from 'react';
import { enrichAllWithHandover } from '../../api/shifts/shift.handover';
import {
  getShiftAssignmentsForRange,
} from '../../api/shifts/shift.service';
import type { ShiftWithHandover } from '../../api/shifts/shift.types';
import { toISODate } from '../../api/shifts/shift.utils';
import { toLocalDateString } from '../../lib/dates';

interface UseMyShiftsResult {
  todayShifts: ShiftWithHandover[];
  upcomingShifts: ShiftWithHandover[];
  historyShifts: ShiftWithHandover[];
  loading: boolean;
  error: string | null;
}

export function useMyShifts(
  caregiverId: string | undefined,
  groupId: string | undefined,
): UseMyShiftsResult {
  const [allShifts, setAllShifts] = useState<ShiftWithHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = toLocalDateString();

  useEffect(() => {
    let active = true;

    async function loadShifts() {
      if (!caregiverId || !groupId) {
        setAllShifts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const pastStart = new Date(`${today}T12:00:00.000Z`);
        pastStart.setUTCDate(pastStart.getUTCDate() - 30);
        const futureEnd = new Date(`${today}T12:00:00.000Z`);
        futureEnd.setUTCDate(futureEnd.getUTCDate() + 30);

        const [rangeAssignments] = await Promise.all([
          getShiftAssignmentsForRange(groupId, toISODate(pastStart), toISODate(futureEnd)),
        ]);

        if (!active) return;
        const enriched = enrichAllWithHandover(rangeAssignments);
        setAllShifts(enriched.filter((shift) => shift.assignedCaregiverId === caregiverId));
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error ? loadError.message : 'Unable to load your shifts',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadShifts();

    return () => {
      active = false;
    };
  }, [caregiverId, groupId, today]);

  const { todayShifts, upcomingShifts, historyShifts } = useMemo(() => {
    const todayList = allShifts.filter((shift) => shift.shiftDate === today);
    const upcoming = allShifts.filter((shift) => shift.shiftDate > today);
    const history = allShifts.filter((shift) => shift.shiftDate < today);
    return {
      todayShifts: todayList,
      upcomingShifts: upcoming,
      historyShifts: history.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate)),
    };
  }, [allShifts, today]);

  return { todayShifts, upcomingShifts, historyShifts, loading, error };
}
