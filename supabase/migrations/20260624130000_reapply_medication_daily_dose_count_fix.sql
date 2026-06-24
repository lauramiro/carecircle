-- The 2026-06-24 sync-with-production migration replayed production's
-- current (broken) text[] signature for medication_daily_dose_count, which
-- undid the 20260623150000 fix (production has not had that migration
-- deployed yet). Re-apply the time[] fix so local matches "production once
-- this branch ships," not production's current broken state.

drop function if exists public.medication_daily_dose_count(text, text[], integer, integer[], integer);

create or replace function public.medication_daily_dose_count(
  p_schedule_type text,
  p_specific_times time without time zone[],
  p_interval_hours integer,
  p_days_of_week integer[],
  p_day_of_month integer
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p_schedule_type = 'daily' and p_interval_hours is not null and p_interval_hours > 0
      then greatest(
        1,
        floor(
          (
            (24 * 60 - 1)
            - case
              when p_specific_times is not null and cardinality(p_specific_times) > 0
                then (
                  extract(hour from p_specific_times[1]) * 60
                  + extract(minute from p_specific_times[1])
                )
              else 8 * 60
            end
          )::numeric / (p_interval_hours * 60)::numeric
        ) + 1
      )
    when p_schedule_type = 'daily'
      then greatest(1, coalesce(cardinality(p_specific_times), 0))::numeric
    when p_schedule_type = 'weekly'
      then (greatest(1, coalesce(cardinality(p_days_of_week), 0))::numeric
        * greatest(1, coalesce(cardinality(p_specific_times), 0))::numeric) / 7::numeric
    when p_schedule_type = 'biweekly'
      then greatest(1, coalesce(cardinality(p_specific_times), 0))::numeric / 14::numeric
    when p_schedule_type = 'monthly' and p_day_of_month is not null
      then greatest(1, coalesce(cardinality(p_specific_times), 0))::numeric / 30::numeric
    else 0::numeric
  end;
$$;
