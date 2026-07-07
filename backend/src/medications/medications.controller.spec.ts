import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MedicationsController } from './medications.controller';

describe('MedicationsController', () => {
  const medicationsService = {
    create: vi.fn(),
    update: vi.fn(),
    pause: vi.fn(),
    activate: vi.fn(),
    archive: vi.fn(),
  };
  const supabase = { getClient: vi.fn() };

  let controller: MedicationsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MedicationsController(
      medicationsService as never,
      supabase as never,
    );
  });

  it('create rejects non as-needed medications without course bounds', () => {
    expect(() =>
      controller.create(
        '11111111-1111-4111-8111-111111111111',
        {
          patientId: '22222222-2222-4222-8222-222222222222',
          medicationName: 'Aspirin',
          dose: 100,
          unit: 'mg',
          startDate: '2025-01-01',
          scheduleType: 'daily',
          specificTimes: ['08:00'],
          perpetual: false,
        },
        undefined,
      ),
    ).toThrow(BadRequestException);

    expect(medicationsService.create).not.toHaveBeenCalled();
  });

  it('create delegates to service when course bounds are valid', async () => {
    medicationsService.create.mockResolvedValue({ id: 'med-1' });

    const dto = {
      patientId: '22222222-2222-4222-8222-222222222222',
      medicationName: 'Aspirin',
      dose: 100,
      unit: 'mg',
      startDate: '2025-01-01',
      scheduleType: 'daily',
      specificTimes: ['08:00'],
      perpetual: true,
    };

    await controller.create(
      '11111111-1111-4111-8111-111111111111',
      dto,
      'Bearer test-token',
    );

    expect(medicationsService.create).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      dto,
      'test-token',
    );
  });
});
