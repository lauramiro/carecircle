


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."invite_status" AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'expired'
);


ALTER TYPE "public"."invite_status" OWNER TO "postgres";


CREATE TYPE "public"."medication_unit" AS ENUM (
    'mg',
    'ml',
    'mcg',
    'units'
);


ALTER TYPE "public"."medication_unit" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_active_member_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  active_count INT;
BEGIN
  -- Only run the check if a user is being inserted as 'active' 
  -- or if an existing user is being updated to 'active'
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
    
    -- Count current active members in this specific group
    SELECT COUNT(*) INTO active_count 
    FROM care_givers 
    WHERE group_id = NEW.group_id AND status = 'active';

    -- If 8 or more exist, block the action and throw an error
    IF active_count >= 8 THEN
      RAISE EXCEPTION 'Group has reached the maximum capacity of 8 active members.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_active_member_limit"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invite_type" "text" NOT NULL,
    "status" "public"."invite_status" DEFAULT 'pending'::"public"."invite_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '48:00:00'::interval) NOT NULL
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group_invite"("p_group_id" "uuid", "p_email" "text", "p_invite_type" "text") RETURNS "public"."invites"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_invite invites;
begin
  insert into invites (group_id, email, invite_type)
  values (p_group_id, p_email, p_invite_type)
  returning * into new_invite;

  return new_invite;
end;
$$;


ALTER FUNCTION "public"."create_group_invite"("p_group_id" "uuid", "p_email" "text", "p_invite_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_patient_checklist_today"("p_patient_id" "uuid", "p_include_past" boolean DEFAULT false) RETURNS TABLE("checklist_id" "uuid", "checklist_date" "date", "item_id" "uuid", "medication_name" character varying, "dosage" numeric, "dosage_unit" character varying, "time_of_day" character varying, "window_start" character varying, "window_end" character varying, "status" character varying, "given_at" timestamp without time zone, "skip_reason" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dmc.id,
    dmc.checklist_date,
    ci.id,
    m.name,
    m.dosage,
    m.dosage_unit,
    ci.time_of_day,
    ci.window_start,
    ci.window_end,
    ci.status,
    ci.given_at,
    ci.skip_reason
  FROM daily_medication_checklists dmc
  JOIN checklist_items ci ON dmc.id = ci.checklist_id
  JOIN medications m ON ci.medication_id = m.id
  WHERE dmc.patient_id = p_patient_id
  AND (
    (p_include_past = FALSE AND dmc.checklist_date = CURRENT_DATE)
    OR (p_include_past = TRUE AND dmc.checklist_date >= CURRENT_DATE - INTERVAL '7 days')
  )
  ORDER BY dmc.checklist_date DESC, ci.time_of_day ASC;
END;
$$;


ALTER FUNCTION "public"."get_patient_checklist_today"("p_patient_id" "uuid", "p_include_past" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Insert a new profile record when a user signs up
    -- Uses data from auth.users (NEW record)
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        email_verified,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,                                    -- UUID from auth.users
        NEW.email,                                 -- Email from auth.users
        COALESCE(NEW.raw_user_meta_data->>'full_name', 
                 NEW.raw_user_meta_data->>'name',
                 split_part(NEW.email, '@', 1)),  -- Extract name from metadata or email
        COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),  -- Default role: patient
        NEW.email_confirmed_at IS NOT NULL,        -- Check if email is verified
        NOW(),
        NOW()
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates a profile record when a new user signs up via Supabase Auth';



CREATE OR REPLACE FUNCTION "public"."handle_user_email_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If email changed in auth.users, update it in profiles
    IF OLD.email IS DISTINCT FROM NEW.email THEN
        UPDATE public.profiles
        SET 
            email = NEW.email,
            email_verified = (NEW.email_confirmed_at IS NOT NULL),
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    -- If email verification status changed, update it in profiles
    IF OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at THEN
        UPDATE public.profiles
        SET 
            email_verified = (NEW.email_confirmed_at IS NOT NULL),
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_email_update"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_user_email_update"() IS 'Syncs email and email_verified status from auth.users to profiles';



CREATE OR REPLACE FUNCTION "public"."handle_user_last_seen"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Update last_seen_at when user's last_sign_in_at changes
    IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
        UPDATE public.profiles
        SET 
            last_seen_at = NEW.last_sign_in_at,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_last_seen"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_user_last_seen"() IS 'Updates last_seen_at in profiles when user signs in';



CREATE OR REPLACE FUNCTION "public"."is_caregiver_for"("p_patient_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_givers
    WHERE caregiver_id = auth.uid()
      AND patient_id = p_patient_id
      AND status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_caregiver_for"("p_patient_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_email_registered"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from auth.users
    where lower(btrim(email)) = lower(btrim(p_email))
  );
$$;


ALTER FUNCTION "public"."is_email_registered"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_member"("check_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 
    from care_givers 
    where group_id = check_group_id 
    and caregiver_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_group_member"("check_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
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
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_profile_trigger"() RETURNS TABLE("total_users" integer, "users_with_profiles" integer, "users_without_profiles" integer, "sync_percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_total INTEGER;
    v_with_profiles INTEGER;
    v_without_profiles INTEGER;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO v_total FROM auth.users;
    
    -- Count users with profiles
    SELECT COUNT(*) 
    INTO v_with_profiles
    FROM auth.users u
    INNER JOIN public.profiles p ON u.id = p.id;
    
    -- Calculate users without profiles
    v_without_profiles := v_total - v_with_profiles;
    
    RETURN QUERY 
    SELECT 
        v_total,
        v_with_profiles,
        v_without_profiles,
        CASE 
            WHEN v_total = 0 THEN 0
            ELSE ROUND((v_with_profiles::NUMERIC / v_total::NUMERIC) * 100, 2)
        END;
END;
$$;


ALTER FUNCTION "public"."verify_profile_trigger"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_profile_trigger"() IS 'Verifies that all auth.users have corresponding profiles';



CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "appointment_type" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "location" "text",
    "is_virtual" boolean DEFAULT false,
    "virtual_meeting_link" "text",
    "provider_id" "uuid",
    "provider_name" "text",
    "attendees" "uuid"[],
    "status" "text" DEFAULT 'scheduled'::"text",
    "reminder_sent" boolean DEFAULT false,
    "reminder_sent_at" timestamp with time zone,
    "notes" "text",
    "post_appointment_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "cancellation_reason" "text",
    CONSTRAINT "appointments_appointment_type_check" CHECK (("appointment_type" = ANY (ARRAY['checkup'::"text", 'specialist'::"text", 'therapy'::"text", 'lab'::"text", 'imaging'::"text", 'surgery'::"text", 'other'::"text"]))),
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'no_show'::"text"]))),
    CONSTRAINT "valid_time_range" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


