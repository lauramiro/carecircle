-- RLS for gp_contacts, care_notes, and ai_insights.
-- SELECT + INSERT: primary_carer and secondary_carer
-- DELETE: primary_carer only

alter table public.gp_contacts  enable row level security;
alter table public.care_notes    enable row level security;
alter table public.ai_insights   enable row level security;

-- ── gp_contacts ──────────────────────────────────────────────

create policy "gp_contacts_select" on public.gp_contacts
  for select to authenticated
  using (
    exists (
      select 1 from public.care_givers cg
      where cg.patient_id = gp_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care in ('primary_carer', 'secondary_carer')
    )
  );

create policy "gp_contacts_insert" on public.gp_contacts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.care_givers cg
      where cg.patient_id = gp_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care in ('primary_carer', 'secondary_carer')
    )
  );

create policy "gp_contacts_delete" on public.gp_contacts
  for delete to authenticated
  using (
    exists (
      select 1 from public.care_givers cg
      where cg.patient_id = gp_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = 'primary_carer'
    )
  );

-- ── care_notes ───────────────────────────────────────────────

create policy "care_notes_select" on public.care_notes
  for select to authenticated
  using (
    exists (
      select 1 from public.care_givers cg
      where cg.patient_id = care_notes.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care in ('primary_carer', 'secondary_carer')
    )
  );

create policy "care_notes_insert" on public.care_notes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.care_givers cg
      where cg.patient_id = care_notes.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care in ('primary_carer', 'secondary_carer')
    )
    and (care_notes.created_by = auth.uid() or care_notes.created_by is null)
  );

create policy "care_notes_delete" on public.care_notes
  for delete to authenticated
  using (
    exists (
      select 1 from public.care_givers cg
      where cg.patient_id = care_notes.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = 'primary_carer'
    )
  );

-- ── ai_insights ──────────────────────────────────────────────

create policy "ai_insights_select" on public.ai_insights
  for select to authenticated
  using (
    exists (
      select 1 from public.care_givers cg
      where cg.patient_id = ai_insights.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care in ('primary_carer', 'secondary_carer')
    )
  );

create policy "ai_insights_insert" on public.ai_insights
  for insert to authenticated
  with check (
    exists (
      select 1 from public.care_givers cg
      where cg.patient_id = ai_insights.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care in ('primary_carer', 'secondary_carer')
    )
  );

create policy "ai_insights_delete" on public.ai_insights
  for delete to authenticated
  using (
    exists (
      select 1 from public.care_givers cg
      where cg.patient_id = ai_insights.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = 'primary_carer'
    )
  );
