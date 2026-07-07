# Design & Testing

## System architecture

### Overview

CareCircle is a monorepo with a React 19 SPA (`frontend/`), NestJS 11 API (`backend/`), and Supabase PostgreSQL (`supabase/migrations/`). The frontend talks to Supabase directly for RLS-governed reads and realtime subscriptions, and to the backend for business-logic writes (medications, PDF generation, AI Q&A, alerts, crons).

### Architectural patterns

| Pattern | Where | Why |
| :--- | :--- | :--- |
| Layered / feature modules | `backend/src/*` | NestJS module-per-domain; Controller → Service → Repository |
| Repository | `backend/src/integrations/repositories/` | Single place for Supabase service-role access |
| BFF-style API | `/api/*` routes | Complex workflows (PDF, AI, crons) stay server-side |
| RLS + dual data path | Frontend `supabase-js` + backend admin client | Reads via RLS; writes centralized in API |
| Cron / subscriber workers | `backend/src/cron/`, `checklist-ack-alert.subscriber` | Scheduled materialization, alerts, insights |

### Deployment

| Component | Host | Cost tier |
| :--- | :--- | :--- |
| Frontend SPA | Render (static) | Free tier |
| Backend API | Render (web service) | Free tier |
| Database / Auth / Storage | Supabase Cloud | Free tier |

### CI/CD pipelines

| Workflow | File | Purpose |
| :--- | :--- | :--- |
| CI | `.github/workflows/ci.yml` | Lint, unit/integration tests, build (frontend + backend) |
| E2E | `.github/workflows/e2e.yml` | Playwright API smoke tests against deployed backend |
| Deploy | `.github/workflows/deploy.yml` | Render deploy hooks after CI + E2E succeed on `main` |
| RLS verify (manual) | `.github/workflows/rls-verify.yml` | Optional cross-circle RLS SQL harness |

### Testing strategy summary

Automated testing spans four layers: **backend Vitest** unit and integration specs (`backend/src/**/*.spec.ts`, `npm run test:e2e` for integration config), **frontend Vitest** unit and integration tests (`frontend/src/**/*.test.ts(x)`, `npm run test:integration`), **Playwright API smoke** regression against production-like endpoints (`e2e/tests/api-smoke.spec.ts`), and a **direct PostgreSQL RLS harness** (`supabase/verify_cross_circle_rls.sql` with seed data). CI runs lint and tests on every pull request; E2E runs on `main`/`develop` pushes and gates deployment.

### Known security trade-off (documented)

Backend routes use the Supabase **service-role** key and do not yet require a caller JWT on most endpoints. RLS protects frontend direct queries only. Mitigation in progress: the frontend sends `Authorization: Bearer <token>` when a session exists; the backend validates group membership when a token is present (see `security_and_compliance.md`). Insight generation is intentionally user-triggered from the Insights page (`POST /api/insights/generate/:groupId`, alias `/debug/generate/:groupId`), rate-limited to 3 requests per minute per client.

---

## CC-129 Magic-Link Onboarding Test Notes

The invite flow is designed as a four-step path from email to the care circle group details page:

1. Open the secure invitation magic link.
2. Review the care circle details.
3. Accept the invitation.
4. Continue to the group dashboard.

Automated coverage:

| Area | Test | Purpose |
| :--- | :--- | :--- |
| Invite email magic link | `backend/src/invites/group-invite-email.service.spec.ts` | Verifies invitation email links are Supabase magic links that redirect to `/group-invite` confirmation mode. |
| Pending invite login resume | `frontend/src/pages/LoginPage.test.tsx` | Verifies login magic links preserve matching pending invite redirects. |
| Invite onboarding progress | `frontend/src/pages/InvitePage.test.tsx` | Verifies the explicit accept screen shows the numbered onboarding steps. |

Manual sprint-review evidence should include one non-technical user attempting the invitation flow from email link to group details page, with notes on step count, points of confusion, and whether assistance was needed.

## CC-117 Automated Test Matrix

