\set ON_ERROR_STOP on

-- Direct database-level RLS verification harness.
-- Run after `npx supabase db reset` against the local Supabase Postgres instance:
-- psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/verify_cross_circle_rls.sql
--
-- The script simulates authenticated users by:
--   1. switching to the `authenticated` database role, and
--   2. setting `request.jwt.claim.sub` for auth.uid().
--
-- Expected behavior for cross-circle access attempts:
--   - SELECT: zero rows visible.
--   - UPDATE / DELETE: zero affected rows or an RLS error.
--   - INSERT: RLS error.

begin;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

create temp table rls_test_actors (
  sort_order integer primary key,
  actor_role text not null,
  actor_id uuid not null
);

insert into rls_test_actors (sort_order, actor_role, actor_id)
values
  (1, 'primary_carer', '11111111-1111-4111-8111-111111111111'::uuid),
  (2, 'secondary_carer', '22222222-2222-4222-8222-222222222222'::uuid),
  (3, 'observer', '33333333-3333-4333-8333-333333333333'::uuid);

create temp table rls_test_cases (
  sort_order integer primary key,
  table_name text not null,
  operation text not null,
  pass_rule text not null,
  sql_body text not null
);

insert into rls_test_cases (sort_order, table_name, operation, pass_rule, sql_body)
values
  ( 1, 'care_givers', 'SELECT', 'must_be_zero', 'select 1 from public.care_givers where id = ''bbbbbbbb-1000-4000-8000-bbbbbbbbbbb1''::uuid'),
  ( 2, 'care_givers', 'INSERT', 'must_error', 'insert into public.care_givers (caregiver_id, group_id, patient_id, role_in_care, status, can_communicate, can_schedule, can_view_medical, relationship) values (auth.uid(), ''bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1''::uuid, ''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1''::uuid, ''observer'', ''active'', false, false, true, ''cross-circle-attempt'') returning 1'),
  ( 3, 'care_givers', 'UPDATE', 'zero_or_error', 'update public.care_givers set relationship = ''cross-circle-update-attempt'' where id = ''bbbbbbbb-1000-4000-8000-bbbbbbbbbbb1''::uuid returning 1'),
  ( 4, 'care_givers', 'DELETE', 'zero_or_error', 'delete from public.care_givers where id = ''bbbbbbbb-1000-4000-8000-bbbbbbbbbbb1''::uuid returning 1'),
  ( 5, 'care_group', 'SELECT', 'must_be_zero', 'select 1 from public.care_group where id = ''bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1''::uuid'),
  ( 6, 'care_group', 'INSERT', 'must_error', 'insert into public.care_group (name, description, patient_id, primary_caregiver_id, preferred_timezone) values (''Cross Circle Insert Attempt'', ''Should be denied by RLS.'', ''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1''::uuid, ''44444444-4444-4444-8444-444444444444''::uuid, ''UTC'') returning 1'),
  ( 7, 'care_group', 'UPDATE', 'zero_or_error', 'update public.care_group set description = ''cross-circle-update-attempt'' where id = ''bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1''::uuid returning 1'),
  ( 8, 'care_group', 'DELETE', 'zero_or_error', 'delete from public.care_group where id = ''bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1''::uuid returning 1'),
  ( 9, 'patients', 'SELECT', 'must_be_zero', 'select 1 from public.patients where id = ''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1''::uuid'),
  (10, 'patients', 'INSERT', 'must_error', 'insert into public.patients (full_name, date_of_birth, primary_caregiver_id, notes) values (''Cross Circle Patient Attempt'', ''1950-05-05'', ''44444444-4444-4444-8444-444444444444''::uuid, ''Should be denied by RLS.'') returning 1'),
  (11, 'patients', 'UPDATE', 'zero_or_error', 'update public.patients set notes = ''cross-circle-update-attempt'' where id = ''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1''::uuid returning 1'),
  (12, 'patients', 'DELETE', 'zero_or_error', 'delete from public.patients where id = ''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1''::uuid returning 1'),
  (13, 'medications', 'SELECT', 'must_be_zero', 'select 1 from public.medications where id = ''bbbbbbbb-2000-4000-8000-bbbbbbbbbbb1''::uuid'),
  (14, 'medications', 'INSERT', 'must_error', 'insert into public.medications (patient_id, medication_name, dose, unit, start_date, prescribed_by, created_by, status) values (''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1''::uuid, ''Cross Circle Medication Attempt'', 1, ''tablet'', current_date, auth.uid(), auth.uid(), ''active'') returning 1'),
  (15, 'medications', 'UPDATE', 'zero_or_error', 'update public.medications set notes = ''cross-circle-update-attempt'' where id = ''bbbbbbbb-2000-4000-8000-bbbbbbbbbbb1''::uuid returning 1'),
  (16, 'medications', 'DELETE', 'zero_or_error', 'delete from public.medications where id = ''bbbbbbbb-2000-4000-8000-bbbbbbbbbbb1''::uuid returning 1'),
  (17, 'handover_journal_entries', 'SELECT', 'must_be_zero', 'select 1 from public.handover_journal_entries where id = ''bbbbbbbb-3000-4000-8000-bbbbbbbbbbb1''::uuid'),
  (18, 'handover_journal_entries', 'INSERT', 'must_error', 'insert into public.handover_journal_entries (group_id, author_id, content) values (''bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1''::uuid, auth.uid(), ''Cross-circle handover insert attempt.'') returning 1'),
  (19, 'handover_journal_entries', 'UPDATE', 'zero_or_error', 'update public.handover_journal_entries set content = ''cross-circle-update-attempt'' where id = ''bbbbbbbb-3000-4000-8000-bbbbbbbbbbb1''::uuid returning 1'),
  (20, 'handover_journal_entries', 'DELETE', 'zero_or_error', 'delete from public.handover_journal_entries where id = ''bbbbbbbb-3000-4000-8000-bbbbbbbbbbb1''::uuid returning 1');

