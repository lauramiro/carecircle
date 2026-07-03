import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import type { AdministrationLogEvent } from '../../api/administrationLog/administrationLog.types';
import AdministrationLogRow from '../../components/administrationLog/AdministrationLogRow';
import AdministrationLogEventModal from '../../components/administrationLog/AdministrationLogEventModal';
import AdministrationLogFiltersBar from '../../components/administrationLog/AdministrationLogFiltersBar';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorPanel, LoadingPanel } from '../../components/ui/ContentPanel';
import { useAdministrationLog } from '../../hooks/administrationLog/useAdministrationLog';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import {
  defaultAdministrationLogFilters,
  filterAdministrationLogEvents,
  type AdministrationLogFiltersState,
} from '../../utils/administrationLog.filters.utils';

export default function AdministrationLogPage() {
  const { groupId } = useParams();
  const { group, loading, error } = useGroupDetail(groupId);
  const { events, loading: loadingLog } = useAdministrationLog(groupId, group?.patientId);
  const [selected, setSelected] = useState<AdministrationLogEvent | null>(null);
  const [filters, setFilters] = useState<AdministrationLogFiltersState>(() =>
    defaultAdministrationLogFilters(),
  );

  const filteredEvents = useMemo(
    () => filterAdministrationLogEvents(events, filters),
    [events, filters],
  );

  const carerOptions = useMemo(() => events.map((e) => e.carerName), [events]);
  const medicationOptions = useMemo(() => events.map((e) => e.medicationName), [events]);

  if (!groupId) {
    return <Navigate to="/groups/list" replace />;
  }

  if (loading) {
    return (
      <section>
        <PageHeader title="Administration log" subtitle="Review recorded medication administrations and history." />
        <LoadingPanel message="Loading group…" />
      </section>
    );
  }

  if (error || !group) {
    return (
      <section>
        <PageHeader title="Administration log" subtitle="Review recorded medication administrations and history." />
        <ErrorPanel message={error ?? 'Group not found.'} />
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        eyebrow="Care group"
        title="Administration log"
        subtitle={`${group.name} — read-only history of medications given, skipped, or marked overdue.`}
      />

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
        <>
          <AdministrationLogFiltersBar
            filters={filters}
            onChange={setFilters}
            carerOptions={carerOptions}
            medicationOptions={medicationOptions}
          />

          {filteredEvents.length === 0 ? (
            <p
              className="mt-6 rounded-xl border bg-white p-6 text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              No events match your filters. Adjust the filters above or use &quot;Clear filters&quot; to see the full
              log.
            </p>
          ) : (
            <div
              className="mt-6 overflow-hidden rounded-xl border bg-white"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
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
                        Scheduled
                      </th>
                      <th className="px-3 py-2 font-bold" scope="col">
                        Recorded
                      </th>
                      <th className="px-3 py-2 text-right font-bold" scope="col">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event) => {
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
        </>
      )}

      <AdministrationLogEventModal
        event={selected}
        onClose={() => setSelected(null)}
        localTimestampLabel={selected ? new Date(selected.occurredAtIso).toLocaleString() : ''}
      />
    </section>
  );
}
