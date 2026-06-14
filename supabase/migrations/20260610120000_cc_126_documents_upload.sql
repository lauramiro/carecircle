insert into storage.buckets (id, name, public)
values ('care-documents', 'care-documents', false)
on conflict (id) do update set public = false;

update public.documents
set document_type = case
  when document_type = 'insurance' then 'insurance'
  when document_type = 'lab_report' then 'test_result'
  when document_type = 'other' then 'other'
  else 'other'
end
where document_type is not null;

alter table public.documents
drop constraint if exists documents_document_type_check;

alter table public.documents
add constraint documents_document_type_check
check (
  document_type is null
  or document_type = any (array['discharge_summary', 'test_result', 'insurance', 'other'])
);

drop policy if exists "documents_read_for_active_caregivers" on public.documents;

create policy "documents_read_for_active_caregivers"
  on public.documents
  for select
  to authenticated
  using (public.is_caregiver_for(patient_id));

drop policy if exists "documents_insert_for_active_caregivers" on public.documents;

create policy "documents_insert_for_active_caregivers"
  on public.documents
  for insert
  to authenticated
  with check (
    public.is_caregiver_for(patient_id)
    and uploaded_by = auth.uid()
    and document_type = any (array['discharge_summary', 'test_result', 'insurance', 'other'])
  );

drop policy if exists "documents_delete_for_primary_carers" on public.documents;

create policy "documents_delete_for_primary_carers"
  on public.documents
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = documents.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = 'primary_carer'::public.member_role
    )
  );

drop policy if exists "documents_upload_for_active_caregivers" on storage.objects;

create policy "documents_upload_for_active_caregivers"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'care-documents'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1
        from public.care_givers cg
        where cg.patient_id = ((storage.foldername(name))[1])::uuid
          and cg.caregiver_id = auth.uid()
          and cg.status = 'active'
      )
      else false
    end
  );

drop policy if exists "documents_read_for_active_caregivers" on storage.objects;

create policy "documents_read_for_active_caregivers"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'care-documents'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1
        from public.care_givers cg
        where cg.patient_id = ((storage.foldername(name))[1])::uuid
          and cg.caregiver_id = auth.uid()
          and cg.status = 'active'
      )
      else false
    end
  );

drop policy if exists "documents_delete_for_primary_carers" on storage.objects;

create policy "documents_delete_for_primary_carers"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'care-documents'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1
        from public.care_givers cg
        where cg.patient_id = ((storage.foldername(name))[1])::uuid
          and cg.caregiver_id = auth.uid()
          and cg.status = 'active'
          and cg.role_in_care = 'primary_carer'::public.member_role
      )
      else false
    end
  );