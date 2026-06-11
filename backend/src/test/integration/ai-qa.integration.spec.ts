import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { Groq } from 'groq-sdk';
import { ProfileService } from '../../../src/ai/profile.service';

// Mock Groq
vi.mock('groq-sdk');
const mockGroqCreate = vi.fn();

(Groq as any).mockImplementation(() => ({
  chat: {
    completions: {
      create: mockGroqCreate,
    },
  },
}));

const mockProfile = {
  patientName: 'Test Patient',
  dateOfBirth: '1980-01-01',
  conditions: ['Hypertension'],
  allergies: ['Penicillin'],
  medications: [{ name: 'Lisinopril', dose: '10', dosage_unit: 'mg', frequency: 'once daily', startDate: '2024-01-01' }],
  recentLogs: [],
  recentJournalEntries: [],
  upcomingAppointments: [],
  recentWellbeingCheckins: [],
};

const mockProfileService = {
  getCareProfile: vi.fn().mockResolvedValue(mockProfile),
};

describe('AI Q&A Integration (mock LLM)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProfileService)
      .useValue(mockProfileService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockGroqCreate.mockReset();
    mockProfileService.getCareProfile.mockClear();
  });

  it('should return a grounded answer from the mock LLM', async () => {
    const mockAnswer = 'Lisinopril 10mg once daily.';
    mockGroqCreate.mockResolvedValueOnce({
      choices: [{ message: { content: mockAnswer } }],
    });

    const response = await request(app.getHttpServer())
      .post('/api/ai/qa')
      .send({
        question: 'What is the patient’s blood pressure medication?',
        groupId: 'test-group-id',
      })
      .expect(201);

    expect(response.body.answer).toBe(mockAnswer);
    expect(response.body.patientName).toBe(mockProfile.patientName);
    expect(response.body.latencyMs).toBeGreaterThan(0);
    expect(mockProfileService.getCareProfile).toHaveBeenCalledWith('test-group-id');
  });

  it('should return 500 if Groq fails', async () => {
    mockGroqCreate.mockRejectedValueOnce(new Error('Groq API error'));

    await request(app.getHttpServer())
      .post('/api/ai/qa')
      .send({
        question: 'Any question',
        groupId: 'test-group-id',
      })
      .expect(500);
  });
});