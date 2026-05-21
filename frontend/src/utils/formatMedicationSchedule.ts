import {
  DAY_LABELS,
  SCHEDULE_TYPE_LABELS,
} from '../api/medications/medications.types';
import type { Medication } from '../api/medications/medications.types';
import type { MedicationFormValues } from '../hooks/medications/useMedicationForm';

export function getSchedulePreview(values: MedicationFormValues): string {
  if (!values.scheduleType) return '';
  const isInterval = values.dailyMode === 'interval';
  const times = isInterval
    ? values.intervalStartTime ? [values.intervalStartTime] : []
    : values.specificTimes.filter(Boolean);
  const pseudo = {
    scheduleType: values.scheduleType,
    specificTimes: times.length ? times : null,
    intervalHours: isInterval && values.intervalHours !== '' ? (values.intervalHours as number) : null,
    daysOfWeek: values.daysOfWeek.length ? values.daysOfWeek : null,
    dayOfMonth: values.dayOfMonth !== '' ? (values.dayOfMonth as number) : null,
  } as unknown as Medication;
  return formatMedicationSchedule(pseudo);
}

export function getMedicationTimesToday(med: Medication): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();

  if (med.scheduleType === 'as_needed' || !med.scheduleType) return [];

  if (med.scheduleType === 'daily') {
    if (med.intervalHours) {
      const start = med.specificTimes?.[0] ?? '08:00';
      const [h, m] = start.split(':').map(Number);
      const times: string[] = [];
      let minutes = h * 60 + m;
      while (minutes < 24 * 60) {
        const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
        const mm = String(minutes % 60).padStart(2, '0');
        times.push(`${hh}:${mm}`);
        minutes += med.intervalHours * 60;
      }
      return times;
    }
    return med.specificTimes ?? [];
  }

  if (med.scheduleType === 'weekly') {
    return (med.daysOfWeek ?? []).includes(dayOfWeek) ? (med.specificTimes ?? []) : [];
  }

  if (med.scheduleType === 'biweekly') {
    const start = new Date(med.startDate);
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - start.getTime()) / 86400000);
    return diffDays >= 0 && diffDays % 14 === 0 ? (med.specificTimes ?? []) : [];
  }

  if (med.scheduleType === 'monthly') {
    return today.getDate() === med.dayOfMonth ? (med.specificTimes ?? []) : [];
  }

  return med.specificTimes ?? [];
}

export function formatMedicationSchedule(med: Medication): string {
  if (!med.scheduleType) return '';

  const label = SCHEDULE_TYPE_LABELS[med.scheduleType];
  if (med.scheduleType === 'as_needed') return label;

  if (med.scheduleType === 'daily' && med.intervalHours) {
    const start = med.specificTimes?.[0] ?? '';
    return `Every ${med.intervalHours}h${start ? ` from ${start}` : ''}`;
  }
  if (med.scheduleType === 'weekly' && med.daysOfWeek?.length) {
    const days = med.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ');
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
