import { describe, expect, it, vi } from 'vitest';
import {
  getDailyDoseCount,
  MedicationLowStockAlertService,
} from './medication-low-stock-alert.service';
import type { MedicationRecord } from '../integrations/types';

function makeMed(overrides: Partial<MedicationRecord> = {}): MedicationRecord {
  return {
    id: 'med-1',
    patient_id: 'patient-1',
    medication_name: 'Metformin',
    dose: 500,
    unit: 'mg',
    schedule_type: 'daily',
    specific_times: ['08:00', '18:00'],
    interval_hours: null,
    days_of_week: null,
    day_of_month: null,
    start_date: '2026-01-01',
    end_date: null,
    status: 'active',
    perpetual: true,
    total_doses: null,
    quantity_on_hand: 10,
    low_stock_alert_threshold_days: 7,
    low_stock_alert_sent_at: null,
    materialization_cursor_at: null,
    ...overrides,
  };
}

describe('MedicationLowStockAlertService', () => {
  it('calculates average daily doses for scheduled medication patterns', () => {
    expect(getDailyDoseCount(makeMed())).toBe(2);
    expect(
      getDailyDoseCount(
        makeMed({ interval_hours: 6, specific_times: ['08:00'] }),
      ),
    ).toBe(3);
    expect(
      getDailyDoseCount(
        makeMed({
          schedule_type: 'weekly',
          days_of_week: [1, 3, 5],
          specific_times: ['08:00'],
        }),
      ),
    ).toBe(3 / 7);
  });

  it('marks the medication and sends one alert to active primary carers when stock is low', async () => {
    const medicationRepo = {
      findById: vi.fn().mockResolvedValue(makeMed()),
      markLowStockAlertSent: vi.fn().mockResolvedValue(makeMed()),
      clearLowStockAlertSent: vi.fn(),
    };
    const careGroupRepo = {
      listActivePrimaryCarerIds: vi.fn().mockResolvedValue(['carer-1']),
    };
    const pushDispatch = {
      sendToUsers: vi.fn().mockResolvedValue({ allFailed: false, log: [] }),
    };
    const service = new MedicationLowStockAlertService(
      medicationRepo as never,
      careGroupRepo as never,
      pushDispatch as never,
    );

    await service.maybeSendLowStockAlert({
      medicationId: 'med-1',
      groupId: 'group-1',
    });

    expect(medicationRepo.markLowStockAlertSent).toHaveBeenCalledWith(
      'med-1',
      expect.any(String),
    );
    expect(pushDispatch.sendToUsers).toHaveBeenCalledWith(
      ['carer-1'],
      expect.objectContaining({
        title: 'Medication stock low',
        url: '/groups/group-1/medications',
      }),
    );
    expect(medicationRepo.clearLowStockAlertSent).not.toHaveBeenCalled();
  });

  it('does not alert for untracked medication stock', async () => {
    const medicationRepo = {
      findById: vi.fn().mockResolvedValue(makeMed({ quantity_on_hand: null })),
      markLowStockAlertSent: vi.fn(),
      clearLowStockAlertSent: vi.fn(),
    };
    const service = new MedicationLowStockAlertService(
      medicationRepo as never,
      { listActivePrimaryCarerIds: vi.fn() } as never,
      { sendToUsers: vi.fn() } as never,
    );

    await service.maybeSendLowStockAlert({
      medicationId: 'med-1',
      groupId: 'group-1',
    });

    expect(medicationRepo.markLowStockAlertSent).not.toHaveBeenCalled();
  });

  it('does not send when another process already marked the alert sent', async () => {
    const medicationRepo = {
      findById: vi.fn().mockResolvedValue(makeMed()),
      markLowStockAlertSent: vi.fn().mockResolvedValue(null),
      clearLowStockAlertSent: vi.fn(),
    };
    const pushDispatch = { sendToUsers: vi.fn() };
    const service = new MedicationLowStockAlertService(
      medicationRepo as never,
      {
        listActivePrimaryCarerIds: vi.fn().mockResolvedValue(['carer-1']),
      } as never,
      pushDispatch as never,
    );

    await service.maybeSendLowStockAlert({
      medicationId: 'med-1',
      groupId: 'group-1',
    });

    expect(pushDispatch.sendToUsers).not.toHaveBeenCalled();
  });

  it('clears the alert sentinel when all push delivery attempts fail', async () => {
    const medicationRepo = {
      findById: vi.fn().mockResolvedValue(makeMed()),
      markLowStockAlertSent: vi
        .fn()
        .mockImplementation((_id: string, sentAt: string) =>
          Promise.resolve(makeMed({ low_stock_alert_sent_at: sentAt })),
        ),
      clearLowStockAlertSent: vi.fn().mockResolvedValue(undefined),
    };
    const careGroupRepo = {
      listActivePrimaryCarerIds: vi.fn().mockResolvedValue(['carer-1']),
    };
    const pushDispatch = {
      sendToUsers: vi.fn().mockResolvedValue({ allFailed: true, log: [] }),
    };
    const service = new MedicationLowStockAlertService(
      medicationRepo as never,
      careGroupRepo as never,
      pushDispatch as never,
    );

    await service.maybeSendLowStockAlert({
      medicationId: 'med-1',
      groupId: 'group-1',
    });

    const sentAt = medicationRepo.markLowStockAlertSent.mock
      .calls[0][1] as string;
    expect(medicationRepo.clearLowStockAlertSent).toHaveBeenCalledWith(
      'med-1',
      sentAt,
    );
  });

  it('scans pending low-stock candidates as a realtime fallback', async () => {
    const medicationRepo = {
      findPendingLowStockAlertCandidates: vi
        .fn()
        .mockResolvedValue([makeMed()]),
      findById: vi.fn().mockResolvedValue(makeMed()),
      markLowStockAlertSent: vi.fn().mockResolvedValue(makeMed()),
      clearLowStockAlertSent: vi.fn(),
    };
    const careGroupRepo = {
      getGroupContextByPatientId: vi.fn().mockResolvedValue({
        groupId: 'group-1',
        patientId: 'patient-1',
        preferredTimezone: 'UTC',
        patientFirstName: 'Alex',
      }),
      listActivePrimaryCarerIds: vi.fn().mockResolvedValue(['carer-1']),
    };
    const pushDispatch = {
      sendToUsers: vi.fn().mockResolvedValue({ allFailed: false, log: [] }),
    };
    const service = new MedicationLowStockAlertService(
      medicationRepo as never,
      careGroupRepo as never,
      pushDispatch as never,
    );

    await service.runPendingLowStockAlerts(25);

    expect(
      medicationRepo.findPendingLowStockAlertCandidates,
    ).toHaveBeenCalledWith(25);
    expect(careGroupRepo.getGroupContextByPatientId).toHaveBeenCalledWith(
      'patient-1',
    );
    expect(pushDispatch.sendToUsers).toHaveBeenCalledOnce();
  });
});
