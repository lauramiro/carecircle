import type { AdministrationLogStatus } from '../../api/administrationLog/administrationLog.types';
import {
  type AdministrationLogFiltersState,
  countActiveFilterFields,
  defaultAdministrationLogFilters,
  uniqueSorted,
} from '../../utils/administrationLog.filters.utils';

const STATUS_OPTIONS: { value: AdministrationLogStatus; label: string }[] = [
  { value: 'given', label: 'Given' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'overdue', label: 'Overdue' },
];

export interface AdministrationLogFiltersBarProps {
  filters: AdministrationLogFiltersState;
  onChange: (next: AdministrationLogFiltersState) => void;
  carerOptions: string[];
  medicationOptions: string[];
}

export default function AdministrationLogFiltersBar({
  filters,
  onChange,
  carerOptions,
  medicationOptions,
}: AdministrationLogFiltersBarProps) {
  const activeCount = countActiveFilterFields(filters);

  function toggleStatus(s: AdministrationLogStatus) {
    const has = filters.statuses.includes(s);
    const next = has ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s];
    onChange({ ...filters, statuses: next });
  }

  function clearAll() {
    onChange(defaultAdministrationLogFilters());
  }

  const sortedCarers = uniqueSorted(carerOptions);
  const sortedMeds = uniqueSorted(medicationOptions);

  return (
    <div
      className="mt-6 rounded-xl border bg-white p-4"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Filters
        </p>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs font-bold"
          style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Clear filters
        </button>
      </div>

      {activeCount > 0 && (
        <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
          {activeCount} active {activeCount === 1 ? 'filter' : 'filters'}
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <fieldset className="min-w-0">
          <legend className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Status
          </legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {STATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(opt.value)}
                  onChange={() => toggleStatus(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="filter-carer" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Carer
          </label>
          <select
            id="filter-carer"
            value={filters.carerName}
            onChange={(e) => onChange({ ...filters, carerName: e.target.value })}
            className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">All carers</option>
            {sortedCarers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-med" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Medication
          </label>
          <select
            id="filter-med"
            value={filters.medicationName}
            onChange={(e) => onChange({ ...filters, medicationName: e.target.value })}
            className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">All medications</option>
            {sortedMeds.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="min-w-[140px] flex-1">
            <label htmlFor="filter-from" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              From
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) =>
                onChange({ ...filters, dateFrom: e.target.value ? e.target.value : null })
              }
              className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label htmlFor="filter-to" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              To
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) =>
                onChange({ ...filters, dateTo: e.target.value ? e.target.value : null })
              }
              className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
