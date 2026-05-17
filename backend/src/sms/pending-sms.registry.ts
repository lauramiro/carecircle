import { Injectable, Logger } from '@nestjs/common';

export type PendingSmsCancelReason = 'acknowledged' | 'shutdown' | 'replaced';

/**
 * In-process scheduler for “send SMS after delay” jobs. A single Nest instance only (CC-101/CC-102).
 */
@Injectable()
export class PendingSmsRegistry {
  private readonly logger = new Logger(PendingSmsRegistry.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();

  schedule(checklistItemId: string, delayMs: number, run: () => void): void {
    this.cancel(checklistItemId, 'replaced');
    const t = setTimeout(() => {
      this.timers.delete(checklistItemId);
      run();
    }, delayMs);
    this.timers.set(checklistItemId, t);
    this.logger.log(`pending_sms_scheduled checklistItemId=${checklistItemId} delayMs=${delayMs}`);
  }

  cancel(checklistItemId: string, reason: PendingSmsCancelReason): void {
    const t = this.timers.get(checklistItemId);
    if (!t) return;
    clearTimeout(t);
    this.timers.delete(checklistItemId);
    this.logger.log(
      `pending_sms_cancelled checklistItemId=${checklistItemId} reason=${reason} at=${new Date().toISOString()}`,
    );
  }

  hasPending(checklistItemId: string): boolean {
    return this.timers.has(checklistItemId);
  }

  /** Clears all timers (tests / shutdown). */
  clearAll(reason: PendingSmsCancelReason = 'shutdown'): void {
    for (const [id, t] of this.timers) {
      clearTimeout(t);
      this.logger.log(`pending_sms_cancelled checklistItemId=${id} reason=${reason}`);
    }
    this.timers.clear();
  }
}
