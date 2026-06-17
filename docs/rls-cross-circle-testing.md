# RLS Cross-Circle Access Testing

**Ticket:** CC-120  
**Date verified:** 2026-06-17  
**Branch:** CC-120-RLS-Cross-Circle-Leak-Testing-Documentation

---

## 1. Purpose

This document records the design, execution steps, and results of the Row Level Security (RLS) cross-circle leak tests for CareCircle. It demonstrates that no authenticated user belonging to one care circle (Circle A) can read or mutate any data belonging to a different care circle (Circle B) at the database level — independent of any application-layer checks.

---

## 2. RLS Policy Table

The following table documents every RLS policy active on the five core tables covered by the cross-circle harness.

> **Note on SELECT behaviour:** PostgreSQL RLS policies applied to SELECT silently filter rows to an empty result set — they do not raise an error. This is the correct and intended security behaviour: the database reveals neither data nor its existence to an unauthorised caller. Only INSERT/UPDATE/DELETE operations raise an explicit RLS violation error.

### `public.care_givers`

| Operation | Policy name | Rule summary |
|-----------|-------------|--------------|
| SELECT | Members can view all caregivers in their groups | `is_group_member(group_id)` — caller must appear in `care_givers` for the same `group_id` |
| INSERT | Caregiver can add themselves or primary caregiver can add other | `auth.uid() = caregiver_id` OR `auth.uid() = patients.primary_caregiver_id` |
| UPDATE | Caregiver can update their own membership; primary caregiver ca… | `auth.uid() = caregiver_id` OR `auth.uid() = patients.primary_caregiver_id` |
| DELETE | Only primary caregiver can remove caregivers | `auth.uid() = patients.primary_caregiver_id` |

### `public.care_group`

| Operation | Policy name | Rule summary |
|-----------|-------------|--------------|
| SELECT | Users can view their care circle memberships | `auth.uid() = primary_caregiver_id` |
| INSERT | Users can be able to insert records | `auth.uid() = primary_caregiver_id` |
| UPDATE | *(none)* | Implicitly denied — no permissive policy exists |
| DELETE | *(none)* | Implicitly denied — no permissive policy exists |

### `public.patients`

| Operation | Policy name | Rule summary |
|-----------|-------------|--------------|
| SELECT | patients select for active caregivers | `auth.uid() = primary_caregiver_id` OR active membership in `care_givers` for this patient |
| INSERT | patients insert by primary caregiver | `auth.uid() = primary_caregiver_id` |
| UPDATE | patients update by active primary carer | Active `primary_carer` role in `care_givers` for this patient |
| DELETE | patients delete by active primary carer | Active `primary_carer` role in `care_givers` for this patient |

### `public.medications`

| Operation | Policy name | Rule summary |
|-----------|-------------|--------------|
| SELECT | caregivers_read_medications | `is_caregiver_for(patient_id)` — active `care_givers` row for this patient |
| INSERT | caregivers_insert_medications | `is_caregiver_for(patient_id)` AND `prescribed_by = auth.uid()` |
| UPDATE | no_direct_updates | `USING (false)` — unconditionally denied for all users |
| DELETE | no_direct_deletes | `USING (false)` — unconditionally denied for all users |

### `public.handover_journal_entries`

| Operation | Policy name | Rule summary |
|-----------|-------------|--------------|
| SELECT | Group members can view handover journal entries | Active `care_givers` row whose `group_id` matches the entry |
| INSERT | Carers can add handover journal entries | Active `primary_carer` or `secondary_carer` in `care_givers`, AND `author_id = auth.uid()` |
| UPDATE | *(none)* | Implicitly denied — no permissive policy exists |
| DELETE | *(none)* | Implicitly denied — no permissive policy exists |

---

## 3. Test Fixture Layout

The seed file `supabase/seeds/rls_cross_circle_verification_seed.sql` creates two completely isolated circles and four test actors.

### Circle A

