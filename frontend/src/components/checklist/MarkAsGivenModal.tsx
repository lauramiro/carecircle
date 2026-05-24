import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CameraIcon, ImageIcon, XIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import type { ChecklistItem } from '@lib/checklist';
import type { ChecklistItemPatch } from '@api/checklist/checklist.types';
import { markChecklistItemGiven } from '@api/checklist/dailyChecklist.service';
import { computeOverdueDuration } from '@lib/checklistStatus';
import { useReducedMotion } from '@hooks/useReducedMotion';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_PANEL_VARIANTS,
  STATIC_MODAL_VARIANTS,
  TRANSITIONS,
} from '@lib/animation.constants';

interface MarkAsGivenModalProps {
  item: ChecklistItem;
  checklistDate: string;
  open: boolean;
  onGiven: (patch: ChecklistItemPatch) => void;
  onCancel: () => void;
}

export default function MarkAsGivenModal({
  item,
  checklistDate,
  open,
  onGiven,
  onCancel,
}: MarkAsGivenModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [notes, setNotes] = useState('');
  const [showLateFields, setShowLateFields] = useState(false);
  const [overdueHours, setOverdueHours] = useState(0);
  const [overdueMinutes, setOverdueMinutes] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);

  const autoOverdue = computeOverdueDuration(item.scheduled_time, checklistDate, new Date());

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraStarting(false);
  }, []);

  useEffect(() => {
    if (!open) stopCamera();
  }, [open, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!cameraOpen || !open) return;

    let cancelled = false;

    async function startStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch {
        if (!cancelled) {
          toast.error('Could not access the camera. Check permissions or use Gallery.');
          stopCamera();
        }
      } finally {
        if (!cancelled) setCameraStarting(false);
      }
    }

    void startStream();

    return () => {
      cancelled = true;
    };
  }, [cameraOpen, open, stopCamera]);

  if (!open) return null;

  function resetAndClose() {
    stopCamera();
    setNotes('');
    setShowLateFields(false);
    setOverdueHours(0);
    setOverdueMinutes(0);
    setPhotoFile(null);
    onCancel();
  }

  function handleOpenLateFields() {
    setShowLateFields(true);
    setOverdueHours(autoOverdue.hours);
    setOverdueMinutes(autoOverdue.minutes);
  }

  function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setPhotoFile(file);
  }

  function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera is not supported in this browser. Use Gallery instead.');
      return;
    }
    setCameraStarting(true);
    setCameraOpen(true);
  }

  function captureFromCamera() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('Could not capture photo. Try again.');
          return;
        }
        setPhotoFile(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        stopCamera();
      },
      'image/jpeg',
      0.92,
    );
  }

  async function submit(asLate: boolean) {
    setSubmitting(true);
    try {
      const patch = await markChecklistItemGiven({
        itemId: item.id,
        notes,
        asLate,
        overdueHours,
        overdueMinutes,
        photoFile,
      });

      toast.success(`${item.medication_name} marked as given.`);
      setNotes('');
      setPhotoFile(null);
      setShowLateFields(false);
      onGiven(patch);
    } catch {
      toast.error('Could not mark medication as given. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          variants={shouldReduceMotion ? undefined : MODAL_BACKDROP_VARIANTS}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-given-title"
            className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            style={{ borderColor: 'var(--color-border)' }}
            variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_PANEL_VARIANTS}
            transition={TRANSITIONS.modal}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="mark-given-title"
                  className="text-xl font-extrabold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Mark as Given
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {item.medication_name} · {item.dosage} {item.dosage_unit} at {item.scheduled_time}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={resetAndClose}
                className="rounded-full p-2"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                <XIcon size={16} strokeWidth={1.9} />
              </button>
            </div>

            <div className="mt-4">
              <label htmlFor="given-notes" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Notes <span style={{ color: 'var(--color-text-hint)' }}>(optional)</span>
              </label>
              <textarea
                id="given-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about this dose..."
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Photo proof <span style={{ color: 'var(--color-text-hint)' }}>(optional)</span>
              </p>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelected}
                className="hidden"
              />
              {cameraOpen ? (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full rounded-lg border object-cover aspect-[4/3] bg-black"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={captureFromCamera}
                      className="flex-1 h-10 rounded-lg px-4 text-sm font-bold text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      Take photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="h-10 rounded-lg border px-4 text-sm font-bold"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={cameraStarting}
                    onClick={openCamera}
                    className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-60"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    <CameraIcon size={14} /> {cameraStarting ? 'Opening…' : 'Camera'}
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    <ImageIcon size={14} /> Gallery
                  </button>
                </div>
              )}
              {photoFile && !cameraOpen && (
                <p className="mt-2 text-xs" style={{ color: 'var(--color-status-given)' }}>
                  Photo selected: {photoFile.name}
                </p>
              )}
            </div>

            {showLateFields && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="overdue-hours" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    Hours overdue (0–48)
                  </label>
                  <input
                    id="overdue-hours"
                    type="number"
                    min={0}
                    max={48}
                    value={overdueHours}
                    onChange={(e) => setOverdueHours(Math.min(48, Math.max(0, Number(e.target.value))))}
                    className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
                <div>
                  <label htmlFor="overdue-minutes" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    Minutes overdue (0–59)
                  </label>
                  <input
                    id="overdue-minutes"
                    type="number"
                    min={0}
                    max={59}
                    value={overdueMinutes}
                    onChange={(e) => setOverdueMinutes(Math.min(59, Math.max(0, Number(e.target.value))))}
                    className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit(false)}
                className="h-10 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {submitting ? 'Saving...' : 'Mark as given (on time)'}
              </button>
              {!showLateFields ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleOpenLateFields}
                  className="h-10 rounded-lg border px-4 text-sm font-bold disabled:opacity-60"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-status-overdue)' }}
                >
                  Mark as given (late / overdue)
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submit(true)}
                  className="h-10 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-status-overdue)' }}
                >
                  {submitting ? 'Saving...' : 'Confirm given late'}
                </button>
              )}
              <button
                type="button"
                onClick={resetAndClose}
                className="h-10 rounded-lg border px-4 text-sm font-bold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