COMMENT ON TABLE "public"."appointments" IS 'Patient appointments and scheduling';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "changes" "jsonb",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Audit trail of all system actions';



CREATE TABLE IF NOT EXISTS "public"."care_givers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "caregiver_id" "uuid" NOT NULL,
    "role_in_care" "text",
    "can_view_medical" boolean,
    "can_schedule" boolean,
    "can_communicate" boolean,
    "status" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "relationship" "text",
    CONSTRAINT "care_givers_status_check" CHECK (("status" = ANY (ARRAY['suspended'::"text", 'inactive'::"text", 'active'::"text"])))
);


ALTER TABLE "public"."care_givers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."care_group" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "primary_caregiver_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "name" "text",
    "preferred_timezone" timestamp with time zone
);


ALTER TABLE "public"."care_group" OWNER TO "postgres";


COMMENT ON TABLE "public"."care_group" IS 'Care team members for each patient';



CREATE TABLE IF NOT EXISTS "public"."care_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "goals" "text"[],
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "review_date" "date",
    "status" "text" DEFAULT 'active'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "care_plans_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."care_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."care_plans" IS 'Care plans for patients';



CREATE TABLE IF NOT EXISTS "public"."care_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "full_name" "text" NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "avatar_url" "text",
    "conditions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "allergies" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."care_recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checklist_id" "uuid" NOT NULL,
    "medication_id" "uuid" NOT NULL,
    "time_of_day" character varying(5) NOT NULL,
    "window_start" character varying(5) NOT NULL,
    "window_end" character varying(5) NOT NULL,
    "status" character varying(20) DEFAULT 'due'::character varying NOT NULL,
    "given_at" timestamp without time zone,
    "given_by_user_id" "uuid",
    "skip_reason" character varying(100),
    "skip_notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "check_given_or_skipped" CHECK ((NOT (("given_at" IS NOT NULL) AND ("skip_reason" IS NOT NULL)))),
    CONSTRAINT "check_given_requires_timestamp" CHECK ((((("status")::"text" = 'given'::"text") AND ("given_at" IS NOT NULL)) OR (("status")::"text" <> 'given'::"text"))),
    CONSTRAINT "check_skip_requires_reason" CHECK ((((("status")::"text" = 'skipped'::"text") AND ("skip_reason" IS NOT NULL)) OR (("status")::"text" <> 'skipped'::"text"))),
    CONSTRAINT "checklist_items_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['due'::character varying, 'given'::character varying, 'overdue'::character varying, 'skipped'::character varying])::"text"[])))
);


