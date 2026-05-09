import { useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { supabase } from '@lib/supabaseClient';
import type { ChecklistItem } from '@lib/checklist';
import SkipReasonModal from '@components/checklist/SkipReasonModal';
import MedicationProofViewerModal from '@components/checklist/MedicationProofViewerModal';
import { CHECKLIST_PROOF_BUCKET, STATUS_STYLES } from '@components/checklist/medicationChecklist.constants';

interface MedicationChecklistItemRowProps {
  item: ChecklistItem;
  disabled: boolean;
  shouldReduceMotion: boolean;
}

export default function MedicationChecklistItemRow({
  item,
  disabled,
  shouldReduceMotion,
}: MedicationChecklistItemRowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);
  const [viewerCaregiverName, setViewerCaregiverName] = useState<string>('Unknown carer');
  const [viewerLoading, setViewerLoading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const isTerminal = item.status === 'given' || item.status === 'skipped';
  const isEditable = !isTerminal && !disabled;
  const isGiven = item.status === 'given';
  const style = STATUS_STYLES[item.status];

  const handleOpenCamera = () => {
    if (!isEditable) return;
    cameraInputRef.current?.click();
  };

  const handleOpenGallery = () => {
    if (!isEditable) return;
    galleryInputRef.current?.click();
  };

  const handleProofSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !isEditable) return;

    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  const handleOpenViewer = async () => {
    if (!isGiven) return;
    setShowPhotoViewer(true);
    setViewerLoading(true);
    setViewerPhotoUrl(null);
    setViewerCaregiverName('Unknown carer');

    try {
      const folderPath = `checklist-proofs/${item.id}`;
      const { data: files, error: listError } = await supabase.storage
        .from(CHECKLIST_PROOF_BUCKET)
        .list(folderPath, {
          limit: 20,
          sortBy: { column: 'name', order: 'desc' },
        });

      if (listError) throw listError;

      const firstFile = files?.[0];
      if (firstFile?.name) {
        const { data } = supabase.storage
          .from(CHECKLIST_PROOF_BUCKET)
          .getPublicUrl(`${folderPath}/${firstFile.name}`);
        if (data?.publicUrl) {
          setViewerPhotoUrl(data.publicUrl);
        }
      }

      if (item.given_by_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', item.given_by_user_id)
          .maybeSingle();
        if (profile?.full_name) {
          setViewerCaregiverName(profile.full_name);
        }
      }
    } catch {
      toast.error('Could not load confirmation photo.');
    } finally {
      setViewerLoading(false);
    }
  };

  const localConfirmationTime = item.given_at ? new Date(item.given_at).toLocaleString() : 'Unknown time';
  const doseText = `${item.dosage} ${item.dosage_unit}`;

  return (
    <>
      <motion.div
        className="flex items-center justify-between rounded-lg border px-4 py-3 mt-2"
        style={{
          borderColor: 'var(--color-border)',
          cursor: isGiven ? 'pointer' : 'default',
        }}
        onClick={() => void handleOpenViewer()}
        whileTap={isGiven && !shouldReduceMotion ? { scale: 0.99 } : undefined}
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
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => void handleProofSelected(event)}
            data-testid={`camera-input-${item.id}`}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => void handleProofSelected(event)}
            data-testid={`gallery-input-${item.id}`}
            className="hidden"
          />
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: style.bg, color: style.color }}>
            {style.label}
          </span>

          {isEditable && (
            <>
              <div className="flex flex-col gap-1">
                <motion.button
                  type="button"
                  onClick={handleOpenCamera}
                  disabled={isLoading}
                  className="h-8 rounded-lg px-3 text-xs font-bold text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                >
                  {isLoading ? 'Uploading...' : 'Mark as Given'}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleOpenGallery}
                  disabled={isLoading}
                  className="h-8 rounded-lg border px-3 text-xs font-bold disabled:opacity-60"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                >
                  Choose from gallery
                </motion.button>
              </div>
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
      </motion.div>

      {showSkipModal && (
        <SkipReasonModal
          itemId={item.id}
          medicationName={item.medication_name}
          open={showSkipModal}
          onSkipped={() => setShowSkipModal(false)}
          onCancel={() => setShowSkipModal(false)}
        />
      )}

      <MedicationProofViewerModal
        open={showPhotoViewer}
        shouldReduceMotion={shouldReduceMotion}
        medicationName={item.medication_name}
        doseText={doseText}
        localConfirmationTime={localConfirmationTime}
        caregiverName={viewerCaregiverName}
        photoUrl={viewerPhotoUrl}
        loading={viewerLoading}
        onClose={() => setShowPhotoViewer(false)}
      />
    </>
  );
}
