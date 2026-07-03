export type AdministrationLogStatus = 'given' | 'skipped' | 'overdue';

export type AdministrationLogSource = 'checklist_item' | 'medication_log';

/** Normalised row for the medication administration log (US-08 / CC-94). */
export interface AdministrationLogEvent {
  id: string;
  source: AdministrationLogSource;
  /** ISO timestamp used for sorting (local display derived in the UI). */
  occurredAtIso: string;
  status: AdministrationLogStatus;
  medicationName: string;
  doseDisplay: string;
  carerName: string;
  checklistDate?: string;
  scheduledTimeLabel?: string;
  overdueHours?: number | null;
  overdueMinutes?: number | null;
  notes?: string | null;
  photoThumbnailUrl: string | null;
  photoFullUrl: string | null;
}
