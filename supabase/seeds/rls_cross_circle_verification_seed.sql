-- Seed fixtures used only for direct RLS verification of cross-circle access.
-- These rows are loaded by `supabase db reset` and exercised by
-- `supabase/verify_cross_circle_rls.sql`.

-- Test actor UUIDs
-- Circle A primary:   11111111-1111-4111-8111-111111111111
-- Circle A secondary: 22222222-2222-4222-8222-222222222222
-- Circle A observer:  33333333-3333-4333-8333-333333333333
-- Circle B primary:   44444444-4444-4444-8444-444444444444

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'authenticated',
    'authenticated',
    'rls.circlea.primary@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"RLS Circle A Primary","role":"caregiver"}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222'::uuid,
    'authenticated',
    'authenticated',
    'rls.circlea.secondary@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"RLS Circle A Secondary","role":"caregiver"}'::jsonb,
    now(),
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333'::uuid,
    'authenticated',
    'authenticated',
    'rls.circlea.observer@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"RLS Circle A Observer","role":"caregiver"}'::jsonb,
    now(),
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444'::uuid,
    'authenticated',
    'authenticated',
    'rls.circleb.primary@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"RLS Circle B Primary","role":"caregiver"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.patients (
  id,
  full_name,
  date_of_birth,
  primary_caregiver_id,
  email,
  notes
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    'RLS Circle A Patient',
    '1940-01-01',
    '11111111-1111-4111-8111-111111111111'::uuid,
    'rls.patient.a@example.com',
    'Seed fixture for Circle A RLS verification.'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid,
    'RLS Circle B Patient',
    '1942-02-02',
    '44444444-4444-4444-8444-444444444444'::uuid,
    'rls.patient.b@example.com',
    'Seed fixture for Circle B RLS verification.'
  )
on conflict (id) do nothing;

insert into public.care_group (
  id,
  name,
  description,
  patient_id,
  primary_caregiver_id,
  preferred_timezone
)
values
  (
    'aaaaaaaa-0000-4000-8000-aaaaaaaaaaa1'::uuid,
    'RLS Verification Circle A',
    'Cross-circle RLS verification fixture for Circle A.',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'UTC'
  ),
  (
    'bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1'::uuid,
    'RLS Verification Circle B',
    'Cross-circle RLS verification fixture for Circle B.',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    'UTC'
  )
on conflict (id) do nothing;

update public.patients
set group_id = case id
  when 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid then 'aaaaaaaa-0000-4000-8000-aaaaaaaaaaa1'::uuid
  when 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid then 'bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1'::uuid
  else group_id
end
where id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid
);

insert into public.care_givers (
  id,
  caregiver_id,
  group_id,
  patient_id,
  role_in_care,
  status,
  can_communicate,
  can_schedule,
  can_view_medical,
  relationship
)
values
  (
    'aaaaaaaa-1000-4000-8000-aaaaaaaaaaa1'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'aaaaaaaa-0000-4000-8000-aaaaaaaaaaa1'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    'primary_carer',
    'active',
    true,
    true,
    true,
    'primary'
  ),
  (
    'aaaaaaaa-2000-4000-8000-aaaaaaaaaaa1'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    'aaaaaaaa-0000-4000-8000-aaaaaaaaaaa1'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    'secondary_carer',
    'active',
    true,
    true,
    true,
    'secondary'
  ),
  (
    'aaaaaaaa-3000-4000-8000-aaaaaaaaaaa1'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    'aaaaaaaa-0000-4000-8000-aaaaaaaaaaa1'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    'observer',
    'active',
    false,
    false,
    true,
    'observer'
  ),
  (
    'bbbbbbbb-1000-4000-8000-bbbbbbbbbbb1'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    'bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid,
    'primary_carer',
    'active',
    true,
    true,
    true,
    'primary'
  )
on conflict (id) do nothing;

insert into public.medications (
  id,
  patient_id,
  medication_name,
  dose,
  unit,
  start_date,
  prescribed_by,
  status,
  created_by,
  notes
)
values (
  'bbbbbbbb-2000-4000-8000-bbbbbbbbbbb1'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid,
  'Circle B Medication',
  1,
  'mg',
  current_date,
  '44444444-4444-4444-8444-444444444444'::uuid,
  'active',
  '44444444-4444-4444-8444-444444444444'::uuid,
  'Seed fixture for direct RLS verification.'
)
on conflict (id) do nothing;

insert into public.handover_journal_entries (
  id,
  group_id,
  author_id,
  content,
  created_at,
  updated_at
)
values (
  'bbbbbbbb-3000-4000-8000-bbbbbbbbbbb1'::uuid,
  'bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1'::uuid,
  '44444444-4444-4444-8444-444444444444'::uuid,
  'Circle B handover entry seeded for RLS verification.',
  timezone('utc', now()) - interval '10 minutes',
  timezone('utc', now()) - interval '10 minutes'
)
on conflict (id) do nothing;