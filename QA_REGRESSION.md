# CareCircle QA Regression Test Plan

Derived from `backend/src/**/*.controller.ts`, `backend/src/**/*.dto.ts`, `frontend/src/App.tsx`, `frontend/src/pages/**`, `frontend/src/contexts/AuthContext.tsx`, and `supabase/migrations/*.sql`. Every flow below traces to a real route, component, or RLS policy — flows that could not be traced are listed in "Coverage gaps", not included here.

---

## AUTH

### AUTH-01 — Sign up with valid email/password
**Preconditions:** No account exists for test email. On `/signup`.
**Steps:** Enter email; enter password meeting rules (≥8 chars, ≥1 digit, ≥1 of `! @ # $ % & *`); enter matching confirm password; submit.
**Expected:** `supabase.auth.signUp()` succeeds; "check your email" screen shown with 1-hour expiry note.
**Severity:** Blocker

### AUTH-02 — Sign up rejects weak password (client-side)
**Preconditions:** On `/signup`.
**Steps:** Enter password under 8 chars, or missing digit, or missing special char.
**Expected:** Inline validation error shown, no `signUp()` call made.
**Severity:** Major

### AUTH-03 — Sign up rejects mismatched confirm-password
**Steps:** Enter password and a different confirmPassword; submit.
**Expected:** Mismatch error shown, no API call.
**Severity:** Minor

### AUTH-04 — Sign up with already-registered email
**Preconditions:** Email already has an account.
**Steps:** Submit signup form with that email.
**Expected:** Supabase "already registered" error mapped to an account-exists message in UI.
**Severity:** Major

### AUTH-05 — Login with valid password
**Preconditions:** Confirmed account exists. On `/login`, password mode.
**Steps:** Enter correct email/password; submit.
**Expected:** `signInWithPassword()` succeeds, redirect to `/dashboard` (or pending-invite path if one exists).
**Severity:** Blocker

### AUTH-06 — Login with invalid credentials
**Steps:** Enter wrong password; submit.
**Expected:** Error mapped from "Invalid login credentials" to a user-facing mismatch message; no redirect.
**Severity:** Major

### AUTH-07 — Login via magic link
**Steps:** Toggle to magic-link mode; enter email; submit.
**Expected:** `signInWithOtp()` called; "check your email" screen shown with 1-hour expiry.
**Severity:** Major

### AUTH-08 — Forgot password
**Preconditions:** On `/forgot-password`.
**Steps:** Enter registered email; submit.
**Expected:** `resetPasswordForEmail()` called with `redirectTo: /reset-password`; confirmation screen shown.
**Severity:** Major

### AUTH-09 — Unverified email is blocked from app
**Preconditions:** Account created but email link not clicked.
**Steps:** Attempt login with valid credentials.
**Expected:** `session.user.email_confirmed_at` is null → `isAuthenticated` is false in `App.tsx`; user is not granted access to `/dashboard` routes.
**Severity:** Blocker

### AUTH-10 — Sign out
**Preconditions:** Logged in.
**Steps:** Trigger sign out.
**Expected:** `supabase.auth.signOut()` called, session cleared, redirected out of authenticated routes.
**Severity:** Major

### AUTH-11 — Session restore on reload
**Preconditions:** Logged in, page refreshed.
**Steps:** Reload app.
**Expected:** `AuthContext` calls `getSession()` on mount and restores authenticated state without forcing re-login.
**Severity:** Major

---

## GROUP INVITES

### INVITE-01 — Send invite email (backend)
**Preconditions:** Caller has `inviteId`, `groupId`, valid `groupName`.
**Steps:** `POST /api/invites/group/send-email` with `{inviteId, groupId, email, groupName}`.
**Expected:** Generates Supabase magic link, sends Gmail invite email, returns `{ok: true}`.
**Severity:** Blocker

### INVITE-02 — Send invite with invalid email format
**Steps:** `POST /api/invites/group/send-email` with malformed `email`.
**Expected:** 400 from `SendGroupInviteEmailDto` `@IsEmail()` validation; no email sent.
**Severity:** Major

