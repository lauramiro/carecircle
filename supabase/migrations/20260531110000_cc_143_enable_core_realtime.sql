/*
 * CC-143: Enable Supabase Realtime for core care tables used by dashboard and journal live updates.
 * Uses conditional ADD so CC-152 (weekly_shift_assignments) can merge without conflict.
 */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'medication_logs'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.medication_logs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'handover_journal_entries'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.handover_journal_entries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'weekly_shift_assignments'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.weekly_shift_assignments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'patient_wellbeing_checkins'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.patient_wellbeing_checkins;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.appointments;
  END IF;
END $$;

ALTER TABLE public.medication_logs REPLICA IDENTITY FULL;
ALTER TABLE public.handover_journal_entries REPLICA IDENTITY FULL;
ALTER TABLE public.weekly_shift_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.patient_wellbeing_checkins REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