| Area | Test | Purpose | CI visibility |
| :--- | :--- | :--- | :--- |
| Medication schedule-vs-log comparison | `backend/src/checklist/slot-computation.spec.ts` | Verifies on-time, late, skipped, already-given, and multi-window dose classifications against known datasets. | Backend Vitest job |
| Push notification delivery | `backend/src/alerts/vapid-delivery.integration.spec.ts` | Sends a real VAPID/Web Push notification to a configured test subscription when `VAPID_TEST_*` secrets are present; skips explicitly otherwise. | Backend Vitest job |
| AI hospital summary completeness | `backend/src/hospital-summary/hospital-summary.spec.ts` | Verifies required generated payload sections are present before hospital summary output is used. | Backend Vitest job |
| Medication confirmation concurrency | `frontend/src/api/checklist/checklistMutations.service.test.ts` | Verifies simultaneous medication confirmations result in one successful update and exactly one confirmation record insert. | Frontend Vitest job |
| Frontend auth session | `frontend/src/contexts/AuthContext.test.tsx` | Session handling and auth context wiring. | Frontend Vitest job |
| Group invite flow | `frontend/src/test/integration/group-invite-flow.test.tsx` | Multi-step invite onboarding path. | Frontend Vitest job |
| API smoke regression | `e2e/tests/api-smoke.spec.ts` | Production API DTO validation and error-shape checks. | E2E workflow |
| Cron scheduler wiring | `backend/src/cron/cron.jobs.spec.ts` | Scheduled job registration and handlers. | Backend Vitest job |
| Overdue medication alerts | `backend/src/checklist/overdue-detection.service.spec.ts` | Alert pipeline when doses are missed. | Backend Vitest job |
| AI Q&A integration | `backend/src/test/integration/ai-qa.integration.spec.ts` | Groq-backed Q&A with mocked provider. | Backend Vitest job |
| Medications service | `backend/src/medications/medications.service.spec.ts` | Create/update/pause medication flows. | Backend Vitest job |
| Insights controller | `backend/src/insights/insights.controller.spec.ts` | HTTP-level insights endpoints. | Backend Vitest job |
| Medications controller | `backend/src/medications/medications.controller.spec.ts` | DTO validation at HTTP boundary. | Backend Vitest job |

The CI workflow runs deterministic backend and frontend build/test jobs on pull requests. The VAPID delivery check is intentionally opt-in because it requires a live browser push subscription and VAPID test secrets.


## Permission Matrix
This section defines the access control levels for users within a care group based on their role in the `group_members` table.

| Role | Permissions |
| :--- | :--- |
| **primary_carer** | Full CRUD within own group |
| **secondary_carer** | Full CRUD on logs/journal/check-ins, read-only on medications and profile |
| **observer** | Read-only everywhere |

---

## Row Level Security (RLS) Policy Catalogue

This section documents **every** RLS policy currently enforced in the CareCircle Supabase database. Policies are grouped by table and operation. Each entry includes the policy name, the SQL expression used by PostgreSQL, and a plain-English explanation of what it **allows** and what it **blocks**.

> **How RLS works in PostgreSQL / Supabase:**
> - A `USING` clause filters which *existing* rows a user can see or act on.
> - A `WITH CHECK` clause validates whether a *new or updated* row is permitted.
> - If no policy exists for a given operation, the operation is **denied by default** when RLS is enabled.
> - Multiple policies on the same table and operation are combined with **OR** (any one passing is sufficient).

---

### 1. `care_givers` (Group Membership)

#### SELECT — "Members can view all caregivers in their groups"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `is_group_member(group_id)` |

**Allows:** Any authenticated user who is an active member of a care group can view all other caregiver rows that belong to that same group. This is what powers the Members table in the UI.

**Blocks:** Users who are not members of a group cannot see any caregiver records for that group.

---

#### INSERT — "Caregiver can add themselves or primary caregiver can add other"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **WITH CHECK** | `(auth.uid() = caregiver_id) OR (auth.uid() = (SELECT patients.primary_caregiver_id FROM patients WHERE patients.id = care_givers.patient_id))` |

**Allows:** A user can insert a `care_givers` row only if (a) the `caregiver_id` in the new row matches their own `auth.uid()` (i.e. they are adding themselves, such as when accepting an invite), **or** (b) they are the `primary_caregiver_id` of the linked patient (i.e. the group admin is adding someone else).

**Blocks:** A secondary carer or observer cannot add other people to a group. No one can insert a row on behalf of another user unless they are the primary caregiver.

---

#### UPDATE — "Primary Carers can update members in their group"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = care_givers.group_id AND cg.caregiver_id = auth.uid() AND cg.role_in_care = 'primary_carer'::member_role AND cg.status = 'active')` |
| **WITH CHECK** | *(same as USING)* |

