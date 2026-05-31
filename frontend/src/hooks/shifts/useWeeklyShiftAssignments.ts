import { useEffect, useState } from 'react';
import {
  getWeeklyShiftAssignments,
  saveWeeklyShiftAssignment,
} from '../../api/shifts/shift.service';
import type {
  SaveWeeklyShiftAssignmentPayload,
  WeeklyShiftAssignment,
} from '../../api/shifts/shift.types';
import { getAssignmentKey } from '../../api/shifts/shift.utils';

interface UseWeeklyShiftAssignmentsResult {
  assignments: WeeklyShiftAssignment[];
  loading: boolean;
  error: string | null;
  savingKey: string | null;
  saveAssignment: (payload: SaveWeeklyShiftAssignmentPayload) => Promise<void>;
}

export function useWeeklyShiftAssignments(
  groupId: string | undefined,
  weekStart: string,
): UseWeeklyShiftAssignmentsResult {
  const [assignments, setAssignments] = useState<WeeklyShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAssignments() {
      if (!groupId) {
        setAssignments([]);
        setError('Group ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const nextAssignments = await getWeeklyShiftAssignments(groupId, weekStart);
        if (!active) return;
        setAssignments(nextAssignments);
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load weekly shift assignments',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAssignments();

    return () => {
      active = false;
    };
  }, [groupId, weekStart]);

  async function saveAssignment(payload: SaveWeeklyShiftAssignmentPayload) {
    const assignmentKey = getAssignmentKey(payload.shiftDate, payload.slot);

    try {
      setSavingKey(assignmentKey);
      setError(null);
      const savedAssignment = await saveWeeklyShiftAssignment(payload);
      setAssignments((currentAssignments) => currentAssignments.map((assignment) => {
        return getAssignmentKey(assignment.shiftDate, assignment.slot) === assignmentKey
          ? savedAssignment
          : assignment;
      }));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save the shift assignment',
      );
      throw saveError;
    } finally {
      setSavingKey(null);
    }
  }

  return { assignments, loading, error, savingKey, saveAssignment };
}