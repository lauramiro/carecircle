import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import type { MedicationRecord } from '../integrations/types';

function makeMed(overrides: Partial<MedicationRecord> = {}): MedicationRecord {
  return {
    id: 'med-1',
    patient_id: 'patient-1',
    medication_name: 'Metformin',
    dose: 500,
    unit: 'mg',
    schedule_type: 'daily',
    specific_times: ['08:00'],
    interval_hours: null,
    days_of_week: null,
    day_of_month: null,
    start_date: '2025-01-01',
    end_date: null,
    status: 'active',
    perpetual: true,
    total_doses: null,
    quantity_on_hand: null,
    low_stock_alert_threshold_days: 7,
    low_stock_alert_sent_at: null,
    materialization_cursor_at: null,
    ...overrides,
  };
}

describe('MedicationsService', () => {
  const medicationRepo = {
    insert: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  };
  const careGroupRepo = {
    getGroupContext: vi.fn(),
  };
  const materialization = {
    materializeForMedication: vi.fn(),
  };
  const reconciliation = {
    reconcileAfterMedicationEdit: vi.fn(),
    pauseMedication: vi.fn(),
    activateMedication: vi.fn(),
    archiveMedication: vi.fn(),
  };

  let service: MedicationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MedicationsService(
      medicationRepo as never,
      careGroupRepo as never,
      materialization as never,
      reconciliation as never,
    );
  });

  it('create materializes checklist items for scheduled medications', async () => {
    careGroupRepo.getGroupContext.mockResolvedValue({
      groupId: 'group-1',
      patientId: 'patient-1',
      preferredTimezone: 'UTC',
      patientFirstName: 'Alex',
    });
    medicationRepo.insert.mockResolvedValue(makeMed());
    materialization.materializeForMedication.mockResolvedValue(undefined);

    await service.create('group-1', {
      patientId: 'patient-1',
      medicationName: 'Metformin',
      dose: 500,
      unit: 'mg',
      startDate: '2025-01-01',
      scheduleType: 'daily',
      specificTimes: ['08:00'],
      perpetual: true,
    });

    expect(materialization.materializeForMedication).toHaveBeenCalledWith(
      'med-1',
      'medication_create',
    );
    expect(medicationRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity_on_hand: null }),
    );
  });

  it('create persists quantity on hand when provided', async () => {
    careGroupRepo.getGroupContext.mockResolvedValue({
      groupId: 'group-1',
      patientId: 'patient-1',
      preferredTimezone: 'UTC',
      patientFirstName: 'Alex',
    });
    medicationRepo.insert.mockResolvedValue(makeMed({ quantity_on_hand: 28 }));
    materialization.materializeForMedication.mockResolvedValue(undefined);

    await service.create('group-1', {
      patientId: 'patient-1',
      medicationName: 'Metformin',
      dose: 500,
      unit: 'mg',
      startDate: '2025-01-01',
      scheduleType: 'daily',
      specificTimes: ['08:00'],
      perpetual: true,
      quantityOnHand: 28,
    });

    expect(medicationRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity_on_hand: 28 }),
    );
  });

  it('create skips materialization for as_needed medications', async () => {
    careGroupRepo.getGroupContext.mockResolvedValue({
      groupId: 'group-1',
      patientId: 'patient-1',
      preferredTimezone: 'UTC',
      patientFirstName: 'Alex',
    });
    medicationRepo.insert.mockResolvedValue(
      makeMed({ schedule_type: 'as_needed', specific_times: null }),
    );

    await service.create('group-1', {
      patientId: 'patient-1',
      medicationName: 'Salbutamol',
      dose: 100,
      unit: 'mcg',
      startDate: '2025-01-01',
      scheduleType: 'as_needed',
      perpetual: false,
    });

    expect(materialization.materializeForMedication).not.toHaveBeenCalled();
  });

  it('create throws NotFoundException when group is missing', async () => {
    careGroupRepo.getGroupContext.mockResolvedValue(null);

    await expect(
      service.create('group-1', {
        patientId: 'patient-1',
        medicationName: 'Metformin',
        dose: 500,
        unit: 'mg',
        startDate: '2025-01-01',
        scheduleType: 'daily',
        perpetual: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update reconciles checklist when schedule-affecting fields change', async () => {
    const oldMed = makeMed();
    const newMed = makeMed({ specific_times: ['08:00', '20:00'] });
    medicationRepo.findById
      .mockResolvedValueOnce(oldMed)
      .mockResolvedValueOnce(newMed);
    medicationRepo.update.mockResolvedValue(newMed);

    await service.update('group-1', 'med-1', {
      specificTimes: ['08:00', '20:00'],
    });

    expect(reconciliation.reconcileAfterMedicationEdit).toHaveBeenCalledWith(
      oldMed,
      newMed,
    );
  });

  it('update skips reconciliation when only non-schedule fields change', async () => {
    const oldMed = makeMed();
    const newMed = makeMed({ medication_name: 'Metformin XR' });
    medicationRepo.findById
      .mockResolvedValueOnce(oldMed)
      .mockResolvedValueOnce(newMed);
    medicationRepo.update.mockResolvedValue(newMed);

    await service.update('group-1', 'med-1', {
      medicationName: 'Metformin XR',
    });

    expect(reconciliation.reconcileAfterMedicationEdit).not.toHaveBeenCalled();
  });

  it('updates quantity on hand without checklist reconciliation', async () => {
    const oldMed = makeMed({ quantity_on_hand: 12 });
    const newMed = makeMed({ quantity_on_hand: 20 });
    medicationRepo.findById.mockResolvedValueOnce(oldMed);
    medicationRepo.update.mockResolvedValue(newMed);

    await service.update('group-1', 'med-1', {
      quantityOnHand: 20,
    });

    expect(medicationRepo.update).toHaveBeenCalledWith('med-1', {
      quantity_on_hand: 20,
    });
    expect(reconciliation.reconcileAfterMedicationEdit).not.toHaveBeenCalled();
  });

  it('pause delegates to reconciliation service', async () => {
    medicationRepo.findById.mockResolvedValue(makeMed({ status: 'paused' }));

    await service.pause('med-1');

    expect(reconciliation.pauseMedication).toHaveBeenCalledWith('med-1');
  });
});