**Allows:** Only an active `primary_carer` within the same `group_id` can update any caregiver row in that group. This is the policy that powers the role-change dropdown in the Members Management screen.

**Blocks:** Secondary carers and observers cannot change anyone's role, status, or any other field on the `care_givers` table through this policy.

---

#### UPDATE — "Caregiver can update their own membership; primary caregiver ca…"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `(auth.uid() = caregiver_id) OR (auth.uid() = (SELECT patients.primary_caregiver_id FROM patients WHERE patients.id = care_givers.patient_id))` |
| **WITH CHECK** | *(same as USING)* |

**Allows:** A user can update their *own* caregiver row (e.g. updating notification preferences), **or** the primary caregiver of the linked patient can update any member's row.

**Blocks:** A user cannot update another user's membership row unless they are the primary caregiver for that patient.

> **Note:** Because PostgreSQL combines multiple UPDATE policies with OR, a user passes the UPDATE check if *either* of the two UPDATE policies above is satisfied.

---

#### DELETE — "Only primary caregiver can remove caregivers"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `auth.uid() = (SELECT patients.primary_caregiver_id FROM patients WHERE patients.id = care_givers.patient_id)` |

**Allows:** Only the primary caregiver of the linked patient can delete (remove) a caregiver from the group.

**Blocks:** Secondary carers and observers cannot remove any member from a group. A member cannot remove themselves — only the primary caregiver can do that.

---

### 2. `care_group` (Care Circles)

#### SELECT — "Users can view their care circle memberships"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **USING** | `auth.uid() = primary_caregiver_id` |

**Allows:** Only the primary caregiver (group creator) can directly read `care_group` rows. Other members access group data indirectly through the `care_givers` join.

**Blocks:** Non-primary-caregiver users cannot directly query the `care_group` table.

---

#### INSERT — "Users can be able to insert records"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **WITH CHECK** | `auth.uid() = primary_caregiver_id` |

**Allows:** Any authenticated user can create a new care group, as long as they set themselves as the `primary_caregiver_id`.

**Blocks:** No user can create a group and assign someone else as the primary caregiver.

---

> **Note:** No UPDATE or DELETE policies exist on `care_group`. This means updates and deletions are **completely blocked** by RLS for all users via the PostgREST API.

---

### 3. `care_recipients`

#### SELECT — "Enable authenticated caregivers to select records"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **USING** | `auth.uid() = (SELECT care_group.primary_caregiver_id FROM care_group)` |

**Allows:** The primary caregiver can view care recipient records.

**Blocks:** Non-primary users cannot directly read care recipient data from this table.

---

#### INSERT — "Enabled insertions for caregivers"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **WITH CHECK** | `auth.uid() = (SELECT care_group.primary_caregiver_id FROM care_group)` |

**Allows:** Only the primary caregiver can add new care recipient records.

**Blocks:** Secondary carers and observers cannot create care recipient entries.

---

#### UPDATE — "Caregivers are able to update the records"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **USING** | `auth.uid() = (SELECT care_group.primary_caregiver_id FROM care_group)` |
| **WITH CHECK** | *(same as USING)* |

**Allows:** Only the primary caregiver can modify care recipient records.

**Blocks:** All other roles are denied write access.

---

> **Note:** No DELETE policy exists on `care_recipients`. Deletions are **blocked for everyone**.

---

### 4. `patients`

#### SELECT — "patients select for active caregivers"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **USING** | `(primary_caregiver_id = auth.uid()) OR (EXISTS (SELECT 1 FROM care_givers cg WHERE cg.patient_id = patients.id AND cg.caregiver_id = auth.uid() AND cg.status = 'active'))` |

**Allows:** The primary caregiver can always view the patient. Additionally, any active caregiver linked to that patient (regardless of role — `primary_carer`, `secondary_carer`, or `observer`) can view the patient record.

**Blocks:** Users with no active `care_givers` relationship to the patient cannot see the record.

---

#### INSERT — "patients insert by primary caregiver"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **WITH CHECK** | `primary_caregiver_id = auth.uid()` |

**Allows:** A user can create a patient record only if they set themselves as the `primary_caregiver_id`.

**Blocks:** No one can create a patient and assign another user as primary caregiver.

---

