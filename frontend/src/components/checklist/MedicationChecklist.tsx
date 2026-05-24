import { useEffect, useMemo, useRef } from 'react';
import { summarizeChecklist, type ChecklistItem } from '@lib/checklist';
import { sortChecklistItemsByScheduledTime } from '@lib/checklistStatus';
import { toLocalDateString } from '@lib/dates';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { useChecklistSubscription } from '@hooks/checklist/useChecklistSubscription';
import MedicationChecklistItemRow from '@components/checklist/MedicationChecklistItemRow';

interface MedicationChecklistProps {
  checklistId: string;
  checklistDate: string;
  items: ChecklistItem[];
  userRole: 'primary' | 'secondary' | 'observer';
  isLoading?: boolean;
  loadingLabel?: string;
  onItemsChange?: (items: ChecklistItem[]) => void;
  highlightItemId?: string;
}

function isToday(dateStr: string): boolean {
  return dateStr === toLocalDateString(new Date());
}

export default function MedicationChecklist({
  checklistId,
  checklistDate,
  items: itemsFromParent,
  userRole,
  isLoading = false,
  loadingLabel = 'Loading checklist…',
  onItemsChange,
  highlightItemId,
}: MedicationChecklistProps) {
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const { items, isSubscribed, patchItem } = useChecklistSubscription(
    checklistId,
    checklistDate,
    itemsFromParent,
    onItemsChange,
  );
  const shouldReduceMotion = useReducedMotion();
  const isReadOnly = userRole === 'observer';

  const sortedItems = useMemo(
    () => sortChecklistItemsByScheduledTime(items),
    [items],
  );
  const summary = summarizeChecklist(sortedItems);

  const title = isToday(checklistDate) ? "Today's Medications" : `Medications for ${checklistDate}`;

  useEffect(() => {
    if (!highlightItemId || isLoading) return;
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightItemId, isLoading, sortedItems.length]);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            {title}
          </h1>
          <p className="mt-1 text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor: isLoading
                  ? 'var(--color-text-hint)'
                  : isSubscribed
                    ? 'var(--color-status-given)'
                    : 'var(--color-text-hint)',
              }}
            />
            {isLoading
              ? loadingLabel
              : isSubscribed
                ? 'Live updates on'
                : 'Connecting…'}
          </p>
        </div>

        {isReadOnly && (
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-text-secondary)' }}
          >
            Read-only
          </span>
        )}
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Remaining', value: summary.remaining, color: 'var(--color-primary)' },
          { label: 'Given', value: summary.given, color: 'var(--color-status-given)' },
          { label: 'Overdue', value: summary.overdue, color: 'var(--color-status-overdue)' },
          { label: 'Skipped', value: summary.skipped, color: 'var(--color-status-skipped)' },
        ].map((stat) => (
          <article
            key={stat.label}
            className="rounded-xl border bg-white p-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </article>
        ))}
      </div>

      <div
        className="relative rounded-xl border bg-white overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {isLoading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 px-4 text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {loadingLabel}
          </div>
        )}
        {sortedItems.length === 0 ? (
          <p className="py-8 text-sm text-center" style={{ color: 'var(--color-text-hint)' }}>
            No medications scheduled for this day.
          </p>
        ) : (
          <div className="px-5 py-4 space-y-1">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                id={`checklist-item-${item.id}`}
                ref={item.id === highlightItemId ? highlightRef : undefined}
                className="rounded-lg"
                style={
                  item.id === highlightItemId
                    ? {
                        backgroundColor: 'var(--color-primary-light, #eff6ff)',
                        outline: '2px solid var(--color-primary)',
                      }
                    : undefined
                }
              >
                <MedicationChecklistItemRow
                  item={item}
                  checklistDate={checklistDate}
                  disabled={isReadOnly}
                  shouldReduceMotion={shouldReduceMotion}
                  onItemPatch={patchItem}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
