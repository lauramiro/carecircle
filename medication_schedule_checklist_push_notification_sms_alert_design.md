# Medication Schedule, Checklist, Push Notification & SMS Alert — Implementation Design

**Status:** Authoritative spec for greenfield refactor (backward compatibility not required)  
**Migration:** `supabase/migrations/20260524120000_medication_checklist_alerts_redesign.sql`  
**Related tickets:** US-09 (push), US-10 / CC-101 (SMS fallback), US-10.3 / CC-102 (cancel on acknowledgement)

---

## 1. Purpose

Replace the current **lazy checklist sync on page load** with a **server-driven pipeline**:

1. Materialize `checklist_items` when medications are scheduled (and in rolling batches).
2. Detect overdue doses via cron and persist `status = 'overdue'`.
3. Create a durable `missed_medications_alert` row (with phone numbers and push targets).
4. Send push notifications promptly.
5. Send SMS fallback **10 minutes after push** if still not acknowledged, using a separate SMS cron reading `missed_medications_alert`.

This document is written so an implementing agent can follow it without guessing.

---

## 1.1 Implementation prerequisites (do this first)

Before writing any new checklist, alert, or medication scheduling code, **delete the entire stale `backend/src/lib/` directory**. Do not extend, import from, or “temporarily keep” files in that folder — they predate this design and will mislead an implementing agent.

**Remove the whole directory:**

```text
backend/src/lib/                    # DELETE ENTIRE FOLDER
  checklist_generation.ts           # stale; wrong families/RPC assumptions
  overdue_detection.ts              # stale; wrong overdue rule; unwired cron
  overdue_detection.spec.ts         # tests for stale code
  medication_status.ts              # stale; duplicate of slot logic to re-port cleanly
  local_date.ts                     # stale helper
  supabase.ts                       # stale; ad-hoc client — replace with integrations layer
```

**Review and likely replace (do not extend blindly):**

```text
backend/src/integrations/supabase-admin.service.ts   # CC-101-era; narrow SMS helpers, wrong column names (care_giver_id), leaks raw client via getClientOrNull()
```

This file may be **deleted entirely** and replaced with a fresh service-role Supabase layer (see §8.0). If kept, it must be **rewritten** — not patched — with domain-specific query methods for materialization, alerts, and push targets. Do not copy-paste the existing implementation.

**Fix callers that import stale Supabase code before deleting** (grep the repo):

| Caller | Action |
|--------|--------|
| `backend/src/ai/profile.service.ts` | Inject the new Supabase gateway/repositories; remove `lib/supabase` import. |
| `backend/src/sms/*` (coordinator, subscriber) | Removed with §14 legacy SMS code; any remaining imports must use the new layer. |
| `backend/scripts/check-patient.ts` | Update to use Nest/bootstrap pattern, or delete the script if unused. |

**Replace with fresh modules** under `backend/src/checklist/`, `backend/src/alerts/`, `backend/src/cron/`, `backend/src/medications/`, and `backend/src/integrations/` as defined in §8. Port any still-valid **ideas** (e.g. timezone-aware overdue math, E.164 phone filtering) into new code with new tests — never copy-paste from `lib/` or the old `supabase-admin.service.ts`.

**Rules for agents:**

- If a file path starts with `backend/src/lib/`, it must not exist at the end of the implementation.
- Do not extend `backend/src/integrations/supabase-admin.service.ts` as-is; **delete and reimplement** the service-role gateway if a clean design is clearer (preferred).

---

## 2. Non-goals (this phase)

- Native iOS/Android apps (PWA + Web Push / optional FCM web only).
- `as_needed` medications auto-scheduling (no checklist rows).
- HIPAA-grade SMS logging redaction (follow existing Twilio dev patterns).
- Multi-instance durable job queue (single Nest process + Postgres rows is sufficient for Capstone).

---

## 3. Domain glossary

| Term | Meaning |
|------|---------|
| **Dose slot** | One scheduled administration: medication + `scheduled_at` instant. |
| **Materialization** | Inserting `checklist_items` rows for future dose slots. |
| **Window** | ±30 minutes around dose time; overdue = 30+ minutes after **window_start** (equivalent: at/after `scheduled_at` if `scheduled_at` = window_start + 30min). |
| **Acknowledgement** | Checklist item becomes `given` or `skipped`. |
| **Alert row** | Row in `missed_medications_alert` driving push + SMS. |
| **Perpetual medication** | No `end_date` / `total_doses`; infinite course rolled via `checklist_schedule`. |

---

## 4. High-level architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ MEDICATION WRITE (add / edit / pause / archive / activate)              │
│   → Nest API (NOT direct Supabase from browser for schedule mutations)  │
│   → ChecklistMaterializationService                                     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CRON 1 — ChecklistMaterializationCron                                   │
│   Interval: every 6 hours + on-demand when horizon low                  │
│   Reads: checklist_schedule (pending, next_compute_at within 24h)     │
│   Writes: checklist_items (batch ≤100), checklist_schedule status       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CRON 2 — OverdueDetectionCron                                           │
│   Interval: every 1 minute                                              │
│   Finds: checklist_items status=due AND overdue threshold passed        │
│   Writes: status=overdue, missed_medications_alert (snapshot + phones)   │
│   Sends: push notifications immediately (same cron tick)                │
│   Sets: push_sent_at, sms_due_at = push_sent_at + 10 minutes            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
              acknowledgement (Given/Skipped) ──► cancel open alert
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CRON 3 — SmsDispatchCron                                                │
│   Interval: every 1 minute                                              │
│   Reads: missed_medications_alert WHERE push_sent AND sms_due_at <= now │
│          AND sms_sent_at IS NULL AND cancelled_at IS NULL               │
│   Sends: Twilio SMS to sms_phone_numbers[]                              │
│   Writes: sms_sent_at, sms_delivery_log, status=sms_sent               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Three crons only.** Push is **not** a separate cron; it runs inside Cron 2 immediately after inserting the alert row.

---

## 5. Database schema (new / changed)

Apply migration:  
`supabase/migrations/20260524120000_medication_checklist_alerts_redesign.sql`

