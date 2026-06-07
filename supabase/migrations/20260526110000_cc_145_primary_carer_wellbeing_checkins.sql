create table if not exists public.primary_carer_wellbeing_checkins (
  id uuid primary key default gen_random_uuid(),
  carer_id uuid not null references public.profiles(id) on delete cascade,
  submitted_at timestamptz not null default timezone('utc', now()),
  week_start date generated always as (
    date_trunc('week', submitted_at at time zone 'utc')::date
  ) stored,
  sleep_quality integer not null check (sleep_quality between 1 and 5),
  stress_level integer not null check (stress_level between 1 and 5),
  overwhelm_level integer not null check (overwhelm_level between 1 and 5),
  social_connection integer not null check (social_connection between 1 and 5),
  overall_mood integer not null check (overall_mood between 1 and 5),
  composite_score integer generated always as (
    sleep_quality
    + (6 - stress_level)
    + (6 - overwhelm_level)
    + social_connection
    + overall_mood
  ) stored,
  constraint primary_carer_wellbeing_checkins_unique_week unique (carer_id, week_start),
  constraint primary_carer_wellbeing_checkins_composite_score_check
    check (composite_score between 5 and 25)
);

create index if not exists primary_carer_wellbeing_checkins_carer_submitted_idx
  on public.primary_carer_wellbeing_checkins (carer_id, submitted_at desc);

alter table public.primary_carer_wellbeing_checkins enable row level security;

drop policy if exists "Primary carers can view their own wellbeing check-ins"
  on public.primary_carer_wellbeing_checkins;

create policy "Primary carers can view their own wellbeing check-ins"
on public.primary_carer_wellbeing_checkins
for select
using (auth.uid() = carer_id);

drop policy if exists "Primary carers can add their own wellbeing check-ins"
  on public.primary_carer_wellbeing_checkins;

create policy "Primary carers can add their own wellbeing check-ins"
on public.primary_carer_wellbeing_checkins
for insert
with check (
  auth.uid() = carer_id
  and exists (
    select 1
    from public.care_givers cg
    where cg.caregiver_id = auth.uid()
      and cg.status = 'active'
      and cg.role_in_care = 'primary_carer'::public.member_role
  )
);