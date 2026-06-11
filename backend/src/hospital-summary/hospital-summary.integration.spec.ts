import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HospitalSummaryService } from '../../src/hospital-summary/hospital-summary.service';
import { PDFGenerationService } from '../../src/hospital-summary/pdf-generation.service';

const mockHospitalSummaryData = {
  patient: { fullName: 'Test Patient', dateOfBirth: '1980-01-01' },
  medications: [{ name: 'Lisinopril', dose: '10mg', frequency: 'once daily' }],
  gpContacts: [{ name: 'Dr. Smith', phone: '123-456' }],
  careNotesSummary: [{ date: '2026-06-01', content: 'Patient stable' }],
  conditions: ['Hypertension'],
  allergies: ['Penicillin'],
  flaggedPatterns: [],
  upcomingAppointments: [],
};

const mockHospitalSummaryService = {
  assembleCareProfile: vi.fn().mockResolvedValue(mockHospitalSummaryData),
};

const mockPdfBuffer = Buffer.from('fake pdf content');
const mockPDFGenerationService = {
  generatePDF: vi.fn().mockResolvedValue(mockPdfBuffer),
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
    await app.close();
  });

  it('should generate a PDF with correct headers and content', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/hospital-summary/generate-pdf')
      .send({ groupId: 'test-group-id' })
      .expect(201)
      .expect('Content-Type', /pdf/);

    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(0);
    expect(mockHospitalSummaryService.assembleCareProfile).toHaveBeenCalledWith('test-group-id');
    expect(mockPDFGenerationService.generatePDF).toHaveBeenCalledWith(mockHospitalSummaryData);
  });

  it('should return 500 if assembling the profile fails', async () => {
    mockHospitalSummaryService.assembleCareProfile.mockRejectedValueOnce(new Error('Supabase error'));

    await request(app.getHttpServer())
      .post('/api/hospital-summary/generate-pdf')
      .send({ groupId: 'test-group-id' })
      .expect(500);
  });
});