import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Pill } from 'lucide-react';
import AddMedicationForm from '../../components/medications/AddMedicationForm';
import EditMedicationForm from '../../components/medications/EditMedicationForm';
import MedicationDetailsModal from '../../components/medications/MedicationDetailsModal';
import { useMedications } from '../../hooks/medications/useMedications';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import type { AddMedicationPayload, EditMedicationPayload, Medication } from '../../api/medications/medications.types';
import { formatMedicationSchedule } from '../../utils/formatMedicationSchedule';
import { getErrorMessage } from '../../utils/helper';

const MEDICATION_SAVE_ERROR_MESSAGE = 'Medication was not saved. Check your connection and try again.';

export default function AddMedicationPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { group, loading: groupLoading, error: groupError } = useGroupDetail(groupId);
  const patientId = group?.patientId ?? '';
  const { medications, loading: medsLoading, isSubmitting, addMedication, editMedication, pauseMedication, activateMedication, archiveMedication } =
    useMedications(patientId, groupId ?? '');
  const location = useLocation();
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [detailsMed, setDetailsMed] = useState<Medication | null>(null);

  // Pre-select a medication for editing when navigated here from the schedule page
  useEffect(() => {
    const editingMedId = (location.state as { editingMedId?: string } | null)?.editingMedId;
    if (editingMedId && medications.length > 0) {
      const target = medications.find((m) => m.id === editingMedId) ?? null;
      setEditingMed(target);
      // Clear state so a refresh doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, [location.state, medications]);

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (groupLoading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Add Medication</h1>
        <div
          className="mt-6 rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Loading...
        </div>
      </section>
    );
  }

  if (!group) {
    return <Navigate to="/groups/list" replace />;
  }

  if (groupError) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Add Medication</h1>
        <div
          className="mt-6 rounded-xl border p-6 text-sm"
          style={{
            borderColor: 'var(--color-status-critical)',
            backgroundColor: 'var(--color-status-critical-bg)',
            color: 'var(--color-status-critical)',
          }}
        >
          {groupError}
        </div>
      </section>
    );
  }

  async function handleAdd(payload: AddMedicationPayload) {
    try {
      await addMedication(payload);
      toast.success('Medication added to schedule');
    } catch (error) {
      toast.error(getErrorMessage(error) || MEDICATION_SAVE_ERROR_MESSAGE);
      throw error;
    }
  }

  async function handleEdit(changes: EditMedicationPayload) {
    if (!editingMed) return;
    try {
      await editMedication(editingMed.id, changes);
      setEditingMed(null);
      toast.success('Medication updated');
    } catch (error) {
      toast.error(getErrorMessage(error) || MEDICATION_SAVE_ERROR_MESSAGE);
      throw error;
    }
  }

  function handleCancel() {
    navigate(`/groups/${groupId}`);
  }

  const visibleMeds = medications.filter((m) => m.status === 'active' || m.status === 'paused');

  return (
    <section>
      <div className="mb-6">
        <h1
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Add Medication
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {group.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div
            className="rounded-xl border bg-white p-6"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {editingMed ? (
              <>
                <h2 className="mb-4 text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  Editing: {editingMed.medicationName}
                </h2>
                <EditMedicationForm
                  initialValues={editingMed}
                  isSubmitting={isSubmitting}
                  onSubmit={handleEdit}
                  onCancel={() => setEditingMed(null)}
                />
              </>
            ) : (
              <AddMedicationForm
                patientId={patientId}
                isSubmitting={isSubmitting}
                onSubmit={handleAdd}
                onCancel={handleCancel}
              />
            )}
          </div>
        </div>

        <aside>
          <div
            className="rounded-xl border bg-white p-5"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Pill size={18} strokeWidth={1.9} color="var(--color-primary)" />
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Current schedule
              </h2>
            </div>

            {medsLoading ? (
              <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
                Loading medications...
              </p>
            ) : visibleMeds.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
                No medications added yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {visibleMeds.map((med) => (
                  <li key={med.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {med.medicationName}
                          </p>
                          {med.status === 'paused' && (
                            <span
                              className="text-xs rounded px-1.5 py-0.5 font-medium"
                              style={{ background: '#e5e7eb', color: '#6b7280' }}
                            >
                              Paused
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)' }}>
                          {med.dosage} &middot; {formatMedicationSchedule(med)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDetailsMed(med)}
                          className="text-xs px-2 py-0.5 rounded border"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          aria-label={`View details for ${med.medicationName}`}
                        >
                          Info
                        </button>
                        {med.status === 'active' && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setEditingMed(med)}
                            className="text-xs px-2 py-0.5 rounded border"
                            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                          >
                            Edit
                          </button>
                        )}
                        {med.status === 'active' && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => void pauseMedication(med.id)}
                            className="text-xs px-2 py-0.5 rounded border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          >
                            Pause
                          </button>
                        )}
                        {med.status === 'paused' && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => void activateMedication(med.id)}
                            className="text-xs px-2 py-0.5 rounded border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          >
                            Activate
                          </button>
                        )}
                        {confirmArchiveId === med.id ? (
                          <>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => { void archiveMedication(med.id); setConfirmArchiveId(null); }}
                              className="text-xs px-2 py-0.5 rounded border font-bold"
                              style={{ borderColor: 'var(--color-status-critical)', color: 'var(--color-status-critical)' }}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmArchiveId(null)}
                              className="text-xs px-2 py-0.5 rounded border"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setConfirmArchiveId(med.id)}
                            className="text-xs px-2 py-0.5 rounded border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <MedicationDetailsModal
        medication={detailsMed}
        open={detailsMed !== null}
        onClose={() => setDetailsMed(null)}
      />
    </section>
  );
}
