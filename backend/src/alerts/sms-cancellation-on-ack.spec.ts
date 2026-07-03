import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ChecklistAckAlertSubscriber } from '../checklist/checklist-ack-alert.subscriber';
import { SmsDispatchService } from './sms-dispatch.service';

const dueAlert = {
  id: 'alert-1',
  checklist_item_id: 'item-1',
  sms_body: 'Jamie: Metformin overdue',
  sms_phone_numbers: ['+447700900123'],
};

/**
 * CC-102 acceptance: acknowledge at t+5 → SMS at t+10 does not fire.
 * Models DB-backed cancellation: cancelled rows are excluded from findSmsDueAlerts.
 */
describe('SMS cancellation on acknowledgement (CC-102)', () => {
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

  let cancelled = false;
  let smsService: SmsDispatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    cancelled = false;
    appConfig.config = {};

    alertRepo.cancelOpenAlert.mockImplementation(() => {
      cancelled = true;
      return Promise.resolve();
    });
    alertRepo.findSmsDueAlerts.mockImplementation(() =>
      Promise.resolve(cancelled ? [] : [dueAlert]),
    );
    checklistRepo.findById.mockResolvedValue({
      id: 'item-1',
      status: 'overdue',
    });
    twilio.sendSms.mockResolvedValue({ sid: 'SM1' });

    smsService = new SmsDispatchService(
      alertRepo as never,
      checklistRepo as never,
      twilio as never,
      appConfig as never,
    );
  });

  function ackAtT5(): void {
    const chain = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    const client = {
      channel: vi.fn().mockReturnValue(chain),
      removeChannel: vi.fn(),
    };
    const supabase = {
      isEnabled: () => true,
      getClient: () => client as never,
    };

    const mockAlertRepo = {
      ...alertRepo,
      findCancelledAlertByItemId: vi.fn().mockResolvedValue(null),
    };
    const mockPushDispatch = {
      sendDismissToUsers: vi.fn().mockResolvedValue(undefined),
    };
    const mockLowStockAlerts = {
      maybeSendLowStockAlert: vi.fn().mockResolvedValue(undefined),
    };

    const subscriber = new ChecklistAckAlertSubscriber(
      supabase as never,
      mockAlertRepo as never,
      mockPushDispatch as never,
      mockLowStockAlerts as never,
    );
    subscriber.onModuleInit();

    const handler = chain.on.mock.calls[0][2] as (payload: {
      new: Record<string, unknown>;
    }) => void;
    handler({ new: { id: 'item-1', status: 'given' } });
  }

  it('does not send SMS at t+10 when acknowledged at t+5', async () => {
    // t+0..t+5: SMS not yet due — cron finds nothing
    alertRepo.findSmsDueAlerts.mockResolvedValueOnce([]);
    await smsService.runTick();
    expect(twilio.sendSms).not.toHaveBeenCalled();

    // t+5: carer marks Given on any device — Realtime cancels open alert
    ackAtT5();
    await vi.waitFor(() =>
      expect(alertRepo.cancelOpenAlert).toHaveBeenCalledWith(
        'item-1',
        'marked_given',
      ),
    );

    // t+10: SMS cron — cancelled alert excluded from query
    await smsService.runTick();
    expect(twilio.sendSms).not.toHaveBeenCalled();
    expect(alertRepo.markSmsSent).not.toHaveBeenCalled();
  });

  it('sends SMS at t+10 when alert was not acknowledged', async () => {
    await smsService.runTick();

    expect(alertRepo.cancelOpenAlert).not.toHaveBeenCalled();
    expect(twilio.sendSms).toHaveBeenCalledWith(
      '+447700900123',
      dueAlert.sms_body,
    );
    expect(alertRepo.markSmsSent).toHaveBeenCalled();
  });
});
