import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@lib/supabaseClient';
import { fetchTodayShifts, type ShiftAssignmentWithCarer } from '@api/shifts/shifts.service';
import {
  currentDayMinutes,
  isShiftSlotActive,
  parseShiftSlotBounds,
  shiftEndDisplay,
} from '@lib/shifts';

export interface OnDutyCarerState {
  carerName: string | null;
  shiftEnd: string | null;
  noCarerAssigned: boolean;
  loading: boolean;
  error: string | null;
}

export function useOnDutyCarer(groupId: string): OnDutyCarerState {
  const [shifts, setShifts] = useState<ShiftAssignmentWithCarer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState(() => currentDayMinutes());

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetchTodayShifts(groupId)
      .then((rows) => { if (active) setShifts(rows); })
      .catch(() => { if (active) setError('Failed to load shift data.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`dashboard-shifts-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_shift_assignments', filter: `group_id=eq.${groupId}` },
        () => {
          // Refetch on any change rather than patching state — shift assignments are infrequent.
          fetchTodayShifts(groupId)
            .then(setShifts)
            .catch(() => { /* non-fatal; keep stale data */ });
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [groupId]);

  // Re-evaluate the active slot every minute so the widget updates at shift transitions.
  useEffect(() => {
    const id = setInterval(() => setNowMin(currentDayMinutes()), 60_000);
    return () => clearInterval(id);
  }, []);

  const currentShift = useMemo<ShiftAssignmentWithCarer | null>(() => {
    const active = shifts.filter(
      (s) => s.assignedCaregiverId !== null && isShiftSlotActive(s.shiftSlot, nowMin),
    );
    if (!active.length) return null;
    // When multiple shifts overlap, use the one that started most recently (latest startMin).
    return [...active].sort((a, b) => {
      const aStart = parseShiftSlotBounds(a.shiftSlot)?.startMin ?? 0;
      const bStart = parseShiftSlotBounds(b.shiftSlot)?.startMin ?? 0;
      return bStart - aStart;
    })[0];
  }, [shifts, nowMin]);

  return {
    carerName: currentShift?.carerName ?? null,
    shiftEnd: currentShift ? shiftEndDisplay(currentShift.shiftSlot) : null,
    noCarerAssigned: !loading && !error && !currentShift,
    loading,
    error,
  };
}
