-- medication_logs has RLS enabled but no policies at all, so every query
-- (including the primary carer's own administration-log history view,
-- frontend/src/api/administrationLog/administrationLog.service.ts:198-214)
-- silently returns zero rows for everyone. Add SELECT scoped the same way
-- as the other medical-data table on this same patient_id, ai_insights
-- ("ai_insights_select" in 20260525130000_add_gp_contacts_care_notes_ai_insights_rls.sql):
-- active primary/secondary carers only, matching this codebase's existing
-- convention for medical-sensitive tables (observers are excluded the same
-- way they're excluded from ai_insights).
--
-- No INSERT/UPDATE/DELETE policy is added: nothing in the frontend or any
-- DB function currently writes to this table (verified via grep across
-- frontend/src and pg_proc), so there is no known write path to scope yet.
-- Add one when a real write path is introduced.

create policy "medication_logs_select"
on public.medication_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.care_givers cg
    where cg.patient_id = medication_logs.patient_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
      and cg.role_in_care in ('primary_carer', 'secondary_carer')
  )
);
