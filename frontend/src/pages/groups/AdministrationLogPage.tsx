import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAdministrationLogEvents } from '../../api/administrationLog/administrationLog.service';
import type { AdministrationLogEvent } from '../../api/administrationLog/administrationLog.types';
import AdministrationLogRow from '../../components/administrationLog/AdministrationLogRow';
import AdministrationLogEventModal from '../../components/administrationLog/AdministrationLogEventModal';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';

export default function AdministrationLogPage() {
  const { groupId } = useParams();
  const { group, loading, error } = useGroupDetail(groupId);
  const [events, setEvents] = useState<AdministrationLogEvent[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [selected, setSelected] = useState<AdministrationLogEvent | null>(null);

  useEffect(() => {
    if (!groupId || !group?.patientId) {
      setLoadingLog(false);
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoadingLog(true);

    void (async () => {
      try {
        const data = await fetchAdministrationLogEvents(groupId, group.patientId, {
          includeProofThumbnails: true,
        });
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) {
          toast.error('Could not load administration log.');
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoadingLog(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupId, group?.patientId]);

  if (!groupId) {
    return <Navigate to="/groups/list" replace />;
  }

  if (loading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Medication administration log</h1>
        <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Loading…
        </p>
      </section>
    );
  }

  if (error || !group) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Medication administration log</h1>
        <p className="mt-4 text-sm" style={{ color: 'var(--color-status-critical)' }}>
          {error ?? 'Group not found.'}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1
        style={{
          color: 'var(--color-text-primary)',
          fontSize: '26px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: 0,
        }}
      >
        Medication administration log
      </h1>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {group.name} — read-only history of medications given, skipped, or marked overdue. Entries cannot be edited or
        removed from this screen.
      </p>

      {!group.patientId ? (
        <p className="mt-6 text-sm" style={{ color: 'var(--color-text-hint)' }}>
          This group has no linked patient record yet, so the administration log is empty.
        </p>
      ) : loadingLog ? (
        <p className="mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Loading events…
        </p>
      ) : events.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No medication events recorded yet for this care circle.
        </p>
      ) : (
        <div
          className="mt-6 overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr
                  className="border-b text-[11px] uppercase tracking-wide"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-hint)',
                  }}
                >
                  <th className="w-12 px-3 py-2 font-bold" scope="col">
                    <span className="sr-only">Photo</span>
                  </th>
                  <th className="px-3 py-2 font-bold" scope="col">
                    Medication
                  </th>
                  <th className="px-3 py-2 font-bold" scope="col">
                    Dose
                  </th>
                  <th className="px-3 py-2 font-bold" scope="col">
                    Carer
                  </th>
                  <th className="px-3 py-2 font-bold" scope="col">
                    Time
                  </th>
                  <th className="px-3 py-2 text-right font-bold" scope="col">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const localTimestampLabel = new Date(event.occurredAtIso).toLocaleString();
                  return (
                    <AdministrationLogRow
                      key={event.id}
                      event={event}
                      localTimestampLabel={localTimestampLabel}
                      onOpen={() => setSelected(event)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdministrationLogEventModal
        event={selected}
        onClose={() => setSelected(null)}
        localTimestampLabel={selected ? new Date(selected.occurredAtIso).toLocaleString() : ''}
      />
    </section>
  );
}
