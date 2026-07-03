import type { AdministrationLogEvent, AdministrationLogStatus } from '../api/administrationLog/administrationLog.types';

/** Dose + unit only (medication name is shown separately in the log). */
export function formatMedicationDoseLine(medication: {
  medication_name?: string | null;
  name?: string | null;
  dose?: number | string | null;
  dosage?: string | null;
  unit?: string | null;
  dosage_unit?: string | null;
}): string {
  const dose =
    medication.dose != null && String(medication.dose).trim() !== ''
      ? String(medication.dose)
      : medication.dosage != null && String(medication.dosage).trim() !== ''
        ? String(medication.dosage)
        : '';
  const unit = (medication.unit ?? medication.dosage_unit ?? '').toString();
  const core = [dose, unit].filter(Boolean).join(' ');
  return core || '—';
}

export function medicationDisplayName(medication: {
  medication_name?: string | null;
  name?: string | null;
}): string {
  return (medication.medication_name ?? medication.name ?? '').trim() || 'Medication';
}

export function formatDoseDisplay(medication: {
  medication_name?: string | null;
  name?: string | null;
  dose?: number | string | null;
  dosage?: string | null;
  unit?: string | null;
  dosage_unit?: string | null;
}): string {
  return formatMedicationDoseLine(medication);
}

export function administrationLogStatusLabel(status: AdministrationLogStatus): string {
  switch (status) {
    case 'given':
      return 'Given';
    case 'skipped':
      return 'Skipped';
    case 'overdue':
      return 'Overdue';
    default:
      return status;
  }
}

export function formatAdministrationLogScheduledTime(label?: string): string {
  return label?.trim() ? label.trim() : '—';
}

function wasGivenLate(event: AdministrationLogEvent): boolean {
  return (
    event.status === 'given' &&
    (event.overdueHours != null || event.overdueMinutes != null)
  );
}

/** Status label shown in the log table, including on-time vs late for given doses. */
export function administrationLogDisplayStatusLabel(event: AdministrationLogEvent): string {
  if (event.status === 'given') {
    if (wasGivenLate(event)) {
      return `Given (${event.overdueHours ?? 0}h ${event.overdueMinutes ?? 0}m late)`;
    }
    return 'Given (on time)';
  }
  return administrationLogStatusLabel(event.status);
}

/** Map legacy medication_logs statuses to administration log statuses. */
export function normalizeAdministrationLogStatus(status: string): AdministrationLogStatus | null {
  switch (status) {
    case 'given':
    case 'taken':
      return 'given';
    case 'skipped':
      return 'skipped';
    case 'overdue':
    case 'missed':
      return 'overdue';
    default:
      return null;
  }
}

function eventCalendarDay(event: AdministrationLogEvent): string {
  return event.checklistDate ?? event.occurredAtIso.slice(0, 10);
}

/** Key for collapsing checklist_items and medication_logs rows for the same dose. */
export function buildAdministrationLogDedupKey(event: AdministrationLogEvent): string {
  const med = event.medicationName.trim().toLowerCase();
  const scheduled = (event.scheduledTimeLabel ?? '').trim().toLowerCase();
  return `${eventCalendarDay(event)}|${med}|${scheduled}|${event.status}`;
}

/**
 * Prefer checklist-backed rows when the same dose also appears in medication_logs.
 */
export function deduplicateAdministrationLogEvents(
  events: AdministrationLogEvent[],
): AdministrationLogEvent[] {
  const byKey = new Map<string, AdministrationLogEvent>();

  for (const event of events) {
    const key = buildAdministrationLogDedupKey(event);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, event);
      continue;
    }
    if (existing.source === 'medication_log' && event.source === 'checklist_item') {
      byKey.set(key, event);
    }
  }

  return sortAdministrationLogEvents([...byKey.values()]);
}


/** Reverse-chronological (newest first). */
export function sortAdministrationLogEvents(events: AdministrationLogEvent[]): AdministrationLogEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.occurredAtIso).getTime() - new Date(a.occurredAtIso).getTime(),
  );
}
