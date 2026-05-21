create type "public"."group_member_role" as enum ('primary_carer', 'secondary_carer', 'observer');

create type "public"."member_role" as enum ('primary_carer', 'secondary_carer', 'observer');

drop policy "patients delete by active primary carer" on "public"."patients";

drop policy "patients update by active primary carer" on "public"."patients";

alter table "public"."checklist_items" drop constraint "checklist_items_status_check";

alter table "public"."daily_medication_checklists" drop constraint "daily_medication_checklists_status_check";

alter table "public"."care_givers" alter column "role_in_care" set data type public.member_role using "role_in_care"::public.member_role;

alter table "public"."care_group" add column "role" public.group_member_role not null default 'observer'::public.group_member_role;

alter table "public"."medications" drop column "frequency";

alter table "public"."medications" drop column "time_of_day";

alter table "public"."medications" add column "day_of_month" integer;

alter table "public"."medications" add column "days_of_week" integer[];

alter table "public"."medications" add column "interval_hours" integer;

alter table "public"."medications" add column "schedule_type" text;

alter table "public"."medications" add constraint "medications_schedule_type_check" CHECK ((schedule_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'as_needed'::text]))) not valid;

alter table "public"."medications" validate constraint "medications_schedule_type_check";

alter table "public"."checklist_items" add constraint "checklist_items_status_check" CHECK (((status)::text = ANY ((ARRAY['due'::character varying, 'given'::character varying, 'overdue'::character varying, 'skipped'::character varying])::text[]))) not valid;

alter table "public"."checklist_items" validate constraint "checklist_items_status_check";

alter table "public"."daily_medication_checklists" add constraint "daily_medication_checklists_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::text[]))) not valid;

alter table "public"."daily_medication_checklists" validate constraint "daily_medication_checklists_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.edit_medication(p_id uuid, p_changes jsonb)
 RETURNS public.medications
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  old_row medications;
  new_row medications;
BEGIN
  SELECT * INTO old_row FROM medications WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medication % not found', p_id;
  END IF;

  UPDATE medications
  SET status = 'superseded', updated_at = now()
  WHERE id = p_id;

  INSERT INTO medications (
    id,
    patient_id,
    medication_name,
    generic_name,
    dosage,
    form,
    prescribed_by,
    prescribed_date,
    prescription_number,
    schedule_type,
    specific_times,
    interval_hours,
    days_of_week,
    day_of_month,
    instructions,
    route,
    take_with_food,
    start_date,
    end_date,
    status,
    discontinued_date,
    discontinued_reason,
    refills_remaining,
    last_refill_date,
    pharmacy,
    pharmacy_phone,
    side_effects,
    notes,
    version,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    old_row.patient_id,

    COALESCE(p_changes->>'medication_name', old_row.medication_name),
    old_row.generic_name,
    COALESCE(p_changes->>'dosage', old_row.dosage),
    old_row.form,
    old_row.prescribed_by,
    old_row.prescribed_date,
    old_row.prescription_number,

    COALESCE(p_changes->>'schedule_type', old_row.schedule_type),

    CASE
      WHEN p_changes ? 'specific_times' THEN
        CASE
          WHEN p_changes->'specific_times' = 'null'::jsonb THEN NULL
          ELSE ARRAY(SELECT jsonb_array_elements_text(p_changes->'specific_times'))
        END
      ELSE old_row.specific_times
    END,

    CASE
      WHEN p_changes ? 'interval_hours' THEN
        CASE
          WHEN p_changes->'interval_hours' = 'null'::jsonb THEN NULL
          ELSE (p_changes->>'interval_hours')::integer
        END
      ELSE old_row.interval_hours
    END,

    CASE
      WHEN p_changes ? 'days_of_week' THEN
        CASE
          WHEN p_changes->'days_of_week' = 'null'::jsonb THEN NULL
          ELSE ARRAY(SELECT jsonb_array_elements_text(p_changes->'days_of_week')::integer)
        END
      ELSE old_row.days_of_week
    END,

    CASE
      WHEN p_changes ? 'day_of_month' THEN
        CASE
          WHEN p_changes->'day_of_month' = 'null'::jsonb THEN NULL
          ELSE (p_changes->>'day_of_month')::integer
        END
      ELSE old_row.day_of_month
    END,

    CASE
      WHEN p_changes ? 'instructions' THEN p_changes->>'instructions'
      ELSE old_row.instructions
    END,

    old_row.route,
    old_row.take_with_food,

    COALESCE(p_changes->>'start_date', old_row.start_date::text)::date,

    old_row.end_date,
    'active',
    old_row.discontinued_date,
    old_row.discontinued_reason,
    old_row.refills_remaining,
    old_row.last_refill_date,
    old_row.pharmacy,
    old_row.pharmacy_phone,
    old_row.side_effects,

    CASE
      WHEN p_changes ? 'notes' THEN p_changes->>'notes'
      ELSE old_row.notes
    END,

    old_row.version + 1,
    now(),
    now()
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$function$
;


  create policy "Primary Carers can update members in their group"
  on "public"."care_givers"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.group_id = care_givers.group_id) AND (cg.caregiver_id = auth.uid()) AND (cg.role_in_care = 'primary_carer'::public.member_role) AND (cg.status = 'active'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.group_id = care_givers.group_id) AND (cg.caregiver_id = auth.uid()) AND (cg.role_in_care = 'primary_carer'::public.member_role) AND (cg.status = 'active'::text)))));



  create policy "group admin can insert the data"
  on "public"."daily_medication_checklists"
  as permissive
  for insert
  to authenticated
with check ((group_id IN ( SELECT daily_medication_checklists.group_id
   FROM public.care_group
  WHERE (care_group.primary_caregiver_id = auth.uid()))));



  create policy "patients delete by active primary carer"
  on "public"."patients"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.patient_id = patients.id) AND (cg.caregiver_id = auth.uid()) AND (cg.role_in_care = 'primary_carer'::public.member_role) AND (cg.status = 'active'::text)))));



  create policy "patients update by active primary carer"
  on "public"."patients"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.patient_id = patients.id) AND (cg.caregiver_id = auth.uid()) AND (cg.role_in_care = 'primary_carer'::public.member_role) AND (cg.status = 'active'::text)))));


drop policy "patient avatars delete by primary carer" on "storage"."objects";

drop policy "patient avatars insert by primary carer" on "storage"."objects";

drop policy "patient avatars update by primary carer" on "storage"."objects";


  create policy "patient avatars delete by primary carer"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'avatars'::text) AND (EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.caregiver_id = auth.uid()) AND (cg.role_in_care = 'primary_carer'::public.member_role) AND (cg.status = 'active'::text))))));



  create policy "patient avatars insert by primary carer"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND (EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.caregiver_id = auth.uid()) AND (cg.role_in_care = 'primary_carer'::public.member_role) AND (cg.status = 'active'::text))))));



  create policy "patient avatars update by primary carer"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND (EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE ((cg.caregiver_id = auth.uid()) AND (cg.role_in_care = 'primary_carer'::public.member_role) AND (cg.status = 'active'::text))))));



