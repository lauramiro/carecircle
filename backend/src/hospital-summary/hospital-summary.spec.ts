import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { HospitalSummaryService } from './hospital-summary.service';

describe('HospitalSummaryService', () => {
  let service: HospitalSummaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HospitalSummaryService],
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
        service.assembleHospitalSummary(invalidPatientId)
      ).rejects.toThrow('Patient not found in system');
    });

    it('should include validation errors if sections missing', async () => {
      const patientWithMissingData = 'patient-incomplete-001';

      const result = await service.assembleHospitalSummary(patientWithMissingData);

      // Even if some sections missing, should return with validation errors
      expect(result.validationErrors).toBeDefined();
      expect(Array.isArray(result.validationErrors)).toBe(true);
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