#### UPDATE — "patients update by active primary carer"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `EXISTS (SELECT 1 FROM care_givers cg WHERE cg.patient_id = patients.id AND cg.caregiver_id = auth.uid() AND cg.role_in_care = 'primary_carer'::member_role AND cg.status = 'active')` |

**Allows:** Only an active `primary_carer` linked to the patient can update the patient record.

**Blocks:** `secondary_carer` and `observer` roles are denied. This enforces the permission matrix rule that non-primary roles have read-only access to patient profiles.

---

#### DELETE — "patients delete by active primary carer"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `EXISTS (SELECT 1 FROM care_givers cg WHERE cg.patient_id = patients.id AND cg.caregiver_id = auth.uid() AND cg.role_in_care = 'primary_carer'::member_role AND cg.status = 'active')` |

**Allows:** Only an active `primary_carer` linked to the patient can delete the patient record.

**Blocks:** All other roles are denied.

---

### 5. `medications`

#### SELECT — "caregivers_read_medications"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `is_caregiver_for(patient_id)` |

**Allows:** Any user who is a caregiver for the patient (any role) can read medication records. This satisfies the permission matrix: all three roles have at least read access to medications.

**Blocks:** Users with no caregiver relationship cannot view medications.

---

#### INSERT — "caregivers_insert_medications"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **WITH CHECK** | `is_caregiver_for(patient_id) AND (prescribed_by = auth.uid())` |

**Allows:** A caregiver can insert a medication only if they are linked to the patient **and** they set themselves as the `prescribed_by` user.

**Blocks:** Observers and secondary carers can still technically pass `is_caregiver_for()`, so this policy relies on the application layer to restrict observer writes. The `prescribed_by = auth.uid()` check prevents impersonation.

---

#### UPDATE — "no_direct_updates"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `false` |

**Allows:** Nothing. This policy unconditionally denies all direct UPDATE operations.

**Blocks:** **Everyone.** Medication updates must go through a server-side function or edge function that bypasses RLS with a service-role key.

---

#### DELETE — "no_direct_deletes"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `false` |

**Allows:** Nothing. This policy unconditionally denies all direct DELETE operations.

**Blocks:** **Everyone.** Medication deletions are handled through server-side functions only.

---

### 6. `daily_medication_checklists`

#### SELECT — "Users see checklists for their families"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `group_id IN (SELECT group_id FROM care_group WHERE care_group.primary_caregiver_id = auth.uid())` |

**Allows:** The primary caregiver of a care group can view all daily medication checklists belonging to that group.

**Blocks:** Non-primary users cannot directly query this table. Secondary carers and observers are denied.

---

> **Note:** No INSERT, UPDATE, or DELETE policies exist on this table. All write operations are **blocked for everyone** via the PostgREST API.

---

### 7. `medication_confirmations`

#### SELECT — "group_members_select_confirmations"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **USING** | `EXISTS (SELECT 1 FROM checklist_items ci JOIN daily_medication_checklists dmc ON dmc.id = ci.checklist_id JOIN care_givers cg ON cg.group_id = dmc.group_id WHERE ci.id = medication_confirmations.checklist_item_id AND cg.caregiver_id = auth.uid() AND cg.status = 'active')` |

**Allows:** Any active group member (any role) can view medication confirmations for checklist items within their group.

**Blocks:** Users not in the group cannot see confirmations.

---

#### INSERT — "caregivers_insert_own_confirmation"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **WITH CHECK** | `auth.uid() = carer_id` |

**Allows:** A caregiver can record their own medication confirmation (setting themselves as `carer_id`).

**Blocks:** No one can insert a confirmation on behalf of another user.

---

> **Note:** No UPDATE or DELETE policies exist. Confirmations are **immutable** — once recorded, they cannot be modified or removed via the API.

---

### 8. `invites`

#### SELECT — "select own invites"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **USING** | `email = (auth.jwt() ->> 'email')` |

**Allows:** A user can only view invites addressed to their own email address.

**Blocks:** Users cannot see invites sent to other people.

---

#### INSERT — "admins can create invites"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **WITH CHECK** | `true` |

**Allows:** Any authenticated user can create an invite record. The application layer controls who should be allowed to send invites (typically the primary carer).

**Blocks:** Unauthenticated (anon) requests are denied.

---

