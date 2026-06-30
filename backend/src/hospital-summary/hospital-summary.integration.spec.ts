import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HospitalSummaryService } from '../../src/hospital-summary/hospital-summary.service';
import { PDFGenerationService } from '../../src/hospital-summary/pdf-generation.service';

// Mock SupabaseAdminClient with a proper class constructor
vi.mock('../../src/integrations/supabase-admin.client', () => {
  // Build the query chain to return a patient ID
  const singleFn = vi
    .fn()
    .mockResolvedValue({ data: { id: 'patient-123' }, error: null });
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  const fromFn = vi.fn().mockReturnValue({ select: selectFn });

  class MockSupabaseAdminClient {
    getClient() {
      return { from: fromFn };
    }
    isEnabled() {
      return false;
    }
  }

  return {
    SupabaseAdminClient: MockSupabaseAdminClient,
  };
});

// Mock data matching the structure expected by the controller
const mockSummaryData = {
  fullName: 'Test Patient',
  dateOfBirth: '1980-01-01',
  medications: [{ name: 'Lisinopril', dose: '10mg', frequency: 'once daily' }],
  gpContacts: [{ name: 'Dr. Smith', phone: '123-456' }],
  careNotesSummary: [{ date: '2026-06-01', content: 'Patient stable' }],
  conditions: ['Hypertension'],
  allergies: ['Penicillin'],
  flaggedPatterns: [],
  upcomingAppointments: [],
  isValid: true,
  validationErrors: [],
};

const mockHospitalSummaryService = {
  assembleHospitalSummary: vi.fn().mockResolvedValue(mockSummaryData),
};

const mockPdfBuffer = Buffer.from('fake pdf content');
const mockPDFGenerationService = {
  generateHospitalSummaryPDF: vi.fn().mockResolvedValue(mockPdfBuffer),
};

describe('Hospital Summary Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HospitalSummaryService)
      .useValue(mockHospitalSummaryService)
      .overrideProvider(PDFGenerationService)
      .useValue(mockPDFGenerationService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should generate a PDF with correct headers and content', async () => {
    const response = await request(app.getHttpServer() as never)
      .post('/hospital-summary/generate-pdf')
      .send({ groupId: 'test-group-id' })
      .expect(201)
      .expect('Content-Type', /pdf/);

    expect(response.body).toBeInstanceOf(Buffer);
    expect((response.body as Buffer).length).toBeGreaterThan(0);
    expect(
      mockHospitalSummaryService.assembleHospitalSummary,
    ).toHaveBeenCalledWith('patient-123');
    expect(
      mockPDFGenerationService.generateHospitalSummaryPDF,
    ).toHaveBeenCalledWith(mockSummaryData);
  });

  it('should return 500 if assembling the profile fails', async () => {
    mockHospitalSummaryService.assembleHospitalSummary.mockRejectedValueOnce(
      new Error('Supabase error'),
    );

    await request(app.getHttpServer() as never)
      .post('/hospital-summary/generate-pdf')
      .send({ groupId: 'test-group-id' })
      .expect(500);
  });
});
