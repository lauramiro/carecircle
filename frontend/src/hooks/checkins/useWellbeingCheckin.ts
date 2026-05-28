import { useCallback, useEffect, useState } from 'react';
import { getTodayCheckin, upsertCheckin } from '../../api/checkins/checkins.service';
import type { UpsertCheckinPayload, WellbeingCheckin } from '../../api/checkins/checkins.types';

/** Returns today's date as a local ISO date string (YYYY-MM-DD) */
function getLocalIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface UseWellbeingCheckinResult {
  /** Today's existing check-in, or null if none yet */
  todayCheckin: WellbeingCheckin | null;
  /** Whether the initial load is in progress */
  loading: boolean;
  /** Whether a save/upsert is in flight */
  isSubmitting: boolean;
  /** True when a check-in already exists and the user is trying to overwrite it */
  showOverwritePrompt: boolean;
  /** The local calendar date string (YYYY-MM-DD) being used for today */
  todayDate: string;
  /**
   * Attempt to save a check-in.
   * If a check-in already exists for today, sets showOverwritePrompt = true
   * instead of immediately saving. Call confirmOverwrite() to proceed.
   */
  submitCheckin: (payload: Omit<UpsertCheckinPayload, 'caregiverId' | 'checkinDate'>) => void;
  /** Proceed with overwriting the existing check-in */
  confirmOverwrite: () => Promise<void>;
  /** Dismiss the overwrite prompt without saving */
  cancelOverwrite: () => void;
}

export function useWellbeingCheckin(
  patientId: string,
  groupId: string,
  caregiverId: string,
): UseWellbeingCheckinResult {
  const todayDate = getLocalIsoDate();
  const [todayCheckin, setTodayCheckin] = useState<WellbeingCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);

  // Pending payload held in state while the user decides whether to overwrite
  const [pendingPayload, setPendingPayload] = useState<UpsertCheckinPayload | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTodayCheckin() {
      if (!patientId || !groupId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const existing = await getTodayCheckin(patientId, todayDate);
        if (active) setTodayCheckin(existing);
      } catch {
        // Non-critical: if the load fails, treat as no check-in yet
        if (active) setTodayCheckin(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTodayCheckin();
    return () => { active = false; };
  }, [patientId, groupId, todayDate]);

  const submitCheckin = useCallback(
    (partial: Omit<UpsertCheckinPayload, 'caregiverId' | 'checkinDate'>) => {
      const full: UpsertCheckinPayload = {
        ...partial,
        caregiverId,
        checkinDate: todayDate,
      };

      if (todayCheckin !== null) {
        // A check-in already exists — ask the user to confirm before overwriting
        setPendingPayload(full);
        setShowOverwritePrompt(true);
        return;
      }

      // No existing check-in, proceed immediately
      void performUpsert(full);
    },
    [caregiverId, todayDate, todayCheckin], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const performUpsert = useCallback(async (payload: UpsertCheckinPayload) => {
    setIsSubmitting(true);
    try {
      const saved = await upsertCheckin(payload);
      setTodayCheckin(saved);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const confirmOverwrite = useCallback(async () => {
    if (!pendingPayload) return;
    setShowOverwritePrompt(false);
    await performUpsert(pendingPayload);
    setPendingPayload(null);
  }, [pendingPayload, performUpsert]);

  const cancelOverwrite = useCallback(() => {
    setShowOverwritePrompt(false);
    setPendingPayload(null);
  }, []);

  return {
    todayCheckin,
    loading,
    isSubmitting,
    showOverwritePrompt,
    todayDate,
    submitCheckin,
    confirmOverwrite,
    cancelOverwrite,
  };
}