> **Note:** No UPDATE or DELETE policies exist. Invites are managed server-side via RPC functions (`accept_group_invite`, `reject_group_invite`).

---

### 9. `messages`

#### SELECT — "Users can view their messages"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `(auth.uid() = sender_id) OR (auth.uid() = recipient_id)` |

**Allows:** A user can read messages where they are either the sender or the recipient.

**Blocks:** Users cannot read messages between other users.

---

> **Note:** No INSERT, UPDATE, or DELETE policies are documented. Message creation and management is handled server-side.

---

### 10. `notifications`

#### SELECT — "Users can view own notifications"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `auth.uid() = user_id` |

**Allows:** A user can only read their own notifications.

**Blocks:** Users cannot see notifications belonging to other users.

---

#### UPDATE — "Users can update own notifications"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `auth.uid() = user_id` |

**Allows:** A user can update their own notifications (e.g. marking as read).

**Blocks:** Users cannot modify another user's notifications.

---

> **Note:** No INSERT or DELETE policies exist. Notification creation is server-side; deletion is blocked.

---

### 11. `profiles`

#### SELECT — "Users can view all profiles"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `true` |

**Allows:** All authenticated users can view all profile records. This is intentional — profile data (name, avatar) is needed to render member lists across the app.

**Blocks:** Nothing. This is a fully open read policy.

---

#### UPDATE — "Users can update own profile"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `auth.uid() = id` |

**Allows:** A user can only update their own profile row.

**Blocks:** No user can modify another user's profile.

---

> **Note:** No INSERT or DELETE policies exist. Profile rows are created automatically by a database trigger (`verify_profile_trigger`) on user sign-up; deletion is blocked.

---

### 12. `storage.objects` (File Storage)

#### SELECT — "Give users authenticated access to folder 1oj01fe_0"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **Bucket** | `avatars` |
| **USING** | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'private' AND auth.role() = 'authenticated'` |

**Allows:** Any authenticated user can read files in the `avatars` bucket under the `private/` folder.

**Blocks:** Unauthenticated users and files outside `private/` are denied.

---

#### SELECT — "patient avatars read by active caregivers" / "patient avatars readable by active caregivers"

| Detail | Value |
|:---|:---|
| **Roles** | `authenticated` |
| **Bucket** | `patient-avatars` |
| **USING** | `bucket_id = 'patient-avatars' AND EXISTS (SELECT 1 FROM care_givers cg WHERE cg.patient_id::text = (storage.foldername(objects.name))[1] AND cg.caregiver_id = auth.uid() AND cg.status = 'active')` |

**Allows:** An active caregiver can read patient avatar files where the folder name matches a `patient_id` they are linked to. All roles (`primary_carer`, `secondary_carer`, `observer`) can read.

**Blocks:** Users not linked to the patient cannot view that patient's avatar.

> **Note:** There are two duplicate SELECT policies with this same logic. They are functionally equivalent.

---

#### INSERT — "patient avatars insert by primary carer"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **Bucket** | `avatars` |
| **WITH CHECK** | `bucket_id = 'avatars' AND EXISTS (SELECT 1 FROM care_givers cg WHERE cg.caregiver_id = auth.uid() AND cg.role_in_care = 'primary_carer'::member_role AND cg.status = 'active')` |

**Allows:** Only an active `primary_carer` can upload new files to the `avatars` bucket.

**Blocks:** `secondary_carer` and `observer` roles cannot upload avatars.

---

#### INSERT — "Give users authenticated access to folder 1oj01fe_1"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **Bucket** | `avatars` |
| **WITH CHECK** | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'private' AND auth.role() = 'authenticated'` |

**Allows:** Any authenticated user can upload files to the `avatars/private/` folder (used for user profile avatars).

**Blocks:** Unauthenticated users and uploads outside the `private/` folder path.

---

#### UPDATE — "patient avatars update by primary carer"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **Bucket** | `avatars` |
| **USING** | `bucket_id = 'avatars' AND EXISTS (SELECT 1 FROM care_givers cg WHERE cg.caregiver_id = auth.uid() AND cg.role_in_care = 'primary_carer'::member_role AND cg.status = 'active')` |

**Allows:** Only an active `primary_carer` can overwrite/update existing avatar files.

**Blocks:** `secondary_carer` and `observer` roles cannot modify avatar files.

---