### INVITE-03 — Send invite with oversized groupName
**Steps:** Submit `groupName` > 200 chars.
**Expected:** 400 from `@MaxLength(200)`.
**Severity:** Minor

### INVITE-04 — Invite send fails when Gmail not configured
**Preconditions:** Gmail env vars unset.
**Steps:** Trigger invite send.
**Expected:** `ServiceUnavailableException('invite_email_requires_gmail_env')`.
**Severity:** Major

### INVITE-05 — Click invite link, email not registered
**Steps:** Open `/group-invite?inviteId=...&email=new@example.com`.
**Expected:** Redirected to `/signup` (email not registered).
**Severity:** Major

### INVITE-06 — Click invite link, registered but logged out
**Steps:** Open invite link for a registered email while logged out.
**Expected:** Redirected to `/login`.
**Severity:** Major

### INVITE-07 — Click invite link, logged in with mismatched email
**Preconditions:** Logged in as user A; invite link is for user B's email.
**Steps:** Open invite link.
**Expected:** Email-mismatch error state shown; invite is not accepted.
**Severity:** Major (potential authorization issue if bypassable)

### INVITE-08 — Accept invitation
**Preconditions:** Logged in with matching email, invite pending, confirmation=true.
**Steps:** Click "Accept" on `InviteAcceptPanel`.
**Expected:** RPC `update_invite_status(inviteId, 'accepted')` runs; `care_givers` row created (`status='active'`); navigates to `/groups/{groupId}`.
**Severity:** Blocker

### INVITE-09 — Reject invitation
**Steps:** Click "Reject".
**Expected:** RPC `update_invite_status(inviteId, 'rejected')`; navigates to `/`.
**Severity:** Major

### INVITE-10 — Accept invite when already a member
**Preconditions:** User already has a `care_givers` row for this group.
**Steps:** Open confirmation screen.
**Expected:** UI detects existing membership (via membership check) and does not create a duplicate `care_givers` row.
**Severity:** Major

### INVITE-11 — 8 active-caregiver group limit
**Preconditions:** Group already has 8 active `care_givers` rows.
**Steps:** Accept a 9th invite (insert into `care_givers` with `status='active'`).
**Expected:** `check_active_member_limit()` trigger raises `'Group has reached the maximum capacity of 8 active members.'`; insert fails.
**Severity:** Blocker

### INVITE-12 — Invite visibility is restricted to recipient (RLS)
**Preconditions:** Two users, A and B, each with separate pending invites.
**Steps:** As user A, query `invites` table directly via Supabase client.
**Expected:** Only invites where `email = auth.jwt() ->> 'email'` are visible; B's invite is not returned.
**Severity:** Blocker (RLS/data-leak boundary)

---

## CARE GROUPS

### GROUP-01 — Create care group (happy path)
**Preconditions:** Logged in, on `/groups/create`.
**Steps:** Fill group name (≥3 chars), patient full name (≥2 chars), DOB (past date), relationship, timezone, and at least one of patient email/phone; submit.
**Expected:** Inserts/links `profiles`, `patients`, `care_group`, and a `care_givers` row for the creator as active primary caregiver; navigates to new group.
**Severity:** Blocker

### GROUP-02 — Create group missing both patient email and phone
**Steps:** Leave both patient email and phone blank; submit.
**Expected:** Client-side validation blocks submit (at least one required).
**Severity:** Major

### GROUP-03 — Create group with invalid DOB (future date)
**Steps:** Enter a future date of birth.
**Expected:** Validation error, no insert performed.
**Severity:** Minor

### GROUP-04 — Patients RLS — only designated caregiver can create
**Steps:** Attempt to insert a `patients` row where `primary_caregiver_id != auth.uid()`.
**Expected:** Insert rejected by RLS policy.
**Severity:** Blocker

