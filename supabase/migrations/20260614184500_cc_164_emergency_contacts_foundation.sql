-- CC-164: Emergency contacts foundation for CC-131.

alter table public.appointments
  add column if not exists provider_phone text;

create table if not exists public.emergency_contacts (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.patients(id) on delete cascade,
  label text not null,
  contact_name text not null,
  phone text not null,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id) on delete set null,
  constraint emergency_contacts_sort_order_check check (sort_order between 0 and 1)
);

create index if not exists idx_emergency_contacts_patient_id
  on public.emergency_contacts(patient_id);

alter table public.emergency_contacts enable row level security;

drop policy if exists "emergency_contacts_select" on public.emergency_contacts;
create policy "emergency_contacts_select"
  on public.emergency_contacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = emergency_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
    )
  );

drop policy if exists "emergency_contacts_insert" on public.emergency_contacts;
create policy "emergency_contacts_insert"
  on public.emergency_contacts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = emergency_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
    and (
      select count(*)
      from public.emergency_contacts ec
      where ec.patient_id = emergency_contacts.patient_id
        and ec.is_active = true
    ) < 2
  );

drop policy if exists "emergency_contacts_update" on public.emergency_contacts;
create policy "emergency_contacts_update"
  on public.emergency_contacts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = emergency_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
  )
  with check (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = emergency_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
  );

-- Align GP contact read/manage policies with emergency-screen requirements.
drop policy if exists "gp_contacts_select" on public.gp_contacts;
create policy "gp_contacts_select"
  on public.gp_contacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = gp_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
    )
  );

drop policy if exists "gp_contacts_insert" on public.gp_contacts;
create policy "gp_contacts_insert"
  on public.gp_contacts
  for insert
  to authenticated
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
