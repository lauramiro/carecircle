alter table public.medications
  add column if not exists quantity_on_hand integer,
  add column if not exists low_stock_alert_threshold_days integer not null default 7,
  add column if not exists low_stock_alert_sent_at timestamp with time zone;

alter table public.medications
  add constraint medications_quantity_on_hand_nonnegative
    check (quantity_on_hand is null or quantity_on_hand >= 0) not valid,
  add constraint medications_low_stock_alert_threshold_positive
    check (low_stock_alert_threshold_days >= 1) not valid;

alter table public.medications validate constraint medications_quantity_on_hand_nonnegative;
alter table public.medications validate constraint medications_low_stock_alert_threshold_positive;

create or replace function public.medication_daily_dose_count(
  p_schedule_type text,
  p_specific_times text[],
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
                  extract(hour from p_specific_times[1]::time) * 60
                  + extract(minute from p_specific_times[1]::time)
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

create or replace function public.reset_low_stock_alert_when_restocked()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_daily_dose_count numeric;
begin
  v_daily_dose_count := public.medication_daily_dose_count(
    new.schedule_type,
    new.specific_times,
    new.interval_hours,
    new.days_of_week,
    new.day_of_month
  );

  if new.quantity_on_hand is null
    or v_daily_dose_count <= 0
    or (new.quantity_on_hand::numeric / v_daily_dose_count) >= coalesce(new.low_stock_alert_threshold_days, 7)::numeric
  then
    new.low_stock_alert_sent_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists reset_medication_low_stock_alert_when_restocked on public.medications;
create trigger reset_medication_low_stock_alert_when_restocked
before insert or update of
  quantity_on_hand,
  low_stock_alert_threshold_days,
  schedule_type,
  specific_times,
  interval_hours,
  days_of_week,
  day_of_month
on public.medications
for each row
execute function public.reset_low_stock_alert_when_restocked();

create or replace function public.mark_checklist_item_given(
  p_item_id uuid,
  p_given_at timestamp with time zone,
  p_given_notes text default null,
  p_overdue_hours integer default null,
  p_overdue_minutes integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.checklist_items%rowtype;
begin
  update public.checklist_items
  set
    status = 'given',
    given_at = p_given_at,
    given_by_carer_id = auth.uid(),
    given_notes = nullif(trim(coalesce(p_given_notes, '')), ''),
    overdue_hours = p_overdue_hours,
    overdue_minutes = p_overdue_minutes,
    updated_at = p_given_at
  where id = p_item_id
    and status in ('due', 'overdue')
    and exists (
      select 1
      from public.care_givers cg
      where cg.group_id = checklist_items.group_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care in ('primary_carer', 'secondary_carer')
    )
  returning * into v_item;

  if not found then
    return null;
  end if;

  update public.medications
  set
    quantity_on_hand = greatest(quantity_on_hand - 1, 0),
    updated_at = now()
  where id = v_item.medication_id
    and quantity_on_hand is not null;

  return v_item.id;
end;
$$;

grant execute on function public.mark_checklist_item_given(
  uuid,
  timestamp with time zone,
  text,
  integer,
  integer
) to authenticated;
