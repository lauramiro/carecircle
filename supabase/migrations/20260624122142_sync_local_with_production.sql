drop policy "caregivers_insert_own_confirmation" on "public"."medication_confirmations";

drop policy "caregivers_insert_medications" on "public"."medications";

drop policy "caregivers_read_medications" on "public"."medications";

revoke delete on table "public"."medication_schedules" from "anon";

revoke insert on table "public"."medication_schedules" from "anon";

revoke references on table "public"."medication_schedules" from "anon";

revoke select on table "public"."medication_schedules" from "anon";

revoke trigger on table "public"."medication_schedules" from "anon";

revoke truncate on table "public"."medication_schedules" from "anon";

revoke update on table "public"."medication_schedules" from "anon";

revoke delete on table "public"."medication_schedules" from "authenticated";

revoke insert on table "public"."medication_schedules" from "authenticated";

revoke references on table "public"."medication_schedules" from "authenticated";

revoke select on table "public"."medication_schedules" from "authenticated";

revoke trigger on table "public"."medication_schedules" from "authenticated";

revoke truncate on table "public"."medication_schedules" from "authenticated";

revoke update on table "public"."medication_schedules" from "authenticated";

revoke delete on table "public"."medication_schedules" from "service_role";

revoke insert on table "public"."medication_schedules" from "service_role";

revoke references on table "public"."medication_schedules" from "service_role";

revoke select on table "public"."medication_schedules" from "service_role";

revoke trigger on table "public"."medication_schedules" from "service_role";

revoke truncate on table "public"."medication_schedules" from "service_role";

revoke update on table "public"."medication_schedules" from "service_role";

alter table "public"."appointments" drop constraint "appointments_recurrence_rule_check";

alter table "public"."care_group" drop constraint "care_circle_members_patient_id_caregiver_id_key";

alter table "public"."care_group" drop constraint "care_circle_members_patient_id_fkey";

alter table "public"."medication_confirmations" drop constraint "medication_confirmations_carer_id_fkey";

alter table "public"."medication_schedules" drop constraint "medication_schedules_medication_id_fkey";

alter table "public"."medication_schedules" drop constraint "medication_schedules_patient_id_fkey";

alter table "public"."daily_medication_checklists" drop constraint "daily_medication_checklists_status_check";

drop function if exists "public"."medication_daily_dose_count"(p_schedule_type text, p_specific_times time without time zone[], p_interval_hours integer, p_days_of_week integer[], p_day_of_month integer);

drop function if exists "public"."update_invite_status"(p_invite_id uuid, p_status public.invite_status);

drop view if exists "public"."upcoming_appointments";

alter table "public"."medication_schedules" drop constraint "medication_schedules_pkey";

drop index if exists "public"."care_circle_members_patient_id_caregiver_id_key";

drop index if exists "public"."idx_appointments_series";

drop index if exists "public"."idx_care_circle_patient";

drop index if exists "public"."idx_medication_schedules_active";

drop index if exists "public"."idx_medication_schedules_patient";

drop index if exists "public"."medication_schedules_pkey";

drop index if exists "public"."idx_med_confirmations_carer";

