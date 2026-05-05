import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Pill } from 'lucide-react';
import AddMedicationForm from '../../components/medications/AddMedicationForm';
import { useMedications } from '../../hooks/medications/useMedications';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import type { AddMedicationPayload } from '../../api/medications/medications.types';
import { FREQUENCY_LABELS } from '../../api/medications/medications.types';

export default function AddMedicationPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { group, loading: groupLoading } = useGroupDetail(groupId);
  const patientId = group?.patientId ?? '';
  const { medications, loading: medsLoading, isSubmitting, addMedication } =
    useMedications(patientId);

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

  async function handleSubmit(payload: AddMedicationPayload) {
    await addMedication(payload);
    toast.success('Medication added to schedule');
  }

  function handleCancel() {
    navigate(`/groups/${groupId}`);
  }

  const activeMeds = medications.filter((m) => m.status === 'active');

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
            <AddMedicationForm
              patientId={patientId}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
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
            ) : activeMeds.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
                No medications added yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {activeMeds.map((med) => (
                  <li key={med.id} className="text-sm">
                    <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {med.name}
                    </p>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      {med.dose} {med.unit} &middot; {FREQUENCY_LABELS[med.frequency]}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-hint)' }}>
                      {med.timeWindows.join(', ')}
                    </p>
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
