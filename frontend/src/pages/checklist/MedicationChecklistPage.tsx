import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import MedicationChecklist from '../../components/checklist/MedicationChecklist';
import DateNavigation from '../../components/checklist/DateNavigation';
import { loadDailyChecklist } from '../../api/checklist/dailyChecklist.service';
import type { ChecklistItem, ChecklistDoseStatus } from '../../lib/checklist';
import { parseLocalDateString, toLocalDateString } from '../../lib/dates';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorPanel, LoadingPanel } from '../../components/ui/ContentPanel';

export default function MedicationChecklistPage() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightItemId = searchParams.get('item') ?? undefined;
  const dateParam = searchParams.get('date');
  const filterParam = searchParams.get('filter') as ChecklistDoseStatus | null;
  const filterStatus = filterParam === 'overdue' || filterParam === 'due' || filterParam === 'given' || filterParam === 'skipped'
    ? filterParam
    : undefined;
  const [selectedDate, setSelectedDate] = useState(() =>
    dateParam ? parseLocalDateString(dateParam) : new Date(),
  );
  const { group, loading: groupLoading, error: groupError } = useGroupDetail(groupId);
  const [checklistView, setChecklistView] = useState<{ id: string; date: string } | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [resolvingChecklist, setResolvingChecklist] = useState(true);
  const loadRequestRef = useRef(0);

  const selectedDateStr = useMemo(() => toLocalDateString(selectedDate), [selectedDate]);
  const patientId = group?.patientId ?? '';

  useEffect(() => {
    if (dateParam) {
      setSelectedDate(parseLocalDateString(dateParam));
    }
  }, [dateParam]);

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
        <PageHeader title="Daily medication checklist" subtitle="Track doses and mark medications as given." />
        <LoadingPanel message="Loading group…" />
      </section>
    );
  }

  if (groupError || !group) {
    return (
      <section>
        <PageHeader title="Daily medication checklist" subtitle="Track doses and mark medications as given." />
        <ErrorPanel message={groupError ?? 'Group not found.'} />
      </section>
    );
  }

  const isChecklistStale = checklistView !== null && checklistView.date !== selectedDateStr;

  return (
    <section>
      <PageHeader
        eyebrow="Care group"
        title={group.name}
        subtitle="Mark each dose as given, skip with a reason, or add optional notes and photo proof. Use the arrows to browse other days."
      />

      <div className="mt-2">
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
          userRole={group.role}
          isLoading={resolvingChecklist || isChecklistStale}
          items={checklistItems}
          onItemsChange={setChecklistItems}
          loadingLabel={`Loading checklist for ${selectedDateStr}…`}
          highlightItemId={highlightItemId}
          filterStatus={filterStatus}
        />
      )}
    </section>
  );
}
