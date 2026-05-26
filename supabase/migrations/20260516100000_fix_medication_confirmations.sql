-- Fix medication_confirmations table
--
-- Problems in the remote schema this migration corrects:
--   1. id is bigint (identity sequence) — inconsistent with every other table (uuid)
--   2. checklist_item_id has DEFAULT gen_random_uuid() — silently accepts inserts
--      without a real FK value instead of rejecting them
--   3. carer_id has DEFAULT gen_random_uuid() — same problem as above
--   4. photo_url is nullable — must be NOT NULL per ticket requirements
--   5. loca_time_zone has two bugs: typo in name and wrong type (timestamptz
--      instead of text). The column must store an IANA timezone string such as
--      'Europe/Madrid', not a timestamp.
--   6. created_at is nullable with no default
--   7. No foreign key constraints on checklist_item_id or carer_id
--   8. No indexes for common query patterns
--   9. RLS is enabled but zero policies exist — every insert/select from the
--      frontend is silently blocked


-- ── 1. Fix id: bigint identity → uuid ────────────────────────────────────────
-- The table is brand-new with no data, so the type change is safe.
ALTER TABLE public.medication_confirmations
  DROP CONSTRAINT medication_confirmations_pkey;

ALTER TABLE public.medication_confirmations
  ALTER COLUMN id DROP IDENTITY;

ALTER TABLE public.medication_confirmations
  ALTER COLUMN id TYPE uuid USING gen_random_uuid();

ALTER TABLE public.medication_confirmations
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.medication_confirmations
  ADD CONSTRAINT medication_confirmations_pkey PRIMARY KEY (id);


-- ── 2. Fix checklist_item_id: drop random default, enforce NOT NULL ───────────
ALTER TABLE public.medication_confirmations
  ALTER COLUMN checklist_item_id DROP DEFAULT;

ALTER TABLE public.medication_confirmations
  ALTER COLUMN checklist_item_id SET NOT NULL;


-- ── 3. Fix carer_id: drop random default, enforce NOT NULL ───────────────────
ALTER TABLE public.medication_confirmations
  ALTER COLUMN carer_id DROP DEFAULT;

ALTER TABLE public.medication_confirmations
  ALTER COLUMN carer_id SET NOT NULL;


-- ── 4. Fix photo_url: enforce NOT NULL ───────────────────────────────────────
ALTER TABLE public.medication_confirmations
  ALTER COLUMN photo_url SET NOT NULL;


-- ── 5. Fix loca_time_zone: rename (typo) + retype timestamptz → text ─────────
-- Never store a timezone as a timestamp. The correct value is a string like
-- 'Europe/Madrid'. The USING clause converts any existing rows safely; the
-- table should be empty at this point.
ALTER TABLE public.medication_confirmations
  RENAME COLUMN loca_time_zone TO local_timezone;

ALTER TABLE public.medication_confirmations
  ALTER COLUMN local_timezone TYPE text
  USING local_timezone::text;

ALTER TABLE public.medication_confirmations
  ALTER COLUMN local_timezone SET NOT NULL;


-- ── 6. Fix created_at: add default and NOT NULL ───────────────────────────────
ALTER TABLE public.medication_confirmations
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.medication_confirmations
  ALTER COLUMN created_at SET NOT NULL;


-- ── 7. Add foreign key constraints ───────────────────────────────────────────
-- Cascade deletes so orphaned confirmations are cleaned up automatically when
-- a checklist item is removed.
ALTER TABLE public.medication_confirmations
  ADD CONSTRAINT medication_confirmations_checklist_item_id_fkey
  FOREIGN KEY (checklist_item_id)
  REFERENCES public.checklist_items (id)
  ON DELETE CASCADE;

-- RESTRICT on carer so a profile cannot be deleted while confirmations exist —
-- those records are medical evidence and must be preserved or explicitly handled.
ALTER TABLE public.medication_confirmations
  ADD CONSTRAINT medication_confirmations_carer_id_fkey
  FOREIGN KEY (carer_id)
  REFERENCES public.profiles (id)
  ON DELETE RESTRICT;


-- ── 8. Add indexes ────────────────────────────────────────────────────────────
-- Lookup by checklist item (most common: "show proof for this dose")
CREATE INDEX idx_med_confirmations_checklist_item
  ON public.medication_confirmations (checklist_item_id);

-- Lookup by carer (audit: "what did this carer confirm today?")
CREATE INDEX idx_med_confirmations_carer
  ON public.medication_confirmations (carer_id);

-- Time-range queries and ordering
CREATE INDEX idx_med_confirmations_confirmed_at
  ON public.medication_confirmations (confirmed_at_utc);


-- ── 9. RLS policies ───────────────────────────────────────────────────────────
-- RLS is already enabled on this table (from the remote schema pull).
-- No policies existed, meaning all operations were blocked for all users.

-- Authenticated caregivers can insert only their own confirmation records.
CREATE POLICY "caregivers_insert_own_confirmation"
  ON public.medication_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = carer_id);

-- Any active caregiver in the same care group as the checklist item's patient
-- can read confirmations. The join path is:
--   medication_confirmations → checklist_items → daily_medication_checklists → care_givers
CREATE POLICY "group_members_select_confirmations"
  ON public.medication_confirmations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.checklist_items ci
      JOIN public.daily_medication_checklists dmc ON dmc.id = ci.checklist_id
      JOIN public.care_givers cg ON cg.group_id = dmc.group_id
      WHERE ci.id = medication_confirmations.checklist_item_id
        AND cg.caregiver_id = auth.uid()
        AND cg.status = 'active'
    )
  );
