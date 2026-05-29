import { describe, expect, it } from 'vitest';
import { PDFGenerationService } from './pdf-generation.service';
import type { HospitalSummaryData } from './hospital-summary.service';

const sampleSummaryData: HospitalSummaryData = {
  fullName: 'Test Patient',
  dateOfBirth: '1980-01-01',
  patientId: 'patient-123',
  generatedAt: new Date().toISOString(),
  medications: [
    {
      name: 'Atorvastatin',
      dose: '20',
      unit: 'mg',
      frequency: 'once daily',
      startDate: '2024-01-01',
      lastGivenTimestamp: new Date().toISOString(),
    },
  ],
  conditions: ['Hypertension'],
  allergies: ['Penicillin'],
  gpContacts: [
    {
      name: 'Dr. Jane Doe',
      specialty: 'General Practitioner',
      phone: '555-1234',
      email: 'jane.doe@example.com',
      address: '123 Care Lane',
    },
  ],
  careNotesSummary: [
    {
      date: new Date().toISOString().split('T')[0],
      content: 'Patient reported mild discomfort during morning walk.',
      tone: 'neutral',
    },
  ],
  flaggedPatterns: [
    {
      type: 'pain_trend',
      observation: 'Pain references increased slightly over the week.',
      severity: 'medium',
    },
  ],
  isValid: true,
  validationErrors: [],
};

describe('PDFGenerationService', () => {
  it('generates a valid PDF buffer from summary data', async () => {
    const service = new PDFGenerationService();
    const buffer = await service.generateHospitalSummaryPDF(sampleSummaryData);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(200);
    expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });
});
