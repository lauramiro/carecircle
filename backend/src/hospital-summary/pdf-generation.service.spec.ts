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
  emergencyContacts: [
    { name: 'Mary Smith', role: 'Daughter', phone: '+447700900123' },
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
  flaggedDocuments: [
    {
      fileName: 'discharge-summary.pdf',
      documentType: 'discharge_summary',
      uploadedAt: new Date().toISOString(),
      fileType: 'application/pdf',
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
});
