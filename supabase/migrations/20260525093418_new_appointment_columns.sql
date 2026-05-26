ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence_rule       text,
  ADD COLUMN IF NOT EXISTS recurrence_series_id  uuid;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_recurrence_rule_check
    CHECK (recurrence_rule IN ('weekly', 'fortnightly', 'monthly'));

CREATE INDEX IF NOT EXISTS idx_appointments_series
  ON public.appointments (recurrence_series_id)
  WHERE recurrence_series_id IS NOT NULL;