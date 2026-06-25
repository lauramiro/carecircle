# CC-132: Emergency Contacts in Hospital Summary PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated, data-driven Emergency Contacts section to the generated hospital summary PDF, placed between Allergies and GP Contacts, omitted entirely when no contacts exist.

**Architecture:** Bring the `emergency_contacts` table onto this branch via a copied migration (it currently only exists on the unmerged CC-164 branch), add a backend fetch method to `HospitalSummaryService`, and render a new section in `PDFGenerationService` following the exact pattern already used for Allergies/GP Contacts.

**Tech Stack:** NestJS, Supabase (Postgres + RLS), `pdfkit`, Vitest.

## Global Constraints

- Spec source: `docs/superpowers/specs/2026-06-22-cc132-emergency-contacts-pdf-design.md`.
- Migration must be copied verbatim from CC-164 (commit `5e732f3`), including the unrelated `appointments.provider_phone` column and the `gp_contacts` policy realignment — do not split or edit it.
- Section is omitted (no title, no placeholder text) when there are zero emergency contacts — this differs from Allergies/Conditions, which print "No X recorded."
- `role` in the rendered output and in the `EmergencyContact` interface is sourced from the `label` column, not a new `role` column.
- Out of scope: `EmergencyContactsPage` CRUD UI (CC-131) and the US-15.3 10-profile validation suite — not touched by this plan.

---

### Task 1: Add the `emergency_contacts` migration

**Files:**
- Create: `supabase/migrations/20260614184500_cc_164_emergency_contacts_foundation.sql`

**Interfaces:**
- Produces: `public.emergency_contacts` table with columns `id, patient_id, label, contact_name, phone, sort_order, is_active, created_at, updated_at, created_by`. Task 2 selects `contact_name, label, phone` from it filtered by `patient_id` and `is_active = true`.

- [ ] **Step 1: Create the migration file with the exact content from CC-164**

```sql
-- CC-164: Emergency contacts foundation for CC-131.

alter table public.appointments
  add column if not exists provider_phone text;

create table if not exists public.emergency_contacts (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.patients(id) on delete cascade,
  label text not null,
  contact_name text not null,
  phone text not null,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id) on delete set null,
  constraint emergency_contacts_sort_order_check check (sort_order between 0 and 1)
);

create index if not exists idx_emergency_contacts_patient_id
  on public.emergency_contacts(patient_id);

alter table public.emergency_contacts enable row level security;

drop policy if exists "emergency_contacts_select" on public.emergency_contacts;
create policy "emergency_contacts_select"
  on public.emergency_contacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = emergency_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
    )
  );

drop policy if exists "emergency_contacts_insert" on public.emergency_contacts;
create policy "emergency_contacts_insert"
  on public.emergency_contacts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = emergency_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
    and (
      select count(*)
      from public.emergency_contacts ec
      where ec.patient_id = emergency_contacts.patient_id
        and ec.is_active = true
    ) < 2
  );

drop policy if exists "emergency_contacts_update" on public.emergency_contacts;
create policy "emergency_contacts_update"
  on public.emergency_contacts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = emergency_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
  )
  with check (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = emergency_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
  );

-- Align GP contact read/manage policies with emergency-screen requirements.
drop policy if exists "gp_contacts_select" on public.gp_contacts;
create policy "gp_contacts_select"
  on public.gp_contacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = gp_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
    )
  );

drop policy if exists "gp_contacts_insert" on public.gp_contacts;
create policy "gp_contacts_insert"
  on public.gp_contacts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = gp_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
  );
```

- [ ] **Step 2: Verify the file matches the source commit byte-for-byte**

Run: `git show 5e732f3:supabase/migrations/20260614184500_cc_164_emergency_contacts_foundation.sql | diff - supabase/migrations/20260614184500_cc_164_emergency_contacts_foundation.sql`
Expected: no output (files identical)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260614184500_cc_164_emergency_contacts_foundation.sql
git commit -m "feat(db): add emergency_contacts table for CC-132 hospital summary section"
```

---

### Task 2: Fetch emergency contacts in `HospitalSummaryService`

**Files:**
- Modify: `backend/src/hospital-summary/hospital-summary.service.ts`
- Test: `backend/src/hospital-summary/hospital-summary.spec.ts`

**Interfaces:**
- Consumes: `public.emergency_contacts` table from Task 1 (`contact_name, label, phone, patient_id, is_active, sort_order`).
- Produces: `EmergencyContact { name: string; role: string; phone: string }` exported from `hospital-summary.service.ts`; `HospitalSummaryData.emergencyContacts: EmergencyContact[]`. Task 3 consumes both.

- [ ] **Step 1: Write the failing test in `hospital-summary.spec.ts`**

Add an `EMERGENCY_CONTACTS` fixture next to the other `Record<string, ...>` fixtures (after `GP_CONTACTS`, around line 59):

```typescript
const EMERGENCY_CONTACTS: Record<string, Record<string, unknown>[]> = {
  'test-patient-001': [
    { contact_name: 'Mary Smith', label: 'Daughter', phone: '+447700900123' },
  ],
};
```

Add a case to the `resolve()` switch (after the `'gp_contacts'` case, around line 103):

```typescript
    case 'emergency_contacts':
      return {
        data: EMERGENCY_CONTACTS[filters.patient_id as string] ?? [],
        error: null,
      };
