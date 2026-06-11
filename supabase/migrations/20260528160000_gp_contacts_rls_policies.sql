-- gp_contacts: add missing UPDATE policy (SELECT/INSERT/DELETE already exist on remote).

drop policy if exists "gp_contacts_update" on public.gp_contacts;

create policy "gp_contacts_update"
  on public.gp_contacts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = gp_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
  )
  with check (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = gp_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
  );
