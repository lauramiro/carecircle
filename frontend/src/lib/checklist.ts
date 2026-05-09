export type MedicationStatus = 'due' | 'given' | 'overdue' | 'skipped';

export interface TimeWindow {
  time_of_day: string;
  window_start: string;
  window_end: string;
}

export interface ChecklistItem {
  id: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  dosage_unit: string;
  time_window: TimeWindow;
  status: MedicationStatus;
  given_at?: string | null;
  given_by_user_id?: string | null;
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
  return {
    total: items.length,
    due: items.filter(i => i.status === 'due').length,
    given: items.filter(i => i.status === 'given').length,
    overdue: items.filter(i => i.status === 'overdue').length,
    skipped: items.filter(i => i.status === 'skipped').length,
    remaining: items.filter(i => i.status === 'due' || i.status === 'overdue').length,
  };
}