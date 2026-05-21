import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useMedications } from '../../hooks/medications/useMedications';
import { formatMedicationSchedule, getMedicationTimesToday } from '../../utils/formatMedicationSchedule';
import type { Medication } from '../../api/medications/medications.types';

export default function MedicationsSchedulePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { group, loading: groupLoading } = useGroupDetail(groupId);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const patientId = group?.patientId ?? '';
  const { medications, loading: medsLoading, isSubmitting, pauseMedication, activateMedication, archiveMedication } =
    useMedications(patientId);

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

  const isAdmin = group.role === 'Admin';
  const visibleMeds = medications.filter((m) => m.status === 'active' || m.status === 'paused');

  // Build today's time-ordered list: [{time, meds[]}]
  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const timeMap = new Map<string, Medication[]>();
  for (const med of visibleMeds.filter((m) => m.status === 'active')) {
    for (const time of getMedicationTimesToday(med)) {
      if (!timeMap.has(time)) timeMap.set(time, []);
      timeMap.get(time)!.push(med);
    }
  }
  const todaySlots = [...timeMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  function toMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  function handleEdit(med: Medication) {
    navigate(`/groups/${groupId}/medications/add`, { state: { editingMedId: med.id } });
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/groups/${groupId}/checklist`)}
            className="h-10 rounded-lg px-4 text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Daily checklist
          </button>
          {isAdmin && (
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
          className="rounded-xl border bg-white p-8 text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            No medications in the schedule yet.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate(`/groups/${groupId}/medications/add`)}
              className="mt-4 h-9 rounded-lg px-4 text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Add first medication
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today section */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              Today &middot; {todayDate}
            </p>
            {todaySlots.length === 0 ? (
              <div
                className="rounded-xl border bg-white p-4 text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                No scheduled doses today.
              </div>
            ) : (
              <ul className="space-y-2">
                {todaySlots.map(([time, meds]) => {
                  const past = toMinutes(time) < nowMinutes;
                  return (
                    <li
                      key={time}
                      className="flex gap-4 rounded-xl border bg-white p-4"
                      style={{ borderColor: 'var(--color-border)', opacity: past ? 0.55 : 1 }}
                    >
                      <span
                        className="w-12 shrink-0 pt-0.5 text-sm font-bold tabular-nums"
                        style={{ color: past ? 'var(--color-text-secondary)' : 'var(--color-primary)' }}
                      >
                        {time}
                      </span>
                      <ul className="space-y-1">
                        {meds.map((med) => (
                          <li key={med.id}>
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {med.medicationName}
                            </span>
                            <span className="ml-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {med.dosage}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Full schedule */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              All medications
            </p>
            <ul className="space-y-3">
              {visibleMeds.map((med) => (
                <li
                  key={med.id}
                  className="rounded-xl border bg-white p-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
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
                      <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {med.dosage} &middot; {formatMedicationSchedule(med)}
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex shrink-0 gap-1">
                        {med.status === 'active' && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleEdit(med)}
                            className="rounded border px-2 py-1 text-xs font-bold"
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
                            className="rounded border px-2 py-1 text-xs"
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
                            className="rounded border px-2 py-1 text-xs"
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
                              className="rounded border px-2 py-1 text-xs font-bold"
                              style={{ borderColor: 'var(--color-status-critical)', color: 'var(--color-status-critical)' }}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmArchiveId(null)}
                              className="rounded border px-2 py-1 text-xs"
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
                            className="rounded border px-2 py-1 text-xs"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