### GROUP-05 — View group members list
**Preconditions:** Member of group, on `/groups/:groupId/members`.
**Steps:** Load page.
**Expected:** `GroupMembersTable` lists members with role/status, scoped to group via `is_group_member(group_id)` RLS on `care_givers`.
**Severity:** Major

### GROUP-06 — Non-primary caregiver cannot manage members
**Preconditions:** Logged in as a `caregiver` (not `primary_caregiver`).
**Steps:** Open `/groups/:groupId/members`.
**Expected:** Invite/role-change/remove actions hidden per `canManageMembers(role)`; if attempted directly via API/RLS, write is rejected.
**Severity:** Blocker (authorization boundary)

### GROUP-07 — Primary caregiver changes a member's role
**Preconditions:** Logged in as primary caregiver.
**Steps:** Open `MemberActionConfirmationModal`, change role, confirm.
**Expected:** `validateMemberRoleChange()` passes, `care_givers.role_in_care` updated.
**Severity:** Major

### GROUP-08 — Primary caregiver removes a member
**Steps:** Confirm removal in modal.
**Expected:** `care_givers` row deleted (or status updated); removed user loses access to group on next load.
**Severity:** Major

### GROUP-09 — Non-primary attempts to delete a `care_givers` row directly
**Preconditions:** Logged in as non-primary caregiver.
**Steps:** Attempt direct delete via Supabase client.
**Expected:** RLS DELETE policy on `care_givers` rejects (only primary caregiver permitted).
**Severity:** Blocker

---

## MEDICATIONS

### MED-01 — Create medication, daily schedule
**Preconditions:** Member of group, on `/groups/:groupId/medications/add`.
**Steps:** Fill medicationName, dose ≥0.01, unit, startDate, scheduleType='daily', specificTimes; submit.
**Expected:** `POST /api/groups/:groupId/medications` returns 201/200; record inserted; `ChecklistMaterializationService.materializeForMedication()` generates future `checklist_items`.
**Severity:** Blocker

### MED-02 — Create medication, group not found
**Steps:** `POST /api/groups/{invalidGroupId}/medications` with valid DTO.
**Expected:** `NotFoundException('Group not found')`.
**Severity:** Major

### MED-03 — Create medication with dose below minimum
**Steps:** Submit `dose: 0`.
**Expected:** 400 from `@Min(0.01)`.
**Severity:** Minor

### MED-04 — Create medication with invalid scheduleType
**Steps:** Submit `scheduleType: 'hourly'` (not in allowed set).
**Expected:** 400 from `@IsIn(['daily','weekly','biweekly','monthly','as_needed'])`.
**Severity:** Minor

### MED-05 — Create non-"as_needed" medication missing course bounds
**Steps:** Submit `scheduleType: 'daily'` with no `perpetual`, no `endDate`, no `totalDoses`.
**Expected:** Controller's `validateCourseBounds()` rejects — non-as-needed meds must specify perpetual, end date, or total doses.
**Severity:** Major

### MED-06 — Create "as_needed" medication skips course-bounds requirement
**Steps:** Submit `scheduleType: 'as_needed'` with no perpetual/endDate/totalDoses.
**Expected:** Accepted; no checklist materialization triggered (per service logic for as_needed).
**Severity:** Major

### MED-07 — Checklist materialization failure after successful insert
**Preconditions:** Simulate materialization service failure (e.g. bad schedule data).
**Steps:** Create a non-as-needed medication that triggers a materialization error.
**Expected:** `InternalServerErrorException('Medication saved but checklist materialization failed')` — medication row exists but caller is informed materialization failed (no silent data loss either way).
**Severity:** Major

### MED-08 — Update medication
**Steps:** `PATCH /api/groups/:groupId/medications/:medicationId` with changed dose/schedule.
**Expected:** 200, record updated; if schedule-affecting fields changed, `ChecklistReconciliationService.reconcileAfterMedicationEdit()` runs.
**Severity:** Major

### MED-09 — Update non-existent medication
**Steps:** `PATCH` with a random `medicationId`.
**Expected:** `NotFoundException('Medication not found')`.
**Severity:** Major

