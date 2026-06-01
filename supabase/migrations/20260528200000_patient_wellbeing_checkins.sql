-- Migration: patient_wellbeing_checkins
-- Tracks the patient's daily wellbeing as assessed by an on-duty caregiver.
-- Distinct from primary_carer_wellbeing_checkins which tracks the CARER's own wellbeing.

create table if not exists public.patient_wellbeing_checkins (
  id              uuid         primary key default gen_random_uuid(),
  patient_id      uuid         not null references public.patients(id)    on delete cascade,
  group_id        uuid         not null references public.care_group(id)  on delete cascade,
  caregiver_id    uuid         not null references public.profiles(id)    on delete restrict,

  -- UTC instant this record was created / last overwritten
  created_at      timestamptz  not null default timezone('utc', now()),
  updated_at      timestamptz  not null default timezone('utc', now()),

  -- Local calendar date in the patient's preferred timezone (set by caller)
  checkin_date    date         not null,

  -- Wellbeing dimensions
  mood            smallint     not null check (mood between 1 and 5),
  appetite        text         not null check (appetite in ('good', 'fair', 'poor')),
  mobility        text         not null check (mobility in ('normal', 'reduced', 'very_limited')),
  pain_level      smallint     not null check (pain_level between 0 and 10),

  -- Free-text observations (optional)
  notes           text,

  -- One check-in per patient per calendar day; upsert on conflict to overwrite
  constraint patient_wellbeing_checkins_patient_date_unique unique (patient_id, checkin_date)
);

-- Fast look-ups for: today's check-in, recent check-ins for AI context
create index if not exists patient_wellbeing_checkins_patient_date_idx
  on public.patient_wellbeing_checkins (patient_id, checkin_date desc);

create index if not exists patient_wellbeing_checkins_group_date_idx
  on public.patient_wellbeing_checkins (group_id, checkin_date desc);

-- Auto-bump updated_at on every row change
create or replace function public.touch_wellbeing_checkin_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger trg_patient_wellbeing_checkins_updated_at
  before update on public.patient_wellbeing_checkins
  for each row execute function public.touch_wellbeing_checkin_updated_at();

-- ─── Row Level Security ────────────────────────────────────────────────────────

alter table public.patient_wellbeing_checkins enable row level security;

-- SELECT: any active member of the care group may read
create policy "Group members can view patient wellbeing check-ins"
on public.patient_wellbeing_checkins
for select
to public
using (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id  = patient_wellbeing_checkins.group_id
      and cg.caregiver_id = auth.uid()
      and cg.status    = 'active'
  )
);

-- INSERT: active primary/secondary carers only; must set themselves as caregiver_id
create policy "Active carers can insert patient wellbeing check-ins"
on public.patient_wellbeing_checkins
for insert
to public
with check (
  caregiver_id = auth.uid()
  and exists (
    select 1
    from public.care_givers cg
    where cg.group_id      = patient_wellbeing_checkins.group_id
      and cg.caregiver_id  = auth.uid()
      and cg.status        = 'active'
      and cg.role_in_care  in ('primary_carer', 'secondary_carer')
  )
);

-- UPDATE: active primary/secondary carers may overwrite (supports the upsert flow)
create policy "Active carers can update patient wellbeing check-ins"
on public.patient_wellbeing_checkins
for update
to public
using (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id      = patient_wellbeing_checkins.group_id
      and cg.caregiver_id  = auth.uid()
      and cg.status        = 'active'
      and cg.role_in_care  in ('primary_carer', 'secondary_carer')
  )
)
with check (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id      = patient_wellbeing_checkins.group_id
      and cg.caregiver_id  = auth.uid()
      and cg.status        = 'active'
      and cg.role_in_care  in ('primary_carer', 'secondary_carer')
  )
);