### 5.1 `medications` (alter)

| Column | Type | Notes |
|--------|------|-------|
| `perpetual` | boolean NOT NULL default false | Required unless `end_date` or `total_doses` set (for non-`as_needed`). |
| `total_doses` | integer nullable | Total planned slots; **does not decrement** when Given. |
| `materialization_cursor_at` | timestamptz nullable | Resume point for batched inserts. |

**Constraint `medications_course_bounds_check`:**  
For `schedule_type != 'as_needed'`, require `perpetual = true OR end_date IS NOT NULL OR total_doses IS NOT NULL`.

**Status values:** `active | paused | archived | superseded | discontinued` (align app + DB).

### 5.2 `care_group.preferred_timezone`

Type: **text** IANA name (e.g. `Europe/London`). Used for all schedule/overdue calculations for that group.

### 5.3 `checklist_items` (alter)

| Column | Type | Notes |
|--------|------|-------|
| `group_id` | uuid FK | Denormalized for queries/crons. |
| `patient_id` | uuid FK | Denormalized. |
| `scheduled_at` | timestamptz NOT NULL (new rows) | Canonical instant; **source of truth** for overdue. |
| `timezone` | text | Copied from group at materialization. |
| `archived_at` | timestamptz nullable | Soft archive (schedule edit / med archived). |

**Status values:** `due | given | overdue | skipped | archived`

**Unique index:** `(medication_id, scheduled_at)` where not archived.

**Snapshots (keep):** `medication_name`, `dose`, `dosage_unit`, `window_start`, `window_end`, `scheduled_time` (local HH:mm label optional).

**Keep** `checklist_id` → `daily_medication_checklists` for UI date grouping. Ensure parent row exists when materializing.

### 5.4 `checklist_schedule` (new)

| Column | Type | Notes |
|--------|------|-------|
| `medication_id` | uuid FK | |
| `next_compute_at` | timestamptz | When cron should extend materialization. |
| `cursor_at` | timestamptz nullable | Start generating slots after this instant. |
| `status` | text | `pending | done | archived | failed` |
| `last_error` | text nullable | |

Only **one `pending` row per medication** (unique partial index).

### 5.5 `push_subscriptions` (new)

Stores Web Push / FCM endpoints per user. See §8.3.

### 5.6 `missed_medications_alert` (new)

Central alert orchestration table.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `checklist_item_id` | uuid FK | yes | One open alert per item (`pending_push` or `push_sent`). |
| `group_id` | uuid | yes | |
| `patient_id` | uuid | yes | |
| `medication_id` | uuid | yes | |
| `patient_first_name` | text | yes | First token of patient `full_name`. |
| `medication_name` | text | yes | Snapshot at overdue time. |
| `dose_summary` | text | yes | e.g. `10 mg`. |
| `minutes_overdue` | integer | yes | At detection time. |
| `scheduled_at` | timestamptz | yes | From checklist item. |
| `overdue_detected_at` | timestamptz | yes | default now(). |
| `push_body` | text | yes | US-09 format. |
| `sms_body` | text | yes | US-10 format. |
| `deep_link_url` | text | yes | `/groups/:groupId/checklist?date=YYYY-MM-DD&item=:itemId` |
| `push_recipient_user_ids` | uuid[] | yes | Active carers in group. |
| `sms_phone_numbers` | text[] | yes | E.164 phones at detection time (may be empty). |
| `push_due_at` | timestamptz | yes | default now(). |
| `push_sent_at` | timestamptz | nullable | Set when push dispatch completes. |
| `sms_due_at` | timestamptz | nullable | Set to `push_sent_at + 10 minutes`. |
| `sms_sent_at` | timestamptz | nullable | |
| `cancelled_at` | timestamptz | nullable | Given/Skipped before SMS. |
| `cancellation_reason` | text | nullable | `acknowledged`, `medication_archived`, etc. |
| `status` | text | yes | See lifecycle §7. |
| `push_delivery_log` | jsonb | yes | Array of `{ userId, subscriptionId, success, statusCode?, error? }`. |
| `sms_delivery_log` | jsonb | yes | Array of `{ phone, success, sid?, error? }`. |

---

## 6. Slot computation (shared logic)

**Implement once** in `backend/src/checklist/slot-computation.ts` and mirror tests from `frontend/src/lib/medicationSchedule.test.ts`.

Port these functions from frontend (then **delete frontend-only duplicate** or re-export from shared package if monorepo allows):

- `isMedicationScheduledOnDate(med, date, timezone)`
- `computeDoseTimesForDate(med, date, timezone)`
- `deriveWindowBounds(scheduledTime)` → window_start = scheduledTime − 30min, window_end = scheduledTime + 30min

### 6.1 `scheduled_at` construction

For each local dose time `HH:mm` on local date `D` in group timezone `TZ`:

```text
scheduled_at = zonedDateTimeToUtc(D + HH:mm, TZ)
```

**Overdue rule (authoritative):**

```text
overdue_at = scheduled_at   -- if scheduled_at is dose time (center of window)
             OR window_start + 30 minutes (same instant if window_start = scheduled_at - 30min)
```

**Use consistently:** store `scheduled_at` as the **dose time** (center). Overdue when:

```sql
now() >= scheduled_at + interval '30 minutes'
AND status = 'due'
AND given_at IS NULL
AND skip_reason IS NULL
```

### 6.2 Course end calculation

Given medication `M`:

1. If `schedule_type = 'as_needed'` → **no auto slots**.
2. If `perpetual = true` → no end; roll with `checklist_schedule`.
3. If `end_date` set → last eligible local date = `end_date`.
4. If `total_doses = N` → generate slot dates forward from `max(start_date, today)` until N slots enumerated (skip past slots, still count toward N only for **future** inserts; see §6.4).

### 6.3 Materialization batch cap

When computing all future slots for a medication:

- Insert at most **100** rows per operation.
- Skip slots where `scheduled_at <= now()` (never insert past).
- If more slots remain:
  - Set `medications.materialization_cursor_at` to last inserted `scheduled_at`.
  - Upsert `checklist_schedule` with `status='pending'`, `next_compute_at = now() + 6 hours` (or when horizon < 14 days — see §6.5).