| Resource | ID |
|----------|----|
| Group | `aaaaaaaa-0000-4000-8000-aaaaaaaaaaa1` |
| Patient | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1` |

| Actor | Role | UUID |
|-------|------|------|
| rls.circlea.primary@example.com | primary_carer | `11111111-1111-4111-8111-111111111111` |
| rls.circlea.secondary@example.com | secondary_carer | `22222222-2222-4222-8222-222222222222` |
| rls.circlea.observer@example.com | observer | `33333333-3333-4333-8333-333333333333` |

### Circle B (target — should be unreachable from Circle A)

| Resource | ID |
|----------|----|
| Group | `bbbbbbbb-0000-4000-8000-bbbbbbbbbbb1` |
| Patient | `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1` |
| Care givers row | `bbbbbbbb-1000-4000-8000-bbbbbbbbbbb1` |
| Medication row | `bbbbbbbb-2000-4000-8000-bbbbbbbbbbb1` |
| Handover entry | `bbbbbbbb-3000-4000-8000-bbbbbbbbbbb1` |

| Actor | Role | UUID |
|-------|------|------|
| rls.circleb.primary@example.com | primary_carer | `44444444-4444-4444-8444-444444444444` |

---

## 4. How to Run

### Prerequisites

- Docker Desktop running
- Node.js 18+ installed
- Supabase CLI available (`frontend/node_modules/.bin/supabase` or `npx supabase`)

### Step 1 — Start the local Supabase stack

Run from the **project root** (`c:\Quantic\CareCircle`):

```bash
cd frontend
npx supabase start
```

This applies all migrations and seeds the fixture data automatically. You should see all migrations apply without errors and the output end with:

```
Started supabase local development setup.
```

### Step 2 — Run the verification harness

From the **project root**, pipe the harness SQL into psql running inside the Supabase DB container:

```bash
cat supabase/verify_cross_circle_rls.sql | docker exec -i supabase_db_carecircle psql -U postgres -d postgres
```

On Windows PowerShell:

```powershell
Get-Content supabase\verify_cross_circle_rls.sql | docker exec -i supabase_db_carecircle psql -U postgres -d postgres
```

### Step 3 — Read the output

The harness prints three result sets:

**Table 1 — Summary grid** (one row per actor × table, columns are SELECT/INSERT/UPDATE/DELETE):
```
 actor_role    | table_name | select_result | insert_result | update_result | delete_result
```
Every cell should read `PASS`.

**Table 2 — Failures detail** (should be empty):
```
 actor_role | table_name | operation | outcome | detail
------------+------------+-----------+---------+--------
(0 rows)
```

**Table 3 — Totals**:
```
 total_checks | passed_checks | failed_checks
--------------+---------------+---------------
           60 |            60 |             0
```

A run is considered passing when `failed_checks = 0`.

### Step 4 — Stop local Supabase when done

```bash
npx supabase stop
```

---

## 5. Test Results

Verified on **2026-06-17** against branch `CC-120-RLS-Cross-Circle-Leak-Testing-Documentation`.  
Local Supabase CLI version: **2.101.0**

### Summary grid

| Actor role | Table | SELECT | INSERT | UPDATE | DELETE |
|------------|-------|--------|--------|--------|--------|
| primary_carer | care_givers | PASS | PASS | PASS | PASS |
| primary_carer | care_group | PASS | PASS | PASS | PASS |
| primary_carer | handover_journal_entries | PASS | PASS | PASS | PASS |
| primary_carer | medications | PASS | PASS | PASS | PASS |
| primary_carer | patients | PASS | PASS | PASS | PASS |
| secondary_carer | care_givers | PASS | PASS | PASS | PASS |
| secondary_carer | care_group | PASS | PASS | PASS | PASS |
| secondary_carer | handover_journal_entries | PASS | PASS | PASS | PASS |
| secondary_carer | medications | PASS | PASS | PASS | PASS |
| secondary_carer | patients | PASS | PASS | PASS | PASS |
| observer | care_givers | PASS | PASS | PASS | PASS |
| observer | care_group | PASS | PASS | PASS | PASS |
| observer | handover_journal_entries | PASS | PASS | PASS | PASS |
| observer | medications | PASS | PASS | PASS | PASS |
| observer | patients | PASS | PASS | PASS | PASS |

### Totals

| Metric | Value |
|--------|-------|
| Total checks | 60 |
| Passed | 60 |
| Failed | 0 |

### Pass rule key

| Rule | Meaning | Tables / operations |
|------|---------|---------------------|
| `must_be_zero` | SELECT returns 0 rows (RLS filters silently) | All SELECT operations |
| `must_error` | INSERT raises an RLS violation error | All INSERT operations |
| `zero_or_error` | UPDATE/DELETE affects 0 rows or raises an error | All UPDATE/DELETE operations |

---

## 6. Scope and Known Limitations

The harness covers the five tables that hold the core care-circle data. The following tables have RLS enabled but are not yet included in this harness:

| Table | Migration |
|-------|-----------|
| `daily_medication_checklists` / `checklist_items` | `20260518220500` |
| `gp_contacts`, `care_notes`, `ai_insights` | `20260525130000` |
| `primary_carer_wellbeing_checkins` | `20260526110000` |
| `patient_wellbeing_checkins` | `20260528200000` |
| `weekly_shift_assignments` | `20260520170000` |
| `weekly_digests`, `insight_cards`, `user_insight_dismissals` | `20260604183434` |
| `documents` | `20260610120000` |
| `emergency_contacts` | `20260614184500` |

Extending the harness to these tables is recommended before production sign-off but is outside the scope of CC-120.
