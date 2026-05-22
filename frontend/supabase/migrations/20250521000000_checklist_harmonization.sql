-- Medication checklist harmonization: extend checklist_items and fix RLS

-- New columns on checklist_items
ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS scheduled_time text,
  ADD COLUMN IF NOT EXISTS medication_name text,
  ADD COLUMN IF NOT EXISTS dose numeric,
  ADD COLUMN IF NOT EXISTS dosage_unit text,
  ADD COLUMN IF NOT EXISTS given_notes text,
  ADD COLUMN IF NOT EXISTS overdue_hours integer,
  ADD COLUMN IF NOT EXISTS overdue_minutes integer,
  ADD COLUMN IF NOT EXISTS given_by_carer_id uuid REFERENCES public.profiles(id);

-- Backfill dose time: window_start is 30 minutes before the actual scheduled dose
UPDATE public.checklist_items
SET scheduled_time = to_char(
  (timestamp '2000-01-01' + window_start::time + interval '30 minutes')::time,
  'HH24:MI'
)
WHERE scheduled_time IS NULL
  AND window_start IS NOT NULL;

-- Prevent duplicate dose slots per checklist
CREATE UNIQUE INDEX IF NOT EXISTS checklist_items_checklist_med_time_unique
  ON public.checklist_items (checklist_id, medication_id, scheduled_time)
  WHERE scheduled_time IS NOT NULL;

-- RLS: allow all active care group members to read/write checklists
ALTER TABLE public.daily_medication_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active carers can select daily checklists" ON public.daily_medication_checklists;
CREATE POLICY "Active carers can select daily checklists"
  ON public.daily_medication_checklists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_givers cg
      WHERE cg.group_id = daily_medication_checklists.group_id
        AND cg.caregiver_id = auth.uid()
        AND cg.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Active carers can insert daily checklists" ON public.daily_medication_checklists;
CREATE POLICY "Active carers can insert daily checklists"
  ON public.daily_medication_checklists
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.care_givers cg
      WHERE cg.group_id = daily_medication_checklists.group_id
        AND cg.caregiver_id = auth.uid()
        AND cg.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Active carers can select checklist items" ON public.checklist_items;
CREATE POLICY "Active carers can select checklist items"
  ON public.checklist_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_medication_checklists dmc
      JOIN public.care_givers cg ON cg.group_id = dmc.group_id
      WHERE dmc.id = checklist_items.checklist_id
        AND cg.caregiver_id = auth.uid()
        AND cg.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Active carers can insert checklist items" ON public.checklist_items;
CREATE POLICY "Active carers can insert checklist items"
  ON public.checklist_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_medication_checklists dmc
      JOIN public.care_givers cg ON cg.group_id = dmc.group_id
      WHERE dmc.id = checklist_items.checklist_id
        AND cg.caregiver_id = auth.uid()
        AND cg.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Active carers can update checklist items" ON public.checklist_items;
CREATE POLICY "Active carers can update checklist items"
  ON public.checklist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_medication_checklists dmc
      JOIN public.care_givers cg ON cg.group_id = dmc.group_id
      WHERE dmc.id = checklist_items.checklist_id
        AND cg.caregiver_id = auth.uid()
        AND cg.status = 'active'
    )
  );