### 6.4 `total_doses` semantics

**Fixed at schedule creation.** Represents total planned administrations for the course.

- When generating initially: enumerate all slots from `start_date` through implicit end; **insert only future slots** up to 100; store cursor for remainder.
- **Do not decrement** on Given.
- When Given count + skipped + archived + remaining future slots matters for UI, compute from rows — do not mutate `total_doses`.

### 6.5 Horizon trigger (in addition to 6h cron)

Before insert batch, if medication is perpetual (or long course) and **count of future `due` rows < 14 days of doses** (estimate: `14 * doses_per_day`), enqueue `checklist_schedule` with `next_compute_at = now()`.

---

## 7. Alert lifecycle (`missed_medications_alert`)

```text
pending_push
   │  OverdueDetectionCron sends push
   ▼
push_sent  (sms_due_at = push_sent_at + 10 min)
   │  SmsDispatchCron when sms_due_at <= now()
   ▼
sms_sent

At any time before sms_sent:
   Given/Skipped on checklist_item → cancelled (cancellation_reason=acknowledged)

Medication archived / future slots archived → cancel open alerts for those items
```

**Status values:**

| Status | Meaning |
|--------|---------|
| `pending_push` | Row created; push not yet confirmed sent. |
| `push_sent` | Push dispatched; waiting for SMS window. |
| `sms_sent` | SMS dispatched (terminal success). |
| `cancelled` | Acknowledged or obviated; no SMS. |
| `push_failed` | Push failed for all recipients; still set `sms_due_at` unless product says otherwise — **default: still schedule SMS** (US-10 fallback purpose). |
| `sms_failed` | SMS attempted but all numbers failed; log in `sms_delivery_log`. |

**Idempotency:** unique partial index prevents two open alerts per `checklist_item_id`.

---

## 8. Backend modules (NestJS)

### 8.0 Greenfield rule

**Do not use or extend `backend/src/lib/`.** That directory must be deleted in the first implementation step (§1.1).

**Do not extend `backend/src/integrations/supabase-admin.service.ts` as-is.** It was built for CC-101 SMS lookups only, exposes a raw Supabase client, and uses outdated assumptions (e.g. `care_giver_id` column name). **Prefer deleting it** and introducing a clean service-role layer, for example:

```text
backend/src/integrations/
  supabase-admin.module.ts          # Nest module wiring
  supabase-admin.client.ts          # thin createClient wrapper; service role only; no domain logic
  repositories/
    checklist.repository.ts         # checklist_items, daily_medication_checklists, checklist_schedule
    medication.repository.ts
    alert.repository.ts             # missed_medications_alert
    care-group.repository.ts        # carers, phones, patient names, timezones
    push-subscription.repository.ts
```

Services in `checklist/`, `alerts/`, and `medications/` inject **repositories**, not a leaked `SupabaseClient`. Realtime (CC-102 cancel) may use a dedicated `SupabaseRealtimeService` if needed — still no `getClientOrNull()` on a domain service.

If you keep the filename `SupabaseAdminService`, it must be a **full rewrite** with only narrow, typed methods — not the current CC-101 file with methods bolted on.

Replace other legacy files (do not extend):

- `backend/src/sms/pending-sms.registry.ts` → remove (SMS via DB cron)
- `backend/src/sms/internal/internal-missed-medication.controller.ts` → remove (no HTTP hook)
- `backend/src/sms/missed-medication-sms.coordinator.ts` → remove (replaced by `missed_medications_alert` + crons)
- `backend/src/sms/internal/internal-missed-med-sms.guard.ts` → remove with the internal controller

### 8.1 Module layout

```text
backend/src/checklist/
  slot-computation.ts          # shared dose math
  slot-computation.spec.ts
  checklist-materialization.service.ts
  checklist-materialization.service.spec.ts
  checklist-reconciliation.service.ts   # edit/archive/pause
  overdue-detection.service.ts
  overdue-detection.service.spec.ts

backend/src/alerts/
  missed-medication-alert.service.ts    # create alert rows, cancel
  push-dispatch.service.ts              # Web Push + FCM
  sms-dispatch.service.ts               # Twilio batch from alert row
  push-subscriptions.controller.ts      # register/unregister

backend/src/cron/
  checklist-materialization.cron.ts     # CRON 1
  overdue-detection.cron.ts             # CRON 2
  sms-dispatch.cron.ts                  # CRON 3

backend/src/medications/
  medications.controller.ts             # POST/PATCH/ pause/archive
  medications.service.ts                # wraps DB + triggers materialization
```

Wire crons in `AppModule` using `@nestjs/schedule` (`ScheduleModule.forRoot()`).

### 8.2 ChecklistMaterializationService

**Public methods:**

```typescript
materializeForMedication(medicationId: string, reason: string): Promise<void>
reconcileAfterMedicationEdit(oldMed, newMed): Promise<void>
archiveMedication(medicationId: string): Promise<void>
activateMedication(medicationId: string): Promise<void>
extendPendingSchedules(limit: number): Promise<void>
```

**`materializeForMedication` algorithm:**

1. Load medication; exit if not `active` or `as_needed`.
2. Load `patient_id`, resolve `group_id` from `care_group`, load `preferred_timezone`.
3. Compute all future dose slots (respect `end_date` / `total_doses` / `perpetual`).
4. Take next ≤100 slots with `scheduled_at > now()` and `scheduled_at > cursor`.
5. For each slot:
   - Ensure `daily_medication_checklists` row for local date.
   - Insert `checklist_items` with snapshots, `status='due'`, `group_id`, `patient_id`, `scheduled_at`, `timezone`.
   - ON CONFLICT `(medication_id, scheduled_at)` DO NOTHING.
6. Update cursor; if more slots remain → upsert `checklist_schedule` (`pending`, `next_compute_at`).
7. Else mark schedule `done`.

### 8.3 ChecklistReconciliationService (medication edit)

