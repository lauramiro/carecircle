-- Create the Storage bucket used for patient avatars.
-- Its policies live in 20260610133000_fix_patient_avatar_bucket_policies.sql,
-- but the bucket itself was only ever created by hand. The frontend uses
-- getPublicUrl for avatars, so this bucket must be public.
insert into storage.buckets (id, name, public)
values ('patient-avatars', 'patient-avatars', true)
on conflict (id) do update set public = true;
