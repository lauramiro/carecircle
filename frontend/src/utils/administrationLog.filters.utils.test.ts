import { describe, expect, it } from 'vitest';
import {
  defaultAdministrationLogFilters,
  filterAdministrationLogEvents,
  countActiveFilterFields,
} from './administrationLog.filters.utils';
import type { AdministrationLogEvent } from '../api/administrationLog/administrationLog.types';

const base = (over: Partial<AdministrationLogEvent>): AdministrationLogEvent => ({
  id: 'x',
  source: 'checklist_item',
  occurredAtIso: '2025-03-15T12:00:00.000Z',
  status: 'given',
  medicationName: 'Med A',
  doseDisplay: '1 mg',
  carerName: 'Sam',
  photoThumbnailUrl: null,
  photoFullUrl: null,
  ...over,
});

describe('administrationLog.filters.utils', () => {
  it('filterAdministrationLogEvents applies status, carer, medication, and date range', () => {
    const events = [
      base({ id: '1', status: 'given', carerName: 'Sam', medicationName: 'A', occurredAtIso: '2025-03-10T10:00:00.000Z' }),
      base({ id: '2', status: 'skipped', carerName: 'Jo', medicationName: 'B', occurredAtIso: '2025-03-20T10:00:00.000Z' }),
    ];

    const f = defaultAdministrationLogFilters();
    f.statuses = ['given'];
    expect(filterAdministrationLogEvents(events, f).map((e) => e.id)).toEqual(['1']);

    const f2 = defaultAdministrationLogFilters();
    f2.carerName = 'Jo';
    expect(filterAdministrationLogEvents(events, f2).map((e) => e.id)).toEqual(['2']);

    const f3 = defaultAdministrationLogFilters();
    f3.dateFrom = '2025-03-15';
    f3.dateTo = '2025-03-25';
    expect(filterAdministrationLogEvents(events, f3).map((e) => e.id)).toEqual(['2']);
  });

  it('countActiveFilterFields counts non-default selections', () => {
    const f = defaultAdministrationLogFilters();
    expect(countActiveFilterFields(f)).toBe(0);
    f.statuses = ['given'];
    f.carerName = 'X';
    f.dateFrom = '2025-01-01';
    expect(countActiveFilterFields(f)).toBe(3);
  });
});