ALTER TABLE "public"."checklist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_medication_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "checklist_date" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "give_at" timestamp with time zone,
    "skip_reason" "text",
    CONSTRAINT "daily_medication_checklists_checklist_date_check" CHECK (("checklist_date" >= (CURRENT_DATE - '90 days'::interval))),
    CONSTRAINT "daily_medication_checklists_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::"text"[])))
);


ALTER TABLE "public"."daily_medication_checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer,
    "file_url" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "document_type" "text",
    "title" "text",
    "description" "text",
    "tags" "text"[],
    "is_sensitive" boolean DEFAULT false,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['medical_record'::"text", 'insurance'::"text", 'consent_form'::"text", 'lab_report'::"text", 'imaging'::"text", 'prescription'::"text", 'legal'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."documents" IS 'Patient documents and files';



CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "preferred_timezone" character varying(100) DEFAULT 'UTC'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medical_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "record_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "diagnosis_code" "text",
    "procedure_code" "text",
    "provider_id" "uuid",
    "facility" "text",
    "data" "jsonb",
    "record_date" "date" NOT NULL,
    "attachments" "text"[],
    "tags" "text"[],
    "is_sensitive" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "medical_records_record_type_check" CHECK (("record_type" = ANY (ARRAY['diagnosis'::"text", 'lab_result'::"text", 'imaging'::"text", 'prescription'::"text", 'procedure'::"text", 'vaccination'::"text", 'vital_signs'::"text", 'note'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."medical_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."medical_records" IS 'Medical records, lab results, diagnoses, procedures';



CREATE TABLE IF NOT EXISTS "public"."medication_confirmations" (
    "id" bigint NOT NULL,
    "checklist_item_id" "uuid" DEFAULT "gen_random_uuid"(),
    "carer_id" "uuid" DEFAULT "gen_random_uuid"(),
    "photo_url" "text",
    "confirmed_at_utc" timestamp with time zone DEFAULT "now"() NOT NULL,
    "loca_time_zone" timestamp with time zone,
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."medication_confirmations" OWNER TO "postgres";


ALTER TABLE "public"."medication_confirmations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."medication_confirmations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."medication_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "medication_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "scheduled_time" timestamp with time zone NOT NULL,
    "actual_time" timestamp with time zone,
    "status" "text" NOT NULL,
    "dosage_taken" "text",
    "notes" "text",
    "logged_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "medication_logs_status_check" CHECK (("status" = ANY (ARRAY['taken'::"text", 'missed'::"text", 'skipped'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."medication_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."medication_logs" IS 'Log of medication doses taken/missed';



CREATE TABLE IF NOT EXISTS "public"."medication_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "medication_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "time_of_day" character varying(5) NOT NULL,
    "window_start" character varying(5) NOT NULL,
    "window_end" character varying(5) NOT NULL,
    "days_of_week" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."medication_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "medication_name" "text" NOT NULL,
    "name" "text",
    "form" "text",
    "prescribed_by" "uuid",
    "prescribed_date" "date",
    "prescription_number" "text",
    "frequency" "text" NOT NULL,
    "time_of_day" "text"[],
    "specific_times" time without time zone[],
    "instructions" "text",
    "route" "text",
    "take_with_food" boolean,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "status" "text" DEFAULT 'active'::"text",
    "discontinued_date" "date",
    "discontinued_reason" "text",
    "refills_remaining" integer,
    "last_refill_date" "date",
    "pharmacy" "text",
    "pharmacy_phone" "text",
    "side_effects" "text"[],
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "version" smallint DEFAULT '1'::smallint,
    "dosage_unit" "text",
    "dose" numeric NOT NULL,
    "unit" "public"."medication_unit" NOT NULL,
    "created_by" "uuid",
    "time_windows" "jsonb",
    CONSTRAINT "medications_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'discontinued'::"text"])))
);


ALTER TABLE "public"."medications" OWNER TO "postgres";


COMMENT ON TABLE "public"."medications" IS 'Patient medication schedules and prescriptions';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "thread_id" "uuid",
    "parent_message_id" "uuid",
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid",
    "patient_id" "uuid",
    "subject" "text",
    "body" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text",
    "attachments" "text"[],
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "is_urgent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'alert'::"text", 'reminder'::"text", 'update'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Internal messaging between care team members';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "related_entity_type" "text",
    "related_entity_id" "uuid",
    "action_url" "text",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "sent_via" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'User notifications';



CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "full_name" "text" NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "gender" "text",
    "blood_type" "text",
    "email" "text",
    "phone" "text",
    "emergency_contact" "jsonb",
    "address" "jsonb",
    "medical_record_number" "text",
    "insurance_info" "jsonb",
    "allergies" "text"[],
    "chronic_conditions" "text"[],
    "current_medications" "text"[],
    "care_level" "text",
    "primary_caregiver_id" "uuid",
    "primary_physician_id" "uuid",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "group_id" "uuid",
    "avatar_url" "text",
    CONSTRAINT "patients_blood_type_check" CHECK (("blood_type" = ANY (ARRAY['A+'::"text", 'A-'::"text", 'B+'::"text", 'B-'::"text", 'AB+'::"text", 'AB-'::"text", 'O+'::"text", 'O-'::"text"]))),
    CONSTRAINT "patients_care_level_check" CHECK (("care_level" = ANY (ARRAY['independent'::"text", 'assisted'::"text", 'intensive'::"text", 'hospice'::"text"]))),
    CONSTRAINT "patients_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text", 'prefer_not_to_say'::"text"]))),
    CONSTRAINT "valid_patient_contact" CHECK ((("email" IS NOT NULL) OR ("phone" IS NOT NULL)))
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


COMMENT ON TABLE "public"."patients" IS 'Patient records with medical information';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "avatar_url" "text",
    "date_of_birth" "date",
    "address" "jsonb",
    "role" "text" NOT NULL,
    "license_number" "text",
    "specialization" "text",
    "organization" "text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "email_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_seen_at" timestamp with time zone,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['patient'::"text", 'caregiver'::"text", 'healthcare_provider'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles extending Supabase auth';



COMMENT ON COLUMN "public"."profiles"."role" IS 'User role: patient, caregiver, healthcare_provider, admin';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "care_plan_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "task_type" "text",
    "assigned_to" "uuid",
    "due_date" "date",
    "due_time" time without time zone,
    "recurrence" "text",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "completion_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'overdue'::"text"]))),
    CONSTRAINT "tasks_task_type_check" CHECK (("task_type" = ANY (ARRAY['medication'::"text", 'appointment'::"text", 'exercise'::"text", 'meal'::"text", 'hygiene'::"text", 'vital_check'::"text", 'therapy'::"text", 'social'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Care tasks and activities';



CREATE OR REPLACE VIEW "public"."upcoming_appointments" WITH ("security_invoker"='on') AS
 SELECT "a"."id",
    "a"."title",
    "a"."start_time",
    "a"."location",
    "a"."status",
    "p"."full_name" AS "patient_name",
    "pr"."full_name" AS "provider_name"
   FROM (("public"."appointments" "a"
     JOIN "public"."patients" "p" ON (("a"."patient_id" = "p"."id")))
     LEFT JOIN "public"."profiles" "pr" ON (("a"."provider_id" = "pr"."id")))
  WHERE (("a"."start_time" > "now"()) AND ("a"."status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text"])))
  ORDER BY "a"."start_time";


ALTER VIEW "public"."upcoming_appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vital_signs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "blood_pressure_systolic" integer,
    "blood_pressure_diastolic" integer,
    "heart_rate" integer,
    "temperature" numeric(4,1),
    "respiratory_rate" integer,
    "oxygen_saturation" integer,
    "blood_glucose" integer,
    "weight" numeric(5,2),
    "height" numeric(5,2),
    "measured_at" timestamp with time zone NOT NULL,
    "measured_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vital_signs" OWNER TO "postgres";


COMMENT ON TABLE "public"."vital_signs" IS 'Time-series vital signs measurements';



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."care_group"
    ADD CONSTRAINT "care_circle_members_patient_id_caregiver_id_key" UNIQUE ("patient_id", "primary_caregiver_id");



ALTER TABLE ONLY "public"."care_group"
    ADD CONSTRAINT "care_circle_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."care_givers"
    ADD CONSTRAINT "care_givers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."care_givers"
    ADD CONSTRAINT "care_givers_unique_member" UNIQUE ("group_id", "patient_id", "caregiver_id");



ALTER TABLE ONLY "public"."care_plans"
    ADD CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."care_recipients"
    ADD CONSTRAINT "care_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_medication_checklists"
    ADD CONSTRAINT "daily_medication_checklists_group_id_patient_id_checklist_d_key" UNIQUE ("group_id", "patient_id", "checklist_date");



ALTER TABLE ONLY "public"."daily_medication_checklists"
    ADD CONSTRAINT "daily_medication_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_group_id_key" UNIQUE ("group_id");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medication_confirmations"
    ADD CONSTRAINT "medication_confirmations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medication_logs"
    ADD CONSTRAINT "medication_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medication_schedules"
    ADD CONSTRAINT "medication_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medications"
    ADD CONSTRAINT "medications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_group_id_key" UNIQUE ("group_id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_medical_record_number_key" UNIQUE ("medical_record_number");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_appointments_patient" ON "public"."appointments" USING "btree" ("patient_id");



CREATE INDEX "idx_appointments_provider" ON "public"."appointments" USING "btree" ("provider_id");



CREATE INDEX "idx_appointments_start_time" ON "public"."appointments" USING "btree" ("start_time");



CREATE INDEX "idx_appointments_status" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_care_circle_caregiver" ON "public"."care_group" USING "btree" ("primary_caregiver_id");



CREATE INDEX "idx_care_circle_patient" ON "public"."care_group" USING "btree" ("patient_id");



CREATE INDEX "idx_care_givers_care_giver_id" ON "public"."care_givers" USING "btree" ("caregiver_id");



CREATE INDEX "idx_care_givers_group_id" ON "public"."care_givers" USING "btree" ("group_id");



CREATE INDEX "idx_care_givers_patient_id" ON "public"."care_givers" USING "btree" ("patient_id");



CREATE INDEX "idx_care_givers_status" ON "public"."care_givers" USING "btree" ("status");



CREATE INDEX "idx_care_plans_patient" ON "public"."care_plans" USING "btree" ("patient_id");



CREATE INDEX "idx_care_plans_status" ON "public"."care_plans" USING "btree" ("status");



CREATE INDEX "idx_checklist_items_checklist" ON "public"."checklist_items" USING "btree" ("checklist_id");



CREATE INDEX "idx_checklist_items_medication" ON "public"."checklist_items" USING "btree" ("medication_id");



CREATE INDEX "idx_checklist_items_status" ON "public"."checklist_items" USING "btree" ("status");



CREATE INDEX "idx_checklist_items_time" ON "public"."checklist_items" USING "btree" ("time_of_day");



CREATE INDEX "idx_daily_checklists_date" ON "public"."daily_medication_checklists" USING "btree" ("checklist_date" DESC);



CREATE INDEX "idx_daily_checklists_family" ON "public"."daily_medication_checklists" USING "btree" ("group_id");



CREATE INDEX "idx_daily_checklists_patient" ON "public"."daily_medication_checklists" USING "btree" ("patient_id");



CREATE INDEX "idx_documents_patient" ON "public"."documents" USING "btree" ("patient_id");



CREATE INDEX "idx_documents_type" ON "public"."documents" USING "btree" ("document_type");



CREATE INDEX "idx_documents_uploaded_by" ON "public"."documents" USING "btree" ("uploaded_by");



CREATE INDEX "idx_families_timezone" ON "public"."families" USING "btree" ("preferred_timezone");



CREATE INDEX "idx_medical_records_date" ON "public"."medical_records" USING "btree" ("record_date");



CREATE INDEX "idx_medical_records_patient" ON "public"."medical_records" USING "btree" ("patient_id");



CREATE INDEX "idx_medical_records_provider" ON "public"."medical_records" USING "btree" ("provider_id");



CREATE INDEX "idx_medical_records_type" ON "public"."medical_records" USING "btree" ("record_type");



CREATE INDEX "idx_medication_logs_medication" ON "public"."medication_logs" USING "btree" ("medication_id");



CREATE INDEX "idx_medication_logs_patient" ON "public"."medication_logs" USING "btree" ("patient_id");



CREATE INDEX "idx_medication_logs_scheduled_time" ON "public"."medication_logs" USING "btree" ("scheduled_time");



CREATE INDEX "idx_medication_logs_status" ON "public"."medication_logs" USING "btree" ("status");



CREATE INDEX "idx_medication_schedules_active" ON "public"."medication_schedules" USING "btree" ("is_active");



CREATE INDEX "idx_medication_schedules_patient" ON "public"."medication_schedules" USING "btree" ("patient_id");



CREATE INDEX "idx_medications_patient" ON "public"."medications" USING "btree" ("patient_id");



CREATE INDEX "idx_medications_start_date" ON "public"."medications" USING "btree" ("start_date");



CREATE INDEX "idx_medications_status" ON "public"."medications" USING "btree" ("status");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_is_read" ON "public"."messages" USING "btree" ("is_read");



CREATE INDEX "idx_messages_patient" ON "public"."messages" USING "btree" ("patient_id");



CREATE INDEX "idx_messages_recipient" ON "public"."messages" USING "btree" ("recipient_id");



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_thread" ON "public"."messages" USING "btree" ("thread_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_patients_is_active" ON "public"."patients" USING "btree" ("is_active");



CREATE INDEX "idx_patients_medical_record_number" ON "public"."patients" USING "btree" ("medical_record_number");



CREATE INDEX "idx_patients_primary_caregiver" ON "public"."patients" USING "btree" ("primary_caregiver_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_is_active" ON "public"."profiles" USING "btree" ("is_active");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");



CREATE INDEX "idx_tasks_patient" ON "public"."tasks" USING "btree" ("patient_id");



CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING "btree" ("priority");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_vital_signs_measured_at" ON "public"."vital_signs" USING "btree" ("measured_at");



CREATE INDEX "idx_vital_signs_patient" ON "public"."vital_signs" USING "btree" ("patient_id");



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_care_circle_updated_at" BEFORE UPDATE ON "public"."care_group" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_care_givers_updated_at" BEFORE UPDATE ON "public"."care_givers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_care_plans_updated_at" BEFORE UPDATE ON "public"."care_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_medical_records_updated_at" BEFORE UPDATE ON "public"."medical_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_medications_updated_at" BEFORE UPDATE ON "public"."medications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_patients_updated_at" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."care_group"
    ADD CONSTRAINT "care_circle_members_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_givers"
    ADD CONSTRAINT "care_givers_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_givers"
    ADD CONSTRAINT "care_givers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."care_group"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_givers"
    ADD CONSTRAINT "care_givers_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_group"
    ADD CONSTRAINT "care_group_primary_caregiver_id_fkey" FOREIGN KEY ("primary_caregiver_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_plans"
    ADD CONSTRAINT "care_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."care_plans"
    ADD CONSTRAINT "care_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_recipients"
    ADD CONSTRAINT "care_recipients_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."care_group"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "public"."daily_medication_checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_given_by_user_id_fkey" FOREIGN KEY ("given_by_user_id") REFERENCES "public"."care_givers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_medication_checklists"
    ADD CONSTRAINT "daily_medication_checklists_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."care_group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_medication_checklists"
    ADD CONSTRAINT "daily_medication_checklists_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."care_group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."care_group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."medication_logs"
    ADD CONSTRAINT "medication_logs_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."medication_logs"
    ADD CONSTRAINT "medication_logs_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medication_logs"
    ADD CONSTRAINT "medication_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medication_schedules"
    ADD CONSTRAINT "medication_schedules_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medication_schedules"
    ADD CONSTRAINT "medication_schedules_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medications"
    ADD CONSTRAINT "medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medications"
    ADD CONSTRAINT "medications_prescribed_by_fkey" FOREIGN KEY ("prescribed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."care_group"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_primary_caregiver_id_fkey" FOREIGN KEY ("primary_caregiver_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_primary_physician_id_fkey" FOREIGN KEY ("primary_physician_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_care_plan_id_fkey" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_measured_by_fkey" FOREIGN KEY ("measured_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



CREATE POLICY "Caregiver can add themselves or primary caregiver can add other" ON "public"."care_givers" FOR INSERT WITH CHECK ((("auth"."uid"() = "caregiver_id") OR ("auth"."uid"() = ( SELECT "patients"."primary_caregiver_id"
   FROM "public"."patients"
  WHERE ("patients"."id" = "care_givers"."patient_id")))));



CREATE POLICY "Caregiver can update their own membership; primary caregiver ca" ON "public"."care_givers" FOR UPDATE USING ((("auth"."uid"() = "caregiver_id") OR ("auth"."uid"() = ( SELECT "patients"."primary_caregiver_id"
   FROM "public"."patients"
  WHERE ("patients"."id" = "care_givers"."patient_id"))))) WITH CHECK ((("auth"."uid"() = "caregiver_id") OR ("auth"."uid"() = ( SELECT "patients"."primary_caregiver_id"
   FROM "public"."patients"
  WHERE ("patients"."id" = "care_givers"."patient_id")))));



CREATE POLICY "Caregivers are able sto update the records" ON "public"."care_recipients" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = ( SELECT "care_group"."primary_caregiver_id" AS "caregiver_id"
   FROM "public"."care_group"))) WITH CHECK (("auth"."uid"() = ( SELECT "care_group"."primary_caregiver_id" AS "caregiver_id"
   FROM "public"."care_group")));



CREATE POLICY "Enable authenticated caregivers to select records" ON "public"."care_recipients" FOR SELECT TO "authenticated" USING (("auth"."uid"() = ( SELECT "care_group"."primary_caregiver_id" AS "caregiver_id"
   FROM "public"."care_group")));



CREATE POLICY "Enabled insertions for caregivers" ON "public"."care_recipients" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = ( SELECT "care_group"."primary_caregiver_id" AS "caregiver_id"
   FROM "public"."care_group")));



CREATE POLICY "Members can view all caregivers in their groups" ON "public"."care_givers" FOR SELECT USING ("public"."is_group_member"("group_id"));



CREATE POLICY "Only primary caregiver can remove caregivers" ON "public"."care_givers" FOR DELETE USING (("auth"."uid"() = ( SELECT "patients"."primary_caregiver_id"
   FROM "public"."patients"
  WHERE ("patients"."id" = "care_givers"."patient_id"))));



CREATE POLICY "Users can be able to insert records" ON "public"."care_group" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "primary_caregiver_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view all profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their care circle memberships" ON "public"."care_group" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "primary_caregiver_id"));



CREATE POLICY "Users can view their messages" ON "public"."messages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users see checklists for their families" ON "public"."daily_medication_checklists" FOR SELECT USING (("group_id" IN ( SELECT "daily_medication_checklists"."group_id"
   FROM "public"."care_group"
  WHERE ("care_group"."primary_caregiver_id" = "auth"."uid"()))));



CREATE POLICY "admins can create invites" ON "public"."invites" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."care_givers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."care_group" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."care_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."care_recipients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "caregivers_insert_medications" ON "public"."medications" FOR INSERT WITH CHECK (("public"."is_caregiver_for"("patient_id") AND ("prescribed_by" = "auth"."uid"())));



CREATE POLICY "caregivers_read_medications" ON "public"."medications" FOR SELECT USING ("public"."is_caregiver_for"("patient_id"));



ALTER TABLE "public"."checklist_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_medication_checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medication_confirmations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medication_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medication_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "no_direct_deletes" ON "public"."medications" FOR DELETE USING (false);



CREATE POLICY "no_direct_updates" ON "public"."medications" FOR UPDATE USING (false);



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patients delete by active primary carer" ON "public"."patients" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."care_givers" "cg"
  WHERE (("cg"."patient_id" = "patients"."id") AND ("cg"."caregiver_id" = "auth"."uid"()) AND ("cg"."status" = 'active'::"text") AND ("cg"."role_in_care" = 'Primary Carer'::"text")))));



