import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OverdueDetectionService } from './overdue-detection.service';
import type { ChecklistItemRecord, MissedMedicationAlertRecord } from '../integrations/types';

function makeItem(overrides: Partial<ChecklistItemRecord> = {}): ChecklistItemRecord {
  return {
    id: 'item-1',
    checklist_id: 'cl-1',
    medication_id: 'med-1',
    medication_name: 'Metformin',
    dose: 500,
    dosage_unit: 'mg',
    scheduled_time: '08:00',
    scheduled_at: '2025-05-21T08:00:00.000Z',
    status: 'due',
    group_id: 'group-1',
    patient_id: 'patient-1',
    timezone: 'UTC',
    given_at: null,
    skip_reason: null,
    overdue_at: null,
    archived_at: null,
    ...overrides,
  };
}

describe('OverdueDetectionService', () => {
  const checklistRepo = {
    findDueItemsPastThreshold: vi.fn(),
    findById: vi.fn(),
    markOverdue: vi.fn(),
  };
  const careGroupRepo = {
    getGroupContext: vi.fn(),
    listActiveGroupMembers: vi.fn(),
  };
  const alertRepo = {
    insertAlert: vi.fn(),
    updateAfterPush: vi.fn(),
  };
  const pushDispatch = {
    dispatch: vi.fn(),
  };
  const appConfig = {
    config: { FRONTEND_PUBLIC_URL: 'https://app.example.com' },
    smsFallbackDelayMinutes: 10,
  };

  let service: OverdueDetectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OverdueDetectionService(
      checklistRepo as never,
      careGroupRepo as never,
      alertRepo as never,
      pushDispatch as never,
      appConfig as never,
    );
  });

  it('runTick processes due items past the 30-minute threshold', async () => {
    const overdueItem = makeItem();
    checklistRepo.findDueItemsPastThreshold.mockResolvedValue([overdueItem]);
    checklistRepo.findById.mockResolvedValue(overdueItem);
    checklistRepo.markOverdue.mockResolvedValue(true);
    careGroupRepo.getGroupContext.mockResolvedValue({
      groupId: 'group-1',
      patientId: 'patient-1',
      preferredTimezone: 'UTC',
      patientFirstName: 'Alex',
    });
    careGroupRepo.listActiveGroupMembers.mockResolvedValue({
      groupMembersIds: ['carer-1'],
      groupMembersPhoneNumbers: ['+447700900123'],
    });
    const alert: MissedMedicationAlertRecord = {
      id: 'alert-1',
      checklist_item_id: 'item-1',
      group_id: 'group-1',
      patient_id: 'patient-1',
      medication_id: 'med-1',
      patient_first_name: 'Alex',
      medication_name: 'Metformin',
      dose_summary: '500 mg',
      minutes_overdue: 32,
      scheduled_at: overdueItem.scheduled_at!,
      overdue_detected_at: '2025-05-21T09:02:00.000Z',
      push_body: 'Metformin 500 mg is 32 minutes overdue',
      sms_body: 'Alex: Metformin (500 mg) ~32 min overdue. Open CareCircle to record or skip.',
      deep_link_url: 'https://app.example.com/groups/group-1/checklist?date=2025-05-21&item=item-1',
      push_recipient_user_ids: ['carer-1'],
      sms_phone_numbers: ['+447700900123'],
      push_due_at: '2025-05-21T09:02:00.000Z',
      push_sent_at: null,
      sms_due_at: null,
      sms_sent_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      status: 'pending_push',
      push_delivery_log: [],
      sms_delivery_log: [],
    };
    alertRepo.insertAlert.mockResolvedValue(alert);
    pushDispatch.dispatch.mockResolvedValue({
      log: [{ userId: 'carer-1', subscriptionId: 'sub-1', success: true, statusCode: 201 }],
      allFailed: false,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-05-21T09:02:00.000Z'));

    await service.runTick();

    expect(checklistRepo.markOverdue).toHaveBeenCalledWith('item-1', '2025-05-21T08:30:00.000Z');
    expect(alertRepo.insertAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        checklist_item_id: 'item-1',
        push_recipient_user_ids: ['carer-1'],
        sms_phone_numbers: ['+447700900123'],
        status: 'pending_push',
      }),
    );
    expect(pushDispatch.dispatch).toHaveBeenCalledWith(alert);
    expect(alertRepo.updateAfterPush).toHaveBeenCalledWith(
      'alert-1',
      expect.objectContaining({
        status: 'push_sent',
        pushDeliveryLog: expect.any(Array),
      }),
    );

    vi.useRealTimers();
  });

  it('runTick skips items still within the 30-minute grace period', async () => {
    const item = makeItem({ scheduled_at: '2025-05-21T08:00:00.000Z' });
    checklistRepo.findDueItemsPastThreshold.mockResolvedValue([item]);
    checklistRepo.findById.mockResolvedValue(item);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-05-21T08:15:00.000Z'));

    await service.runTick();

    expect(checklistRepo.markOverdue).not.toHaveBeenCalled();
    expect(alertRepo.insertAlert).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('runTick sets push_failed when all push deliveries fail', async () => {
    const overdueItem = makeItem({ scheduled_at: '2025-05-21T08:00:00.000Z' });
    checklistRepo.findDueItemsPastThreshold.mockResolvedValue([overdueItem]);
    checklistRepo.findById.mockResolvedValue(overdueItem);
    checklistRepo.markOverdue.mockResolvedValue(true);
    careGroupRepo.getGroupContext.mockResolvedValue({
      groupId: 'group-1',
      patientId: 'patient-1',
      preferredTimezone: 'UTC',
      patientFirstName: 'Alex',
    });
    careGroupRepo.listActiveGroupMembers.mockResolvedValue({
      groupMembersIds: ['carer-1'],
      groupMembersPhoneNumbers: [],
    });
    alertRepo.insertAlert.mockResolvedValue({ id: 'alert-1' });
    pushDispatch.dispatch.mockResolvedValue({ log: [], allFailed: true });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-05-21T09:02:00.000Z'));

    await service.runTick();

    expect(alertRepo.updateAfterPush).toHaveBeenCalledWith(
      'alert-1',
      expect.objectContaining({ status: 'push_failed' }),
    );

    vi.useRealTimers();
  });
});
