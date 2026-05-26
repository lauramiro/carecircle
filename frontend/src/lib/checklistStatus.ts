import type { ChecklistItem } from './checklist';
import { compareTimes } from './time';

/** Duration since backend set overdue_at (for late-given modal prefill only). */
export function overdueDurationSince(
  overdueAt: string | null | undefined,
  now: Date = new Date(),
): { hours: number; minutes: number } {
  if (!overdueAt) {
    return { hours: 0, minutes: 0 };
  }

  const diffMs = Math.max(0, now.getTime() - new Date(overdueAt).getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  return {
    hours: Math.min(48, Math.floor(totalMinutes / 60)),
    minutes: Math.min(59, totalMinutes % 60),
  };
}

export function sortChecklistItemsByScheduledTime(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => compareTimes(a.scheduled_time, b.scheduled_time));
}
