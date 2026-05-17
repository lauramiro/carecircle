import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PendingSmsRegistry } from './pending-sms.registry';

describe('PendingSmsRegistry', () => {
  let registry: PendingSmsRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = new PendingSmsRegistry();
  });

  afterEach(() => {
    registry.clearAll('shutdown');
    vi.useRealTimers();
  });

  it('runs callback after delay', async () => {
    const fn = vi.fn();
    registry.schedule('a1', 60_000, fn);
    expect(registry.hasPending('a1')).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fn).toHaveBeenCalledOnce();
    expect(registry.hasPending('a1')).toBe(false);
  });

  it('cancel prevents callback', async () => {
    const fn = vi.fn();
    registry.schedule('a1', 60_000, fn);
    registry.cancel('a1', 'acknowledged');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fn).not.toHaveBeenCalled();
    expect(registry.hasPending('a1')).toBe(false);
  });

  it('re-scheduling replaces previous timer', async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    registry.schedule('a1', 10_000, fn1);
    registry.schedule('a1', 20_000, fn2);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledOnce();
  });
});