When schedule-affecting fields change (`schedule_type`, times, dose, `start_date`, `end_date`, `total_doses`, `perpetual`):

1. **Archive** future items: `status='archived'`, `archived_at=now()` where `medication_id=? AND status='due' AND scheduled_at > now()`.
2. **Cancel** open alerts for archived/overdue-open items if medication edit affects them (see below).
3. Reset `materialization_cursor_at`.
4. Call `materializeForMedication`.

**Do NOT archive/delete:** `given`, `skipped`, past `overdue` history.

**Open overdue alert during edit:** if item is `overdue` with open alert, set alert `cancelled_at`, `status='cancelled'`, `cancellation_reason='schedule_changed'`.

**Pause / archive medication:**

- Archive all future `due` items.
- Set all non-`done` `checklist_schedule` rows to `archived`.
- Cancel open alerts for that medication's open items.

**Activate / unarchive:** call `materializeForMedication`.

### 8.4 OverdueDetectionService (Cron 2 core)

Every **1 minute**:

```sql
SELECT ci.*, cg.preferred_timezone
FROM checklist_items ci
JOIN daily_medication_checklists dmc ON dmc.id = ci.checklist_id
JOIN care_group cg ON cg.id = dmc.group_id
WHERE ci.status = 'due'
  AND ci.scheduled_at IS NOT NULL
  AND ci.scheduled_at <= now() - interval '30 minutes'
  AND ci.given_at IS NULL
  AND ci.skip_reason IS NULL
FOR UPDATE SKIP LOCKED
LIMIT 50;
```

For each row:

1. Re-read item; abort if no longer `due`.
2. `UPDATE checklist_items SET status='overdue', updated_at=now() WHERE id=? AND status='due'`.
3. If update row count = 0 → skip.
4. Load group carers + phones + patient first name.
5. Build messages:
   - **push_body:** `{medication_name} {dose_summary} is {minutes_overdue} minutes overdue`
   - **sms_body:** `{patient_first_name}: {medication_name} ({dose_summary}) ~{minutes_overdue} min overdue. Open CareCircle to record or skip.`
6. Insert `missed_medications_alert` (status `pending_push`, `sms_phone_numbers`, `push_recipient_user_ids`, `deep_link_url`).
7. Call `PushDispatchService.dispatch(alert)`.
8. Update alert: `push_sent_at`, `sms_due_at = push_sent_at + 10min`, `status='push_sent'`, merge `push_delivery_log`.

**Phone collection query (same as current SMS service):**

```sql
SELECT DISTINCT p.phone
FROM care_givers cg
JOIN profiles p ON p.id = cg.caregiver_id
WHERE cg.group_id = :groupId
  AND cg.status = 'active'
  AND p.phone IS NOT NULL
  AND p.phone ~ '^\+[1-9]\d{1,14}$';  -- E.164
```

Store as `sms_phone_numbers` array on the alert row **at insert time**.

### 8.5 PushDispatchService

- Load `push_subscriptions` for each `push_recipient_user_ids`.
- Web Push: use `web-push` + VAPID keys from env.
- FCM (optional): Firebase Admin SDK for `platform='fcm'`.
- Payload includes `title`, `body=push_body`, `data.url=deep_link_url`.
- Log per-subscription result in `push_delivery_log`.
- **Do not throw** on individual failures; continue all recipients.

**Env vars (add to `env.schema.ts`):**

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT=mailto:...
FIREBASE_PROJECT_ID          # optional
FIREBASE_CLIENT_EMAIL        # optional
FIREBASE_PRIVATE_KEY         # optional
```

### 8.6 SmsDispatchService (Cron 3)

Every **1 minute**:

```sql
SELECT * FROM missed_medications_alert
WHERE status = 'push_sent'
  AND sms_sent_at IS NULL
  AND cancelled_at IS NULL
  AND sms_due_at <= now()
FOR UPDATE SKIP LOCKED
LIMIT 20;
```

For each alert:

1. Re-load checklist item; if `given` or `skipped` → cancel alert, skip SMS.
2. For each phone in `sms_phone_numbers` → Twilio send; append to `sms_delivery_log`.
3. Set `sms_sent_at`, `status='sms_sent'` (even if some numbers fail — US-10: log failures, don't crash).

Use existing `TwilioSmsService` pattern (return `{ sid } | { error }` per phone).

### 8.7 Acknowledgement cancellation (CC-102)

On checklist item update to `given` / `skipped`:

**Option A (recommended):** Supabase Realtime subscriber in Nest (`ChecklistAckAlertSubscriber`) listening to `checklist_items` UPDATE — cancels open alert where `checklist_item_id` matches.

**Option B:** Explicit cancel call from frontend API after mutation (less reliable).

Cancel:

```sql
UPDATE missed_medications_alert
SET cancelled_at = now(),
    cancellation_reason = 'acknowledged',
    status = 'cancelled',
    updated_at = now()
WHERE checklist_item_id = :id
  AND status IN ('pending_push', 'push_sent')
  AND sms_sent_at IS NULL;
```

---

## 9. Cron schedules (exact)

| Cron | `@Cron` | Responsibility |
|------|---------|----------------|
| **CRON 1** `ChecklistMaterializationCron` | `0 */6 * * *` (every 6h) + optional `@Cron('0 */1 * * *')` horizon check | Process `checklist_schedule` where `status='pending' AND next_compute_at <= now() + 24h`; extend batches. |
| **CRON 2** `OverdueDetectionCron` | `* * * * *` (every minute) | Mark overdue + insert alert + send push. |
| **CRON 3** `SmsDispatchCron` | `* * * * *` (every minute) | Send due SMS from `missed_medications_alert`. |

Use `@nestjs/schedule` with timezone `UTC`. All comparisons use `timestamptz`.

---

## 10. API changes

### 10.1 Move medication mutations to backend

Replace direct Supabase writes from frontend for:

- `addMedication`
- `editMedication`
- `pauseMedication` / `activateMedication`
- `archiveMedication`

**Example routes:**

```text
POST   /api/groups/:groupId/medications
PATCH  /api/groups/:groupId/medications/:medicationId
POST   /api/groups/:groupId/medications/:medicationId/pause
POST   /api/groups/:groupId/medications/:medicationId/activate
POST   /api/groups/:groupId/medications/:medicationId/archive
```

Each mutating route calls materialization/reconciliation synchronously (transaction preferred).

### 10.2 Push subscription routes

```text
POST   /api/push/subscriptions        # register
DELETE /api/push/subscriptions/:id    # unregister
```

Authenticated caregiver only (`user_id = auth profile id`).

### 10.3 Checklist read (frontend)

**Remove** `syncChecklistItems` from load path as primary writer.

```typescript
// loadDailyChecklist becomes read-only:
getOrCreateDailyChecklistId()  // optional: still ensure parent row for date
fetchChecklistItems(checklistId, date)  // SELECT only
```

Query by:

```sql
SELECT ci.*
FROM checklist_items ci
JOIN daily_medication_checklists dmc ON dmc.id = ci.checklist_id
WHERE dmc.group_id = :groupId
  AND dmc.checklist_date = :date
  AND ci.status <> 'archived'
