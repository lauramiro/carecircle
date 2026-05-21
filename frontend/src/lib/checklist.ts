import type { ChecklistItemRow } from './supabaseTables';

export type ChecklistDoseStatus = 'due' | 'given' | 'overdue' | 'skipped';

export interface TimeWindow {
  time_of_day: string;
  window_start: string;
  window_end: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id?: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  dosage_unit: string;
  dose?: number | null;
  scheduled_time: string;
  time_window: TimeWindow;
  status: ChecklistDoseStatus;
  given_at?: string | null;
  given_by_carer_id?: string | null;
  given_by_user_id?: string | null;
  given_notes?: string | null;
  overdue_hours?: number | null;
  overdue_minutes?: number | null;
  skip_reason?: string | null;
  skip_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistSummary {
  total: number;
  due: number;
  given: number;
  overdue: number;
  skipped: number;
  remaining: number;
}

export function summarizeChecklist(items: ChecklistItem[]): ChecklistSummary {
  const due = items.filter((i) => i.status === 'due').length;
  const given = items.filter((i) => i.status === 'given').length;
  const overdue = items.filter((i) => i.status === 'overdue').length;
  const skipped = items.filter((i) => i.status === 'skipped').length;

  return {
    total: items.length,
    due,
    given,
    overdue,
    skipped,
    remaining: due + overdue,
  };
}

export function rowToChecklistItem(row: ChecklistItemRow): ChecklistItem {
  const scheduledTime = row.scheduled_time;
  if (!scheduledTime) {
    throw new Error(`Checklist item ${row.id} is missing scheduled_time.`);
  }

  const windowStart = row.window_start ?? scheduledTime;
  const windowEnd = row.window_end ?? scheduledTime;

  return {
    id: row.id,
    checklist_id: row.checklist_id,
    medication_id: row.medication_id,
    medication_name: row.medication_name ?? 'Unknown medication',
    dosage: row.dose != null ? String(row.dose) : '',
    dosage_unit: row.dosage_unit ?? 'mg',
    dose: row.dose,
    scheduled_time: scheduledTime,
    time_window: {
      time_of_day: scheduledTime,
      window_start: windowStart,
      window_end: windowEnd,
    },
    status: row.status as ChecklistDoseStatus,
    given_at: row.given_at,
    given_by_carer_id: row.given_by_carer_id,
    given_by_user_id: row.given_by_user_id,
    given_notes: row.given_notes,
    overdue_hours: row.overdue_hours,
    overdue_minutes: row.overdue_minutes,
    skip_reason: row.skip_reason,
    skip_notes: row.skip_notes,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}
