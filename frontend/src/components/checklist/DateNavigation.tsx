import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface DateNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DateNavigation({ selectedDate, onDateChange }: DateNavigationProps) {
  const today = startOfDay(new Date());
  const selected = startOfDay(selectedDate);
  const isToday = selected.getTime() === today.getTime();

  // Window ends on selected date (or today if selected is in the future — clamped below)
  const windowEnd = selected > today ? today : selected;
  const windowStart = addDays(windowEnd, -6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(windowStart, i));

  function goToPrevWindow() {
    onDateChange(addDays(selected, -7));
  }

  function goToNextWindow() {
    const next = addDays(selected, 7);
    onDateChange(next > today ? today : next);
  }

  const canGoNext = addDays(windowEnd, 7) <= today;

  return (
    <div className="mb-6 flex justify-center">
      <div className="inline-flex flex-col items-center">
        <div className="mb-3 flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={goToPrevWindow}
            aria-label="Previous week"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <ChevronLeft size={16} strokeWidth={1.9} />
          </button>

          <div className="flex-1 text-center px-1">
            <p className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              {isToday ? 'Today' : formatDate(selected.toISOString())}
            </p>
            {!isToday && (
              <button
                type="button"
                onClick={() => onDateChange(new Date())}
                className="mt-0.5 text-xs font-bold"
                style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Back to today
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={goToNextWindow}
            disabled={!canGoNext && isToday}
            aria-label="Next week"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border disabled:opacity-40"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <ChevronRight size={16} strokeWidth={1.9} />
          </button>
        </div>

        <div className="max-w-full overflow-x-auto pb-1">
          <div className="mx-auto flex w-max gap-1.5">
        {days.map((day) => {
          const isSelected = toDateString(day) === toDateString(selected);
          const isDayToday = toDateString(day) === toDateString(today);

          return (
            <button
              key={toDateString(day)}
              type="button"
              onClick={() => onDateChange(day)}
              className="flex flex-col items-center rounded-xl px-3 py-2 text-xs font-bold shrink-0"
              style={{
                backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-accent-soft)',
                color: isSelected ? '#ffffff' : isDayToday ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                border: isDayToday && !isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                minWidth: '44px',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 600 }}>
                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
              <span className="mt-0.5 text-sm font-extrabold">{day.getDate()}</span>
            </button>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
}
