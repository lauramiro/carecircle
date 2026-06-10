drop policy if exists "patient avatars delete by primary carer"
  on storage.objects;

create policy "patient avatars delete by primary carer"
  on storage.objects
  as permissive
  for delete
  to public
using (
  bucket_id = 'patient-avatars'
  and exists (
    select 1
    from public.care_givers cg
    where (cg.patient_id)::text = (storage.foldername(objects.name))[1]
      and cg.caregiver_id = auth.uid()
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active'
  )
);

drop policy if exists "patient avatars insert by primary carer"
  on storage.objects;

create policy "patient avatars insert by primary carer"
  on storage.objects
  as permissive
  for insert
  to public
with check (
  bucket_id = 'patient-avatars'
  and exists (
    select 1
    from public.care_givers cg
    where (cg.patient_id)::text = (storage.foldername(name))[1]
      and cg.caregiver_id = auth.uid()
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active'
  )
);

drop policy if exists "patient avatars update by primary carer"
  on storage.objects;

create policy "patient avatars update by primary carer"
  on storage.objects
  as permissive
  for update
  to public
using (
  bucket_id = 'patient-avatars'
  and exists (
    select 1
    from public.care_givers cg
    where (cg.patient_id)::text = (storage.foldername(objects.name))[1]
      and cg.caregiver_id = auth.uid()
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active'
  )
)
with check (
  bucket_id = 'patient-avatars'
  and exists (
    select 1
    from public.care_givers cg
    where (cg.patient_id)::text = (storage.foldername(name))[1]
      and cg.caregiver_id = auth.uid()
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active'
  )
);