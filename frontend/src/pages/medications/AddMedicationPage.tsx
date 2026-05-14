import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Pill } from 'lucide-react';
import AddMedicationForm from '../../components/medications/AddMedicationForm';
import EditMedicationForm from '../../components/medications/EditMedicationForm';
import { useMedications } from '../../hooks/medications/useMedications';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import type { AddMedicationPayload, EditMedicationPayload, Medication } from '../../api/medications/medications.types';

import { FREQUENCY_LABELS } from '../../api/medications/medications.types';

export default function AddMedicationPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { group, loading: groupLoading } = useGroupDetail(groupId);
  const patientId = group?.patientId ?? '';
  const { medications, loading: medsLoading, isSubmitting, addMedication, editMedication, pauseMedication, activateMedication, archiveMedication } =
    useMedications(patientId);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

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

  async function handleAdd(payload: AddMedicationPayload) {
    await addMedication(payload);
    toast.success('Medication added to schedule');
  }

  async function handleEdit(changes: EditMedicationPayload) {
    if (!editingMed) return;
    await editMedication(editingMed.id, changes);
    setEditingMed(null);
    toast.success('Medication updated');
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
                          {med.dosage} &middot; {FREQUENCY_LABELS[med.frequency]}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-hint)' }}>
                          {(med.timeOfDay ?? []).join(', ')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
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
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void archiveMedication(med.id)}
                          className="text-xs px-2 py-0.5 rounded border"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
