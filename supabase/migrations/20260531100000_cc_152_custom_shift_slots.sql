-- CC-152: Allow custom HH:MM-HH:MM shift slots alongside standard session enums.

alter table public.weekly_shift_assignments
  drop constraint if exists weekly_shift_assignments_slot_check;

alter table public.weekly_shift_assignments
  add constraint weekly_shift_assignments_slot_check check (
    shift_slot in ('morning', 'afternoon', 'evening', 'overnight')
    or shift_slot ~ '^\d{2}:\d{2}-\d{2}:\d{2}$'
  );

alter table public.weekly_shift_assignment_history
  drop constraint if exists weekly_shift_assignment_history_slot_check;

alter table public.weekly_shift_assignment_history
  add constraint weekly_shift_assignment_history_slot_check check (
    shift_slot in ('morning', 'afternoon', 'evening', 'overnight')
    or shift_slot ~ '^\d{2}:\d{2}-\d{2}:\d{2}$'
  );

alter publication supabase_realtime add table weekly_shift_assignments;
