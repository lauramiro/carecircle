import { motion } from 'framer-motion';
import { ArrowRight, Plus, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GroupRoleBadge from '@components/groups/GroupRoleBadge';
import EmptyState from '@components/ui/EmptyState';
import { ErrorPanel } from '@components/ui/ContentPanel';
import PageHeader from '@components/ui/PageHeader';
import { useGroups } from '@hooks/groups/useGroups';
import { formatDate, formatMemberCount } from '@utils/formatters';
import { getInitialsFromLabel } from '@utils/greeting';
import {
  CARD_VARIANTS,
  STATIC_CARD_VARIANTS,
  STAGGER_CONTAINER_VARIANTS,
  TRANSITIONS,
} from '@lib/animation.constants';
import { useReducedMotion } from '@hooks/useReducedMotion';

function GroupsListSkeleton() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.16, delay: 0.15 }}
      aria-label="Loading groups"
    >
      <span className="sr-only">Loading groups...</span>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-start gap-3">
            <div className="carecircle-skeleton h-11 w-11 rounded-xl" />
            <div className="flex-1">
              <div className="carecircle-skeleton h-4 w-32 rounded" />
              <div className="carecircle-skeleton mt-2 h-3 w-20 rounded" />
            </div>
          </div>
          <div className="carecircle-skeleton mt-4 h-3 w-full rounded" />
          <div className="carecircle-skeleton mt-2 h-3 w-3/4 rounded" />
          <div className="mt-4 flex justify-between border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="carecircle-skeleton h-3 w-20 rounded" />
            <div className="carecircle-skeleton h-3 w-16 rounded" />
          </div>
        </div>
      ))}
    </motion.div>
  );
}

export default function GroupsListPage() {
  const navigate = useNavigate();
  const { groups, loading, error } = useGroups();
  const shouldReduceMotion = useReducedMotion();
  const cardVariants = shouldReduceMotion ? STATIC_CARD_VARIANTS : CARD_VARIANTS;

  if (loading) {
    return (
      <section>
        <PageHeader title="Groups" subtitle="Manage the care circles you belong to." />
        <GroupsListSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <PageHeader title="Groups" subtitle="Manage the care circles you belong to." />
        <ErrorPanel message={error} />
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title="Groups"
        subtitle="Manage the care circles you belong to."
        actions={
          <>
            <span
              className="inline-flex h-10 items-center rounded-lg border bg-white px-4 text-sm font-semibold"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              {groups.length} total
            </span>
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

      {groups.length === 0 ? (
        <EmptyState
          icon={<Users size={24} strokeWidth={1.9} />}
          title="No groups yet"
          description="Groups you create or join will appear here. Start by creating a care circle for someone you support."
          action={
            <Link
              to="/groups/create"
              className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white no-underline"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus size={16} strokeWidth={2} />
              Create group
            </Link>
          }
        />
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          variants={STAGGER_CONTAINER_VARIANTS}
          initial="initial"
          animate="animate"
        >
          {groups.map((group) => (
            <motion.button
              key={group.id}
              type="button"
              onClick={() => navigate(`/groups/${group.id}`)}
              className="group rounded-2xl border bg-white p-5 text-left transition-colors hover:border-[var(--color-primary)]"
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
              <div className="flex items-start gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {getInitialsFromLabel(group.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="truncate text-base font-extrabold">{group.name}</h2>
                    <GroupRoleBadge role={group.role} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {group.description?.trim() || 'No description yet.'}
                  </p>
                </div>
              </div>

              <div
                className="mt-4 flex items-center justify-between border-t pt-3 text-xs font-semibold"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span>{formatDate(group.createdAt)}</span>
                <span className="inline-flex items-center gap-1">
                  {formatMemberCount(group.memberCount)}
                  <ArrowRight
                    size={14}
                    strokeWidth={2}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: 'var(--color-primary)' }}
                  />
                </span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </section>
  );
}