create temp table rls_test_results (
  actor_role text not null,
  table_name text not null,
  operation text not null,
  pass_rule text not null,
  passed boolean not null,
  outcome text not null,
  detail text not null
);

do $$
declare
  actor record;
  test_case record;
  affected_count integer;
  failure_detail text;
begin
  for actor in
    select *
    from rls_test_actors
    order by sort_order
  loop
    perform set_config('request.jwt.claim.sub', actor.actor_id::text, true);

    for test_case in
      select *
      from rls_test_cases
      order by sort_order
    loop
      begin
        execute format('select count(*) from (%s) as attempted', test_case.sql_body)
          into affected_count;

        if test_case.pass_rule = 'must_be_zero' then
          insert into rls_test_results (actor_role, table_name, operation, pass_rule, passed, outcome, detail)
          values (
            actor.actor_role,
            test_case.table_name,
            test_case.operation,
            test_case.pass_rule,
            affected_count = 0,
            case when affected_count = 0 then 'blocked_zero_rows' else 'leaked_rows' end,
            format('row_count=%s', affected_count)
          );
        elsif test_case.pass_rule = 'zero_or_error' then
          insert into rls_test_results (actor_role, table_name, operation, pass_rule, passed, outcome, detail)
          values (
            actor.actor_role,
            test_case.table_name,
            test_case.operation,
            test_case.pass_rule,
            affected_count = 0,
            case when affected_count = 0 then 'blocked_zero_rows' else 'mutation_succeeded' end,
            format('row_count=%s', affected_count)
          );
        else
          insert into rls_test_results (actor_role, table_name, operation, pass_rule, passed, outcome, detail)
          values (
            actor.actor_role,
            test_case.table_name,
            test_case.operation,
            test_case.pass_rule,
            false,
            'unexpected_success',
            format('row_count=%s', affected_count)
          );
        end if;
      exception
        when others then
          get stacked diagnostics failure_detail = message_text;

          insert into rls_test_results (actor_role, table_name, operation, pass_rule, passed, outcome, detail)
          values (
            actor.actor_role,
            test_case.table_name,
            test_case.operation,
            test_case.pass_rule,
            test_case.pass_rule in ('must_error', 'zero_or_error'),
            'database_error',
            coalesce(failure_detail, sqlerrm)
          );
      end;
    end loop;
  end loop;
end
$$;

select
  actor_role,
  table_name,
  max(case when operation = 'SELECT' then case when passed then 'PASS' else 'FAIL' end end) as select_result,
  max(case when operation = 'INSERT' then case when passed then 'PASS' else 'FAIL' end end) as insert_result,
  max(case when operation = 'UPDATE' then case when passed then 'PASS' else 'FAIL' end end) as update_result,
  max(case when operation = 'DELETE' then case when passed then 'PASS' else 'FAIL' end end) as delete_result
from rls_test_results
group by actor_role, table_name
order by
  case actor_role
    when 'primary_carer' then 1
    when 'secondary_carer' then 2
    when 'observer' then 3
    else 4
  end,
  table_name;

select
  actor_role,
  table_name,
  operation,
  outcome,
  detail
from rls_test_results
where passed = false
order by
  case actor_role
    when 'primary_carer' then 1
    when 'secondary_carer' then 2
    when 'observer' then 3
    else 4
  end,
  table_name,
  operation;

select
  count(*) as total_checks,
  count(*) filter (where passed) as passed_checks,
  count(*) filter (where not passed) as failed_checks
from rls_test_results;

rollback;