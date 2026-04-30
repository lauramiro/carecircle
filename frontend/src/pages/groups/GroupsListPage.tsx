import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GroupRoleBadge from '../../components/groups/GroupRoleBadge';
import { useGroups } from '../../hooks/groups/useGroups';
import { formatDate, truncateText } from '../../utils/formatters';
import {
  CARD_VARIANTS,
  STATIC_CARD_VARIANTS,
  STAGGER_CONTAINER_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

function GroupsListSkeleton() {
  const shouldReduceMotion = useReducedMotion();

  return (
    // The delay avoids flashing skeletons for fast mock/API responses.
    <motion.div
      className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.16, delay: 0.15 }}
      aria-label="Loading groups"
    >
      <span className="sr-only">Loading groups...</span>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border bg-white p-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="carecircle-skeleton h-4 w-32 rounded" />
          <div className="carecircle-skeleton mt-2 h-3 w-24 rounded" />
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
        <h1 className="text-2xl font-extrabold">Groups</h1>
        <GroupsListSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Groups</h1>
        <div
          className="mt-6 rounded-xl border p-6 text-sm"
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
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Groups
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Manage the care circles you belong to.
          </p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div
          className="rounded-xl border bg-white p-8 text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Users className="mx-auto mb-3" color="var(--color-primary)" size={28} />
          <p className="font-bold">No groups yet</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Groups you create or join will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Stagger keeps dense cards readable as the list appears. */}
          <motion.div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            variants={STAGGER_CONTAINER_VARIANTS}
            initial="initial"
            animate="animate"
          >
            {groups.map((group) => (
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold">{group.name}</h2>
                  <p
                    className="mt-1 font-mono text-xs"
                    style={{ color: 'var(--color-text-hint)' }}
                  >
                    {group.id}
                  </p>
                </div>
                <GroupRoleBadge role={group.role} />
              </div>

              <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {truncateText(group.description, 30)}
              </p>

              <div
                className="mt-4 flex items-center justify-between border-t pt-3 text-xs font-semibold"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span>{formatDate(group.createdAt)}</span>
                <span>{group.memberCount} members</span>
              </div>
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </section>
  );
}
