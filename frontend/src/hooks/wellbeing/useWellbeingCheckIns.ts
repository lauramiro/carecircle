import { useEffect, useMemo, useState } from 'react';
import {
  createWellbeingCheckIn,
  getCurrentUserWellbeingCheckIns,
  getCurrentWeekStartIso,
  isCurrentUserPrimaryCarer,
} from '../../api/wellbeing/wellbeing.service';
import type {
  CreateWellbeingCheckInInput,
  WellbeingCheckIn,
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
  submitCheckIn: (input: CreateWellbeingCheckInInput) => Promise<void>;
}

export function useWellbeingCheckIns(): UseWellbeingCheckInsResult {
  const [checkIns, setCheckIns] = useState<WellbeingCheckIn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrimaryCarer, setIsPrimaryCarer] = useState(false);

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

  return {
    checkIns,
    error,
    isLoading,
    isSubmitting,
    isPrimaryCarer,
    hasCurrentWeekCheckIn,
    canSubmitCheckIn: isPrimaryCarer && !hasCurrentWeekCheckIn,
    submitCheckIn,
  };
}