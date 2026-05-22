import type { ChecklistDoseStatus, ChecklistItem } from './checklist';
import { compareTimes } from './time';

export interface ChecklistStatusInput {
  id: string;
  medication_id: string;
  status: string;
  scheduled_time: string | null;
  given_at?: string | null;
  skip_reason?: string | null;
}

export function resolveDisplayStatus(
  item: ChecklistStatusInput,
  now: Date,
  checklistDate: string,
): ChecklistDoseStatus {
  if (item.status === 'given' || item.given_at) return 'given';
  if (item.status === 'skipped' || item.skip_reason) return 'skipped';

  if (!item.scheduled_time) {
    throw new Error(`Checklist item ${item.id} is missing scheduled_time.`);
  }

  const scheduledAt = new Date(`${checklistDate}T${item.scheduled_time}:00`);
  return now > scheduledAt ? 'overdue' : 'due';
}

export function withDisplayStatus(
  item: ChecklistItem,
  checklistDate: string,
  now = new Date(),
): ChecklistItem {
  return {
    ...item,
    status: resolveDisplayStatus(
      {
        id: item.id,
        medication_id: item.medication_id,
        status: item.status,
        scheduled_time: item.scheduled_time,
        given_at: item.given_at,
        skip_reason: item.skip_reason,
      },
      now,
      checklistDate,
    ),
  };
}

export function computeOverdueDuration(
  scheduledTime: string,
  checklistDate: string,
  now: Date,
): { hours: number; minutes: number } {
  const scheduledAt = new Date(`${checklistDate}T${scheduledTime}:00`);
  const diffMs = Math.max(0, now.getTime() - scheduledAt.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  return {
    hours: Math.min(48, Math.floor(totalMinutes / 60)),
    minutes: Math.min(59, totalMinutes % 60),
  };
}

export function sortChecklistItemsByScheduledTime(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => compareTimes(a.scheduled_time, b.scheduled_time));
}
