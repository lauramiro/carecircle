import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ChecklistMaterializationCron,
  OverdueDetectionCron,
  SmsDispatchCron,
} from './cron.jobs';

describe('ChecklistMaterializationCron', () => {
  const materialization = { extendPendingSchedules: vi.fn() };
  const appConfig = { cronsEnabled: true };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runEverySixHours extends pending schedules when crons are enabled', async () => {
    const cron = new ChecklistMaterializationCron(materialization as never, appConfig as never);
    await cron.runEverySixHours();
    expect(materialization.extendPendingSchedules).toHaveBeenCalledWith(50);
  });

  it('runHorizonCheck extends pending schedules with a smaller batch', async () => {
    const cron = new ChecklistMaterializationCron(materialization as never, appConfig as never);
    await cron.runHorizonCheck();
    expect(materialization.extendPendingSchedules).toHaveBeenCalledWith(20);
  });

  it('does nothing when crons are disabled', async () => {
    const cron = new ChecklistMaterializationCron(materialization as never, {
      cronsEnabled: false,
    } as never);
    await cron.runEverySixHours();
    expect(materialization.extendPendingSchedules).not.toHaveBeenCalled();
  });
});

describe('OverdueDetectionCron', () => {
  it('runEveryMinute calls overdue detection tick', async () => {
    const overdueDetection = { runTick: vi.fn() };
    const cron = new OverdueDetectionCron(overdueDetection as never, { cronsEnabled: true } as never);
    await cron.runEveryMinute();
    expect(overdueDetection.runTick).toHaveBeenCalledOnce();
  });
});

describe('SmsDispatchCron', () => {
  it('runEveryMinute calls SMS dispatch tick', async () => {
    const smsDispatch = { runTick: vi.fn() };
    const cron = new SmsDispatchCron(smsDispatch as never, { cronsEnabled: true } as never);
    await cron.runEveryMinute();
    expect(smsDispatch.runTick).toHaveBeenCalledOnce();
  });
});
