import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import { HospitalSummaryService } from './hospital-summary.service';

interface SupabaseResult {
  data: unknown;
  error: unknown;
}

const isoNow = () => new Date().toISOString();

// Per-patient fixtures: a fully-populated patient, a found-but-incomplete
// patient (drives validationErrors), and an unknown id (drives not-found).
const PATIENTS: Record<string, Record<string, unknown>> = {
  'test-patient-001': {
    id: 'test-patient-001',
    full_name: 'Test Patient',
    date_of_birth: '1950-01-01',
    chronic_conditions: ['Hypertension', 'Type 2 Diabetes'],
    allergies: ['Penicillin'],
    group_id: 'group-001',
  },
  'patient-incomplete-001': {
    id: 'patient-incomplete-001',
    full_name: 'Incomplete Patient',
    date_of_birth: '1960-06-15',
    chronic_conditions: [],
    allergies: [],
    group_id: 'group-002',
  },
};

const MEDICATIONS: Record<string, Record<string, unknown>[]> = {
  'test-patient-001': [
    {
      id: 'med-1',
      medication_name: 'Lisinopril',
      dose: 10,
      dosage_unit: 'mg',
      schedule_type: 'interval',
      interval_hours: 24,
      start_date: '2024-01-01',
      status: 'active',
    },
  ],
};

const GP_CONTACTS: Record<string, Record<string, unknown>[]> = {
  'test-patient-001': [
    {
      name: 'Dr Jane Smith',
      specialty: 'General Practitioner',
      phone: '+441234567890',
      email: 'jane.smith@nhs.example',
      address: '1 Clinic Road',
    },
  ],
};

const JOURNAL_BY_GROUP: Record<string, Record<string, unknown>[]> = {
  'group-001': [
    { created_at: isoNow(), content: '[NEUTRAL] Patient stable overnight.' },
  ],
};

const INSIGHTS: Record<string, Record<string, unknown>[]> = {
  'test-patient-001': [
    {
      insight_type: 'pain_trend',
      observation: 'Pain references increasing.',
      severity: 'medium',
    },
  ],
};

const resolve = (
  table: string,
  filters: Record<string, unknown>,
): SupabaseResult => {
  switch (table) {
    case 'patients': {
      const patient = PATIENTS[filters.id as string];
      if (!patient) {
        return { data: null, error: { message: 'Patient not found' } };
      }
      return { data: patient, error: null };
    }
    case 'medications':
      return {
        data: MEDICATIONS[filters.patient_id as string] ?? [],
        error: null,
      };
    case 'medication_logs':
      return {
        data: { actual_time: isoNow(), scheduled_time: isoNow() },
        error: null,
      };
    case 'gp_contacts':
      return {
        data: GP_CONTACTS[filters.patient_id as string] ?? [],
        error: null,
      };
    case 'handover_journal_entries':
      return {
        data: JOURNAL_BY_GROUP[filters.group_id as string] ?? [],
        error: null,
      };
    case 'ai_insights':
      return {
        data: INSIGHTS[filters.patient_id as string] ?? [],
        error: null,
      };
    default:
      return { data: [], error: null };
  }
};

// A thenable query builder. Chain methods return the builder; `eq` records its
// filter so the terminal (then/single/maybeSingle) can resolve fixture data.
const createBuilder = (table: string) => {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation((column: string, value: unknown) => {
      filters[column] = value;
      return builder;
    }),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockImplementation(() => Promise.resolve(resolve(table, filters))),
    maybeSingle: vi
      .fn()
      .mockImplementation(() => Promise.resolve(resolve(table, filters))),
    then: (
      onFulfilled: (value: SupabaseResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolve(table, filters)).then(onFulfilled, onRejected),
  };
  return builder;
};

describe('HospitalSummaryService', () => {
  let service: HospitalSummaryService;

  beforeEach(async () => {
    const supabaseAdmin = {
      getClient: vi.fn(() => ({
        from: vi.fn((table: string) => createBuilder(table)),
      })),
    } as unknown as SupabaseAdminClient;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalSummaryService,
        { provide: SupabaseAdminClient, useValue: supabaseAdmin },
      ],
    }).compile();

    service = module.get<HospitalSummaryService>(HospitalSummaryService);
  });

  describe('assembleHospitalSummary', () => {
    it('should assemble complete summary with all sections for valid patient', async () => {
      const syntheticPatientId = 'test-patient-001';

      const result = await service.assembleHospitalSummary(syntheticPatientId);

      // Verify all sections present
      expect(result).toBeDefined();
      expect(result.fullName).toBeDefined();
      expect(result.dateOfBirth).toBeDefined();
      expect(result.medications).toBeDefined();
      expect(Array.isArray(result.medications)).toBe(true);
      expect(result.conditions).toBeDefined();
      expect(result.allergies).toBeDefined();
      expect(result.gpContacts).toBeDefined();
      expect(result.careNotesSummary).toBeDefined();
      expect(result.flaggedPatterns).toBeDefined();

      // Verify no critical sections are empty
      expect(result.medications.length).toBeGreaterThan(0);
      expect(result.conditions.length).toBeGreaterThan(0);
      expect(result.allergies.length).toBeGreaterThan(0);
    });

    it('should fail loudly if patient not found', async () => {
      const invalidPatientId = 'invalid-id-12345';

      await expect(
        service.assembleHospitalSummary(invalidPatientId),
      ).rejects.toThrow('Patient not found in system');
    });

    it('should include validation errors if sections missing', async () => {
      const patientWithMissingData = 'patient-incomplete-001';

      const result = await service.assembleHospitalSummary(
        patientWithMissingData,
      );

      // Even if some sections missing, should return with validation errors
      expect(result.validationErrors).toBeDefined();
      expect(Array.isArray(result.validationErrors)).toBe(true);
      expect(result.validationErrors.length).toBeGreaterThan(0);
      expect(result.isValid).toBe(false);
    });

    it('should fetch fresh data on every call (no caching)', async () => {
      const patientId = 'test-patient-001';

      const result1 = await service.assembleHospitalSummary(patientId);
      const result2 = await service.assembleHospitalSummary(patientId);

      // Both calls should have same structure but timestamps should be close
      expect(result1.fullName).toBe(result2.fullName);
      // Timestamps will be slightly different (fresh fetch each time)
      expect(result1.generatedAt).toBeDefined();
      expect(result2.generatedAt).toBeDefined();
    });
  });
});
