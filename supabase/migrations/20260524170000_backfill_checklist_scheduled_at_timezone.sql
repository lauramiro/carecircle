-- Backfill checklist_items.scheduled_at from local checklist_date + time_of_day
-- using each care group's preferred_timezone (fixes rows materialized when timezone was UTC/default).

UPDATE public.checklist_items ci
SET
  scheduled_at = (
    (to_char(dmc.checklist_date, 'YYYY-MM-DD') || ' ' || ci.time_of_day || ':00')::timestamp
    AT TIME ZONE cg.preferred_timezone
  ),
  timezone = cg.preferred_timezone,
  updated_at = now()
FROM public.daily_medication_checklists dmc
JOIN public.care_group cg ON cg.id = dmc.group_id
WHERE ci.checklist_id = dmc.id
  AND ci.scheduled_at IS NOT NULL
  AND ci.time_of_day IS NOT NULL
  AND ci.status IN ('due', 'overdue')
  AND ci.scheduled_at IS DISTINCT FROM (
    (to_char(dmc.checklist_date, 'YYYY-MM-DD') || ' ' || ci.time_of_day || ':00')::timestamp
    AT TIME ZONE cg.preferred_timezone
  );