### MED-10 — Pause medication
**Steps:** `POST /api/groups/:groupId/medications/:medicationId/pause`.
**Expected:** Status set to `paused`; checklist reconciled (future due items removed/suspended).
**Severity:** Major

### MED-11 — Activate medication
**Steps:** `POST .../activate` on a paused medication.
**Expected:** Status set to `active`; checklist reconciled.
**Severity:** Major

### MED-12 — Archive medication
**Steps:** `POST .../archive`.
**Expected:** Status set to `archived`; checklist reconciled (no further items generated).
**Severity:** Major

### MED-13 — Medications RLS — only assigned caregiver can view/insert
**Steps:** As a user not in `care_givers` for the patient's group, query `medications` table directly.
**Expected:** RLS `is_caregiver_for(patient_id)` blocks SELECT/INSERT for non-members.
**Severity:** Blocker

### MED-14 — Direct update/delete on `medications` is blocked by RLS
**Steps:** Attempt `UPDATE`/`DELETE` directly against `medications` via Supabase client (bypassing backend).
**Expected:** Policies `no_direct_updates`/`no_direct_deletes` reject — all mutations must go through backend service-role path.
**Severity:** Blocker

---

## MEDICATION CHECKLIST

### CHK-01 — Load daily checklist for a date
**Preconditions:** On `/groups/:groupId/checklist`, medications exist with generated items.
**Steps:** Load page for current date.
**Expected:** Checklist + items fetched, items show correct `status` (due/overdue/given/skipped).
**Severity:** Blocker

### CHK-02 — Filter checklist by status
**Steps:** Apply `filter=overdue` query param.
**Expected:** Only overdue items shown.
**Severity:** Minor

### CHK-03 — Mark item as given
**Steps:** Mark a due item as given (optionally attach photo).
**Expected:** `checklist_items.status` → `given`, `given_at` set; if photo attached, `medication_confirmations` row created with `photo_url`.
**Severity:** Major

### CHK-04 — Mark item as skipped with reason
**Steps:** Mark item skipped, enter skip reason/notes.
**Expected:** Status → `skipped`, `skip_reason`/`skip_notes` persisted.
**Severity:** Major

### CHK-05 — Item transitions to overdue automatically
**Preconditions:** Item scheduled >30 min in the past, still `due`.
**Steps:** Wait for/trigger `OverdueDetectionService` run.
**Expected:** Item status → `overdue`, `missed_medications_alert` row created, push notification dispatched to group members.
**Severity:** Blocker

### CHK-06 — SMS fallback sent if alert unresolved
**Preconditions:** Overdue alert created and push sent; item still not marked given/skipped after `sms_due_at`.
**Expected:** SMS dispatched to `sms_phone_numbers`; alert status → `sms_sent`.
**Severity:** Major

### CHK-07 — Confirming a dose after alert created cancels further escalation
**Preconditions:** Overdue alert in `push_sent` state, `sms_due_at` not yet reached.
**Steps:** Mark item given before SMS fires.
**Expected:** Alert is cancelled (`cancelled_at` set) — no SMS sent for a dose already resolved.
**Severity:** Major

### CHK-08 — Checklist visibility scoped to group members (RLS)
**Steps:** As a non-member, query `checklist_items`/`daily_medication_checklists` directly.
**Expected:** Rejected — `group_id IN (SELECT group_id FROM care_givers WHERE caregiver_id = auth.uid())` excludes non-members.
**Severity:** Blocker

### CHK-09 — Medication confirmation insert restricted to own caregiver id
**Steps:** Attempt to insert a `medication_confirmations` row with `caregiver_id` set to a different user's id.
**Expected:** RLS `caregivers_insert_own_confirmation` rejects.
**Severity:** Blocker

---

## APPOINTMENTS

### APPT-01 — Create appointment
**Preconditions:** On `/groups/:groupId/appointments/new`.
**Steps:** Fill title, date, time; submit.
**Expected:** Appointment created via backend call; appears in `/groups/:groupId/appointments` list.
**Severity:** Blocker

