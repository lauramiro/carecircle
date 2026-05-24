alter table public.checklist_items enable row level security;

drop policy if exists "active_group_members_select_checklist_items"
  on public.checklist_items;

create policy "active_group_members_select_checklist_items"
  on public.checklist_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.daily_medication_checklists dmc
      join public.care_givers cg on cg.group_id = dmc.group_id
      where dmc.id = checklist_items.checklist_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
    )
  );

drop policy if exists "active_carers_update_checklist_items"
  on public.checklist_items;

create policy "active_carers_update_checklist_items"
  on public.checklist_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.daily_medication_checklists dmc
      join public.care_givers cg on cg.group_id = dmc.group_id
      where dmc.id = checklist_items.checklist_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care in ('primary_carer', 'secondary_carer')
    )
  )
  with check (
    exists (
      select 1
      from public.daily_medication_checklists dmc
      join public.care_givers cg on cg.group_id = dmc.group_id
      where dmc.id = checklist_items.checklist_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care in ('primary_carer', 'secondary_carer')
    )
  );