#### UPDATE — "Give users authenticated access to folder 1oj01fe_2"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **Bucket** | `avatars` |
| **USING** | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'private' AND auth.role() = 'authenticated'` |

**Allows:** Any authenticated user can update their own files in `avatars/private/`.

**Blocks:** Unauthenticated users.

---

#### DELETE — "patient avatars delete by primary carer"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **Bucket** | `avatars` |
| **USING** | `bucket_id = 'avatars' AND EXISTS (SELECT 1 FROM care_givers cg WHERE cg.caregiver_id = auth.uid() AND cg.role_in_care = 'primary_carer'::member_role AND cg.status = 'active')` |

**Allows:** Only an active `primary_carer` can delete avatar files from the `avatars` bucket.

**Blocks:** `secondary_carer` and `observer` roles cannot delete avatar files.

---

#### DELETE — "Give users authenticated access to folder 1oj01fe_3"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **Bucket** | `avatars` |
| **USING** | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'private' AND auth.role() = 'authenticated'` |

**Allows:** Any authenticated user can delete their own files in `avatars/private/`.

**Blocks:** Unauthenticated users.

---

### 10. `handover_journal_entries`

#### SELECT — "Group members can view handover journal entries"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = handover_journal_entries.group_id AND cg.caregiver_id = auth.uid() AND cg.status = 'active')` |

**Allows:** Any active member of the care group can read every handover journal entry for that group. This satisfies the requirement that all family roles, including observers, can view the handover log.

**Blocks:** Users who are not active members of the group cannot view that group's handover journal entries.

---

#### INSERT — "Carers can add handover journal entries"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **WITH CHECK** | `author_id = auth.uid() AND EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = handover_journal_entries.group_id AND cg.caregiver_id = auth.uid() AND cg.status = 'active' AND cg.role_in_care IN ('primary_carer'::member_role, 'secondary_carer'::member_role))` |

**Allows:** Active primary and secondary carers can write their own handover journal entries for the group.

**Blocks:** Observers cannot create handover journal entries, and no user can create an entry on behalf of another author.

---

#### UPDATE — "Authors can edit handover journal entries for 60 minutes"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `author_id = auth.uid() AND created_at >= timezone('utc', now()) - interval '60 minutes'` |
| **WITH CHECK** | *(same as USING)* |

**Allows:** The original author of a handover journal entry can edit their own entry for up to 60 minutes after it was created.

**Blocks:** Other members cannot edit someone else's entry, and authors lose edit access once the 60-minute window has expired.

---

### 11. `weekly_shift_assignments`

#### SELECT — "Group members can view weekly shift assignments"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = weekly_shift_assignments.group_id AND cg.caregiver_id = auth.uid() AND cg.status = 'active')` |

**Allows:** Any active member of the care group can read the weekly shift coverage grid, including observers.

**Blocks:** Users who are not active members of the group cannot see shift assignments for that group.

---

#### INSERT — "Primary carers can create weekly shift assignments"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **WITH CHECK** | `EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = weekly_shift_assignments.group_id AND cg.caregiver_id = auth.uid() AND cg.status = 'active' AND cg.role_in_care = 'primary_carer'::member_role) AND (assigned_caregiver_id IS NULL OR EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = weekly_shift_assignments.group_id AND cg.caregiver_id = weekly_shift_assignments.assigned_caregiver_id AND cg.status = 'active'))` |

**Allows:** Only an active `primary_carer` can create or mark a weekly slot assignment for the group. The selected assignee must either be empty or an active group member.

**Blocks:** Secondary carers and observers cannot assign slots, and no user can assign a slot to someone outside the care group.

---

#### UPDATE — "Primary carers can update weekly shift assignments"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = weekly_shift_assignments.group_id AND cg.caregiver_id = auth.uid() AND cg.status = 'active' AND cg.role_in_care = 'primary_carer'::member_role)` |
| **WITH CHECK** | `EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = weekly_shift_assignments.group_id AND cg.caregiver_id = auth.uid() AND cg.status = 'active' AND cg.role_in_care = 'primary_carer'::member_role) AND (assigned_caregiver_id IS NULL OR EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = weekly_shift_assignments.group_id AND cg.caregiver_id = weekly_shift_assignments.assigned_caregiver_id AND cg.status = 'active'))` |

**Allows:** Only an active `primary_carer` can change an existing weekly shift assignment, including clearing a slot back to unassigned.

