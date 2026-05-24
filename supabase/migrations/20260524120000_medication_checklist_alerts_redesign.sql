-- Medication schedule → checklist materialization → overdue → push → SMS redesign
-- See: medication_schedule_checklist_push_notification_sms_alert_design.md

-- ---------------------------------------------------------------------------
-- 1. Medications: course bounds + materialization cursor
-- ---------------------------------------------------------------------------

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS perpetual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_doses integer,
  ADD COLUMN IF NOT EXISTS materialization_cursor_at timestamptz;

COMMENT ON COLUMN public.medications.perpetual IS
  'When true, medication has no fixed end_date/total_doses; checklist rows are rolled forward via checklist_schedule.';
COMMENT ON COLUMN public.medications.total_doses IS
  'Planned total scheduled dose slots for finite courses. Does not decrement on Given.';
COMMENT ON COLUMN public.medications.materialization_cursor_at IS
  'Next scheduled_at to materialize when batching checklist_items (>100 cap).';

-- Backfill course bounds for existing scheduled medications
UPDATE public.medications
SET perpetual = true
WHERE schedule_type IS DISTINCT FROM 'as_needed'
  AND perpetual = false
  AND end_date IS NULL
  AND total_doses IS NULL;

ALTER TABLE public.medications DROP CONSTRAINT IF EXISTS medications_course_bounds_check;

ALTER TABLE public.medications
  ADD CONSTRAINT medications_course_bounds_check CHECK (
    schedule_type = 'as_needed'
    OR perpetual = true
    OR end_date IS NOT NULL
    OR total_doses IS NOT NULL
  );

-- Align status values with application (archived/superseded used in frontend)
ALTER TABLE public.medications DROP CONSTRAINT IF EXISTS medications_status_check;

ALTER TABLE public.medications
  ADD CONSTRAINT medications_status_check CHECK (
    status = ANY (ARRAY['active', 'paused', 'archived', 'superseded', 'discontinued'])
  );

-- ---------------------------------------------------------------------------
-- 2. Timezone on care_group (fix legacy timestamptz column if present)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'care_group'
      AND column_name = 'preferred_timezone'
      AND udt_name = 'timestamptz'
  ) THEN
    ALTER TABLE public.care_group
      ALTER COLUMN preferred_timezone TYPE text
      USING 'UTC';
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'care_group'
      AND column_name = 'preferred_timezone'
  ) THEN
    ALTER TABLE public.care_group
      ADD COLUMN preferred_timezone text NOT NULL DEFAULT 'UTC';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Checklist items: canonical scheduled instant + archival
-- ---------------------------------------------------------------------------

ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.care_group(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Expand status to include archived (soft-remove future slots on schedule change)
ALTER TABLE public.checklist_items DROP CONSTRAINT IF EXISTS checklist_items_status_check;

ALTER TABLE public.checklist_items
  ADD CONSTRAINT checklist_items_status_check CHECK (
    status::text = ANY (ARRAY['due', 'given', 'overdue', 'skipped', 'archived'])
  );

CREATE INDEX IF NOT EXISTS idx_checklist_items_scheduled_at
  ON public.checklist_items (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_checklist_items_group_scheduled_at
  ON public.checklist_items (group_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_checklist_items_status_scheduled_at
  ON public.checklist_items (status, scheduled_at)
  WHERE status IN ('due', 'overdue');

CREATE UNIQUE INDEX IF NOT EXISTS checklist_items_medication_scheduled_at_unique
  ON public.checklist_items (medication_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status <> 'archived';

-- ---------------------------------------------------------------------------
-- 4. Rolling materialization queue
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.checklist_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  next_compute_at timestamptz NOT NULL,
  cursor_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending', 'done', 'archived', 'failed'])),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_schedule_pending_next_compute
  ON public.checklist_schedule (next_compute_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS checklist_schedule_one_pending_per_medication
  ON public.checklist_schedule (medication_id)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 5. Push device subscriptions (Web Push + FCM token storage)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['web_push', 'fcm'])),
  endpoint text NOT NULL,
  p256dh text,
  auth text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- 6. Missed medication alerts (orchestration: push then SMS)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.missed_medications_alert (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.care_group(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_first_name text NOT NULL,
  medication_name text NOT NULL,
  dose_summary text NOT NULL,
  minutes_overdue integer NOT NULL CHECK (minutes_overdue >= 0),
  scheduled_at timestamptz NOT NULL,
  overdue_detected_at timestamptz NOT NULL DEFAULT now(),
  push_body text NOT NULL,
  sms_body text NOT NULL,
  deep_link_url text NOT NULL,
  push_recipient_user_ids uuid[] NOT NULL DEFAULT '{}',
  sms_phone_numbers text[] NOT NULL DEFAULT '{}',
  push_due_at timestamptz NOT NULL DEFAULT now(),
  push_sent_at timestamptz,
  sms_due_at timestamptz,
  sms_sent_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  status text NOT NULL DEFAULT 'pending_push'
    CHECK (status = ANY (ARRAY[
      'pending_push', 'push_sent', 'sms_sent', 'cancelled', 'push_failed', 'sms_failed'
    ])),
  push_delivery_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  sms_delivery_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS missed_medications_alert_one_open_per_item
  ON public.missed_medications_alert (checklist_item_id)
  WHERE status IN ('pending_push', 'push_sent');

CREATE INDEX IF NOT EXISTS idx_missed_medications_alert_pending_push
  ON public.missed_medications_alert (push_due_at)
  WHERE status = 'pending_push' AND cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_missed_medications_alert_pending_sms
  ON public.missed_medications_alert (sms_due_at)
  WHERE status = 'push_sent' AND sms_sent_at IS NULL AND cancelled_at IS NULL;

-- ---------------------------------------------------------------------------
-- 7. RLS (service_role used by Nest crons; members read own alerts via group)
-- ---------------------------------------------------------------------------

ALTER TABLE public.checklist_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missed_medications_alert ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_own ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS missed_medications_alert_group_members_select ON public.missed_medications_alert;
CREATE POLICY missed_medications_alert_group_members_select ON public.missed_medications_alert
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_givers cg
      WHERE cg.group_id = missed_medications_alert.group_id
        AND cg.caregiver_id = auth.uid()
        AND cg.status = 'active'
    )
  );

-- checklist_schedule + alert writes: backend service_role only (no authenticated INSERT policy)

COMMENT ON TABLE public.checklist_schedule IS
  'Queue for batched checklist_items materialization when >100 future slots remain.';
COMMENT ON TABLE public.missed_medications_alert IS
  'One row per overdue checklist_item alert lifecycle: push immediately, SMS after sms_due_at.';
