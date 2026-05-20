# Design & Testing

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
