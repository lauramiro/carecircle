ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_offsets integer[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'reminders_sent_offsets'
  ) THEN
    UPDATE public.appointments
    SET reminder_offsets = reminders_sent_offsets
    WHERE reminder_offsets = '{}'
      AND reminders_sent_offsets IS NOT NULL
      AND reminders_sent_offsets <> '{}';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
