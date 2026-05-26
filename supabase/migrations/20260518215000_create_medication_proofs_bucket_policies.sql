-- Create the Storage bucket used by medication photo confirmations.
-- The frontend stores public URLs in medication_confirmations.photo_url, so this
-- bucket must be public unless the app is changed to use signed URLs.
insert into storage.buckets (id, name, public)
values ('medication-proofs', 'medication-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "group_members_upload_medication_proofs"
  on storage.objects;

create policy "group_members_upload_medication_proofs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'medication-proofs'
    and (storage.foldername(name))[1] = 'checklist-proofs'
    and case
      when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1
        from public.checklist_items ci
        join public.daily_medication_checklists dmc on dmc.id = ci.checklist_id
        join public.care_givers cg on cg.group_id = dmc.group_id
        where ci.id = ((storage.foldername(name))[2])::uuid
          and cg.caregiver_id = auth.uid()
          and cg.status = 'active'
      )
      else false
    end
  );

drop policy if exists "group_members_read_medication_proofs"
  on storage.objects;

create policy "group_members_read_medication_proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'medication-proofs'
    and (storage.foldername(name))[1] = 'checklist-proofs'
    and case
      when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1
        from public.checklist_items ci
        join public.daily_medication_checklists dmc on dmc.id = ci.checklist_id
        join public.care_givers cg on cg.group_id = dmc.group_id
        where ci.id = ((storage.foldername(name))[2])::uuid
          and cg.caregiver_id = auth.uid()
          and cg.status = 'active'
      )
      else false
    end
  );
