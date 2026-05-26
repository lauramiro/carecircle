import { describe, expect, it } from 'vitest';
import { INTERVAL_OPTIONS } from '../api/medications/medications.types';
import { formatMedicationSchedule, getSchedulePreview } from './formatMedicationSchedule';
import type { MedicationFormValues } from '../hooks/medications/useMedicationForm';

describe('formatMedicationSchedule', () => {
  it('formats daily interval schedules including 1–3 hour options', () => {
    for (const { value, label } of INTERVAL_OPTIONS.slice(0, 3)) {
      expect(
        formatMedicationSchedule({
          scheduleType: 'daily',
          specificTimes: ['08:00'],
          intervalHours: value,
          daysOfWeek: null,
          dayOfMonth: null,
        }),
      ).toBe(`Every ${value}h from 08:00`);
      expect(label).toMatch(new RegExp(`Every ${value} hour`));
    }
  });

  it('formats weekly schedules with day labels', () => {
    expect(
      formatMedicationSchedule({
        scheduleType: 'weekly',
        specificTimes: ['08:00'],
        intervalHours: null,
        daysOfWeek: [1, 3],
        dayOfMonth: null,
      }),
    ).toBe('Mon, Wed at 08:00');
  });

  it('returns as_needed label without times', () => {
    expect(
      formatMedicationSchedule({
        scheduleType: 'as_needed',
        specificTimes: null,
        intervalHours: null,
        daysOfWeek: null,
        dayOfMonth: null,
      }),
    ).toBe('As needed');
  });
});

describe('getSchedulePreview', () => {
  it('builds preview text from form values for interval daily mode', () => {
    const values = {
      scheduleType: 'daily',
      dailyMode: 'interval',
      intervalHours: 2,
      intervalStartTime: '06:00',
      specificTimes: [],
      daysOfWeek: [],
      dayOfMonth: '',
    } as unknown as MedicationFormValues;

    expect(getSchedulePreview(values)).toBe('Every 2h from 06:00');
  });
});