ORDER BY ci.scheduled_at;
```

Given/Skipped: keep existing Supabase update from frontend **or** move to backend PATCH — either is fine; must trigger alert cancellation.

---

## 11. Frontend changes

### 11.1 Medication form validation

For `schedule_type != 'as_needed'`, require **exactly one of**:

- [ ] `perpetual` checked
- [ ] `end_date` provided
- [ ] `total_doses` provided (positive integer)

Show helper text explaining perpetual = ongoing with automatic roll-forward.

Add fields: `perpetual`, `total_doses`.

### 11.2 Checklist page

- Remove dependency on sync creating rows.
- Support deep link: `/groups/:groupId/checklist?date=YYYY-MM-DD&item=:uuid`
- Scroll/highlight row when `item` query present.

### 11.3 Service worker + push registration

- Add `public/sw.js` handling `push` and `notificationclick`.
- Hook `usePushRegistration` after login (request permission, POST subscription to backend).
- Register in Vite PWA config if used.

### 11.4 Realtime

Keep `useChecklistSubscription` — works when cron inserts/updates rows.

---

## 12. Message formats (exact strings)

### Push (US-09)

```text
{medication_name} {dose_summary} is {minutes_overdue} minutes overdue
```

Example: `Metformin 500 mg is 32 minutes overdue`

### SMS (US-10)

```text
{patient_first_name}: {medication_name} ({dose_summary}) ~{minutes_overdue} min overdue. Open CareCircle to record or skip.
```

Example: `Alex: Metformin (500 mg) ~32 min overdue. Open CareCircle to record or skip.`

### Deep link

```text
/groups/{groupId}/checklist?date={YYYY-MM-DD}&item={checklistItemId}
```

Use group local date derived from `scheduled_at` + timezone.

---

## 13. Edge cases (mandatory handling)

| Case | Behavior |
|------|----------|
| No phone numbers | Insert alert anyway; SMS cron loops zero times; log `sms_delivery_log: []`. |
| No push subscriptions | Push log records failure; still set `sms_due_at` (fallback purpose). |
| Item Given during 10-min SMS window | Cancel alert before send; SMS cron must re-check item status. |
| Duplicate cron tick | `FOR UPDATE SKIP LOCKED` + conditional updates + unique open alert index. |
| Medication edited with future due items | Archive future due; regenerate; cancel open alerts for affected items. |
| `start_date` in past | Materialize forward only from `now()`, not historical slots. |
| Server restart | All state in Postgres; crons resume (no in-memory timers). |
| Observer role | Include in push recipients if active carer; **include in SMS** per US-10 (all family with phones). |
| DST transitions | Use `date-fns-tz` / Luxon for `scheduled_at` computation; add tests for spring/fall. |

---

## 14. Code to delete (explicit)

Perform deletions **before** adding new modules (see §1.1). Prefer **delete and replace** over leaving deprecated files “for reference.”

| Path | Action |
|------|--------|
| **`backend/src/lib/` (entire directory)** | **Delete.** Stale scripts, wrong cron wiring, duplicate Supabase client. |
| **`backend/src/integrations/supabase-admin.service.ts`** | **Delete and replace** (preferred) or full rewrite. Do not extend CC-101 SMS-only methods. |
| `backend/src/sms/pending-sms.registry.ts` | Delete — SMS driven by `missed_medications_alert` cron. |
| `backend/src/sms/pending-sms.registry.spec.ts` | Delete with registry. |
| `backend/src/sms/missed-medication-sms.coordinator.ts` | Delete — replaced by alert + SMS cron. |
| `backend/src/sms/missed-medication-sms.coordinator.spec.ts` | Delete or rewrite against new services. |
| `backend/src/sms/internal/internal-missed-medication.controller.ts` | Delete — no internal HTTP hook. |
| `backend/src/sms/internal/push-dispatched.dto.ts` | Delete with internal controller. |
| `backend/src/sms/internal/internal-missed-med-sms.guard.ts` | Delete with internal controller. |
| `backend/src/sms/internal/internal-missed-med-sms.guard.spec.ts` | Delete with guard. |
| `frontend` `syncChecklistItems` insert path | Remove writer logic — checklist load is read-only. |

**Keep and extend (do not delete):**

- `TwilioSmsService`, E.164 validation (`common/validation/e164.ts`)
- `AppConfigService` / `env.schema.ts` — all env reads go through typed config

**Replace (fresh implementation under `integrations/`):**

- Service-role Supabase access — new client wrapper + repositories (§8.0); **not** the current `supabase-admin.service.ts` unless fully rewritten

**After deletion, verify:**

```bash
# Must return no matches under backend/src/lib
test ! -d backend/src/lib
rg "backend/src/lib|from ['\"].*lib/" backend/
# Confirm no imports of deleted supabase-admin.service unless replaced
rg "supabase-admin.service" backend/
```

---

## 15. Testing requirements

### 15.1 Unit tests

- Slot computation mirrors frontend fixtures (daily/weekly/biweekly/monthly/interval).
- Materialization: ≤100 cap, cursor, schedule queue creation.
- Reconciliation: edit archives only future `due`.
- Overdue: 30-min boundary, skips given/skipped.
- Alert: SMS due = push + 10min.
- Cancellation on given/skipped.

### 15.2 Integration tests

- End-to-end: insert due item with `scheduled_at = now()-31min` → cron → overdue + alert row + push mock called.
- SMS cron selects alert when `sms_due_at <= now()`.
- Ack cancel prevents SMS.

### 15.3 Manual demo script

1. Create perpetual daily med with 2 times/day.
2. Confirm checklist rows appear without opening checklist page (DB query).
3. Backdate one row to >30 min ago (test helper) → wait 1 min → alert row + push on device.
4. Do not acknowledge → wait 10 min → SMS received.
5. Repeat with Given before 10 min → no SMS.

---

## 16. Migration / rollout

0. **Delete `backend/src/lib/`** and fix imports (§1.1, §14). **Delete or rewrite `supabase-admin.service.ts`** (§8.0). Confirm `rg "src/lib"` and stale integration imports are clean.
1. Apply SQL migration.
2. Deploy backend with crons disabled flag (`CRON_ENABLED=false`) for initial deploy.
3. Run one-off script: for each `active` non-`as_needed` medication → `materializeForMedication`.
4. Enable crons.
5. Deploy frontend (forms + read-only checklist + push registration).

No backfill of historical given/skipped required.

---

## 17. Environment variables (complete list)

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Crons + materialization |
| `TWILIO_*` | for SMS | Existing |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | for Web Push | |
| `CRON_ENABLED` | no (default true) | Disable crons in tests |
| `MATERIALIZATION_BATCH_SIZE` | no (default 100) | |
| `SMS_FALLBACK_DELAY_MINUTES` | no (default 10) | |

---

## 18. Implementation verification checklist

Use this checklist after implementation. Every item must be checked.

### Database

- [ ] Migration applied without errors
- [ ] `medications.perpetual`, `total_doses`, `materialization_cursor_at` exist
- [ ] `medications_course_bounds_check` enforced
- [ ] `checklist_items.scheduled_at`, `group_id`, `patient_id`, `archived` status exist
- [ ] Unique `(medication_id, scheduled_at)` prevents duplicates
- [ ] `checklist_schedule` table + partial unique pending index
- [ ] `missed_medications_alert` table + partial unique open alert index
- [ ] `push_subscriptions` table + RLS own-row policy
- [ ] `care_group.preferred_timezone` is `text` IANA

### Slot computation

- [ ] Single backend module; tests ported from frontend
- [ ] `scheduled_at` uses group timezone correctly
- [ ] Overdue threshold = `scheduled_at + 30 minutes`
- [ ] `as_needed` generates zero rows

### Materialization

- [ ] Runs on medication create/edit/pause/archive/activate via backend API
- [ ] Never inserts past slots
- [ ] Batch limit 100 enforced
- [ ] `checklist_schedule` created when more slots remain
- [ ] CRON 1 processes pending schedules (`next_compute_at` within window)
- [ ] Perpetual meds roll forward before horizon runs out
- [ ] `total_doses` / `end_date` / `perpetual` validation in UI + API
- [ ] Edit archives future `due` only; preserves given/skipped
- [ ] Archive/pause cancels pending schedules + archives future due items

### Overdue + push (CRON 2)

- [ ] Runs every 1 minute
- [ ] Selects only `due` items past threshold
- [ ] Conditional update to `overdue` (no double processing)
- [ ] Inserts `missed_medications_alert` with all snapshot fields
- [ ] Populates `sms_phone_numbers` array (E.164) at insert time
- [ ] Populates `push_recipient_user_ids` for active carers
- [ ] Push body matches US-09 format exactly
- [ ] Deep link URL correct format
- [ ] Push sent in same cron execution
- [ ] `push_sent_at` and `sms_due_at = push_sent_at + 10min` set
- [ ] `push_delivery_log` populated; failures don't crash cron
- [ ] No duplicate open alerts per checklist item

### SMS (CRON 3)

- [ ] Runs every 1 minute
- [ ] Selects `push_sent` alerts where `sms_due_at <= now()` and not cancelled
- [ ] Re-checks checklist item not given/skipped before send
- [ ] Sends to each phone in `sms_phone_numbers` snapshot array
- [ ] SMS body matches US-10 format
- [ ] Twilio errors logged per phone; server continues
- [ ] Sets `sms_sent_at` and `status=sms_sent`
- [ ] `sms_delivery_log` populated

### Cancellation (CC-102)

- [ ] Given/Skipped cancels open alert (`pending_push` or `push_sent`, SMS not sent)
- [ ] Schedule change cancels open alerts for affected items
- [ ] Medication archive cancels open alerts

### Frontend

- [ ] Medication form: perpetual / end_date / total_doses rule
- [ ] Medication mutations go through backend API
- [ ] Checklist load is read-only (no sync inserts)
- [ ] Deep link `?date=&item=` scrolls/highlights item
- [ ] Service worker registered; push subscription POST works
- [ ] Realtime updates still reflect cron changes

### Removed legacy code

- [ ] **`backend/src/lib/` directory does not exist**
- [ ] **`supabase-admin.service.ts` deleted or fully rewritten** — repositories in place; no raw `getClientOrNull()` leaked to domain services
- [ ] No imports from `backend/src/lib` anywhere in the repo
- [ ] `overdue_detection.ts`, `checklist_generation.ts`, in-memory SMS registry/coordinator removed
- [ ] Internal `push-dispatched` endpoint and guard removed
- [ ] Frontend sync insert path removed or disabled
- [ ] `ai/profile.service.ts` (and any scripts) no longer depend on deleted `lib/supabase.ts`

### Engineering standards (§19)

- [ ] Nest modules follow single-responsibility layout in §8.1
- [ ] Service-role Supabase access via **repositories** / new integrations layer (no ad-hoc clients, no stale admin service)
- [ ] Slot computation is pure functions with unit tests (no DB in slot math)
- [ ] Crons are idempotent and swallow per-item errors without crashing the job
- [ ] Config read only through `AppConfigService` / `env.schema.ts`

### Tests

- [ ] Slot computation unit tests pass
- [ ] Materialization batch + cursor tests pass
- [ ] Overdue + alert creation tests pass
- [ ] SMS cron selection tests pass
- [ ] Cancellation tests pass

---

## 19. Engineering standards (mandatory for implementing agents)

Follow these practices throughout the implementation. They match CareCircle conventions and keep the pipeline maintainable.

### 19.1 SOLID (apply pragmatically)

| Principle | How it applies here |
|-----------|---------------------|
| **Single Responsibility** | One service per concern: materialization, reconciliation, overdue detection, push dispatch, SMS dispatch. Crons only orchestrate — they do not contain business logic or SQL strings. |
| **Open/Closed** | Add behavior via new services or methods, not by branching inside existing unrelated classes (e.g. do not bolt materialization onto `TwilioSmsService`). |
| **Liskov Substitution** | If you introduce interfaces (e.g. `PushProvider`), implementations must be interchangeable in tests. |
| **Interface Segregation** | Small, focused injectables — avoid a “God” `AlertsService` that materializes, pushes, and sends SMS. |
| **Dependency Inversion** | Services depend on **repositories**, `AppConfigService`, and narrow abstractions — not on global `createClient`, leaked `SupabaseClient`, or `process.env` in crons. |

### 19.2 NestJS structure

- **Module boundaries:** `ChecklistModule`, `AlertsModule`, `MedicationsModule`, `CronModule` — import/export explicitly; register crons in `CronModule`.
- **Controllers:** Thin — validate DTOs, delegate to services, return HTTP codes.
- **Services:** Contain business rules; inject dependencies via constructor.
- **Crons:** `@Injectable()` classes with `@Cron()` methods that call one service method each (e.g. `overdueDetectionService.runTick()`).
- **DTOs:** `class-validator` on all HTTP bodies; whitelist enabled.
- **Config:** Read only through `AppConfigService` — never `process.env` in services (except bootstrap/tests).

### 19.3 Data access

- **One service-role Supabase gateway** under `backend/src/integrations/`: thin client + **repositories** with named methods (`insertChecklistItems`, `findDueItemsPastThreshold`, `insertMissedMedicationAlert`, etc.).
- **Delete** stale `supabase-admin.service.ts` rather than extending CC-101 SMS helpers onto it.
- **No `backend/src/lib/supabase.ts`**, no duplicate Supabase clients, no `getClientOrNull()` exposed to checklist/alert services.
- **Idempotent writes:** `ON CONFLICT DO NOTHING`, conditional `UPDATE … WHERE status = 'due'`, partial unique indexes as in migration.
- **Cron concurrency:** use `FOR UPDATE SKIP LOCKED` or equivalent patterns when selecting rows to process.

### 19.4 Pure domain logic

- **`slot-computation.ts`:** pure functions only (no Supabase, no `Date.now()` hidden inside unless passed as `now` argument). Port from frontend schedule math; cover with Vitest fixtures.
- **Timezone:** all `scheduled_at` conversions in one place; add DST tests.
- **Message formatting:** small functions with explicit inputs → push/SMS body strings (easy to unit test).

### 19.5 Error handling & reliability

- **Expected failures** (Twilio invalid number, push subscription gone): log, record in `*_delivery_log`, continue other recipients — **do not throw** out of cron ticks.
- **Unexpected failures** (DB down): log error, exit tick gracefully; next cron retries.
- **Never crash the process** on a single bad checklist item or phone number.

### 19.6 Code quality (repo conventions)

- **TypeScript:** no `any`; prefer `interface` for payloads; use existing patterns from `TwilioSmsService` and guards.
- **KISS:** smallest diff that satisfies the spec — no premature abstractions (e.g. generic job framework).
- **Delete, don’t comment out:** remove stale code paths entirely (§14).
- **Tests:** co-locate `*.spec.ts`; test pure functions and service behavior with mocks — not “assert true”.
- **No secrets in logs:** never log phone numbers, tokens, or message bodies containing PHI in production info logs (warn/error metadata only).

### 19.7 Frontend alignment

- Medication mutations → backend API only for schedule changes.
- Checklist page → read-only fetch; Realtime subscription unchanged.
- Share **behavior** with backend via duplicated slot tests (or shared package later) — not via importing backend code into frontend.

### 19.8 Anti-patterns (do not do these)

- Recreating `backend/src/lib/` or a “utils” dump for unrelated helpers.
- **Patching** old `supabase-admin.service.ts` instead of repository-based integrations.
- Copy-pasting old `overdue_detection.ts` / `checklist_generation.ts` logic.
- In-memory timers for SMS (`setTimeout` registries).
- Frontend `syncChecklistItems` inserting rows as primary path.
- Direct Supabase medication inserts from browser for schedule-affecting fields.
- God files > 400 lines — split by responsibility.

---

## 20. Decision log (accepted recommendations)

| Decision | Choice |
|----------|--------|
| Checklist creation | At medication schedule time + rolling batches |
| Overdue trigger | `scheduled_at + 30 min`, server DB status |
| SMS scheduling | `missed_medications_alert.sms_due_at` (not in-memory) |
| Push timing | Synchronous in overdue cron (same minute) |
| SMS phone numbers | Snapshotted on alert row at overdue detection |
| Legacy CC-101 coordinator | Replaced by this design |
| **`backend/src/lib/`** | **Delete entirely** before implementation; no ad-hoc Supabase client |
| **`supabase-admin.service.ts`** | **Delete and replace** with client + repositories (§8.0) |
| `daily_medication_checklists` | Kept for date grouping |
| `scheduled_at` | timestamptz canonical instant |
| Batch size | 100 slots per materialization |
| Perpetual meds | Infinite via `checklist_schedule` roll-forward |

---

## 21. Implementation prompt (copy-paste for a later session)

Use this prompt when ready to implement:

```markdown
You are a senior fullstack developer working on the CareCircle monorepo (NestJS backend + Vite React frontend + Supabase).

