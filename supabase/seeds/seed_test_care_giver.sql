-- ── STEP 1: Create auth user ───────────────────────────────────────────────

INSERT INTO auth.users (
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
VALUES (
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'tester5@example.com',                                              -- ← replace
  crypt('TestPassword123!', gen_salt('bf')),                         -- ← replace
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', 'Tester5 Name', 'role', 'caregiver'), -- ← replace name
  now(),
  now()
)
ON CONFLICT DO NOTHING;


-- ── STEP 2: Add to care_givers ───────────────────────────────────────────────

-- Find available groups: SELECT id, name FROM public.care_group;

 INSERT INTO public.care_givers (
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
 SELECT
   u.id                                AS caregiver_id,
   '0b381af1-1734-474e-bd05-17cc47a9b2e4'::uuid                  AS group_id,               -- ← replace
   p.id                                AS patient_id,
   'secondary_carer'::public.member_role AS role_in_care,
   'active'                            AS status,
   true                                AS can_communicate,
   true                                AS can_schedule,
   true                                AS can_view_medical,
   'tester'                            AS relationship
 FROM  auth.users      u
 JOIN  public.patients p ON p.group_id = '0b381af1-1734-474e-bd05-17cc47a9b2e4'::uuid       -- ← same group-id
 WHERE u.email = 'tester5@example.com'                             -- ← replace
 ON CONFLICT (group_id, patient_id, caregiver_id) DO NOTHING;


