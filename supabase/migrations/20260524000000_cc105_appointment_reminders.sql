-- CC-105: Appointment push reminders
-- Tracks which reminder offsets (in minutes) have already been dispatched
-- so the cron job is idempotent across restarts.
-- push_subscriptions table is created by CC-16's migration with the full schema.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminders_sent_offsets integer[] NOT NULL DEFAULT '{}';
