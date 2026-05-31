import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { Activity, CheckCircle2, Edit2 } from 'lucide-react';
import { useWellbeingCheckin } from '../../hooks/checkins/useWellbeingCheckin';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getErrorMessage } from '../../utils/helper';
import type { WellbeingAppetite, WellbeingMobility } from '../../api/checkins/checkins.types';

// ─── Static display helpers ───────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Very low' },
  { value: 2, emoji: '😟', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Very good' },
] as const;

const APPETITE_OPTIONS: { value: WellbeingAppetite; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const MOBILITY_OPTIONS: { value: WellbeingMobility; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'very_limited', label: 'Very limited' },
];

function moodLabel(mood: number): string {
  return MOOD_OPTIONS.find((m) => m.value === mood)?.label ?? String(mood);
}
function moodEmoji(mood: number): string {
  return MOOD_OPTIONS.find((m) => m.value === mood)?.emoji ?? '❓';
}
function appetiteLabel(a: WellbeingAppetite): string {
  return APPETITE_OPTIONS.find((o) => o.value === a)?.label ?? a;
}
function mobilityLabel(m: WellbeingMobility): string {
  return MOBILITY_OPTIONS.find((o) => o.value === m)?.label ?? m;
}

function painColor(level: number): string {
  if (level <= 2) return 'var(--color-status-given)';
  if (level <= 5) return 'var(--color-status-overdue)';
  return 'var(--color-status-critical)';
}

// ─── Segmented control ────────────────────────────────────────────────────────

