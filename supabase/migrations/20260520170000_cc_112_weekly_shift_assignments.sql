create table if not exists public.weekly_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.care_group(id) on delete cascade,
  shift_date date not null,
  shift_slot text not null,
  assigned_caregiver_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint weekly_shift_assignments_slot_check check (
    shift_slot in ('morning', 'afternoon', 'evening', 'overnight')
  ),
  constraint weekly_shift_assignments_group_date_slot_unique unique (group_id, shift_date, shift_slot)
);

create index if not exists weekly_shift_assignments_group_date_idx
  on public.weekly_shift_assignments (group_id, shift_date);

create table if not exists public.weekly_shift_assignment_history (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.weekly_shift_assignments(id) on delete set null,
  group_id uuid not null references public.care_group(id) on delete cascade,
  shift_date date not null,
  shift_slot text not null,
  previous_caregiver_id uuid references public.profiles(id) on delete set null,
  assigned_caregiver_id uuid references public.profiles(id) on delete set null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default timezone('utc', now()),
  constraint weekly_shift_assignment_history_slot_check check (
    shift_slot in ('morning', 'afternoon', 'evening', 'overnight')
  )
);

create index if not exists weekly_shift_assignment_history_group_date_idx
  on public.weekly_shift_assignment_history (group_id, shift_date, shift_slot, changed_at desc);

alter table public.weekly_shift_assignments enable row level security;
alter table public.weekly_shift_assignment_history enable row level security;

create or replace function public.set_weekly_shift_assignments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_weekly_shift_assignments_updated_at
on public.weekly_shift_assignments;

create trigger set_weekly_shift_assignments_updated_at
before update on public.weekly_shift_assignments
for each row
execute function public.set_weekly_shift_assignments_updated_at();

create or replace function public.log_weekly_shift_assignment_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.weekly_shift_assignment_history (
    assignment_id,
    group_id,
    shift_date,
    shift_slot,
    previous_caregiver_id,
    assigned_caregiver_id,
    changed_by,
    changed_at
  )
  values (
    new.id,
    new.group_id,
    new.shift_date,
    new.shift_slot,
    case when tg_op = 'UPDATE' then old.assigned_caregiver_id else null end,
    new.assigned_caregiver_id,
    auth.uid(),
    timezone('utc', now())
  );

  return new;
end;
$$;

drop trigger if exists log_weekly_shift_assignment_history
on public.weekly_shift_assignments;

create trigger log_weekly_shift_assignment_history
after insert or update on public.weekly_shift_assignments
for each row
execute function public.log_weekly_shift_assignment_history();

create policy "Group members can view weekly shift assignments"
on public.weekly_shift_assignments
for select
to public
using (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id = weekly_shift_assignments.group_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
  )
);

create policy "Primary carers can create weekly shift assignments"
on public.weekly_shift_assignments
for insert
to public
with check (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id = weekly_shift_assignments.group_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
      and cg.role_in_care = 'primary_carer'
  )
  and (
    assigned_caregiver_id is null
    or exists (
      select 1
      from public.care_givers cg
      where cg.group_id = weekly_shift_assignments.group_id
        and cg.caregiver_id = weekly_shift_assignments.assigned_caregiver_id
        and cg.status = 'active'
    )
  )
);

create policy "Primary carers can update weekly shift assignments"
on public.weekly_shift_assignments
for update
to public
using (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id = weekly_shift_assignments.group_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
      and cg.role_in_care = 'primary_carer'
  )
)
with check (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id = weekly_shift_assignments.group_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
      and cg.role_in_care = 'primary_carer'
  )
  and (
    assigned_caregiver_id is null
    or exists (
      select 1
      from public.care_givers cg
      where cg.group_id = weekly_shift_assignments.group_id
        and cg.caregiver_id = weekly_shift_assignments.assigned_caregiver_id
        and cg.status = 'active'
    )
  )
);

create policy "Group members can view weekly shift assignment history"
on public.weekly_shift_assignment_history
for select
to public
using (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id = weekly_shift_assignment_history.group_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
  )
);