import { useState } from 'react';
import {
  DAY_LABELS,
  INTERVAL_OPTIONS,
  SCHEDULE_TYPE_LABELS,
  SCHEDULE_TYPES,
  WEEKDAYS,
} from '../../api/medications/medications.types';
import type { ScheduleType } from '../../api/medications/medications.types';
import type { CourseDurationMode, DailyMode, MedicationFormErrors, MedicationFormValues } from '../../hooks/medications/useMedicationForm';
import { medicationFieldClassName, medicationFieldStyle } from './medicationFieldStyles';

interface Props {
  formId: string;
  values: MedicationFormValues;
  errors: MedicationFormErrors;
  setScheduleType: (type: ScheduleType) => void;
  setCourseDurationMode: (mode: CourseDurationMode) => void;
  setDailyMode: (mode: DailyMode) => void;
  updateField: <K extends keyof MedicationFormValues>(name: K, value: MedicationFormValues[K]) => void;
  setSpecificTime: (index: number, time: string) => void;
  addSpecificTime: (time?: string) => void;
  removeSpecificTime: (index: number) => void;
  toggleDayOfWeek: (day: number) => void;
  touchField: (name: keyof MedicationFormErrors) => void;
}

const TIME_PRESETS = [
  { label: 'Morning', time: '08:00' },
  { label: 'Lunch',   time: '12:00' },
  { label: 'Evening', time: '18:00' },
  { label: 'Bedtime', time: '21:00' },
] as const;

const pillBase = 'rounded-lg border px-3 py-2 text-sm font-bold cursor-pointer select-none transition-colors';