```

Add a new test inside `describe('assembleHospitalSummary', ...)`, after the existing "should assemble complete summary..." test:

```typescript
    it('should include emergency contacts sourced from the emergency_contacts table', async () => {
      const result = await service.assembleHospitalSummary('test-patient-001');

      expect(result.emergencyContacts).toEqual([
        { name: 'Mary Smith', role: 'Daughter', phone: '+447700900123' },
      ]);
    });

    it('should return an empty emergency contacts list when none are stored', async () => {
      const result = await service.assembleHospitalSummary('patient-incomplete-001');

      expect(result.emergencyContacts).toEqual([]);
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run src/hospital-summary/hospital-summary.spec.ts`
Expected: FAIL — `result.emergencyContacts` is `undefined`, not the expected array (property doesn't exist yet)

- [ ] **Step 3: Implement `EmergencyContact`, `getEmergencyContacts`, and wire into `assembleHospitalSummary`**

In `backend/src/hospital-summary/hospital-summary.service.ts`, add the interface after `GPContact` (after line 38):

```typescript
export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
}
```

Add `emergencyContacts: EmergencyContact[];` to `HospitalSummaryData`, after the `gpContacts: GPContact[];` field (line 61):

```typescript
  gpContacts: GPContact[];

  // Emergency contacts
  emergencyContacts: EmergencyContact[];
```

In `assembleHospitalSummary`, after the GP contacts fetch block (after line 120, `if (!gpContacts ...) { validationErrors.push(...) }`), add:

```typescript
      // Step 4b: Fetch emergency contacts
      const emergencyContacts = await this.getEmergencyContacts(patientId);
```

In the `summaryData` object literal, after the `gpContacts: gpContacts || [],` line (line 149), add:

```typescript
        gpContacts: gpContacts || [],

        // Emergency contacts
        emergencyContacts: emergencyContacts || [],
```

Add the fetch method after `getGPContacts` (after line 298, before `getCareNotesSummary`):

```typescript
  /**
   * Fetch active emergency contacts for patient, ordered for display
   */
  private async getEmergencyContacts(patientId: string): Promise<EmergencyContact[]> {
    const { data, error } = await this.supabase.getClient()
      .from('emergency_contacts')
      .select('contact_name, label, phone')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching emergency contacts:', error);
      return [];
    }

    return (
      data?.map((contact) => ({
        name: contact.contact_name,
        role: contact.label,
        phone: contact.phone,
      })) || []
    );
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/hospital-summary/hospital-summary.spec.ts`
Expected: PASS — all tests including the two new ones

- [ ] **Step 5: Commit**

```bash
git add backend/src/hospital-summary/hospital-summary.service.ts backend/src/hospital-summary/hospital-summary.spec.ts
git commit -m "feat: fetch emergency contacts for hospital summary data"
```

---

### Task 3: Render Emergency Contacts section in the PDF

**Files:**
- Modify: `backend/src/hospital-summary/pdf-generation.service.ts`
- Test: `backend/src/hospital-summary/pdf-generation.service.spec.ts`

**Interfaces:**
- Consumes: `HospitalSummaryData.emergencyContacts: EmergencyContact[]` from Task 2.
- Produces: PDF section "EMERGENCY CONTACTS" rendered between Allergies and GP Contacts; omitted when the array is empty.

- [ ] **Step 1: Write the failing test in `pdf-generation.service.spec.ts`**

Add `emergencyContacts` to `sampleSummaryData`, after the `gpContacts` array (after line 30, before `careNotesSummary`):

```typescript
  emergencyContacts: [
    { name: 'Mary Smith', role: 'Daughter', phone: '+447700900123' },
  ],
```

Add two new tests after the existing "generates a valid PDF buffer..." test:

```typescript
  it('generates a larger PDF when emergency contacts are present than when absent', async () => {
    const service = new PDFGenerationService();

    const withContacts = await service.generateHospitalSummaryPDF(sampleSummaryData);
    const withoutContacts = await service.generateHospitalSummaryPDF({
      ...sampleSummaryData,
      emergencyContacts: [],
    });

    expect(withContacts.length).toBeGreaterThan(withoutContacts.length);
  });

  it('produces a valid PDF when emergency contacts list is empty', async () => {
    const service = new PDFGenerationService();
    const buffer = await service.generateHospitalSummaryPDF({
      ...sampleSummaryData,
      emergencyContacts: [],
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run src/hospital-summary/pdf-generation.service.spec.ts`
Expected: FAIL — TypeScript error, `emergencyContacts` does not exist on type `HospitalSummaryData` (until Task 2 lands; if run after Task 2, this fails instead with the size-comparison assertion false since the section isn't rendered yet)

- [ ] **Step 3: Implement `addEmergencyContacts` and wire it into the render order**

In `backend/src/hospital-summary/pdf-generation.service.ts`, in `generateHospitalSummaryPDF`, insert the call between `addAllergies` and `addGPContacts` (lines 42-43):

```typescript
        this.addAllergies(doc, summaryData);
        this.addEmergencyContacts(doc, summaryData);
        this.addGPContacts(doc, summaryData);
```

Add the method after `addAllergies` (after line 182, before `addGPContacts`):

```typescript
  private addEmergencyContacts(doc: any, data: HospitalSummaryData) {
    if (data.emergencyContacts.length === 0) return;

    this.ensureSpace(doc, 3);
    this.addSectionTitle(doc, 'EMERGENCY CONTACTS');

    for (const contact of data.emergencyContacts) {
      this.ensureSpace(doc, 1);
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`${contact.name} (${contact.role}) — ${contact.phone}`, { indent: 20 });
    }

    doc.moveDown();
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/hospital-summary/pdf-generation.service.spec.ts`
Expected: PASS — all tests including the two new ones

- [ ] **Step 5: Run the full backend test suite**

Run: `cd backend && npx vitest run`
Expected: PASS — no regressions in other hospital-summary or unrelated suites

- [ ] **Step 6: Commit**

```bash
git add backend/src/hospital-summary/pdf-generation.service.ts backend/src/hospital-summary/pdf-generation.service.spec.ts
git commit -m "feat: render emergency contacts section in hospital summary PDF"
```