### APPT-02 — Create appointment missing required fields
**Steps:** Submit with title/date/time blank.
**Expected:** Client-side validation blocks submit.
**Severity:** Minor

### APPT-03 — Edit single occurrence of recurring appointment
**Preconditions:** Appointment has `recurrenceRule` set.
**Steps:** Edit with `scope=this`.
**Expected:** Only the targeted occurrence is changed; rest of series untouched.
**Severity:** Major

### APPT-04 — Edit future occurrences of recurring appointment
**Steps:** Edit with `scope=future`.
**Expected:** This and all later occurrences updated; past occurrences untouched.
**Severity:** Major

### APPT-05 — Edit entire recurring series
**Steps:** Edit with `scope=all`.
**Expected:** All occurrences in the series updated.
**Severity:** Major

### APPT-06 — Reminder sent at configured offsets
**Preconditions:** Appointment with `reminder_offsets` (e.g. 1440/60 min before).
**Steps:** Wait for/trigger reminders cron near an offset window.
**Expected:** Push (and/or email) reminder sent once per offset; `reminder_sent`/`reminder_sent_at` recorded to prevent duplicates.
**Severity:** Major

---

## SHIFTS

### SHIFT-01 — Assign a shift
**Preconditions:** Logged in as primary caregiver (or role permitted by `canAssignShifts`), on `/groups/:groupId/shifts`.
**Steps:** `POST /api/shifts/assignments` with `{groupId, shiftDate, slot, assignedCaregiverId}`.
**Expected:** Assignment saved; reflected in `GroupScheduleOverview`.
**Severity:** Major

### SHIFT-02 — Unassign a shift
**Steps:** Submit assignment with `assignedCaregiverId: null`.
**Expected:** Shift slot cleared.
**Severity:** Minor

### SHIFT-03 — Non-permitted role attempts to assign shift
**Preconditions:** Logged in as a role for which `canAssignShifts(role)` is false.
**Steps:** Attempt to access shift-assignment UI/action.
**Expected:** Action hidden/blocked in UI; if called directly, should be rejected (verify whether backend enforces this — see Coverage gaps).
**Severity:** Major

### SHIFT-04 — Shift assignment service error
**Steps:** Trigger a failure path in `ShiftsService.assignShift` (e.g. invalid groupId).
**Expected:** `HttpException('Unable to save shift assignment', 500)`.
**Severity:** Minor

### SHIFT-05 — Shift change is recorded in history
**Steps:** Reassign an already-assigned shift slot to a different caregiver.
**Expected:** `weekly_shift_assignment_history` gets a row capturing `previous_caregiver_id`, `assigned_caregiver_id`, `changed_by`, `changed_at`.
**Severity:** Minor

### SHIFT-06 — Shift reminder for next-day evening assignment
**Preconditions:** Caregiver assigned to tomorrow's evening shift.
**Steps:** Wait for/trigger reminders cron.
**Expected:** Assigned caregiver receives a push reminder.
**Severity:** Minor

### SHIFT-07 — My Shifts page shows today's assignment and coverage gaps
**Preconditions:** On `/dashboard/my-shifts`.
**Steps:** Load page with an uncovered shift in a managed group.
**Expected:** `MyShiftsTodayWidget` shows today's assignment; `ShiftCoverageAlerts` flags uncovered slots.
**Severity:** Minor

---

## PUSH / SMS / NOTIFICATIONS

### NOTIF-01 — Register push subscription
**Steps:** `POST /api/push/subscriptions` with `{userId, platform: 'web_push', endpoint, p256dh, auth}`.
**Expected:** Subscription upserted, `{id}` returned.
**Severity:** Major

### NOTIF-02 — Register push subscription with invalid platform
**Steps:** Submit `platform: 'sms'` (not in `['web_push','fcm']`).
**Expected:** 400 from `@IsIn`.
**Severity:** Minor

