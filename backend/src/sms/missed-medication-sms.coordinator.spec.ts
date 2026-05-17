import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MissedMedicationSmsCoordinator } from './missed-medication-sms.coordinator';
import { PendingSmsRegistry } from './pending-sms.registry';

const payload = {
  checklistItemId: 'item-1',
  groupId: 'group-1',
  medicationName: 'Aspirin',
  doseSummary: '81mg',
  minutesOverdue: 15,
};

describe('MissedMedicationSmsCoordinator', () => {
  let registry: PendingSmsRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = new PendingSmsRegistry();
  });

  afterEach(() => {
    registry.clearAll('shutdown');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sends one SMS per recipient after 10 minutes', async () => {
    const sendSms = vi.fn().mockResolvedValue({ sid: 'SMxxx' });
    const twilio = { isConfigured: () => true, sendSms };
    const supabase = {
      isEnabled: () => true,
      listSmsRecipientPhonesForGroup: vi
        .fn()
        .mockResolvedValue(['+441111111111', '+442222222222']),
      getPatientSmsSalutation: vi.fn().mockResolvedValue('Alex'),
    };
    const coord = new MissedMedicationSmsCoordinator(
      registry,
      twilio as never,
      supabase as never,
    );

    coord.scheduleAfterPushDispatched(payload);
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(sendSms).toHaveBeenCalledTimes(2);
    expect(sendSms.mock.calls[0][1]).toContain('Alex:');
    expect(sendSms.mock.calls[0][1]).toContain('Aspirin');
    expect(sendSms.mock.calls[0][1]).toContain('81mg');
    expect(sendSms.mock.calls[0][1]).toContain('15 min overdue');
  });

  it('logs and continues when Twilio returns an error for one recipient', async () => {
    const sendSms = vi
      .fn()
      .mockResolvedValueOnce({ error: 'twilio_send_failed' })
      .mockResolvedValueOnce({ sid: 'SMok' });
    const twilio = { isConfigured: () => true, sendSms };
    const supabase = {
      isEnabled: () => true,
      listSmsRecipientPhonesForGroup: vi.fn().mockResolvedValue(['+441111111111', '+442222222222']),
      getPatientSmsSalutation: vi.fn().mockResolvedValue('Alex'),
    };
    const coord = new MissedMedicationSmsCoordinator(
      registry,
      twilio as never,
      supabase as never,
    );

    coord.scheduleAfterPushDispatched(payload);
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(sendSms).toHaveBeenCalledTimes(2);
  });
});
