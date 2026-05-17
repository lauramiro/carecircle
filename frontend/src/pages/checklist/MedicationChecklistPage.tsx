import { useEffect, useState } from 'react';
import { Navigate, Link, useParams } from 'react-router-dom';
import MedicationChecklist from '../../components/checklist/MedicationChecklist';
import DateNavigation from '../../components/checklist/DateNavigation';
import { fetchDailyChecklistId } from '../../api/checklist/dailyChecklist.service';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MedicationChecklistPage() {
  const { groupId } = useParams();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const { group, loading: groupLoading, error: groupError } = useGroupDetail(groupId);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [resolvingChecklist, setResolvingChecklist] = useState(true);

  useEffect(() => {
    if (!group?.patientId || !groupId) {
      setChecklistId(null);
      setResolvingChecklist(false);
      return;
    }

    let active = true;
    setResolvingChecklist(true);
    const dateStr = toLocalDateString(selectedDate);

    void (async () => {
      const id = await fetchDailyChecklistId({
        patientId: group.patientId,
        groupId,
        checklistDate: dateStr,
      });
      if (!active) return;
      setChecklistId(id);
      setResolvingChecklist(false);
    })();

    return () => {
      active = false;
    };
  }, [group?.patientId, groupId, selectedDate]);

  if (!groupId) {
    return <Navigate to="/groups/list" replace />;
  }

  if (groupLoading) {
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
          Daily medication checklist
        </h1>
        <div
          className="mt-6 rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Loading group…
        </div>
      </section>
    );
  }

  if (groupError || !group) {
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
          Daily medication checklist
        </h1>
        <div
          className="mt-6 rounded-xl border p-6 text-sm"
          style={{
            borderColor: 'var(--color-status-critical)',
            backgroundColor: 'var(--color-status-critical-bg)',
            color: 'var(--color-status-critical)',
          }}
        >
          {groupError ?? 'Group not found.'}
        </div>
      </section>
    );
  }

  const checklistUserRole = group.role === 'Admin' ? 'primary' : 'secondary';

  return (
    <section>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-hint)' }}>
        Care group
      </p>
      <h1
        style={{
          color: 'var(--color-text-primary)',
          fontSize: '26px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: 0,
        }}
      >
        {group.name}
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Mark each dose as given with a photo, or skip with a reason. Use the arrows or pills to review the last seven
        days.
      </p>

      <div className="mt-6">
        <DateNavigation selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </div>

      {resolvingChecklist ? (
        <div
          className="rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Loading checklist for {toLocalDateString(selectedDate)}…
        </div>
      ) : !checklistId ? (
        <div
          className="rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          No checklist exists for this day yet. This usually appears after the nightly checklist job runs for active
          medications, or once medications are saved for this patient. You can still review the{' '}
          <Link to={`/groups/${groupId}/medications`} className="font-bold" style={{ color: 'var(--color-primary)' }}>
            medication schedule
          </Link>
          .
        </div>
      ) : (
        <MedicationChecklist checklistId={checklistId} userRole={checklistUserRole} />
      )}
    </section>
  );
}