### NOTIF-03 — Unregister push subscription
**Steps:** `DELETE /api/push/subscriptions/:id` with `{userId}`.
**Expected:** `{deleted: true}` if it belonged to that user.
**Severity:** Minor

### NOTIF-04 — Get VAPID public key
**Steps:** `GET /api/push/vapid-public-key`.
**Expected:** Returns configured key, or `null` if unset (no error).
**Severity:** Minor

### NOTIF-05 — Push subscriptions are scoped to owner (RLS)
**Steps:** As user A, query `push_subscriptions` directly.
**Expected:** `push_subscriptions_own` policy returns only A's own rows.
**Severity:** Blocker

### NOTIF-06 — Dev push test endpoint blocked outside development
**Preconditions:** `NODE_ENV != 'development'`.
**Steps:** `POST /api/dev/push/test`.
**Expected:** 404 from `DevOnlyGuard`.
**Severity:** Major (prod safety)

### NOTIF-07 — Dev push test sends in development
**Preconditions:** `NODE_ENV=development`, valid `userId` with a subscription.
**Steps:** `POST /api/dev/push/test` with `{userId}`.
**Expected:** `{ok: true}`, push delivered to all of that user's subscriptions.
**Severity:** Minor

### NOTIF-08 — Dev SMS test blocked outside development
**Preconditions:** `NODE_ENV != 'development'`.
**Steps:** `POST /api/dev/sms/test`.
**Expected:** 404 from `DevOnlyGuard`.
**Severity:** Major (prod safety)

### NOTIF-09 — Dev SMS test with invalid phone format
**Steps:** `POST /api/dev/sms/test` with `to: '12345'` (not E.164).
**Expected:** 400 from `@Matches(/^\+[1-9]\d{7,14}$/)`.
**Severity:** Minor

### NOTIF-10 — Dev SMS test with no destination and no fallback configured
**Steps:** `POST /api/dev/sms/test` with no `to`, `TWILIO_DEV_TEST_TO_NUMBER` unset.
**Expected:** `{ok: false, error: 'missing_destination'}`.
**Severity:** Minor

### NOTIF-11 — Dev reminders run blocked outside development
**Preconditions:** `NODE_ENV != 'development'`.
**Steps:** `POST /api/dev/reminders/run`.
**Expected:** 404 from `DevOnlyGuard`.
**Severity:** Major (prod safety)

### NOTIF-12 — Low stock alert fires once per threshold breach
**Preconditions:** Medication `quantity_on_hand` below its computed daily-dose threshold, `low_stock_alert_sent_at` null.
**Steps:** Trigger/await `MedicationLowStockAlertService` run.
**Expected:** Alert sent once; `low_stock_alert_sent_at` set so a duplicate run doesn't re-alert.
**Severity:** Major

