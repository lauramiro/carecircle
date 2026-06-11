import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';

const mockSupabaseSingle = vi.fn();
const mockSupabaseEq = vi.fn().mockReturnThis();
const mockSupabaseSelect = vi.fn().mockReturnThis();
const mockSupabaseFrom = vi.fn().mockReturnValue({
  select: mockSupabaseSelect.mockReturnValue({
    eq: mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
    }),
  }),
});

const mockSupabaseClient = {
  from: mockSupabaseFrom,
};

const mockSupabaseAdminClient = {
  getClient: vi.fn().mockReturnValue(mockSupabaseClient),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: SupabaseAdminClient, useValue: mockSupabaseAdminClient },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should return a complete care profile for a valid groupId', async () => {
    const mockPatient = {
      id: 'patient-123',
      full_name: 'John Doe',
      date_of_birth: '1970-01-01',
      chronic_conditions: ['Diabetes'],
      allergies: ['Peanuts'],
    };
    mockSupabaseSingle.mockResolvedValueOnce({ data: mockPatient, error: null });

    // Simplified mock for other queries (adjust as needed)
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'medications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const profile = await service.getCareProfile('group-123');
    expect(profile.patientName).toBe('John Doe');
    expect(profile.conditions).toEqual(['Diabetes']);
  });

  it('should throw Patient not found when no patient exists', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
    await expect(service.getCareProfile('invalid-group')).rejects.toThrow('Patient not found');
  });
});