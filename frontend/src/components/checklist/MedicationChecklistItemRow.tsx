import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ChecklistItem } from '@lib/checklist';
import type { ChecklistItemPatch } from '@api/checklist/checklist.types';
import SkipReasonModal from '@components/checklist/SkipReasonModal';
import MarkAsGivenModal from '@components/checklist/MarkAsGivenModal';
import MedicationProofViewerModal from '@components/checklist/MedicationProofViewerModal';
import { CHECKLIST_PROOF_BUCKET, STATUS_STYLES } from '@components/checklist/medicationChecklist.constants';
import { supabase } from '@lib/supabaseClient';
import { toast } from 'react-toastify';

interface MedicationChecklistItemRowProps {
  item: ChecklistItem;
  checklistDate: string;
  disabled: boolean;
  shouldReduceMotion: boolean;
  onItemPatch: (id: string, patch: ChecklistItemPatch) => void;
}

export default function MedicationChecklistItemRow({
  item,
  checklistDate,
  disabled,
  shouldReduceMotion,
  onItemPatch,
}: MedicationChecklistItemRowProps) {
  const [showMarkGivenModal, setShowMarkGivenModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);
  const [viewerCaregiverName, setViewerCaregiverName] = useState<string>('Unknown carer');
  const [viewerLoading, setViewerLoading] = useState(false);

  const isTerminal = item.status === 'given' || item.status === 'skipped';
  const isEditable = !isTerminal && !disabled;
  const isGiven = item.status === 'given';
  const style = STATUS_STYLES[item.status];

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
        .list(folderPath, { limit: 20, sortBy: { column: 'name', order: 'desc' } });

      if (!listError && files?.[0]?.name) {
        const { data } = supabase.storage
          .from(CHECKLIST_PROOF_BUCKET)
          .getPublicUrl(`${folderPath}/${files[0].name}`);
        if (data?.publicUrl) setViewerPhotoUrl(data.publicUrl);
      }

      const carerId = item.given_by_carer_id ?? item.given_by_user_id;
      if (carerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', carerId)
          .maybeSingle();
        if (profile?.full_name) setViewerCaregiverName(profile.full_name);
      }
    } catch {
      toast.error('Could not load confirmation details.');
    } finally {
      setViewerLoading(false);
    }
  };

  const localConfirmationTime = item.given_at ? new Date(item.given_at).toLocaleString() : 'Unknown time';
  const doseText = `${item.dosage} ${item.dosage_unit}`;
  const overdueText =
    item.overdue_hours != null || item.overdue_minutes != null
      ? ` (${item.overdue_hours ?? 0}h ${item.overdue_minutes ?? 0}m late)`
      : '';

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
            {item.dosage} {item.dosage_unit} · {item.scheduled_time}
            {item.given_notes ? ` · ${item.given_notes}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{ backgroundColor: style.bg, color: style.color }}
          >
            {style.label}{overdueText && item.status === 'given' ? overdueText : ''}
          </span>

          {isEditable && (
            <>
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMarkGivenModal(true);
                }}
                className="h-8 rounded-lg px-3 text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              >
                Mark given
              </motion.button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSkipModal(true);
                }}
                className="h-8 rounded-lg border px-3 text-xs font-bold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Skip
              </button>
            </>
          )}
        </div>
      </motion.div>

      {showMarkGivenModal && (
        <MarkAsGivenModal
          item={item}
          checklistDate={checklistDate}
          open={showMarkGivenModal}
          onGiven={(patch) => {
            onItemPatch(item.id, patch);
            setShowMarkGivenModal(false);
          }}
          onCancel={() => setShowMarkGivenModal(false)}
        />
      )}

      {showSkipModal && (
        <SkipReasonModal
          itemId={item.id}
          medicationName={item.medication_name}
          open={showSkipModal}
          onSkipped={(patch) => {
            onItemPatch(item.id, patch);
            setShowSkipModal(false);
          }}
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
