import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { MissedMedicationAlertRecord } from '../integrations/types';

const sendNotification = vi.hoisted(() => vi.fn());
const setVapidDetails = vi.hoisted(() => vi.fn());

vi.mock('web-push', () => ({
  default: {
    sendNotification,
    setVapidDetails,
  },
}));

import { PushDispatchService } from './push-dispatch.service';

function makeAlert(overrides: Partial<MissedMedicationAlertRecord> = {}): MissedMedicationAlertRecord {
  return {
    id: 'alert-1',
    checklist_item_id: 'item-1',
    group_id: 'group-1',
    patient_id: 'patient-1',
    medication_id: 'med-1',
    patient_first_name: 'Alex',
    medication_name: 'Metformin',
    dose_summary: '500 mg',
    minutes_overdue: 32,
    scheduled_at: '2025-05-21T08:00:00.000Z',
    overdue_detected_at: '2025-05-21T09:02:00.000Z',
    push_body: 'Metformin 500 mg is 32 minutes overdue',
    sms_body: 'sms',
    deep_link_url: 'https://app.example.com/groups/group-1/checklist',
    push_recipient_user_ids: ['user-1'],
    sms_phone_numbers: [],
    push_due_at: '2025-05-21T09:02:00.000Z',
    push_sent_at: null,
    sms_due_at: null,
    sms_sent_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    status: 'pending_push',
    push_delivery_log: [],
    sms_delivery_log: [],
    ...overrides,
  };
}

describe('PushDispatchService', () => {
  const pushSubRepo = {
    findByUserIds: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns allFailed when VAPID is not configured', async () => {
    const appConfig = { config: {} };
    const service = new PushDispatchService(pushSubRepo as never, appConfig as never);

    const result = await service.dispatch(makeAlert());

    expect(result.allFailed).toBe(true);
    expect(result.log[0]).toMatchObject({ error: 'no_subscription' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('sends web push to subscribed carers', async () => {
    const appConfig = {
      config: {
        VAPID_PUBLIC_KEY: 'pub',
        VAPID_PRIVATE_KEY: 'priv',
        VAPID_SUBJECT: 'mailto:test@example.com',
      },
    };
    pushSubRepo.findByUserIds.mockResolvedValue([
      {
        id: 'sub-1',
        user_id: 'user-1',
        platform: 'web_push',
        endpoint: 'https://push.example/1',
        p256dh: 'key',
        auth: 'auth',
      },
    ]);
    sendNotification.mockResolvedValue({ statusCode: 201 });

    const service = new PushDispatchService(pushSubRepo as never, appConfig as never);
    const alert = makeAlert();
    const result = await service.dispatch(alert);

    expect(setVapidDetails).toHaveBeenCalled();
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://push.example/1', keys: { p256dh: 'key', auth: 'auth' } },
      JSON.stringify({
        title: 'Missed medication',
        body: alert.push_body,
        data: { url: alert.deep_link_url },
      }),
    );
    expect(result.allFailed).toBe(false);
    expect(result.log[0]?.success).toBe(true);
  });

  it('records failure when web push throws', async () => {
    const appConfig = {
      config: {
        VAPID_PUBLIC_KEY: 'pub',
        VAPID_PRIVATE_KEY: 'priv',
        VAPID_SUBJECT: 'mailto:test@example.com',
      },
    };
    pushSubRepo.findByUserIds.mockResolvedValue([
      {
        id: 'sub-1',
        user_id: 'user-1',
        platform: 'web_push',
        endpoint: 'https://push.example/1',
        p256dh: 'key',
        auth: 'auth',
      },
    ]);
    sendNotification.mockRejectedValue(Object.assign(new Error('gone'), { statusCode: 410 }));

    const service = new PushDispatchService(pushSubRepo as never, appConfig as never);
    const result = await service.dispatch(makeAlert());

    expect(result.allFailed).toBe(true);
    expect(result.log[0]).toMatchObject({ success: false, statusCode: 410 });
  });
});
