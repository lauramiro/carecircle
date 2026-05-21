import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import MedicationChecklist from '../../components/checklist/MedicationChecklist';
import DateNavigation from '../../components/checklist/DateNavigation';
import { loadDailyChecklist } from '../../api/checklist/dailyChecklist.service';
import type { ChecklistItem } from '../../lib/checklist';
import { toLocalDateString } from '../../lib/dates';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';

function mapChecklistUserRole(groupRole: string): 'primary' | 'secondary' | 'observer' {
  if (groupRole === 'Admin') return 'primary';
  if (groupRole === 'Observer') return 'observer';
  return 'secondary';
}

export default function MedicationChecklistPage() {
  const { groupId } = useParams();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const { group, loading: groupLoading, error: groupError } = useGroupDetail(groupId);
  const [checklistView, setChecklistView] = useState<{ id: string; date: string } | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [resolvingChecklist, setResolvingChecklist] = useState(true);
  const loadRequestRef = useRef(0);

  const selectedDateStr = useMemo(() => toLocalDateString(selectedDate), [selectedDate]);
  const patientId = group?.patientId ?? '';

  useEffect(() => {
    const requestId = ++loadRequestRef.current;
    let active = true;

    void (async () => {
      if (!patientId || !groupId) {
        if (!active || requestId !== loadRequestRef.current) return;
        setChecklistView(null);
        setChecklistItems([]);
        setResolvingChecklist(false);
        return;
      }

      setResolvingChecklist(true);

      try {
        const { checklistId, items } = await loadDailyChecklist({
          patientId,
          groupId,
          checklistDate: selectedDateStr,
        });

        if (!active || requestId !== loadRequestRef.current) return;
        setChecklistView(checklistId ? { id: checklistId, date: selectedDateStr } : null);
        setChecklistItems(items);
      } catch {
        if (!active || requestId !== loadRequestRef.current) return;
        toast.error('Failed to load checklist. Please try again.');
        setChecklistView(null);
        setChecklistItems([]);
      } finally {
        if (active && requestId === loadRequestRef.current) {
          setResolvingChecklist(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [patientId, groupId, selectedDateStr]);

  if (!groupId) {
    return <Navigate to="/groups/list" replace />;
  }

  if (groupLoading) {
    return (
      <section>
        <h1 style={{ color: 'var(--color-text-primary)', fontSize: '26px', fontWeight: 800, margin: 0 }}>
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
        <h1 style={{ color: 'var(--color-text-primary)', fontSize: '26px', fontWeight: 800, margin: 0 }}>
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

  const checklistUserRole = mapChecklistUserRole(group.role);
  const isChecklistStale = checklistView !== null && checklistView.date !== selectedDateStr;

  return (
    <section>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-hint)' }}>
        Care group
      </p>
      <h1 style={{ color: 'var(--color-text-primary)', fontSize: '26px', fontWeight: 800, margin: 0 }}>
        {group.name}
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Mark each dose as given (on time or late), skip with a reason, or add optional notes and photo proof.
        Use the arrows to browse other weeks.
      </p>

      <div className="mt-6">
        <DateNavigation selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </div>

      {resolvingChecklist && !checklistView ? (
        <div
          className="rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Loading checklist for {selectedDateStr}…
        </div>
      ) : !checklistView ? (
        <div
          className="rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          No checklist exists for this day yet. Add medications in the{' '}
          <Link to={`/groups/${groupId}/medications`} className="font-bold" style={{ color: 'var(--color-primary)' }}>
            medication schedule
          </Link>
          .
        </div>
      ) : (
        <MedicationChecklist
          checklistId={checklistView.id}
          checklistDate={checklistView.date}
          userRole={checklistUserRole}
          isLoading={resolvingChecklist || isChecklistStale}
          items={checklistItems}
          onItemsChange={setChecklistItems}
          loadingLabel={`Loading checklist for ${selectedDateStr}…`}
        />
      )}
    </section>
  );
}
