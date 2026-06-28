import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SmsDispatchService } from './sms-dispatch.service';

describe('SmsDispatchService', () => {
  const alertRepo = {
    findSmsDueAlerts: vi.fn(),
    cancelOpenAlert: vi.fn(),
    markSmsSent: vi.fn(),
  };
  const checklistRepo = {
    findById: vi.fn(),
  };
  const twilio = {
    sendSms: vi.fn(),
  };
  const appConfig = {
    config: {} as { TWILIO_DEV_TEST_TO_NUMBER?: string },
  };

  let service: SmsDispatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    appConfig.config = {};
    service = new SmsDispatchService(
      alertRepo as never,
      checklistRepo as never,
      twilio as never,
      appConfig as never,
    );
  });

  it('runTick cancels SMS when checklist item was acknowledged', async () => {
    alertRepo.findSmsDueAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        checklist_item_id: 'item-1',
        sms_body: 'Overdue',
        sms_phone_numbers: ['+447700900123'],
      },
    ]);
    checklistRepo.findById.mockResolvedValue({ id: 'item-1', status: 'given' });

    await service.runTick();

    expect(alertRepo.cancelOpenAlert).toHaveBeenCalledWith(
      'item-1',
      'acknowledged',
    );
    expect(twilio.sendSms).not.toHaveBeenCalled();
  });

  it('runTick sends SMS to all numbers and marks alert sms_sent', async () => {
    alertRepo.findSmsDueAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        checklist_item_id: 'item-1',
        sms_body: 'Alex: Metformin overdue',
        sms_phone_numbers: ['+447700900123', '+447700900456'],
      },
    ]);
    checklistRepo.findById.mockResolvedValue({
      id: 'item-1',
      status: 'overdue',
    });
    twilio.sendSms
      .mockResolvedValueOnce({ sid: 'SM1' })
      .mockResolvedValueOnce({ sid: 'SM2' });

    await service.runTick();

    expect(twilio.sendSms).toHaveBeenCalledTimes(2);
    expect(alertRepo.markSmsSent).toHaveBeenCalledWith(
      'alert-1',
      expect.objectContaining({
        status: 'sms_sent',
        smsDeliveryLog: [
          { phone: '+447700900123', success: true, sid: 'SM1' },
          { phone: '+447700900456', success: true, sid: 'SM2' },
        ],
      }),
    );
  });

  it('runTick sends to TWILIO_DEV_TEST_TO_NUMBER when set and not already in alert list', async () => {
    appConfig.config.TWILIO_DEV_TEST_TO_NUMBER = '+447700900999';
    alertRepo.findSmsDueAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        checklist_item_id: 'item-1',
        sms_body: 'Alex: Metformin overdue',
        sms_phone_numbers: ['+447700900123'],
      },
    ]);
    checklistRepo.findById.mockResolvedValue({
      id: 'item-1',
      status: 'overdue',
    });
    twilio.sendSms
      .mockResolvedValueOnce({ sid: 'SM1' })
      .mockResolvedValueOnce({ sid: 'SM-dev' });

    await service.runTick();

    expect(twilio.sendSms).toHaveBeenCalledTimes(2);
    expect(twilio.sendSms).toHaveBeenLastCalledWith(
      '+447700900999',
      'Alex: Metformin overdue',
    );
    expect(alertRepo.markSmsSent).toHaveBeenCalledWith(
      'alert-1',
      expect.objectContaining({
        smsDeliveryLog: expect.arrayContaining([
          { phone: '+447700900999', success: true, sid: 'SM-dev' },
        ]) as unknown,
      }),
    );
  });

  it('runTick sends SMS for push_failed alerts (fallback when push had no subscription)', async () => {
    appConfig.config.TWILIO_DEV_TEST_TO_NUMBER = '+447700900999';
    alertRepo.findSmsDueAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        checklist_item_id: 'item-1',
        sms_body: 'Alex: Metformin overdue',
        sms_phone_numbers: [],
        status: 'push_failed',
      },
    ]);
    checklistRepo.findById.mockResolvedValue({
      id: 'item-1',
      status: 'overdue',
    });
    twilio.sendSms.mockResolvedValue({ sid: 'SM-dev' });

    await service.runTick();

    expect(twilio.sendSms).toHaveBeenCalledWith(
      '+447700900999',
      'Alex: Metformin overdue',
    );
  });

  it('runTick marks sms_failed when every send fails', async () => {
    alertRepo.findSmsDueAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        checklist_item_id: 'item-1',
        sms_body: 'Overdue',
        sms_phone_numbers: ['+447700900123'],
      },
    ]);
    checklistRepo.findById.mockResolvedValue({
      id: 'item-1',
      status: 'overdue',
    });
    twilio.sendSms.mockResolvedValue({ error: 'invalid number' });

    await service.runTick();

    expect(alertRepo.markSmsSent).toHaveBeenCalledWith(
      'alert-1',
      expect.objectContaining({
        status: 'sms_failed',
        smsDeliveryLog: [
          { phone: '+447700900123', success: false, error: 'invalid number' },
        ],
      }),
    );
  });
});