**Blocks:** Non-primary roles cannot reassign or clear coverage slots.

---

### 12. `weekly_shift_assignment_history`

#### SELECT — "Group members can view weekly shift assignment history"

| Detail | Value |
|:---|:---|
| **Roles** | `public` |
| **USING** | `EXISTS (SELECT 1 FROM care_givers cg WHERE cg.group_id = weekly_shift_assignment_history.group_id AND cg.caregiver_id = auth.uid() AND cg.status = 'active')` |

**Allows:** Any active member of the care group can read the historical record of shift changes for that group. This keeps the data queryable for downstream wellbeing features.

**Blocks:** Non-members cannot inspect shift history.

---

### Summary: Role Impact Across All Tables

| Table | primary_carer | secondary_carer | observer |
|:---|:---|:---|:---|
| `care_givers` | SELECT, INSERT, UPDATE, DELETE | SELECT, INSERT (self only) | SELECT, INSERT (self only) |
| `care_group` | SELECT, INSERT | — | — |
| `care_recipients` | SELECT, INSERT, UPDATE | — | — |
| `patients` | SELECT, INSERT, UPDATE, DELETE | SELECT | SELECT |
| `medications` | SELECT, INSERT | SELECT, INSERT | SELECT |
| `daily_medication_checklists` | SELECT | — | — |
| `handover_journal_entries` | SELECT, INSERT, UPDATE (own, 60 mins) | SELECT, INSERT, UPDATE (own, 60 mins) | SELECT |
| `weekly_shift_assignments` | SELECT, INSERT, UPDATE | SELECT | SELECT |
| `weekly_shift_assignment_history` | SELECT | SELECT | SELECT |
| `medication_confirmations` | SELECT, INSERT | SELECT, INSERT | SELECT, INSERT |
| `invites` | SELECT (own), INSERT | SELECT (own), INSERT | SELECT (own), INSERT |
| `messages` | SELECT (own) | SELECT (own) | SELECT (own) |
| `notifications` | SELECT (own), UPDATE (own) | SELECT (own), UPDATE (own) | SELECT (own), UPDATE (own) |
| `profiles` | SELECT (all), UPDATE (own) | SELECT (all), UPDATE (own) | SELECT (all), UPDATE (own) |
| `storage.objects` | SELECT, INSERT, UPDATE, DELETE | SELECT | SELECT |

---

## RLS Direct Verification

The repository now includes a direct database-level RLS verification harness at `supabase/verify_cross_circle_rls.sql` plus deterministic fixture data in `supabase/seeds/rls_cross_circle_verification_seed.sql`.

