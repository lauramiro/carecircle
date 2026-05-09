import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { supabase } from '@lib/supabaseClient';
import { summarizeChecklist } from '@lib/checklist';
import type { ChecklistItem, MedicationStatus } from '@lib/checklist';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { useChecklistSubscription } from '@hooks/checklist/useChecklistSubscription';
import SkipReasonModal from '@components/checklist/SkipReasonModal';

const STATUS_STYLES: Record<MedicationStatus, { bg: string; color: string; label: string }> = {
  due: { bg: 'var(--color-status-given-bg)', color: 'var(--color-status-given)', label: 'Due' },
  given: { bg: 'var(--color-status-given-bg)', color: 'var(--color-status-given)', label: 'Given' },
  overdue: { bg: 'var(--color-status-overdue-bg)', color: 'var(--color-status-overdue)', label: 'Overdue' },
  skipped: { bg: 'var(--color-status-skipped-bg)', color: 'var(--color-status-skipped)', label: 'Skipped' },
};

const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning', hours: [0, 11] },
  { id: 'afternoon', label: 'Afternoon', hours: [12, 17] },
  { id: 'evening', label: 'Evening', hours: [18, 20] },
  { id: 'night', label: 'Night', hours: [21, 23] },
];

function groupItemsByWindow(items: ChecklistItem[]): Record<string, ChecklistItem[]> {
  const groups: Record<string, ChecklistItem[]> = {
    morning: [], afternoon: [], evening: [], night: [],
  };
  items.forEach(item => {
    const hour = parseInt(item.time_window.time_of_day.split(':')[0]);
    if (hour <= 11) groups.morning.push(item);
    else if (hour <= 17) groups.afternoon.push(item);
    else if (hour <= 20) groups.evening.push(item);
    else groups.night.push(item);
  });
  return groups;
}

interface MedicationChecklistProps {
  checklistId: string;
  userRole: 'primary' | 'secondary' | 'observer';
}

const CHECKLIST_PROOF_BUCKET = 'medication-proofs';

export default function MedicationChecklist({ checklistId, userRole }: MedicationChecklistProps) {
  const [initialItems, setInitialItems] = useState<ChecklistItem[]>([]);
  const { items, isSubscribed } = useChecklistSubscription(checklistId, initialItems);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['morning', 'afternoon'])
  );
  const shouldReduceMotion = useReducedMotion();
  const isReadOnly = userRole === 'observer';
  const summary = summarizeChecklist(items);
  const itemsByWindow = groupItemsByWindow(items);

  useEffect(() => {
    async function loadChecklist() {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklistId);
      if (error) {
        toast.error('Failed to load checklist.');
      } else {
        setInitialItems(data || []);
      }
    }
    loadChecklist();
  }, [checklistId]);

  function toggleSection(id: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 style={{
            color: 'var(--color-text-primary)', fontSize: '26px',
            fontWeight: 800, letterSpacing: '-0.03em', margin: 0,
          }}>
            Today's Medications
          </h1>
          <p className="mt-1 text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: isSubscribed ? 'var(--color-status-given)' : 'var(--color-text-hint)' }}
            />
            {isSubscribed ? 'Live updates on' : 'Connecting...'}
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

      {/* Summary bar */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Remaining', value: summary.remaining, color: 'var(--color-primary)' },
          { label: 'Given', value: summary.given, color: 'var(--color-status-given)' },
          { label: 'Overdue', value: summary.overdue, color: 'var(--color-status-overdue)' },
          { label: 'Skipped', value: summary.skipped, color: 'var(--color-status-skipped)' },
        ].map(stat => (
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

      {/* Time windows */}
      <div className="space-y-3">
        {TIME_WINDOWS.map(window => {
          const windowItems = itemsByWindow[window.id] || [];
          const remaining = windowItems.filter(
            i => i.status === 'due' || i.status === 'overdue'
          ).length;
          const isExpanded = expandedSections.has(window.id);

          return (
            <div
              key={window.id}
              className="rounded-xl border bg-white overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                type="button"
                onClick={() => toggleSection(window.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                <span className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                  {window.label}
                </span>
                <div className="flex items-center gap-3">
                  {remaining > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: 'var(--color-status-overdue-bg)', color: 'var(--color-status-overdue)' }}
                    >
                      {remaining} remaining
                    </span>
                  )}
                  <span style={{ color: 'var(--color-text-hint)', fontSize: '12px' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t px-5 pb-4 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                  {windowItems.length === 0 ? (
                    <p className="py-4 text-sm text-center" style={{ color: 'var(--color-text-hint)' }}>
                      No medications in this window
                    </p>
                  ) : (
                    windowItems.map(item => (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        disabled={isReadOnly}
                        shouldReduceMotion={shouldReduceMotion}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ChecklistItemRow({
  item,
  disabled,
  shouldReduceMotion,
}: {
  item: ChecklistItem;
  disabled: boolean;
  shouldReduceMotion: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const isTerminal = item.status === 'given' || item.status === 'skipped';
  const isEditable = !isTerminal && !disabled;
  const style = STATUS_STYLES[item.status];

  const handleMarkAsGivenClick = () => {
    if (!isEditable) return;
    proofInputRef.current?.click();
  };

  const handleProofSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !isEditable) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop() || 'jpg';
      const objectPath = `checklist-proofs/${item.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(CHECKLIST_PROOF_BUCKET)
        .upload(objectPath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from('checklist_items')
        .update({
          status: 'given',
          given_at: new Date().toISOString(),
          given_by_user_id: user?.id,
        })
        .eq('id', item.id);
      if (error) throw error;

      toast.success(`${item.medication_name} marked as given.`);
    } catch {
      toast.error('Could not upload proof photo. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="flex items-center justify-between rounded-lg border px-4 py-3 mt-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {item.medication_name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {item.dosage} {item.dosage_unit} · {item.time_window.time_of_day}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={proofInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => void handleProofSelected(event)}
            className="hidden"
          />
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{ backgroundColor: style.bg, color: style.color }}
          >
            {style.label}
          </span>

          {isEditable && (
            <>
              <motion.button
                type="button"
                onClick={handleMarkAsGivenClick}
                disabled={isLoading}
                className="h-8 rounded-lg px-3 text-xs font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-primary)' }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              >
                {isLoading ? 'Uploading...' : 'Mark as Given'}
              </motion.button>
              <button
                type="button"
                onClick={() => setShowSkipModal(true)}
                className="h-8 rounded-lg border px-3 text-xs font-bold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Skip
              </button>
            </>
          )}
        </div>
      </div>

      {showSkipModal && (
        <SkipReasonModal
          itemId={item.id}
          medicationName={item.medication_name}
          open={showSkipModal}
          onSkipped={() => setShowSkipModal(false)}
          onCancel={() => setShowSkipModal(false)}
        />
      )}
    </>
  );
}