export default function MedicationScheduleFields({
  formId,
  values,
  errors,
  setScheduleType,
  setCourseDurationMode,
  setDailyMode,
  updateField,
  setSpecificTime: _setSpecificTime,
  addSpecificTime,
  removeSpecificTime,
  toggleDayOfWeek,
  touchField,
}: Props) {
  const fieldStyle = medicationFieldStyle;

  const activePill: React.CSSProperties = {
    borderColor: 'var(--color-primary)',
    backgroundColor: 'var(--color-primary-light, #eff6ff)',
    color: 'var(--color-primary)',
  };

  const inactivePill = (hasError: boolean): React.CSSProperties => ({
    borderColor: hasError ? 'var(--color-status-critical)' : 'var(--color-border)',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-text-primary)',
  });

  return (
    <div className="space-y-4">
      {/* Schedule type */}
      <div>
        <p
          id={`${formId}-schedule-label`}
          className="text-xs font-bold"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Schedule <span style={{ color: 'var(--color-status-critical)' }}>*</span>
        </p>
        <div
          className="mt-2 flex flex-wrap gap-2"
          role="radiogroup"
          aria-labelledby={`${formId}-schedule-label`}
          aria-describedby={errors.scheduleType ? `${formId}-schedule-error` : undefined}
        >
          {SCHEDULE_TYPES.map((type) => {
            const selected = values.scheduleType === type;
            return (
              <label
                key={type}
                className={pillBase}
                style={selected ? activePill : inactivePill(Boolean(errors.scheduleType))}
              >
                <input
                  type="radio"
                  name={`${formId}-schedule-type`}
                  value={type}
                  checked={selected}
                  onChange={() => setScheduleType(type)}
                  className="sr-only"
                />
                {SCHEDULE_TYPE_LABELS[type]}
              </label>
            );
          })}
        </div>
        {errors.scheduleType && (
          <p
            id={`${formId}-schedule-error`}
            className="mt-1 text-xs"
            style={{ color: 'var(--color-status-critical)' }}
          >
            {errors.scheduleType}
          </p>
        )}
      </div>

      {/* Daily */}
      {values.scheduleType === 'daily' && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
          {/* Daily mode */}
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              How to schedule <span style={{ color: 'var(--color-status-critical)' }}>*</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['specific_times', 'interval'] as DailyMode[]).map((mode) => {
                const selected = values.dailyMode === mode;
                return (
                  <label
                    key={mode}
                    className={pillBase}
                    style={selected ? activePill : inactivePill(Boolean(errors.dailyMode))}
                  >
                    <input
                      type="radio"
                      name={`${formId}-daily-mode`}
                      value={mode}
                      checked={selected}
                      onChange={() => setDailyMode(mode)}
                      className="sr-only"
                    />
                    {mode === 'specific_times' ? 'At specific times' : 'Every few hours'}
                  </label>
                );
              })}
            </div>
            {errors.dailyMode && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-status-critical)' }}>
                {errors.dailyMode}
              </p>
            )}
          </div>

          {/* Specific times */}
          {values.dailyMode === 'specific_times' && (
            <TimeList
              formId={formId}
              times={values.specificTimes}
              error={errors.specificTimes}
              addTime={addSpecificTime}
              removeTime={removeSpecificTime}
            />
          )}

          {/* Interval */}
          {values.dailyMode === 'interval' && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor={`${formId}-interval-hours`}
                  className="text-xs font-bold"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Repeat every <span style={{ color: 'var(--color-status-critical)' }}>*</span>
                </label>
                <select
                  id={`${formId}-interval-hours`}
                  value={values.intervalHours === '' ? '' : String(values.intervalHours)}
                  onChange={(e) =>
                    updateField('intervalHours', e.target.value === '' ? '' : Number(e.target.value))
                  }
                  onBlur={() => touchField('intervalHours')}
                  aria-invalid={Boolean(errors.intervalHours)}
                  className={`${medicationFieldClassName}`}
                  style={fieldStyle(Boolean(errors.intervalHours))}
                >
                  <option value="">Select interval</option>
                  {INTERVAL_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.intervalHours && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-status-critical)' }}>
                    {errors.intervalHours}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`${formId}-interval-start`}
                  className="text-xs font-bold"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Starting at <span style={{ color: 'var(--color-status-critical)' }}>*</span>
                </label>
                <input
                  id={`${formId}-interval-start`}
                  type="time"
                  value={values.intervalStartTime}
                  onChange={(e) => updateField('intervalStartTime', e.target.value)}
                  onBlur={() => touchField('intervalStartTime')}
                  aria-invalid={Boolean(errors.intervalStartTime)}
                  className={`${medicationFieldClassName}`}
                  style={fieldStyle(Boolean(errors.intervalStartTime))}
                />
                {errors.intervalStartTime && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-status-critical)' }}>
                    {errors.intervalStartTime}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly */}
      {values.scheduleType === 'weekly' && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Days <span style={{ color: 'var(--color-status-critical)' }}>*</span>
            </p>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-describedby={errors.daysOfWeek ? `${formId}-days-error` : undefined}
            >
              {WEEKDAYS.map((day) => {
                const selected = values.daysOfWeek.includes(day);
                return (
                  <label
                    key={day}
                    className={pillBase}
                    style={selected ? activePill : inactivePill(Boolean(errors.daysOfWeek))}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleDayOfWeek(day)}
                      className="sr-only"
                    />
                    {DAY_LABELS[day]}
                  </label>
                );
              })}
            </div>
            {errors.daysOfWeek && (
              <p
                id={`${formId}-days-error`}
                className="mt-1 text-xs"
                style={{ color: 'var(--color-status-critical)' }}
              >
                {errors.daysOfWeek}
              </p>
            )}
          </div>

          <TimeList
            formId={formId}
            times={values.specificTimes}
            error={errors.specificTimes}
            addTime={addSpecificTime}
            removeTime={removeSpecificTime}
          />
        </div>
      )}

      {/* Biweekly */}
      {values.scheduleType === 'biweekly' && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Repeats every 2 weeks from the start date below.
          </p>
          <TimeList
            formId={formId}
            times={values.specificTimes}
            error={errors.specificTimes}
            addTime={addSpecificTime}
            removeTime={removeSpecificTime}
          />
        </div>
      )}

      {/* Monthly */}
      {values.scheduleType === 'monthly' && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <label
              htmlFor={`${formId}-day-of-month`}
              className="text-xs font-bold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Day of month <span style={{ color: 'var(--color-status-critical)' }}>*</span>
            </label>
            <input
              id={`${formId}-day-of-month`}
              type="number"
              min={1}
              max={31}
              value={values.dayOfMonth === '' ? '' : String(values.dayOfMonth)}
              onChange={(e) =>
                updateField('dayOfMonth', e.target.value === '' ? '' : Number(e.target.value))
              }
              onBlur={() => touchField('dayOfMonth')}
              placeholder="e.g. 15"
              aria-invalid={Boolean(errors.dayOfMonth)}
              className={`${medicationFieldClassName} w-32`}
              style={fieldStyle(Boolean(errors.dayOfMonth))}
            />
            {errors.dayOfMonth && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-status-critical)' }}>
                {errors.dayOfMonth}
              </p>
            )}
          </div>

          <TimeList
            formId={formId}
            times={values.specificTimes}
            error={errors.specificTimes}
            addTime={addSpecificTime}
            removeTime={removeSpecificTime}
          />
        </div>
      )}

      {/* As needed */}
      {values.scheduleType === 'as_needed' && (
        <div
          className="rounded-lg border p-4 text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          No fixed schedule. Give this medication as needed.
        </div>
      )}

      {/* Start date */}
      {values.scheduleType && (
        <div>
          <label
            htmlFor={`${formId}-start-date`}
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Start date <span style={{ color: 'var(--color-status-critical)' }}>*</span>
          </label>
          <input
            id={`${formId}-start-date`}
            type="date"
            value={values.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            onBlur={() => touchField('startDate')}
            aria-invalid={Boolean(errors.startDate)}
            aria-describedby={errors.startDate ? `${formId}-start-date-error` : undefined}
            className={medicationFieldClassName}
            style={fieldStyle(Boolean(errors.startDate))}
          />
          {errors.startDate && (
            <p
              id={`${formId}-start-date-error`}
              className="mt-1 text-xs"
              style={{ color: 'var(--color-status-critical)' }}
            >
              {errors.startDate}
            </p>
          )}
        </div>
      )}

      {/* Course duration (non as-needed) */}
      {values.scheduleType && values.scheduleType !== 'as_needed' && (
        <div className="space-y-3 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Course duration <span style={{ color: 'var(--color-status-critical)' }}>*</span>
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Choose exactly one: ongoing medication (automatic roll-forward), a fixed end date, or total planned doses.
          </p>
          {errors.perpetual && (
            <p className="text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {errors.perpetual}
            </p>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`${formId}-course-mode`}
              checked={values.courseDurationMode === 'perpetual'}
              onChange={() => setCourseDurationMode('perpetual')}
            />
            Ongoing (perpetual) — checklist rolls forward automatically
          </label>

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={`${formId}-course-mode`}
                checked={values.courseDurationMode === 'end_date'}
                onChange={() => setCourseDurationMode('end_date')}
              />
              Fixed end date
            </label>
            {values.courseDurationMode === 'end_date' && (
              <>
                <input
                  id={`${formId}-course-end`}
                  type="date"
                  value={values.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                  onBlur={() => touchField('endDate')}
                  aria-invalid={Boolean(errors.endDate)}
                  className={`${medicationFieldClassName}`}
                  style={fieldStyle(Boolean(errors.endDate))}
                />
                {errors.endDate && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-status-critical)' }}>
                    {errors.endDate}
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={`${formId}-course-mode`}
                checked={values.courseDurationMode === 'total_doses'}
                onChange={() => setCourseDurationMode('total_doses')}
              />
              Total planned doses
            </label>
            {values.courseDurationMode === 'total_doses' && (
              <>
                <input
                  id={`${formId}-course-total`}
                  type="number"
                  min={1}
                  value={values.totalDoses}
                  onChange={(e) => updateField('totalDoses', e.target.value)}
                  onBlur={() => touchField('totalDoses')}
                  placeholder="e.g. 30"
                  aria-invalid={Boolean(errors.totalDoses)}
                  className={`${medicationFieldClassName} w-32`}
                  style={fieldStyle(Boolean(errors.totalDoses))}
                />
                {errors.totalDoses && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-status-critical)' }}>
                    {errors.totalDoses}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TimeListProps {
  formId: string;
  times: string[];
  error: string | undefined;
  addTime: (time?: string) => void;
  removeTime: (index: number) => void;
}

function TimeList({ formId, times, error, addTime, removeTime }: TimeListProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTime, setCustomTime] = useState('');

  const presetTimes: string[] = TIME_PRESETS.map((p) => p.time);
  const customTimes = times
    .map((t, i) => ({ time: t, index: i }))
    .filter(({ time }) => !presetTimes.includes(time))
    .sort((a, b) => a.time.localeCompare(b.time));

  function togglePreset(presetTime: string) {
    const idx = times.indexOf(presetTime);
    if (idx !== -1) {
      removeTime(idx);
    } else {
      addTime(presetTime);
    }
  }

  function handleAddCustom() {
    if (customTime && !times.includes(customTime)) {
      addTime(customTime);
    }
    setCustomTime('');
    setShowCustomInput(false);
  }

  const pillBase = 'rounded-lg border px-3 py-2 text-sm font-bold cursor-pointer select-none transition-colors';
  const activePill: React.CSSProperties = {
    borderColor: 'var(--color-primary)',
    backgroundColor: 'var(--color-primary-light, #eff6ff)',
    color: 'var(--color-primary)',
  };
  const inactivePill: React.CSSProperties = {
    borderColor: 'var(--color-border)',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div>
      <p className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
        Time <span style={{ color: 'var(--color-status-critical)' }}>*</span>
      </p>

      {/* Preset toggles */}
      <div
        className="mt-2 flex flex-wrap gap-2"
        role="group"
        aria-label="Common medication times"
        aria-describedby={error ? `${formId}-times-error` : undefined}
      >
        {TIME_PRESETS.map(({ label, time }) => {
          const active = times.includes(time);
          return (
            <button
              key={time}
              type="button"
              onClick={() => togglePreset(time)}
              className={pillBase}
              style={active ? activePill : { ...inactivePill, borderColor: error ? 'var(--color-status-critical)' : 'var(--color-border)' }}
              aria-pressed={active}
            >
              {label}
              <span className="ml-1.5 font-normal" style={{ color: 'var(--color-text-secondary)' }}>{time}</span>
            </button>
          );
        })}
      </div>

      {/* Custom time chips */}
      {customTimes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {customTimes.map(({ time, index }) => (
            <span
              key={index}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light, #eff6ff)', color: 'var(--color-primary)' }}
            >
              {time}
              <button
                type="button"
                onClick={() => removeTime(index)}
                className="leading-none"
                aria-label={`Remove ${time}`}
                style={{ color: 'var(--color-primary)' }}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Custom time input */}
      {showCustomInput ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            autoFocus
            aria-label="Custom time"
            className={`${medicationFieldClassName} mt-2 h-10 w-auto`}
            style={medicationFieldStyle(false)}
          />
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customTime}
            className="h-10 rounded-lg border px-3 text-xs font-bold"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'var(--color-input-bg)' }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setShowCustomInput(false); setCustomTime(''); }}
            className="h-10 rounded-lg border px-3 text-xs"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-input-bg)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          className="mt-2 text-xs font-bold"
          style={{ color: 'var(--color-primary)' }}
        >
          + Add custom time
        </button>
      )}

      {error && (
        <p
          id={`${formId}-times-error`}
          className="mt-1 text-xs"
          style={{ color: 'var(--color-status-critical)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