drop table "public"."medication_schedules";


  create table "public"."insight_cards" (
    "id" uuid not null default gen_random_uuid(),
    "digest_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "description" text not null,
    "trend_direction" text,
    "data_link" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."insight_cards" enable row level security;


  create table "public"."user_insight_dismissals" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "insight_card_id" uuid not null,
    "dismissed_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."user_insight_dismissals" enable row level security;


  create table "public"."weekly_digests" (
    "id" uuid not null default gen_random_uuid(),
    "group_id" uuid not null,
    "start_date" date not null,
    "end_date" date not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."weekly_digests" enable row level security;

alter table "public"."ai_insights" add column "generated_at" timestamp with time zone default now();

alter table "public"."ai_insights" add column "suggested_action" text;

alter table "public"."appointments" drop column "recurrence_rule";

alter table "public"."appointments" drop column "recurrence_series_id";

alter table "public"."appointments" drop column "reminders_sent_offsets";

alter table "public"."appointments" add column "reminder_offsets" integer[] default '{1440,60}'::integer[];

alter table "public"."care_group" drop column "patient_id";

alter table "public"."checklist_items" add column "dosage_unit" text;

alter table "public"."checklist_items" add column "dose" numeric;

alter table "public"."checklist_items" add column "given_by_carer_id" uuid;

alter table "public"."checklist_items" add column "given_notes" text;

alter table "public"."checklist_items" add column "medication_name" text;

alter table "public"."checklist_items" add column "overdue_hours" integer;

alter table "public"."checklist_items" add column "overdue_minutes" integer;

alter table "public"."checklist_items" add column "scheduled_time" text;

alter table "public"."medication_confirmations" drop column "carer_id";

alter table "public"."medication_confirmations" add column "caregiver_id" uuid not null;

CREATE UNIQUE INDEX checklist_items_checklist_med_time_unique ON public.checklist_items USING btree (checklist_id, medication_id, scheduled_time) WHERE (scheduled_time IS NOT NULL);

CREATE UNIQUE INDEX insight_cards_pkey ON public.insight_cards USING btree (id);

CREATE UNIQUE INDEX user_insight_dismissals_pkey ON public.user_insight_dismissals USING btree (id);

CREATE UNIQUE INDEX user_insight_dismissals_user_id_insight_card_id_key ON public.user_insight_dismissals USING btree (user_id, insight_card_id);

CREATE UNIQUE INDEX weekly_digests_group_id_start_date_key ON public.weekly_digests USING btree (group_id, start_date);

CREATE UNIQUE INDEX weekly_digests_pkey ON public.weekly_digests USING btree (id);

CREATE INDEX idx_med_confirmations_carer ON public.medication_confirmations USING btree (caregiver_id);

alter table "public"."insight_cards" add constraint "insight_cards_pkey" PRIMARY KEY using index "insight_cards_pkey";

alter table "public"."user_insight_dismissals" add constraint "user_insight_dismissals_pkey" PRIMARY KEY using index "user_insight_dismissals_pkey";

alter table "public"."weekly_digests" add constraint "weekly_digests_pkey" PRIMARY KEY using index "weekly_digests_pkey";

alter table "public"."checklist_items" add constraint "checklist_items_given_by_carer_id_fkey" FOREIGN KEY (given_by_carer_id) REFERENCES public.profiles(id) not valid;

alter table "public"."checklist_items" validate constraint "checklist_items_given_by_carer_id_fkey";

alter table "public"."insight_cards" add constraint "insight_cards_digest_id_fkey" FOREIGN KEY (digest_id) REFERENCES public.weekly_digests(id) ON DELETE CASCADE not valid;

alter table "public"."insight_cards" validate constraint "insight_cards_digest_id_fkey";

alter table "public"."medication_confirmations" add constraint "medication_confirmations_caregiver_id_fkey" FOREIGN KEY (caregiver_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."medication_confirmations" validate constraint "medication_confirmations_caregiver_id_fkey";

alter table "public"."user_insight_dismissals" add constraint "user_insight_dismissals_insight_card_id_fkey" FOREIGN KEY (insight_card_id) REFERENCES public.insight_cards(id) ON DELETE CASCADE not valid;

alter table "public"."user_insight_dismissals" validate constraint "user_insight_dismissals_insight_card_id_fkey";

alter table "public"."user_insight_dismissals" add constraint "user_insight_dismissals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_insight_dismissals" validate constraint "user_insight_dismissals_user_id_fkey";

alter table "public"."user_insight_dismissals" add constraint "user_insight_dismissals_user_id_insight_card_id_key" UNIQUE using index "user_insight_dismissals_user_id_insight_card_id_key";

alter table "public"."weekly_digests" add constraint "weekly_digests_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.care_group(id) ON DELETE CASCADE not valid;

alter table "public"."weekly_digests" validate constraint "weekly_digests_group_id_fkey";

alter table "public"."weekly_digests" add constraint "weekly_digests_group_id_start_date_key" UNIQUE using index "weekly_digests_group_id_start_date_key";

alter table "public"."daily_medication_checklists" add constraint "daily_medication_checklists_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::text[]))) not valid;

alter table "public"."daily_medication_checklists" validate constraint "daily_medication_checklists_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.medication_daily_dose_count(p_schedule_type text, p_specific_times text[], p_interval_hours integer, p_days_of_week integer[], p_day_of_month integer)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_item_given(p_item_id uuid, p_given_at timestamp with time zone, p_given_notes text DEFAULT NULL::text, p_overdue_hours integer DEFAULT NULL::integer, p_overdue_minutes integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.reset_low_stock_alert_when_restocked()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

create or replace view "public"."upcoming_appointments" as  SELECT a.id,
    a.title,
    a.start_time,
    a.location,
    a.status,
    p.full_name AS patient_name,
    pr.full_name AS provider_name
   FROM ((public.appointments a
     JOIN public.patients p ON ((a.patient_id = p.id)))
     LEFT JOIN public.profiles pr ON ((a.provider_id = pr.id)))
  WHERE ((a.start_time > now()) AND (a.status = ANY (ARRAY['scheduled'::text, 'confirmed'::text])))
  ORDER BY a.start_time;


CREATE OR REPLACE FUNCTION public.update_care_giver_role(p_group_id uuid, p_caregiver_id uuid, p_new_role public.member_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_target_role public.member_role;
  v_other_primary_count integer;
  v_next_primary_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_new_role is null then
    raise exception 'Role is required';
  end if;

  if not exists (
    select 1
    from public.care_givers cg
    where cg.group_id = p_group_id
      and cg.caregiver_id = v_actor_id
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active'
  ) then
    raise exception 'Only primary carers can update member roles';
  end if;

  select cg.role_in_care
  into v_target_role
  from public.care_givers cg
  where cg.group_id = p_group_id
    and cg.caregiver_id = p_caregiver_id
    and cg.status = 'active';

  if not found then
    raise exception 'Member not found in this group';
  end if;

  if v_target_role = p_new_role then
    return;
  end if;

  if p_caregiver_id = v_actor_id
     and v_target_role = 'primary_carer'::public.member_role
     and p_new_role <> 'primary_carer'::public.member_role then
    select count(*)
    into v_other_primary_count
    from public.care_givers cg
    where cg.group_id = p_group_id
      and cg.caregiver_id <> p_caregiver_id
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active';

    if v_other_primary_count = 0 then
      raise exception 'You cannot change your role while you are the only primary carer';
    end if;
  end if;

  if v_target_role = 'primary_carer'::public.member_role
     and p_new_role <> 'primary_carer'::public.member_role
     and exists (
       select 1
       from public.care_group g
       where g.id = p_group_id
         and g.primary_caregiver_id = p_caregiver_id
     ) then
    select cg.caregiver_id
    into v_next_primary_id
    from public.care_givers cg
    where cg.group_id = p_group_id
      and cg.caregiver_id <> p_caregiver_id
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active'
    order by cg.joined_at asc
    limit 1;

    if v_next_primary_id is null then
      raise exception 'Cannot change role: assign another primary carer before demoting the group owner';
    end if;

    update public.care_group
    set primary_caregiver_id = v_next_primary_id,
        updated_at = now()
    where id = p_group_id;

    update public.patients
    set primary_caregiver_id = v_next_primary_id,
        updated_at = now()
    where group_id = p_group_id;
  end if;

  update public.care_givers
  set role_in_care = p_new_role,
      updated_at = now()
  where group_id = p_group_id
    and caregiver_id = p_caregiver_id
    and status = 'active';
end;
$function$
;

grant delete on table "public"."insight_cards" to "anon";

grant insert on table "public"."insight_cards" to "anon";

grant references on table "public"."insight_cards" to "anon";

grant select on table "public"."insight_cards" to "anon";

grant trigger on table "public"."insight_cards" to "anon";

grant truncate on table "public"."insight_cards" to "anon";

grant update on table "public"."insight_cards" to "anon";

grant delete on table "public"."insight_cards" to "authenticated";

grant insert on table "public"."insight_cards" to "authenticated";

grant references on table "public"."insight_cards" to "authenticated";

grant select on table "public"."insight_cards" to "authenticated";

grant trigger on table "public"."insight_cards" to "authenticated";

grant truncate on table "public"."insight_cards" to "authenticated";

grant update on table "public"."insight_cards" to "authenticated";

grant delete on table "public"."insight_cards" to "service_role";

grant insert on table "public"."insight_cards" to "service_role";

grant references on table "public"."insight_cards" to "service_role";

grant select on table "public"."insight_cards" to "service_role";

grant trigger on table "public"."insight_cards" to "service_role";

grant truncate on table "public"."insight_cards" to "service_role";

grant update on table "public"."insight_cards" to "service_role";

grant delete on table "public"."user_insight_dismissals" to "anon";

grant insert on table "public"."user_insight_dismissals" to "anon";

grant references on table "public"."user_insight_dismissals" to "anon";

grant select on table "public"."user_insight_dismissals" to "anon";

grant trigger on table "public"."user_insight_dismissals" to "anon";

grant truncate on table "public"."user_insight_dismissals" to "anon";

grant update on table "public"."user_insight_dismissals" to "anon";

grant delete on table "public"."user_insight_dismissals" to "authenticated";

grant insert on table "public"."user_insight_dismissals" to "authenticated";

grant references on table "public"."user_insight_dismissals" to "authenticated";

grant select on table "public"."user_insight_dismissals" to "authenticated";

grant trigger on table "public"."user_insight_dismissals" to "authenticated";

grant truncate on table "public"."user_insight_dismissals" to "authenticated";

grant update on table "public"."user_insight_dismissals" to "authenticated";

grant delete on table "public"."user_insight_dismissals" to "service_role";

grant insert on table "public"."user_insight_dismissals" to "service_role";

grant references on table "public"."user_insight_dismissals" to "service_role";

grant select on table "public"."user_insight_dismissals" to "service_role";

grant trigger on table "public"."user_insight_dismissals" to "service_role";

grant truncate on table "public"."user_insight_dismissals" to "service_role";

grant update on table "public"."user_insight_dismissals" to "service_role";

grant delete on table "public"."weekly_digests" to "anon";

grant insert on table "public"."weekly_digests" to "anon";

grant references on table "public"."weekly_digests" to "anon";

grant select on table "public"."weekly_digests" to "anon";

grant trigger on table "public"."weekly_digests" to "anon";

grant truncate on table "public"."weekly_digests" to "anon";

grant update on table "public"."weekly_digests" to "anon";

grant delete on table "public"."weekly_digests" to "authenticated";

grant insert on table "public"."weekly_digests" to "authenticated";

grant references on table "public"."weekly_digests" to "authenticated";

grant select on table "public"."weekly_digests" to "authenticated";

grant trigger on table "public"."weekly_digests" to "authenticated";

grant truncate on table "public"."weekly_digests" to "authenticated";

grant update on table "public"."weekly_digests" to "authenticated";

grant delete on table "public"."weekly_digests" to "service_role";

grant insert on table "public"."weekly_digests" to "service_role";

grant references on table "public"."weekly_digests" to "service_role";

grant select on table "public"."weekly_digests" to "service_role";

grant trigger on table "public"."weekly_digests" to "service_role";

grant truncate on table "public"."weekly_digests" to "service_role";

grant update on table "public"."weekly_digests" to "service_role";


  create policy "caregivers_delete_appointments"
  on "public"."appointments"
  as permissive
  for delete
  to authenticated
using (public.is_caregiver_for(patient_id));



  create policy "caregivers_insert_appointments"
  on "public"."appointments"
  as permissive
  for insert
  to authenticated
with check ((public.is_caregiver_for(patient_id) AND (created_by = auth.uid())));



  create policy "caregivers_read_appointments"
  on "public"."appointments"
  as permissive
  for select
  to authenticated
using (public.is_caregiver_for(patient_id));



  create policy "caregivers_update_appointments"
  on "public"."appointments"
  as permissive
  for update
  to authenticated
using (public.is_caregiver_for(patient_id));



  create policy "Active carers can insert checklist items"
  on "public"."checklist_items"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.daily_medication_checklists dmc
     JOIN public.care_givers cg ON ((cg.group_id = dmc.group_id)))
  WHERE ((dmc.id = checklist_items.checklist_id) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text)))));



  create policy "Active carers can select checklist items"
  on "public"."checklist_items"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.daily_medication_checklists dmc
     JOIN public.care_givers cg ON ((cg.group_id = dmc.group_id)))
  WHERE ((dmc.id = checklist_items.checklist_id) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text)))));



  create policy "Active carers can update checklist items"
  on "public"."checklist_items"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.daily_medication_checklists dmc
     JOIN public.care_givers cg ON ((cg.group_id = dmc.group_id)))
  WHERE ((dmc.id = checklist_items.checklist_id) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text)))));



  create policy "Active carers can insert daily checklists"
  on "public"."daily_medication_checklists"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.group_id = daily_medication_checklists.group_id) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text)))));



  create policy "Active carers can select daily checklists"
  on "public"."daily_medication_checklists"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.group_id = daily_medication_checklists.group_id) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text)))));



  create policy "Group members can view insight cards"
  on "public"."insight_cards"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.weekly_digests wd
     JOIN public.care_givers cg ON ((cg.group_id = wd.group_id)))
  WHERE ((wd.id = insight_cards.digest_id) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text)))));



  create policy "caregivers can insert medications for their patients"
  on "public"."medications"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (public.care_givers cg
     JOIN public.patients p ON ((p.group_id = cg.group_id)))
  WHERE ((p.id = medications.patient_id) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text)))));



  create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can dismiss their own insights"
  on "public"."user_insight_dismissals"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own dismissals"
  on "public"."user_insight_dismissals"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Group members can view weekly digests"
  on "public"."weekly_digests"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.group_id = weekly_digests.group_id) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text)))));



  create policy "caregivers_insert_own_confirmation"
  on "public"."medication_confirmations"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = caregiver_id));



  create policy "caregivers_insert_medications"
  on "public"."medications"
  as permissive
  for insert
  to authenticated
with check ((public.is_caregiver_for(patient_id) AND (prescribed_by = auth.uid())));



  create policy "caregivers_read_medications"
  on "public"."medications"
  as permissive
  for select
  to authenticated
using (public.is_caregiver_for(patient_id));


CREATE TRIGGER enforce_member_limit BEFORE INSERT OR UPDATE ON public.care_givers FOR EACH ROW EXECUTE FUNCTION public.check_active_member_limit();


