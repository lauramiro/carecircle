-- emergency_contacts has SELECT/INSERT/UPDATE policies but no DELETE policy,
-- so the DB silently denies every delete attempt (handleRemove in
-- EmergencyContactsPage.tsx has no error handling, so this fails silently
-- with no user feedback). Scope it identically to the existing
-- emergency_contacts_update/insert policies: active primary/secondary carer.

create policy "emergency_contacts_delete"
on public.emergency_contacts
for delete
to authenticated
using (
  exists (
    select 1
    from public.care_givers cg
    where cg.patient_id = emergency_contacts.patient_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
      and cg.role_in_care = any (array['primary_carer'::member_role, 'secondary_carer'::member_role])
  )
);
