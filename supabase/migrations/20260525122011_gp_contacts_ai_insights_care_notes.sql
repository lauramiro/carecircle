create table if not exists public.gp_contacts (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null,
  specialty text,
  phone text,
  email text,
  address text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_gp_contacts_patient_id on public.gp_contacts(patient_id);

create table if not exists public.care_notes (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_at timestamptz default now() not null,
  content text not null,
  tone text,
  created_by uuid
);

create index if not exists idx_care_notes_patient_id on public.care_notes(patient_id);
create index if not exists idx_care_notes_created_at on public.care_notes(created_at);

create table if not exists public.ai_insights (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.patients(id) on delete cascade,
  insight_type text not null,
  observation text not null,
  severity text default 'low',
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_ai_insights_patient_id on public.ai_insights(patient_id);
create index if not exists idx_ai_insights_created_at on public.ai_insights(created_at);
