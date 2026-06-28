# CC-132: Emergency Contacts Section in Hospital Summary PDF

## Goal
Add a dedicated Emergency Contacts section to the generated hospital summary PDF, sourced from stored data, placed between Allergies and GP Contacts. Omitted entirely if no emergency contacts exist.

## Schema
Copy `supabase/migrations/20260614184500_cc_164_emergency_contacts_foundation.sql` (currently only on the unmerged CC-164 branch) onto this branch unmodified. Provides:
- `public.emergency_contacts` (id, patient_id, label, contact_name, phone, sort_order, is_active, created_at, updated_at, created_by), max 2 active rows per patient enforced via RLS insert policy.
- RLS: any active circle member can read; only primary/secondary carer can insert/update.
- Also adds `provider_phone` column to `appointments` (unrelated, bundled in the original migration — kept as-is rather than split).

## Backend (`backend/src/hospital-summary/hospital-summary.service.ts`)
- New interface: `EmergencyContact { name: string; role: string; phone: string }` (`role` sourced from the `label` column).
- New private method `getEmergencyContacts(patientId): Promise<EmergencyContact[]>` — selects `contact_name, label, phone` from `emergency_contacts` where `patient_id` matches and `is_active = true`, ordered by `sort_order`.
- Add `emergencyContacts: EmergencyContact[]` to `HospitalSummaryData` interface, populated in `assembleHospitalSummary`. Empty list does not push a validation error (section is optional, not required).

## PDF rendering (`backend/src/hospital-summary/pdf-generation.service.ts`)
- New private method `addEmergencyContacts(doc, data)`, invoked between `addAllergies` and `addGPContacts` in `generateHospitalSummaryPDF`.
- If `data.emergencyContacts.length === 0`, return immediately — no title, no placeholder text (unlike Allergies/Conditions which print "No X recorded").
- Otherwise: section title `EMERGENCY CONTACTS`, one line per contact: `{name} ({role}) — {phone}`.

## Tests
- `hospital-summary.spec.ts`: add a case asserting `emergencyContacts` is populated from `emergency_contacts` table data, and a case asserting an empty array when none exist.
- `pdf-generation.service.spec.ts`: add a case with populated emergency contacts asserting the section renders, and a case with an empty array asserting the section is omitted (no "EMERGENCY CONTACTS" title in output).

## Out of scope
- Emergency contact CRUD UI (`EmergencyContactsPage`) — belongs to CC-131, not touched here.
- US-15.3 10-profile validation suite — referenced by CC-132's AC but is a separate QA task, not part of this implementation.