Read and follow the **entire** design spec before coding (especially §1.1, §6, §8, §12, §13, §14, §16, §19):

  medication_schedule_checklist_push_notification_sms_alert_design.md

Apply/verify database migration:

  supabase/migrations/20260524120000_medication_checklist_alerts_redesign.sql

**Before you start (session setup — use these first):**

- `SUPABASE_ACCESS_TOKEN` is **already exported in the shell** — use it for Supabase CLI / MCP to apply the migration and inspect the remote project. Do not ask the user for a token unless the variable is missing at runtime. You can run it via npx supabase ...
- Supabase project ref: **`fxkwepyjqfwjznsetkcf`**
  - Project URL: `https://fxkwepyjqfwjznsetkcf.supabase.co`
  - CLI example: `supabase db push --project-ref fxkwepyjqfwjznsetkcf` (or equivalent MCP apply)
- Create the working branch first:

  ```bash
  git checkout -b CC-151-refactor-medication-scheduling-checklist-notifications
  ```

Environment (backend `.env` — see design §17 and `backend/.env.example`):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (required for crons)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (generate: `cd backend && npx web-push generate-vapid-keys`)
- `FRONTEND_PUBLIC_URL` (deep links in push/SMS)
- `TWILIO_*` for SMS; `CRON_ENABLED`, `SMS_FALLBACK_DELAY_MINUTES`, `MATERIALIZATION_BATCH_SIZE` optional

