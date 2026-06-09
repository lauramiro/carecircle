import { useEffect, useMemo, useState } from 'react';
import { enrichAllWithHandover } from '../../api/shifts/shift.handover';
import { getShiftAssignmentsForRange } from '../../api/shifts/shift.service';
import type { ShiftWithHandover } from '../../api/shifts/shift.types';
import { toISODate } from '../../api/shifts/shift.utils';
import { toLocalDateString } from '../../lib/dates';

export interface MyShiftsGroup {
  id: string;
  name: string;
}

export interface ShiftsByGroup {
  groupId: string;
  groupName: string;
  shifts: ShiftWithHandover[];
}

interface UseMyShiftsResult {
  todayShifts: ShiftWithHandover[];
  todayByGroup: ShiftsByGroup[];
  upcomingShifts: ShiftWithHandover[];
  upcomingByGroup: ShiftsByGroup[];
  historyShifts: ShiftWithHandover[];
  historyByGroup: ShiftsByGroup[];
  loading: boolean;
  error: string | null;
}

function buildShiftsByGroup(
  groups: MyShiftsGroup[],
  shifts: ShiftWithHandover[],
  filter: (shift: ShiftWithHandover) => boolean,
): ShiftsByGroup[] {
  return groups
    .map((group) => ({
      groupId: group.id,
      groupName: group.name,
      shifts: shifts.filter((shift) => shift.groupId === group.id && filter(shift)),
    }))
    .filter((section) => section.shifts.length > 0);
}

export function useMyShifts(
  caregiverId: string | undefined,
  groups: MyShiftsGroup[],
): UseMyShiftsResult {
  const [allShifts, setAllShifts] = useState<ShiftWithHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = toLocalDateString();
  const groupKey = groups.map((group) => group.id).join(',');

  useEffect(() => {
    let active = true;

    async function loadShifts() {
      if (!caregiverId || groups.length === 0) {
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
        const rangeStart = toISODate(pastStart);
        const rangeEnd = toISODate(futureEnd);

        const assignmentsByGroup = await Promise.all(
          groups.map((group) => getShiftAssignmentsForRange(group.id, rangeStart, rangeEnd)),
        );

        if (!active) return;

        const mine = assignmentsByGroup.flatMap((assignments) =>
          enrichAllWithHandover(assignments).filter(
            (shift) => shift.assignedCaregiverId === caregiverId,
          ),
        );

        setAllShifts(mine);
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
  }, [caregiverId, groupKey, today]);

  const { todayShifts, upcomingShifts, historyShifts, todayByGroup, upcomingByGroup, historyByGroup } =
    useMemo(() => {
      const todayList = allShifts.filter((shift) => shift.shiftDate === today);
      const upcoming = allShifts.filter((shift) => shift.shiftDate > today);
      const history = allShifts
        .filter((shift) => shift.shiftDate < today)
        .sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));

      return {
        todayShifts: todayList,
        upcomingShifts: upcoming,
        historyShifts: history,
        todayByGroup: buildShiftsByGroup(groups, allShifts, (shift) => shift.shiftDate === today),
        upcomingByGroup: buildShiftsByGroup(groups, allShifts, (shift) => shift.shiftDate > today),
        historyByGroup: buildShiftsByGroup(groups, history, () => true),
      };
    }, [allShifts, groups, today]);

  return {
    todayShifts,
    todayByGroup,
    upcomingShifts,
    upcomingByGroup,
    historyShifts,
    historyByGroup,
    loading,
    error,
  };
}
