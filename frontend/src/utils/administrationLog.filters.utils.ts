import type { AdministrationLogEvent, AdministrationLogStatus } from '../api/administrationLog/administrationLog.types';

export interface AdministrationLogFiltersState {
  /** When empty, no status filter (show all). */
  statuses: AdministrationLogStatus[];
  carerName: string;
  medicationName: string;
  /** Inclusive local calendar dates as `yyyy-MM-dd`, or null if open-ended */
  dateFrom: string | null;
  dateTo: string | null;
}

export const defaultAdministrationLogFilters = (): AdministrationLogFiltersState => ({
  statuses: [],
  carerName: '',
  medicationName: '',
  dateFrom: null,
  dateTo: null,
});

function toLocalYmd(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function filterAdministrationLogEvents(
  events: AdministrationLogEvent[],
  filters: AdministrationLogFiltersState,
): AdministrationLogEvent[] {
  return events.filter((ev) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(ev.status)) {
      return false;
    }
    if (filters.carerName && ev.carerName !== filters.carerName) {
      return false;
    }
    if (filters.medicationName && ev.medicationName !== filters.medicationName) {
      return false;
    }
    const ymd = toLocalYmd(ev.occurredAtIso);
    if (filters.dateFrom && ymd < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && ymd > filters.dateTo) {
      return false;
    }
    return true;
  });
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
}

export function countActiveFilterFields(filters: AdministrationLogFiltersState): number {
  let n = 0;
  if (filters.statuses.length > 0) n++;
  if (filters.carerName) n++;
  if (filters.medicationName) n++;
  if (filters.dateFrom) n++;
  if (filters.dateTo) n++;
  return n;
}
