import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  NotebookText,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import GPContactSection from '../../components/groups/GPContactSection';
import GroupRoleBadge from '../../components/groups/GroupRoleBadge';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useGPContacts } from '../../hooks/groups/useGPContacts';
import { formatDate, formatMemberCount } from '../../utils/formatters';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { canManageMembers, isJournalReadOnly } from '../../lib/carePermissions';

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  href?: string;
}

function StatTile({ icon, label, value, href }: StatTileProps) {
  const content = (
    <>
      <div className="flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      </div>
      <div className="mt-2 text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </div>
    </>
  );

  const className = 'rounded-xl border px-4 py-3 text-left transition-colors hover:border-[var(--color-primary)]';

  if (href) {
    return (
      <Link
        to={href}
        className={className}
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          textDecoration: 'none',
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={className}
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
    >
      {content}
    </div>
  );
}

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { group, loading, error } = useGroupDetail(groupId);
  const {
    contacts: gpContacts,
    isSubmitting: gpContactSubmitting,
    addGP,
    updateGP,
    removeGP,
  } = useGPContacts(groupId ?? '', group?.gpContacts ?? []);
  const shouldReduceMotion = useReducedMotion();

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (loading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Group Details</h1>
        <div
          className="mt-6 rounded-xl border bg-white p-6 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Loading group details...
        </div>
      </section>
    );
  }

  if (error || !group) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Group Details</h1>
        <div
          className="mt-6 rounded-xl border p-6 text-sm"
          style={{
            borderColor: 'var(--color-status-critical)',
            backgroundColor: 'var(--color-status-critical-bg)',
            color: 'var(--color-status-critical)',
          }}
        >
          {error ?? 'Group not found.'}
        </div>
      </section>
    );
  }

  const members = group.members;
  const canManageMembersFlag = canManageMembers(group.role);
  const basePath = `/groups/${group.id}`;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="truncate"
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              {group.name}
            </h1>
            <GroupRoleBadge role={group.role} />
          </div>
          {group.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {group.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--color-text-hint)' }}>
            Created {formatDate(group.createdAt)} · {formatMemberCount(members.length)}
          </p>
        </div>
      </header>

      <article
        className="overflow-hidden rounded-2xl border bg-white"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="border-b px-6 py-5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-primary-light)' }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: 'var(--color-primary)' }}
              >
                Today&apos;s care
              </p>
              <h2 className="mt-1 text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                Medication checklist
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Review due doses, mark medications as given, and stay on top of the daily schedule.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <motion.button
                type="button"
                onClick={() => navigate(`${basePath}/checklist`)}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              >
                <ClipboardList size={16} strokeWidth={2} />
                Today&apos;s medications
              </motion.button>
              {canManageMembersFlag && (
                <motion.button
                  type="button"
                  onClick={() => navigate(`${basePath}/medications/add`)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                >
                  <Plus size={16} strokeWidth={2} />
                  Add medication
                </motion.button>
              )}
              
              <motion.button
                  type="button"
                  onClick={() => navigate(`${basePath}/hospital-summary`)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}>
                  <FileText size={16} strokeWidth={2} />
                  Hospital summary
              </motion.button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={<Users size={16} strokeWidth={2} />}
            label="Members"
            value={members.length}
            href={`${basePath}/members`}
          />
          <StatTile
            icon={<CalendarDays size={16} strokeWidth={2} />}
            label="Created"
            value={formatDate(group.createdAt)}
          />
          <StatTile
            icon={<NotebookText size={16} strokeWidth={2} />}
            label="Handover"
            value={isJournalReadOnly(group.role) ? 'Read-only access' : 'Read & write'}
          />
          <StatTile
            icon={<Sparkles size={16} strokeWidth={2} />}
            label="GP contacts"
            value={gpContacts.length}
          />
        </div>
      </article>

      <GPContactSection
        groupId={group.id}
        gpContacts={gpContacts}
        userRole={group.role}
        isSubmitting={gpContactSubmitting}
        onAddGP={addGP}
        onUpdateGP={updateGP}
        onRemoveGP={removeGP}
      />
    </section>
  );
}