---

## Phase 0 — Delete stale code (before any new implementation)

Delete/replace everything in design §1.1 and §14. Do not extend legacy files.

- Delete entire `backend/src/lib/` directory.
- Delete or **fully rewrite** `backend/src/integrations/supabase-admin.service.ts` — replace with `integrations/` client + repositories (§8.0); no `getClientOrNull()` leaked to domain services.
- Delete legacy CC-101 SMS pipeline:
  - `backend/src/sms/pending-sms.registry.ts` (+ spec)
  - `backend/src/sms/missed-medication-sms.coordinator.ts` (+ spec)
  - `backend/src/sms/internal/` (controller, guard, dto, specs)
- Fix callers: `backend/src/ai/profile.service.ts`, `backend/scripts/check-patient.ts` (update or delete).
- Verify: `test ! -d backend/src/lib` and `rg "src/lib|supabase-admin.service" backend/` shows only new integrations code.

---

## Phase 1 — Database + integrations layer

- Apply migration; regenerate types if the project uses generated Supabase types.
- Implement `backend/src/integrations/` per §8.0:
  - Thin service-role client
  - Repositories: checklist, medication, alert, care-group, push-subscription
  - Use correct schema names (e.g. `care_givers.caregiver_id`, not `care_giver_id`)
- Wire `IntegrationsModule`; export repositories to feature modules.