CREATE POLICY "patients insert by primary caregiver" ON "public"."patients" FOR INSERT TO "authenticated" WITH CHECK (("primary_caregiver_id" = "auth"."uid"()));



CREATE POLICY "patients select for active caregivers" ON "public"."patients" FOR SELECT TO "authenticated" USING ((("primary_caregiver_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."care_givers" "cg"
  WHERE (("cg"."patient_id" = "patients"."id") AND ("cg"."caregiver_id" = "auth"."uid"()) AND ("cg"."status" = 'active'::"text"))))));



CREATE POLICY "patients update by active primary carer" ON "public"."patients" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."care_givers" "cg"
  WHERE (("cg"."patient_id" = "patients"."id") AND ("cg"."caregiver_id" = "auth"."uid"()) AND ("cg"."status" = 'active'::"text") AND ("cg"."role_in_care" = 'Primary Carer'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."care_givers" "cg"
  WHERE (("cg"."patient_id" = "patients"."id") AND ("cg"."caregiver_id" = "auth"."uid"()) AND ("cg"."status" = 'active'::"text") AND ("cg"."role_in_care" = 'Primary Carer'::"text")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select own invites" ON "public"."invites" FOR SELECT TO "authenticated" USING (("email" = ("auth"."jwt"() ->> 'email'::"text")));



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vital_signs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."check_active_member_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_active_member_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_active_member_limit"() TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_group_invite"("p_group_id" "uuid", "p_email" "text", "p_invite_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_group_invite"("p_group_id" "uuid", "p_email" "text", "p_invite_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_group_invite"("p_group_id" "uuid", "p_email" "text", "p_invite_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_patient_checklist_today"("p_patient_id" "uuid", "p_include_past" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_patient_checklist_today"("p_patient_id" "uuid", "p_include_past" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_patient_checklist_today"("p_patient_id" "uuid", "p_include_past" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_last_seen"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_last_seen"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_last_seen"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_caregiver_for"("p_patient_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_caregiver_for"("p_patient_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_caregiver_for"("p_patient_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_email_registered"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_email_registered"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_email_registered"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_email_registered"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_group_member"("check_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_member"("check_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_member"("check_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_profile_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."verify_profile_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_profile_trigger"() TO "service_role";


















GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."care_givers" TO "anon";
GRANT ALL ON TABLE "public"."care_givers" TO "authenticated";
GRANT ALL ON TABLE "public"."care_givers" TO "service_role";



GRANT ALL ON TABLE "public"."care_group" TO "anon";
GRANT ALL ON TABLE "public"."care_group" TO "authenticated";
GRANT ALL ON TABLE "public"."care_group" TO "service_role";



GRANT ALL ON TABLE "public"."care_plans" TO "anon";
GRANT ALL ON TABLE "public"."care_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."care_plans" TO "service_role";



GRANT ALL ON TABLE "public"."care_recipients" TO "anon";
GRANT ALL ON TABLE "public"."care_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."care_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_items" TO "anon";
GRANT ALL ON TABLE "public"."checklist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_items" TO "service_role";



GRANT ALL ON TABLE "public"."daily_medication_checklists" TO "anon";
GRANT ALL ON TABLE "public"."daily_medication_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_medication_checklists" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."families" TO "anon";
GRANT ALL ON TABLE "public"."families" TO "authenticated";
GRANT ALL ON TABLE "public"."families" TO "service_role";



GRANT ALL ON TABLE "public"."medical_records" TO "anon";
GRANT ALL ON TABLE "public"."medical_records" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_records" TO "service_role";



GRANT ALL ON TABLE "public"."medication_confirmations" TO "anon";
GRANT ALL ON TABLE "public"."medication_confirmations" TO "authenticated";
GRANT ALL ON TABLE "public"."medication_confirmations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."medication_confirmations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."medication_confirmations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."medication_confirmations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."medication_logs" TO "anon";
GRANT ALL ON TABLE "public"."medication_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."medication_logs" TO "service_role";



GRANT ALL ON TABLE "public"."medication_schedules" TO "anon";
GRANT ALL ON TABLE "public"."medication_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."medication_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."medications" TO "anon";
GRANT ALL ON TABLE "public"."medications" TO "authenticated";
GRANT ALL ON TABLE "public"."medications" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."upcoming_appointments" TO "anon";
GRANT ALL ON TABLE "public"."upcoming_appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."upcoming_appointments" TO "service_role";



GRANT ALL ON TABLE "public"."vital_signs" TO "anon";
GRANT ALL ON TABLE "public"."vital_signs" TO "authenticated";
GRANT ALL ON TABLE "public"."vital_signs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";

alter table "public"."checklist_items" drop constraint "checklist_items_status_check";

alter table "public"."daily_medication_checklists" drop constraint "daily_medication_checklists_status_check";

alter table "public"."checklist_items" add constraint "checklist_items_status_check" CHECK (((status)::text = ANY ((ARRAY['due'::character varying, 'given'::character varying, 'overdue'::character varying, 'skipped'::character varying])::text[]))) not valid;

alter table "public"."checklist_items" validate constraint "checklist_items_status_check";

alter table "public"."daily_medication_checklists" add constraint "daily_medication_checklists_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::text[]))) not valid;

alter table "public"."daily_medication_checklists" validate constraint "daily_medication_checklists_status_check";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Give users authenticated access to folder 1oj01fe_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Give users authenticated access to folder 1oj01fe_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Give users authenticated access to folder 1oj01fe_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Give users authenticated access to folder 1oj01fe_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "patient avatars delete by primary carer"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'patient-avatars'::text) AND (EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE (((cg.patient_id)::text = (storage.foldername(objects.name))[1]) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text) AND (cg.role_in_care = 'Primary Carer'::text))))));



  create policy "patient avatars insert by primary carer"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'patient-avatars'::text) AND (EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE (((cg.patient_id)::text = (storage.foldername(objects.name))[1]) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text) AND (cg.role_in_care = 'Primary Carer'::text))))));



  create policy "patient avatars read by active caregivers"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'patient-avatars'::text) AND (EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE (((cg.patient_id)::text = (storage.foldername(objects.name))[1]) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text))))));



  create policy "patient avatars readable by active caregivers"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'patient-avatars'::text) AND (EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE (((cg.patient_id)::text = (storage.foldername(objects.name))[1]) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text))))));



  create policy "patient avatars update by primary carer"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'patient-avatars'::text) AND (EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE (((cg.patient_id)::text = (storage.foldername(objects.name))[1]) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text) AND (cg.role_in_care = 'Primary Carer'::text))))))
with check (((bucket_id = 'patient-avatars'::text) AND (EXISTS ( SELECT 1
   FROM public.care_givers cg
  WHERE (((cg.patient_id)::text = (storage.foldername(objects.name))[1]) AND (cg.caregiver_id = auth.uid()) AND (cg.status = 'active'::text) AND (cg.role_in_care = 'Primary Carer'::text))))));



