import { motion } from 'framer-motion';
import { ArrowRight, FolderOpen, Plus, Shield, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import { LoadingPanel } from '../components/ui/ContentPanel';
import GroupRoleBadge from '../components/groups/GroupRoleBadge';
import MedicationSummaryWidget from '../components/dashboard/MedicationSummaryWidget';
import OnDutyCarerWidget from '../components/dashboard/OnDutyCarerWidget';
import NextAppointmentWidget from '../components/dashboard/NextAppointmentWidget';
import LatestJournalEntryWidget from '../components/dashboard/LatestJournalEntryWidget';
import AiInsightWidget from '../components/dashboard/AiInsightWidget';
import MyShiftsTodayWidget from '../components/shifts/MyShiftsTodayWidget';
import ShiftCoverageAlerts from '../components/shifts/ShiftCoverageAlerts';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../hooks/groups/useGroups';
import { canAssignShifts, canManageMembers } from '../lib/carePermissions';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useDashboardShiftWarnings } from '../hooks/shifts/useDashboardShiftWarnings';
import {
  CARD_VARIANTS,
  STATIC_CARD_VARIANTS,
  STAGGER_CONTAINER_VARIANTS,
  TRANSITIONS,
} from '../lib/animation.constants';
import { getPersonalizedGreeting } from '../utils/greeting';
import { formatDate, formatMemberCount, truncateText } from '../utils/formatters';

export default function DashboardPage() {
  const { session } = useAuth();
  const { groups, loading, error } = useGroups();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const cardVariants = shouldReduceMotion ? STATIC_CARD_VARIANTS : CARD_VARIANTS;
  const { warnings, loading: warningsLoading, error: warningsError } = useDashboardShiftWarnings();
  const managedGroups = groups.filter((group) => canManageMembers(group.role)).length;
  const totalMembers = groups.reduce((sum, group) => sum + group.memberCount, 0);
  const recentGroups = groups.slice(0, 3);
  const primaryGroup = groups[0] ?? null;
  const shiftManagerGroups = groups.filter((group) => canAssignShifts(group.role));

  if (loading) {
    return (
      <section>
        <PageHeader
          title={getPersonalizedGreeting(session?.user?.email)}
          subtitle="Here's an overview of your care circles today."
          showDate
        />
        <LoadingPanel message="Loading your care circles..." />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <PageHeader title="Dashboard" subtitle="Here's an overview of your care circles today." showDate />
        <div
          className="rounded-xl border p-6 text-sm"
          style={{
            borderColor: 'var(--color-status-critical)',
            backgroundColor: 'var(--color-status-critical-bg)',
            color: 'var(--color-status-critical)',
          }}
        >
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={getPersonalizedGreeting(session?.user?.email)}
        subtitle="Here's an overview of your care circles today."
        showDate
        actions={
          <>
            <Link
              to="/groups/list"
              className="inline-flex h-10 items-center rounded-lg border bg-white px-4 text-sm font-bold no-underline"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              All groups
            </Link>
            <Link
              to="/groups/create"
              className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white no-underline"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus size={16} strokeWidth={2} />
              Create group
            </Link>
          </>
        }
      />

      {primaryGroup && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <MedicationSummaryWidget
              groupId={primaryGroup.id}
              patientId={primaryGroup.patientId}
              groupName={primaryGroup.name}
            />
            <OnDutyCarerWidget
              groupId={primaryGroup.id}
              groupName={primaryGroup.name}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <NextAppointmentWidget
              patientId={primaryGroup.patientId}
              groupId={primaryGroup.id}
              groupName={primaryGroup.name}
            />
            <LatestJournalEntryWidget
              groupId={primaryGroup.id}
              groupName={primaryGroup.name}
            />
            <AiInsightWidget
              patientId={primaryGroup.patientId}
              groupId={primaryGroup.id}
              groupName={primaryGroup.name}
            />
          </div>

          <MyShiftsTodayWidget
            groups={groups.map((group) => ({ id: group.id, name: group.name }))}
          />
        </>
      )}

      <motion.div
        className="grid gap-4 md:grid-cols-3"
        variants={STAGGER_CONTAINER_VARIANTS}
        initial="initial"
        animate="animate"
      >
        <StatCard
          icon={<Users size={20} strokeWidth={1.9} />}
          value={groups.length}
          label="Active groups"
          variants={cardVariants}
        />
        <StatCard
          icon={<Shield size={20} strokeWidth={1.9} />}
          value={managedGroups}
          label="Groups you manage"
          variants={cardVariants}
        />
        <StatCard
          icon={<FolderOpen size={20} strokeWidth={1.9} />}
          value={totalMembers}
          label="Total members"
          variants={cardVariants}
        />
      </motion.div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Recent care circles
          </h2>
          {groups.length > 0 ? (
            <Link
              to="/groups/list"
              className="inline-flex items-center gap-1 text-sm font-semibold no-underline"
              style={{ color: 'var(--color-primary)' }}
            >
              View all
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          ) : null}
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={<Users size={24} strokeWidth={1.9} />}
            title="No care circles yet"
            description="Create your first group to start coordinating medications, appointments, and handover notes."
            action={
              <Link
                to="/groups/create"
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white no-underline"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus size={16} strokeWidth={2} />
                Create your first group
              </Link>
            }
          />
        ) : (
          <motion.div
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            variants={STAGGER_CONTAINER_VARIANTS}
            initial="initial"
            animate="animate"
          >
            {recentGroups.map((group) => (
              <motion.button
                key={group.id}
                type="button"
                onClick={() => navigate(`/groups/${group.id}`)}
                className="rounded-xl border bg-white p-4 text-left"
                style={{
                  borderColor: 'var(--color-border)',
                  cursor: 'pointer',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
                variants={cardVariants}
                transition={TRANSITIONS.card}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : { y: -2, boxShadow: '0 8px 22px rgba(26, 35, 50, 0.08)' }
                }
                whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-extrabold">{group.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {truncateText(group.description || 'No description yet.', 72)}
                    </p>
                  </div>
                  <GroupRoleBadge role={group.role} />
                </div>
                <div
                  className="mt-4 flex items-center justify-between border-t pt-3 text-xs font-semibold"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span>{formatDate(group.createdAt)}</span>
                  <span>{formatMemberCount(group.memberCount)}</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </section>

      {shiftManagerGroups.length > 0 && (
        <ShiftCoverageAlerts
          warnings={warnings}
          loading={warningsLoading}
          error={warningsError}
        />
      )}
    </section>
  );
}
