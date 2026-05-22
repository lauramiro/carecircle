import {
  DAY_LABELS,
  SCHEDULE_TYPE_LABELS,
} from '@api/medications/medications.types';
import type { Medication, ScheduleType } from '@api/medications/medications.types';
import type { MedicationFormValues } from '@hooks/medications/useMedicationForm';
import { computeDoseTimesForDate, normalizeDayOfWeek } from '@lib/medicationSchedule';

type SchedulePreviewSource = Pick<
  Medication,
  'scheduleType' | 'specificTimes' | 'intervalHours' | 'daysOfWeek' | 'dayOfMonth'
>;

function schedulePreviewFromForm(values: MedicationFormValues): SchedulePreviewSource {
  const isInterval = values.dailyMode === 'interval';
  const times = isInterval
    ? values.intervalStartTime
      ? [values.intervalStartTime]
      : []
    : values.specificTimes.filter(Boolean);

  return {
    scheduleType: values.scheduleType as ScheduleType,
    specificTimes: times.length ? times : null,
    intervalHours:
      isInterval && values.intervalHours !== '' ? (values.intervalHours as number) : null,
    daysOfWeek: values.daysOfWeek.length ? values.daysOfWeek : null,
    dayOfMonth: values.dayOfMonth !== '' ? (values.dayOfMonth as number) : null,
  };
}

export function getSchedulePreview(values: MedicationFormValues): string {
  if (!values.scheduleType) return '';
  return formatMedicationSchedule(schedulePreviewFromForm(values));
}

export function getMedicationTimesToday(med: Medication): string[] {
  return computeDoseTimesForDate(med, new Date());
}

export function formatMedicationSchedule(med: SchedulePreviewSource): string {
  if (!med.scheduleType) return '';

  const label = SCHEDULE_TYPE_LABELS[med.scheduleType];
  if (med.scheduleType === 'as_needed') return label;

  if (med.scheduleType === 'daily' && med.intervalHours) {
    const start = med.specificTimes?.[0] ?? '';
    return `Every ${med.intervalHours}h${start ? ` from ${start}` : ''}`;
  }

  if (med.scheduleType === 'weekly' && med.daysOfWeek?.length) {
    const days = med.daysOfWeek.map((d) => DAY_LABELS[normalizeDayOfWeek(d)]).join(', ');
    const times = med.specificTimes?.join(', ') ?? '';
    return `${days}${times ? ` at ${times}` : ''}`;
  }

  if (med.scheduleType === 'monthly' && med.dayOfMonth) {
    const times = med.specificTimes?.join(', ') ?? '';
    return `Day ${med.dayOfMonth}${times ? ` at ${times}` : ''}`;
  }

  const times = med.specificTimes?.join(', ') ?? '';
  return times ? `${label} at ${times}` : label;
}
