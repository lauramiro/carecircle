import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import ShiftHandoverList from '../components/shifts/ShiftHandoverList';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../hooks/groups/useGroups';
import { useMyShifts } from '../hooks/shifts/useMyShifts';
import { LoadingPanel } from '../components/ui/ContentPanel';

type ShiftTab = 'today' | 'upcoming' | 'history';

export default function MyShiftsPage() {
  const { session } = useAuth();
  const { groups, loading: groupsLoading } = useGroups();
  const primaryGroup = groups[0] ?? null;
  const caregiverId = session?.user?.id;
  const [activeTab, setActiveTab] = useState<ShiftTab>('today');

  const { todayShifts, upcomingShifts, historyShifts, loading, error } = useMyShifts(
    caregiverId,
    primaryGroup?.id,
  );

  if (groupsLoading) {
    return (
      <section>
        <PageHeader title="My shifts" subtitle="Your assigned care shifts across your groups." showDate />
        <LoadingPanel message="Loading your shifts..." />
      </section>
    );
  }

  const tabs: Array<{ id: ShiftTab; label: string; shifts: typeof todayShifts; empty: string }> = [
    { id: 'today', label: 'Today', shifts: todayShifts, empty: 'No shifts assigned for today.' },
    { id: 'upcoming', label: 'Upcoming', shifts: upcomingShifts, empty: 'No upcoming shifts scheduled.' },
    { id: 'history', label: 'History', shifts: historyShifts, empty: 'No past shifts recorded yet.' },
  ];

  const current = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <section className="space-y-6">
      <PageHeader
        title="My shifts"
        subtitle={
          primaryGroup
            ? `Shift roster and handovers for ${primaryGroup.name}.`
            : 'Join a care group to see your shift roster.'
        }
        showDate
      />

      {!primaryGroup && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          You are not in any care groups yet.
        </p>
      )}

      {primaryGroup && (
        <>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'white',
                  color: activeTab === tab.id ? 'white' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading && <LoadingPanel message="Loading your shifts..." />}

          {!loading && error && (
            <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
              {error}
            </p>
          )}

          {!loading && !error && (
            <ShiftHandoverList shifts={current.shifts} emptyMessage={current.empty} />
          )}
        </>
      )}
    </section>
  );
}
