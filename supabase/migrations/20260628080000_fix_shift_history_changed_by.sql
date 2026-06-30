-- The weekly_shift_assignment_history trigger populates changed_by from auth.uid(),
-- which is null when the write comes through the backend's service-role client
-- (e.g. POST /api/shifts/assignments). Add an explicit fallback column the
-- application can set, and have the trigger prefer auth.uid() when present
-- (direct/RLS-governed writes) and fall back to it otherwise.

alter table public.weekly_shift_assignments
  add column if not exists last_changed_by uuid references public.profiles(id) on delete set null;

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
    coalesce(auth.uid(), new.last_changed_by),
    timezone('utc', now())
  );

  return new;
end;
$$;
