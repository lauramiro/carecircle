/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PatientRepository } from '../../../src/integrations/repositories/patient.repository';

// Mock Groq SDK
let mockGroqCreate: any;
vi.mock('groq-sdk', () => {
  const createMock = vi.fn();
  const GroqMock = class {
    chat = {
      completions: {
        create: createMock,
      },
    };
  };
  (GroqMock as any).__mockCreate = createMock;
  return {
    default: GroqMock,
    Groq: GroqMock,
  };
});

// Mock PatientRepository to avoid real Supabase calls
const mockPatientRepo = {
  findByGroupId: vi.fn().mockResolvedValue({
    id: 'patient-123',
    full_name: 'John Doe',
    date_of_birth: '1970-01-01',
    chronic_conditions: ['Hypertension'],
    allergies: ['Penicillin'],
  }),
  findActiveMedications: vi.fn().mockResolvedValue([]),
  findRecentMedicationLogs: vi.fn().mockResolvedValue([]),
  findRecentJournalEntries: vi.fn().mockResolvedValue([]),
  findUpcomingAppointments: vi.fn().mockResolvedValue([]),
  findRecentWellbeingCheckins: vi.fn().mockResolvedValue([]),
};

describe('AI Q&A Integration (mock LLM)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { Groq } = await import('groq-sdk');
    mockGroqCreate = (Groq as any).__mockCreate;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PatientRepository)
      .useValue(mockPatientRepo)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    mockGroqCreate?.mockReset();
  });

  it('should return a grounded answer from the mock LLM', async () => {
    const mockAnswer = 'Lisinopril 10mg once daily.';
    mockGroqCreate.mockResolvedValueOnce({
      choices: [{ message: { content: mockAnswer } }],
    });

    const response = await request(app.getHttpServer())
      .post('/ai/qa')
      .send({
        question: 'What is the patient’s blood pressure medication?',
        groupId: 'test-group-id',
      })
      .expect(201);

    const answer = response.body.answer ?? response.body;
    expect(answer).toBe(mockAnswer);
  });

  it('should return 500 if Groq fails', async () => {
    mockGroqCreate.mockRejectedValueOnce(new Error('Groq API error'));

    await request(app.getHttpServer())
      .post('/ai/qa')
      .send({
        question: 'Any question',
        groupId: 'test-group-id',
      })
      .expect(500);
  });
});