function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  id,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div
      className="mt-2 flex overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--color-border)' }}
      role="group"
      aria-labelledby={id}
    >
      {options.map((opt, idx) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 py-2 text-xs font-bold transition-colors"
            style={{
              backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-card)',
              color: isSelected ? '#fff' : 'var(--color-text-secondary)',
              borderRight: idx < options.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}
            aria-pressed={isSelected}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Overwrite confirmation modal ─────────────────────────────────────────────

function OverwriteModal({
  isSubmitting,
  onConfirm,
  onCancel,
}: {
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-overlay)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="overwrite-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <h2
          id="overwrite-modal-title"
          className="text-base font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Check-in already exists
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          A wellbeing check-in for today has already been saved. Do you want to overwrite it with
          the new values?
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {isSubmitting ? 'Saving…' : 'Overwrite'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border py-2.5 text-sm font-bold"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Today's check-in summary (read-only view) ────────────────────────────────

function CheckinSummary({
  checkin,
  isObserver,
  onEdit,
}: {
  checkin: NonNullable<ReturnType<typeof useWellbeingCheckin>['todayCheckin']>;
  isObserver: boolean;
  onEdit: () => void;
}) {
  return (
    <div
      className="mt-4 rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} color="var(--color-status-given)" />
          <span className="text-xs font-bold" style={{ color: 'var(--color-status-given)' }}>
            Today's check-in recorded
          </span>
        </div>
        {!isObserver && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
            aria-label="Update today's check-in"
          >
            <Edit2 size={12} />
            Update
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div
          className="rounded-lg border p-2.5 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <p className="text-xl leading-none">{moodEmoji(checkin.mood)}</p>
          <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--color-text-hint)' }}>
            Mood
          </p>
          <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {moodLabel(checkin.mood)}
          </p>
        </div>

        <div
          className="rounded-lg border p-2.5 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <p className="text-xl leading-none">🍽️</p>
          <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--color-text-hint)' }}>
            Appetite
          </p>
          <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {appetiteLabel(checkin.appetite)}
          </p>
        </div>

        <div
          className="rounded-lg border p-2.5 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <p className="text-xl leading-none">🚶</p>
          <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--color-text-hint)' }}>
            Mobility
          </p>
          <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {mobilityLabel(checkin.mobility)}
          </p>
        </div>

        <div
          className="rounded-lg border p-2.5 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <p
            className="text-xl font-extrabold leading-none"
            style={{ color: painColor(checkin.painLevel) }}
          >
            {checkin.painLevel}
          </p>
          <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--color-text-hint)' }}>
            Pain
          </p>
          <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
            out of 10
          </p>
        </div>
      </div>

      {checkin.notes && (
        <p
          className="mt-3 rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {checkin.notes}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WellbeingCheckinPanelProps {
  patientId: string;
  groupId: string;
  caregiverId: string;
  isObserver: boolean;
}

export default function WellbeingCheckinPanel({
  patientId,
  groupId,
  caregiverId,
  isObserver,
}: WellbeingCheckinPanelProps) {
  const shouldReduceMotion = useReducedMotion();

  const {
    todayCheckin,
    loading,
    isSubmitting,
    showOverwritePrompt,
    submitCheckin,
    confirmOverwrite,
    cancelOverwrite,
  } = useWellbeingCheckin(patientId, groupId, caregiverId);

  // Form state
  const [mood, setMood] = useState<number>(3);
  const [appetite, setAppetite] = useState<WellbeingAppetite>('good');
  const [mobility, setMobility] = useState<WellbeingMobility>('normal');
  const [painLevel, setPainLevel] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Whether the user is actively editing (either first entry or update flow)
  const [isEditing, setIsEditing] = useState(false);

  // Pre-fill form with existing values when the user clicks "Update"
  function openEditForm() {
    if (todayCheckin) {
      setMood(todayCheckin.mood);
      setAppetite(todayCheckin.appetite);
      setMobility(todayCheckin.mobility);
      setPainLevel(todayCheckin.painLevel);
      setNotes(todayCheckin.notes ?? '');
    }
    setFormError(null);
    setIsEditing(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      submitCheckin({ patientId, groupId, mood, appetite, mobility, painLevel, notes: notes.trim() || null });
      // If no overwrite prompt was triggered (first save), clear the form and close edit mode
      // The hook will update todayCheckin; watch for isSubmitting going false
    } catch (error) {
      setFormError(getErrorMessage(error) || 'Unable to save check-in. Please try again.');
    }
  }

  async function handleConfirmOverwrite() {
    try {
      await confirmOverwrite();
      setIsEditing(false);
      toast.success('Check-in updated');
    } catch (error) {
      setFormError(getErrorMessage(error) || 'Unable to update check-in. Please try again.');
    }
  }

  // After a first-time save succeeds (isSubmitting flips back to false and todayCheckin populated)
  // close the edit form. We watch this in the submit handler via the hook's return value.
  // The simpler approach: always close editing after submitCheckin unless overwrite prompt shows.
  function handleAfterSubmit() {
    if (!showOverwritePrompt) {
      setIsEditing(false);
      toast.success('Check-in saved');
    }
  }

  const showForm = isEditing || (!loading && todayCheckin === null && !isObserver);

  return (
    <>
      {/* Overwrite confirmation modal — rendered via portal-style fixed overlay */}
      <AnimatePresence>
        {showOverwritePrompt && (
          <OverwriteModal
            isSubmitting={isSubmitting}
            onConfirm={handleConfirmOverwrite}
            onCancel={cancelOverwrite}
          />
        )}
      </AnimatePresence>

      <article
        className="rounded-xl border bg-white p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Panel header */}
        <div className="flex items-center gap-3">
          <Activity size={20} strokeWidth={1.9} color="var(--color-primary)" />
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Daily wellbeing check-in
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Quick snapshot of the patient's condition today.
            </p>
          </div>
        </div>

        {/* Observer notice */}
        {isObserver && !loading && todayCheckin === null && (
          <div
            className="mt-4 rounded-lg border p-4 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-text-secondary)',
            }}
          >
            No wellbeing check-in has been logged today.
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-4 space-y-2">
            {[52, 36, 36].map((h, i) => (
              <div
                key={i}
                className="carecircle-skeleton rounded-lg"
                style={{ height: h }}
              />
            ))}
          </div>
        )}

        {/* Today's check-in summary (when not editing) */}
        {!loading && todayCheckin !== null && !isEditing && (
          <CheckinSummary
            checkin={todayCheckin}
            isObserver={isObserver}
            onEdit={openEditForm}
          />
        )}

        {/* Check-in form */}
        {showForm && (
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              await handleSubmit(e);
              handleAfterSubmit();
            }}
          >
            {/* Mood */}
            <div>
              <p
                id="mood-label"
                className="text-xs font-bold"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Mood <span style={{ color: 'var(--color-status-critical)' }}>*</span>
              </p>
              <div
                className="mt-2 flex justify-between gap-1"
                role="group"
                aria-labelledby="mood-label"
              >
                {MOOD_OPTIONS.map((opt) => {
                  const isSelected = mood === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      type="button"
                      onClick={() => setMood(opt.value)}
                      aria-pressed={isSelected}
                      aria-label={`Mood: ${opt.label}`}
                      className="flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-xl transition-colors"
                      style={{
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: isSelected
                          ? 'var(--color-primary-light)'
                          : 'var(--color-card)',
                      }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.93 }}
                    >
                      {opt.emoji}
                      <span
                        className="text-[9px] font-bold"
                        style={{
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text-hint)',
                        }}
                      >
                        {opt.value}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Appetite */}
            <div>
              <p
                id="appetite-label"
                className="text-xs font-bold"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Appetite <span style={{ color: 'var(--color-status-critical)' }}>*</span>
              </p>
              <SegmentControl
                id="appetite-label"
                options={APPETITE_OPTIONS}
                value={appetite}
                onChange={setAppetite}
              />
            </div>

            {/* Mobility */}
            <div>
              <p
                id="mobility-label"
                className="text-xs font-bold"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Mobility <span style={{ color: 'var(--color-status-critical)' }}>*</span>
              </p>
              <SegmentControl
                id="mobility-label"
                options={MOBILITY_OPTIONS}
                value={mobility}
                onChange={setMobility}
              />
            </div>

            {/* Pain level */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="pain-slider"
                  className="text-xs font-bold"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Pain level <span style={{ color: 'var(--color-status-critical)' }}>*</span>
                </label>
                <span
                  className="text-lg font-extrabold tabular-nums"
                  style={{ color: painColor(painLevel) }}
                >
                  {painLevel}
                  <span
                    className="text-xs font-normal"
                    style={{ color: 'var(--color-text-hint)' }}
                  >
                    {' '}/10
                  </span>
                </span>
              </div>
              <input
                id="pain-slider"
                type="range"
                min={0}
                max={10}
                step={1}
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="mt-2 w-full accent-[color:var(--color-primary)]"
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={painLevel}
              />
              <div
                className="mt-1 flex justify-between text-[9px] font-bold"
                style={{ color: 'var(--color-text-hint)' }}
              >
                <span>No pain</span>
                <span>Severe</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="checkin-notes"
                className="text-xs font-bold"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Notes{' '}
                <span style={{ color: 'var(--color-text-hint)', fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <textarea
                id="checkin-notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (formError) setFormError(null);
                }}
                rows={2}
                placeholder="Any observations, changes, or context…"
                className="mt-2 w-full rounded-lg border p-3 text-sm outline-none"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {formError && (
              <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
                {formError}
              </p>
            )}

            <div className="flex gap-2">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-10 rounded-lg text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: 'var(--color-primary)' }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              >
                {isSubmitting ? 'Saving…' : todayCheckin !== null ? 'Update check-in' : 'Save check-in'}
              </motion.button>
              {isEditing && todayCheckin !== null && (
                <motion.button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormError(null);
                  }}
                  className="h-10 rounded-lg border px-4 text-sm font-bold"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                >
                  Cancel
                </motion.button>
              )}
            </div>
          </form>
        )}
      </article>
    </>
  );
}
