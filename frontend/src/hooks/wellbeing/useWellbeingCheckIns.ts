import { useEffect, useMemo, useState } from 'react';
import {
  createWellbeingCheckIn,
  dismissWellbeingSupportMessage,
  getActiveWellbeingSupportTrigger,
  getCurrentUserWellbeingCheckIns,
  getCurrentWeekStartIso,
  isCurrentUserPrimaryCarer,
} from '../../api/wellbeing/wellbeing.service';
import type {
  CreateWellbeingCheckInInput,
  WellbeingCheckIn,
  WellbeingSupportTrigger,
} from '../../api/wellbeing/wellbeing.types';
import { getErrorMessage } from '../../utils/helper';

interface UseWellbeingCheckInsResult {
  checkIns: WellbeingCheckIn[];
  error: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  isPrimaryCarer: boolean;
  hasCurrentWeekCheckIn: boolean;
  canSubmitCheckIn: boolean;
  supportTrigger: WellbeingSupportTrigger | null;
  isDismissingSupportMessage: boolean;
  submitCheckIn: (input: CreateWellbeingCheckInInput) => Promise<void>;
  dismissSupportMessage: () => Promise<void>;
}

export function useWellbeingCheckIns(): UseWellbeingCheckInsResult {
  const [checkIns, setCheckIns] = useState<WellbeingCheckIn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrimaryCarer, setIsPrimaryCarer] = useState(false);
  const [isDismissingSupportMessage, setIsDismissingSupportMessage] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCheckIns() {
      try {
        setIsLoading(true);
        setError(null);

        const eligible = await isCurrentUserPrimaryCarer();
        if (!active) return;

        setIsPrimaryCarer(eligible);

        if (!eligible) {
          setCheckIns([]);
          return;
        }

        const nextCheckIns = await getCurrentUserWellbeingCheckIns();
        if (!active) return;
        setCheckIns(nextCheckIns);
      } catch (nextError) {
        if (!active) return;
        setError(getErrorMessage(nextError) || 'Unable to load wellbeing check-ins.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadCheckIns();

    return () => {
      active = false;
    };
  }, []);

  const hasCurrentWeekCheckIn = useMemo(() => {
    const currentWeekStart = getCurrentWeekStartIso();
    return checkIns.some((checkIn) => checkIn.weekStart === currentWeekStart);
  }, [checkIns]);

  const supportTrigger = useMemo(
    () => getActiveWellbeingSupportTrigger(checkIns),
    [checkIns],
  );

  async function submitCheckIn(input: CreateWellbeingCheckInInput) {
    setIsSubmitting(true);
    try {
      const createdCheckIn = await createWellbeingCheckIn(input);
      setCheckIns((currentCheckIns) => [createdCheckIn, ...currentCheckIns]);
      setError(null);
    } catch (nextError) {
      const message = getErrorMessage(nextError) || 'Unable to submit wellbeing check-in.';
      setError(message);
      throw nextError;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function dismissSupportMessage() {
    if (!supportTrigger) return;

    setIsDismissingSupportMessage(true);
    try {
      const dismissedAt = new Date().toISOString();
      await dismissWellbeingSupportMessage(supportTrigger.checkInId);
      setCheckIns((currentCheckIns) =>
        currentCheckIns.map((checkIn) =>
          checkIn.id === supportTrigger.checkInId
            ? { ...checkIn, supportMessageDismissedAt: dismissedAt }
            : checkIn,
        ),
      );
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError) || 'Unable to dismiss wellbeing support message.');
      throw nextError;
    } finally {
      setIsDismissingSupportMessage(false);
    }
  }

  return {
    checkIns,
    error,
    isLoading,
    isSubmitting,
    isPrimaryCarer,
    hasCurrentWeekCheckIn,
    canSubmitCheckIn: isPrimaryCarer && !hasCurrentWeekCheckIn,
    supportTrigger,
    isDismissingSupportMessage,
    submitCheckIn,
    dismissSupportMessage,
  };
}