This harness is intentionally kept outside the frontend and backend applications. It connects directly to PostgreSQL, switches to the `authenticated` role, sets `request.jwt.claim.sub` to simulate each caregiver role, and then attempts cross-circle `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations against Circle B rows while authenticated as Circle A users.

### Verification Scope

| Table | Role | Permitted operations in-scope | Cross-circle operations tested |
|:---|:---|:---|:---|
| `care_givers` | `primary_carer` | SELECT, INSERT, UPDATE, DELETE | SELECT, INSERT, UPDATE, DELETE |
| `care_givers` | `secondary_carer` | SELECT, INSERT (self only) | SELECT, INSERT, UPDATE, DELETE |
| `care_givers` | `observer` | SELECT, INSERT (self only) | SELECT, INSERT, UPDATE, DELETE |
| `care_group` | `primary_carer` | SELECT, INSERT | SELECT, INSERT, UPDATE, DELETE |
| `care_group` | `secondary_carer` | none | SELECT, INSERT, UPDATE, DELETE |
| `care_group` | `observer` | none | SELECT, INSERT, UPDATE, DELETE |
| `patients` | `primary_carer` | SELECT, INSERT, UPDATE, DELETE | SELECT, INSERT, UPDATE, DELETE |
| `patients` | `secondary_carer` | SELECT | SELECT, INSERT, UPDATE, DELETE |
| `patients` | `observer` | SELECT | SELECT, INSERT, UPDATE, DELETE |
| `medications` | `primary_carer` | SELECT, INSERT | SELECT, INSERT, UPDATE, DELETE |
| `medications` | `secondary_carer` | SELECT, INSERT | SELECT, INSERT, UPDATE, DELETE |
| `medications` | `observer` | SELECT | SELECT, INSERT, UPDATE, DELETE |
| `handover_journal_entries` | `primary_carer` | SELECT, INSERT, UPDATE (own, 60 mins) | SELECT, INSERT, UPDATE, DELETE |
| `handover_journal_entries` | `secondary_carer` | SELECT, INSERT, UPDATE (own, 60 mins) | SELECT, INSERT, UPDATE, DELETE |
| `handover_journal_entries` | `observer` | SELECT | SELECT, INSERT, UPDATE, DELETE |

### Expected interpretation of direct-query results

- Cross-circle `SELECT` should return **zero rows visible**.
- Cross-circle `INSERT` should fail with a **database/RLS error**.
- Cross-circle `UPDATE` and `DELETE` should either fail with a **database/RLS error** or affect **zero rows** because the target rows are invisible under RLS.

This behavior is what PostgreSQL RLS enforces at the database layer for direct SQL queries. In practice, blocked reads usually appear as zero visible rows rather than a literal HTTP `403`.

### Current test results status

Cross-circle RLS assertions are executed via `supabase/verify_cross_circle_rls.sql` after `npx supabase db reset`. Results can be refreshed locally or through the manual GitHub Actions workflow `.github/workflows/rls-verify.yml` (requires Docker). Until a run completes in your environment, treat the matrix below as the **verification scope** — re-run the script and update Pass/Fail cells before capstone submission.

| Role | Table | SELECT | INSERT | UPDATE | DELETE | Status |
|:---|:---|:---|:---|:---|:---|:---|
| `primary_carer` | `care_givers` | Not run | Not run | Not run | Not run | Pending local execution |
| `primary_carer` | `care_group` | Not run | Not run | Not run | Not run | Pending local execution |
| `primary_carer` | `patients` | Not run | Not run | Not run | Not run | Pending local execution |
| `primary_carer` | `medications` | Not run | Not run | Not run | Not run | Pending local execution |
| `primary_carer` | `handover_journal_entries` | Not run | Not run | Not run | Not run | Pending local execution |
| `secondary_carer` | `care_givers` | Not run | Not run | Not run | Not run | Pending local execution |
| `secondary_carer` | `care_group` | Not run | Not run | Not run | Not run | Pending local execution |
| `secondary_carer` | `patients` | Not run | Not run | Not run | Not run | Pending local execution |
| `secondary_carer` | `medications` | Not run | Not run | Not run | Not run | Pending local execution |
| `secondary_carer` | `handover_journal_entries` | Not run | Not run | Not run | Not run | Pending local execution |
| `observer` | `care_givers` | Not run | Not run | Not run | Not run | Pending local execution |
| `observer` | `care_group` | Not run | Not run | Not run | Not run | Pending local execution |
| `observer` | `patients` | Not run | Not run | Not run | Not run | Pending local execution |
| `observer` | `medications` | Not run | Not run | Not run | Not run | Pending local execution |
| `observer` | `handover_journal_entries` | Not run | Not run | Not run | Not run | Pending local execution |

### Execution note

Validation was prepared but not executed in this workspace because `npx supabase db reset` prompted for a one-time install of the Supabase CLI package and that install was declined during this session. Once the CLI is available locally, run:

```bash
npx supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/verify_cross_circle_rls.sql
```

The script prints:

- a per-role, per-table pass/fail matrix,
- a detailed list of any failed checks, and
- a final total of passed vs failed assertions.

---

## **AI Q&A Acceptance Test Summary**

**Test Date:** 2026-05-23

**Tester:** QA Team

**Test Patient:** Kenn Kun

**Backend URL:** localhost:3000

**Frontend URL:** localhost:5173

### Results (summary)

- Total questions tested: **20**
- Passed: **20**
- Failed: **0**
- Pass rate: **100%**
- Average latency: **1,245 ms**
- 95th percentile latency: **1,850 ms**
- Meets 8-second latency requirement: **Yes**

### Key Findings

- Grounding: All answerable questions returned accurate, profile-based responses with no hallucinations.
- Refusal behaviour: All absent-data questions were refused correctly and consistently using the authorised phrasing.
- Latency: Performance is well within the 8,000 ms requirement.

For full test details see [QA_REGRESSION.md](./QA_REGRESSION.md) and [AI-Approach-Testing.md](./AI-Approach-Testing.md).