---

## Phase 2 — Domain services + crons (backend)

Implement modules per §8.1:

- `backend/src/checklist/` — `slot-computation.ts` (pure functions; port from `frontend/src/lib/medicationSchedule.ts` + tests), materialization, reconciliation, overdue detection
- `backend/src/alerts/` — alert create/cancel, push dispatch (`web-push` + VAPID), SMS dispatch (reuse `TwilioSmsService`)
- `backend/src/medications/` — Nest API for add/edit/pause/archive/activate; triggers materialization/reconciliation
- `backend/src/cron/` — three crons only:
  1. **Materialization** — every 6h + horizon check; `checklist_schedule`; batch ≤ `MATERIALIZATION_BATCH_SIZE` (default 100)
  2. **Overdue + push** — every 1 min; `due` → `overdue` when `scheduled_at + 30 minutes <= now()`; insert `missed_medications_alert` with `sms_phone_numbers[]` and `push_recipient_user_ids[]` at insert time; send push in same tick; set `sms_due_at = push_sent_at + SMS_FALLBACK_DELAY_MINUTES`
  3. **SMS dispatch** — every 1 min; read `missed_medications_alert` where due; re-check item not given/skipped before send

Rules:
- Follow **§19 Engineering standards** (SOLID, thin crons, repositories not raw clients, idempotent DB writes, `FOR UPDATE SKIP LOCKED` where specified).
- Backward compatibility NOT required.
- No in-memory SMS timers; no internal `POST /api/internal/missed-medication/push-dispatched`.
- Push body (§12): `{medication_name} {dose_summary} is {minutes_overdue} minutes overdue`
- SMS body (§12): `{patient_first_name}: {medication_name} ({dose_summary}) ~{minutes_overdue} min overdue. Open CareCircle to record or skip.`
- Deep link: `/groups/{groupId}/checklist?date={YYYY-MM-DD}&item={checklistItemId}`
- CC-102: cancel open alerts on Given/Skipped (Realtime subscriber or equivalent).
- Install/wire `@nestjs/schedule` if missing; respect `CRON_ENABLED=false` in tests.

---

## Phase 3 — Frontend

- Medication form: `perpetual`, `total_doses`; validate one of perpetual | end_date | total_doses (non–as_needed).
- Route medication schedule mutations through backend API (not direct Supabase for schedule-affecting fields).
- Checklist page: **read-only** load — remove `syncChecklistItems` as a writer.
- Service worker + push registration; expose VAPID public key to client.
- Deep link support: `?date=&item=` scroll/highlight on checklist page.

---

## Phase 4 — Rollout + verification (§16, §18)

1. Deploy/run with `CRON_ENABLED=false` initially after migration.
2. One-off: materialize all active non–as_needed medications.
3. Enable crons; run manual demo script (§15.3) if possible.
4. Walk through **§18 verification checklist** completely; fix any gaps.
5. Run `npm run test` in `backend/` and `frontend/` after each phase.

---

## Constraints

- Do not commit `.docx` files, secrets, or real credentials.
- Do not create git commits unless the user explicitly asks (stage work incrementally instead).
- Do not copy-paste from deleted `lib/` or old `supabase-admin.service.ts`.
- Keep `TwilioSmsService` and `common/validation/e164.ts`; delete dead `SmsModule` providers tied to removed CC-101 code.
```

---

*End of design document.*
