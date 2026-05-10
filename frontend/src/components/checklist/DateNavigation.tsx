import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface DateNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function DateNavigation({ selectedDate, onDateChange }: DateNavigationProps) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Generate last 7 days including today
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  function goToPrev() {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    if (prev >= sevenDaysAgo) onDateChange(prev);
  }

  function goToNext() {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    if (next <= today) onDateChange(next);
  }

  return (
    <div className="mb-6">
      {/* Arrow navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goToPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg border"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ChevronLeft size={16} strokeWidth={1.9} />
        </button>

        <div className="text-center">
          <p
            className="text-sm font-extrabold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {isToday ? 'Today' : formatDate(selectedDate.toISOString())}
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
          onClick={goToNext}
          disabled={isToday}
          className="flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ChevronRight size={16} strokeWidth={1.9} />
        </button>
      </div>

      {/* 7-day pill strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map(day => {
          const isSelected = day.toDateString() === selectedDate.toDateString();
          const isDayToday = day.toDateString() === new Date().toDateString();

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateChange(day)}
              className="flex flex-col items-center rounded-xl px-3 py-2 text-xs font-bold shrink-0"
              style={{
                backgroundColor: isSelected
                  ? 'var(--color-primary)'
                  : 'var(--color-accent-soft)',
                color: isSelected
                  ? '#ffffff'
                  : isDayToday
                  ? 'var(--color-primary)'
                  : 'var(--color-text-secondary)',
                border: isDayToday && !isSelected
                  ? '1px solid var(--color-primary)'
                  : '1px solid transparent',
                minWidth: '44px',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 600 }}>
                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
              <span className="mt-0.5 text-sm font-extrabold">
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}