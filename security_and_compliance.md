# Security & Compliance Technical Design

This chapter outlines the security architectures, compliance boundaries, and privacy protocols governing the CareCircle application. These protocols ensure robust data protection and explicit medical safety tracing.

## 1. Row-Level Security (RLS) Policy Table

CareCircle relies on Supabase's PostgreSQL implementation for deep, database-layer access control. Row-Level Security (RLS) governs **direct frontend queries** made with the Supabase anon key and the user's JWT. When the frontend reads or writes through `supabase-js`, PostgreSQL policies restrict rows to the authenticated user's authorized care groups.

### Backend API boundary

The NestJS backend (`/api/*`) uses the Supabase **service-role** key via `SupabaseAdminClient`. Service-role access **bypasses RLS**. RLS policies in the table below therefore protect the frontend data path, not backend-mediated API calls.

| Endpoint area | Bearer token validation | Notes |
| :--- | :--- | :--- |
| `GET /api/document-storage/groups/:groupId/usage` | **Required** | Validates JWT and active `care_givers` membership |
| Medications, hospital summary, insights, AI Q&A, invites, push | Optional (soft) | When `Authorization: Bearer <token>` is sent, the backend validates group membership; when absent, behavior matches legacy clients (CI smoke tests, anonymous DTO validation) |
| `/api/dev/*` | N/A | Gated by `DevOnlyGuard` (404 outside development) |

**Mitigation in progress:** the frontend sends the session access token on backend calls when logged in; services call `assertGroupMemberIfTokenPresent` so authenticated misuse is rejected without breaking unauthenticated smoke tests.

| Database Table | Target Role(s) | Permitted Operations | Policy Enforcement Rules & Test Results |
| :--- | :--- | :--- | :--- |
| `profiles` | Authenticated User | SELECT, UPDATE | Users can only select and update their own profile (`auth.uid() = id`). Verified working. |
| `patients` | Caregiver, Primary Caregiver | SELECT, UPDATE | Users can access patient records if they belong to a `care_group` linked to the patient via the `care_givers` junction table. Verified. |
| `care_group` | Primary Caregiver, Caregiver | SELECT, INSERT, UPDATE | Caregivers can select groups they belong to. Only Primary Caregivers (role-based logic) or group creators can update group details. |
| `care_givers` | Primary Caregiver, Caregiver | SELECT, INSERT, UPDATE, DELETE | Users can view all caregivers in their group. Only Primary Caregivers can insert/delete (remove) caregivers. |
| `group_invites` | Primary Caregiver, Invitee | SELECT, INSERT, UPDATE | Primary caregivers can insert invites. Users matching the invite email can select and update (accept/decline) the invite. |
| `medications` | Caregiver | SELECT, INSERT, UPDATE, DELETE | Caregivers linked to the group can view and manage medication definitions. |
| `medication_logs` | Caregiver | SELECT, INSERT, UPDATE | Caregivers can view and append adherence logs (given/skipped/overdue) for medications in their accessible groups. |
| `appointments` | Caregiver | SELECT, INSERT, UPDATE, DELETE | Read/write access is restricted to caregivers actively associated with the patient's care group. |
| `vital_signs` | Caregiver | SELECT, INSERT, UPDATE | Protected by the same care group linkage policy. Caregivers can record and view vitals. |
| `journal_entries` | Caregiver | SELECT, INSERT, UPDATE | Caregivers in the group can add or modify notes. |
| `patient_wellbeing_checkins` | Caregiver | SELECT, INSERT | Caregivers can submit subjective wellbeing check-ins. Read access scoped to the care group. |
| `shifts` & `shift_assignments` | Caregiver | SELECT, INSERT, UPDATE, DELETE | Managed by users in the care group for coordination. |
| `ai_insights` | Caregiver | SELECT | Read-only generated records. Only system/backend functions can insert or update based on LLM processing. |
| `push_subscriptions` | Authenticated User | SELECT, INSERT, DELETE | Users can only manage their own VAPID push subscriptions (`auth.uid() = user_id`). |

## 2. Data Privacy & Governance

### Captured Personal Data
The CareCircle application captures and stores Protected Health Information (PHI) and Personally Identifiable Information (PII) exclusively to facilitate coordinated care:
- **Demographic Information:** Caregiver and patient names, email addresses, and contact details (`profiles`).
- **Clinical Data:** Patient chronic conditions, medication schedules, dosages, recorded vital signs (e.g., blood pressure, heart rate, weight), and subjective wellbeing check-ins (`patients`, `medications`, `vital_signs`, `patient_wellbeing_checkins`).
- **Coordination Metadata:** Caregiver shift schedules, journal observations, appointment notes, and system audit logs (`shifts`, `journal_entries`, `appointments`, `audit_logs`).

### Data Retention & Lifecycle Management
- Data is retained actively for the lifecycle of the `care_group`. 
- If a patient record is archived or a care group is disbanded, linked clinical data is securely marked as inactive or hard-deleted depending on user-initiated "right to be forgotten" requests, cascading via PostgreSQL `ON DELETE CASCADE` relationships.

### Zero Third-Party Sharing Boundary
CareCircle enforces a strict boundary governing data sharing. There is **zero unconsented data sharing** with marketing, analytics, or third-party data brokers. Information egress is strictly limited to necessary functional infrastructure:
- **Twilio SMS:** Patient-sensitive notifications are dispatched for critical alerts.
- **Firebase Cloud Messaging (FCM) / VAPID:** Device push notifications for medication reminders.
- **Groq (AI Processing):** Weekly insights use strictly isolated prompt injections containing anonymized context. The LLM does not retain or train on input data.

## 3. Medical Disclaimer Placement Matrix

To ensure patient safety and clearly define the application as a coordination tool rather than a diagnostic medical device, explicit medical disclaimers are placed in the following mandatory system locations:

1. **The Care Profile Home Screen:** Displayed prominently upon login, ensuring every caregiver is reminded that the app does not replace professional medical advice.
2. **Intercepted on AI-Generated Responses:** Every AI insight (generated via Groq) explicitly carries a disclaimer stating that it is an automated observation and not a medical diagnosis.
3. **Hospital Summary PDF Export:** Stamped directly in the footer of every individual page of the exported PDF to ensure medical professionals receiving the document understand its context.

## 4. Infrastructure & Communication Security

### Environment Variable Lifecycle Management
All environment variables are securely managed via `.env` configuration files that are strictly ignored by source control (`.gitignore`). Production variables (Supabase URL, Anon Keys, Twilio Auth, VAPID Private Keys) are injected directly into the CI/CD pipeline (GitHub Actions) as encrypted GitHub Secrets.

### Repository Credential Leak Prevention
The repository utilizes `.gitignore` and `.dockerignore` validations to prevent any accidental leakage of private keys or service accounts. GitHub's Secret Scanning is also enabled to actively monitor for leaked Twilio or Supabase credentials.

### Log Sanitization Protocols
Active sanitization protocols are in place for the Twilio SMS dispatch and Push Notification modules. When logging dispatch results or debugging notification errors, patient-sensitive clinical data (e.g., specific medication names, dosages) is stripped or hashed from the raw provider logs to ensure no PHI is inadvertently stored in external logging aggregation systems.