### NOTIF-13 — End-to-end push registration via the browser UI
**Preconditions:** Logged in, browser supports `serviceWorker`/`PushManager`/`Notification`.
**Steps:** Load any authenticated page; with Notification permission already granted (or via the "Enable notifications" control), `usePushRegistration`'s `registerWebPushForUser()` runs: registers the service worker, calls `pushManager.subscribe()` with the server's VAPID key (`GET /api/push/vapid-public-key`), then syncs the resulting subscription via `POST /api/push/subscriptions`.
**Expected:** The POST reaches the real backend host (not the frontend's own origin) and returns `201`-equivalent with `{id: <uuid>}`; a real row is persisted in `push_subscriptions` for the current user.
**Severity:** Blocker — this is the registration path every push-based alert (overdue medication, appointment reminders, weekly insights) depends on; if it silently no-ops, no user ever receives a push regardless of how correct the alert-generation logic is.

### NOTIF-14 — Real push delivery for an overdue medication alert
**Preconditions:** A registered push subscription (NOTIF-13) for a user who is an active member of a group with a checklist item past its 30-minute overdue grace window.
**Steps:** Wait for/trigger `OverdueDetectionCron`'s per-minute run.
**Expected:** Item flips `due` → `overdue`; a `missed_medications_alert` row is created; `PushDispatchService` sends to the registered subscription; `push_sent_at`/`push_delivery_log` populated.
**Severity:** Major
**Status:** Not confirmed end-to-end on staging — see Coverage gaps.

---

## INSIGHTS / WEEKLY DIGEST

### INS-01 — Get latest insights for group
**Steps:** `GET /api/insights/:groupId/latest?userId=...`.
**Expected:** Returns latest digest/cards for the group, excluding cards this user already dismissed.
**Severity:** Major

### INS-02 — Get archived digests
**Steps:** `GET /api/insights/:groupId/archive`.
**Expected:** Returns prior weekly digests.
**Severity:** Minor

### INS-03 — Dismiss an insight card
**Steps:** `POST /api/insights/cards/:cardId/dismiss` with `{userId}`.
**Expected:** `{success: true}`; row added to `user_insight_dismissals`; card no longer shown to that user on subsequent "latest" fetch.
**Severity:** Major

### INS-04 — Group-level AI insights (`ai_insights` table) fetch
**Steps:** `GET /api/insights/group/:groupId`.
**Expected:** Returns insight_type/observation/suggested_action/severity for the group's patient.
**Severity:** Minor

### INS-05 — Insights fetch for group with no resolvable patient
**Steps:** `GET /api/insights/group/:invalidGroupId`.
**Expected:** `HttpException('Group not found or patient id not resolved', 404)`.
**Severity:** Major

### INS-06 — Weekly digest generation builds from 7-day window
**Preconditions:** Group has medication logs, journal entries, vitals in the past 7 days.
**Steps:** Trigger weekly digest generation (cron or `POST /api/insights/debug/generate/:groupId`).
**Expected:** `weekly_digests` + `insight_cards` rows created from that window; primary caregiver notified.
**Severity:** Major

---

## AI ASSISTANT

### AI-01 — Ask a question
**Preconditions:** On `/groups/:groupId/ai-assistant`.
**Steps:** `POST /api/ai/qa` with `{question, groupId}`.
**Expected:** Returns an AI-generated answer scoped to that group's data.
**Severity:** Major

### AI-02 — Ask with empty question
**Steps:** Submit `question: ''`.
**Expected:** 400 from `@IsNotEmpty()`.
**Severity:** Minor

### AI-03 — Ask with missing groupId
**Steps:** Omit `groupId` from body.
**Expected:** 400 from `@IsString() @IsNotEmpty()` on `groupId`.
**Severity:** Minor

---

## HOSPITAL SUMMARY

### HOSP-01 — Generate hospital summary PDF
**Steps:** `POST /api/hospital-summary/generate-pdf` with `{groupId}`.
**Expected:** PDF blob returned with `Content-Type: application/pdf`, correct `Content-Disposition` filename, `X-Generation-Latency-Ms` header.
**Severity:** Major

### HOSP-02 — Generate PDF for group with incomplete data
**Preconditions:** Patient record missing required summary fields.
**Steps:** Generate PDF.
**Expected:** PDF still returned but `X-Validation-Errors` header lists what's missing/invalid.
**Severity:** Minor

### HOSP-03 — Generate PDF for unresolvable group
**Steps:** `POST` with invalid/unlinked `groupId`.
**Expected:** `HttpException('Group not found or patient id not resolved', 404)`.
**Severity:** Major

### HOSP-04 — Download and share generated PDF (frontend)
**Steps:** From `HospitalSummaryPDF` component, click download, then share.
**Expected:** Blob downloads with expected filename pattern; Web Share API used if available, else falls back to download.
**Severity:** Minor

---

## DOCUMENT STORAGE

### DOC-01 — Get group storage usage with valid bearer token
**Steps:** `GET /api/document-storage/groups/:groupId/usage` with `Authorization: Bearer <token>`.
**Expected:** Returns storage usage object.
**Severity:** Minor

### DOC-02 — Get group storage usage with missing token
**Steps:** Call the same endpoint with no `Authorization` header.
**Expected:** `UnauthorizedException('Missing bearer token.')`.
**Severity:** Major

---

## SETTINGS

### SET-01 — Change theme/font size
**Steps:** On `/settings`, change theme and font size selectors.
**Expected:** Preference persisted (context/localStorage), applied immediately across UI.
**Severity:** Minor

### SET-02 — Toggle weekly wellbeing reminder
**Steps:** Toggle the reminder switch.
**Expected:** `profiles.preferences.notifications.weeklyWellbeingReminderEnabled` updated; reminders cron respects the new value on next run.
**Severity:** Minor

---

## Coverage gaps

These could not be confirmed from code and need clarification before they can be turned into test cases:

1. **No backend auth guard on regular `/api/groups/:groupId/...` routes.** Medications, shifts, insights, hospital-summary, and AI endpoints have no guard verifying the caller's identity or group membership — the service-role Supabase client bypasses RLS. Per earlier discussion this is a known/accepted limitation, but it means I can't write a meaningful "non-member is rejected" test for these backend routes (only for direct Supabase/RLS access, which I did cover). Confirm whether QA should still attempt unauthorized-caller tests against these routes (expecting they currently pass through) or skip them.
2. **`SHIFT-03` (non-permitted role assigning shifts):** confirmed the frontend hides the action via `canAssignShifts()`, but could not confirm whether `POST /api/shifts/assignments` itself rejects an unpermitted caller — same root cause as gap #1.
3. **`AiService.askQuestion` response shape and failure modes** — the controller has no documented error handling (no try/catch visible at controller level), so I don't know what a malformed AI provider response or rate-limit error looks like to the end user. Need the service implementation or a sample response to write meaningful negative tests.
4. **Cron schedules (intervals) for `OverdueDetectionService`, `MedicationLowStockAlertService`, weekly digest generation, and `RemindersService`** were not directly confirmed (I described the 30-minute overdue threshold and 5-minute reminder cadence from service logic/naming, not from a verified cron expression for every job). Confirm actual intervals so timing-dependent tests use correct wait windows.
5. **Reset-password completion flow** — `ForgotPasswordPage` triggers `resetPasswordForEmail`, but I did not find a `/reset-password` page/route in `App.tsx`'s route tree to verify the completion step (setting the new password). Confirm this page exists and where.
6. **Role enum and full permission matrix** (`primary_caregiver`, `caregiver`, `family_member`, `patient` and what each can/can't do) were inferred from usage of `canManageMembers`/`canAssignShifts`/`isJournalReadOnly`, not from a single source of truth. Confirm the canonical role list and a full capability matrix so GROUP/SHIFT/journal permission tests are complete.
7. **Journal flow (`/groups/:groupId/journal`)** — page exists in the route tree but its read/write behavior and `isJournalReadOnly(role)` enforcement weren't traced to specific component/API logic. Need that page's component and any backend route to write real test steps.
8. **Emergency contacts, GP contacts, administration log, patient profile pages** — confirmed they exist as routes but actions were not traced to specific API calls/validation rules at the depth needed for precise steps. Can expand if you want these covered at the same fidelity as medications/checklist.
9. **NOTIF-14 (real push delivery for an overdue alert)** — created a real checklist item ~6 hours past its scheduled time with a genuine push subscription registered, and waited ~40 minutes across two separate checks; the item's status never moved from `due` to `overdue` in the database. I can't confirm whether this is (a) `OverdueDetectionCron` genuinely not running/registered correctly on this deployment, or (b) a Render free/hobby-tier characteristic where the backend process sleeps between requests and a `setInterval`/cron-based job doesn't "catch up" missed ticks after a cold start — both produce the identical symptom from outside the process, and I have no way to inspect Render's actual process-uptime/sleep state or the cron registration logs from this session. `/api/dev/reminders/run` (which would let me force a tick) is correctly 404'd outside development (NOTIF-11), so there's no way to manually trigger this for verification on staging. Needs either backend log access during a longer observation window, or confirmation of whether Render's plan keeps this service continuously warm.
