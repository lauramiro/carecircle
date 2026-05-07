import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useMedications } from '../../hooks/medications/useMedications';
import { FREQUENCY_LABELS, TIME_WINDOWS } from '../../api/medications/medications.types';
import type { MedicationTimeWindow } from '../../api/medications/medications.types';

export default function MedicationsSchedulePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { group, loading: groupLoading } = useGroupDetail(groupId);
  const patientId = group?.patientId ?? '';
  const { medications, loading: medsLoading } = useMedications(patientId);

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (groupLoading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Medication Schedule</h1>
        <div
          className="mt-6 rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Loading...
        </div>
      </section>
    );
  }

  if (!group) return <Navigate to="/groups/list" replace />;

  const visibleMeds = medications.filter(
    (m) => m.status === 'active' || m.status === 'paused',
  );

  const medsByWindow = (window: MedicationTimeWindow) =>
    visibleMeds.filter((m) => (m.timeOfDay ?? []).includes(window));

  const sectionsToRender = TIME_WINDOWS.filter(
    (window) => medsByWindow(window).length > 0,
  );

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
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
            {group.name} Medication Schedule
          </h1>
        </div>

        {group.role === 'Admin' && (
          <button
            type="button"
            onClick={() => navigate(`/groups/${groupId}/medications/add`)}
            className="h-10 rounded-lg px-4 text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Add medication
          </button>
        )}
      </div>

      {medsLoading ? (
        <div
          className="rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Loading medications...
        </div>
      ) : visibleMeds.length === 0 ? (
        <div
          className="rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          No medications in the schedule yet.
        </div>
      ) : (
        <div className="space-y-6">
          {sectionsToRender.map((window) => (
            <div key={window}>
              <h2
                className="mb-3 text-sm font-bold uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {window}
              </h2>
              <ul className="space-y-3">
                {medsByWindow(window).map((med) => (
                  <li
                    key={med.id}
                    className="rounded-xl border bg-white p-4"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p
                            className="font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {med.medicationName}
                          </p>
                          {med.status === 'paused' && (
                            <span
                              className="rounded px-1.5 py-0.5 text-xs font-medium"
                              style={{ background: '#e5e7eb', color: '#6b7280' }}
                            >
                              Paused
                            </span>
                          )}
                        </div>
                        <p
                          className="mt-0.5 text-sm"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {med.dosage} &middot; {FREQUENCY_LABELS[med.frequency]}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
