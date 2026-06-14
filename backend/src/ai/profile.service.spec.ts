import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PatientRepository } from '../integrations/repositories/patient.repository'; // adjust import path as needed

describe('ProfileService', () => {
  let service: ProfileService;
  let mockPatientRepository: any;

  beforeEach(async () => {
    // Create a complete mock with all methods used by ProfileService
    mockPatientRepository = {
      findByGroupId: vi.fn(),
      findActiveMedications: vi.fn(),
      findRecentMedicationLogs: vi.fn(),
      findRecentJournalEntries: vi.fn(),
      findUpcomingAppointments: vi.fn(),
      findRecentWellbeingCheckins: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PatientRepository,
          useValue: mockPatientRepository,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should return a complete care profile for a valid groupId', async () => {
    // Mock patient lookup
    const mockPatient = {
      id: 'patient-123',
      full_name: 'John Doe',
      date_of_birth: '1970-01-01',
      chronic_conditions: ['Diabetes'],
      allergies: ['Peanuts'],
    };
    mockPatientRepository.findByGroupId.mockResolvedValue(mockPatient);

    // Mock empty arrays for other data (simplify)
    mockPatientRepository.findActiveMedications.mockResolvedValue([]);
    mockPatientRepository.findRecentMedicationLogs.mockResolvedValue([]);
    mockPatientRepository.findRecentJournalEntries.mockResolvedValue([]);
    mockPatientRepository.findUpcomingAppointments.mockResolvedValue([]);
    mockPatientRepository.findRecentWellbeingCheckins.mockResolvedValue([]);

    const profile = await service.getCareProfile('group-123');

    expect(profile.patientName).toBe('John Doe');
    expect(profile.conditions).toEqual(['Diabetes']);
    expect(mockPatientRepository.findByGroupId).toHaveBeenCalledWith('group-123');
    expect(mockPatientRepository.findActiveMedications).toHaveBeenCalledWith('patient-123');
    // add other expectations as needed
  });

  it('should throw Patient not found when no patient exists', async () => {
    mockPatientRepository.findByGroupId.mockResolvedValue(null);
    await expect(service.getCareProfile('invalid-group')).rejects.toThrow('Patient not found');
  });
});