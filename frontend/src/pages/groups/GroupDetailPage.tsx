import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { CalendarDays, Hash, Users } from 'lucide-react';
import GroupRoleBadge from '../../components/groups/GroupRoleBadge';
import InviteMemberModal from '../../components/groups/InviteMemberModal';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { formatDate } from '../../utils/formatters';

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const { group, loading, error } = useGroupDetail(groupId);
  const [inviteOpen, setInviteOpen] = useState(false);

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

  const canInvite = group.members.length < 8;

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
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
            {group.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {group.description}
          </p>
        </div>

        {canInvite && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="h-10 rounded-lg px-4 text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Invite Member
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Hash size={20} strokeWidth={1.9} color="var(--color-primary)" />
          <p className="mt-3 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Group ID
          </p>
          <p className="mt-1 font-mono text-sm">{group.id}</p>
        </article>

        <article
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <CalendarDays size={20} strokeWidth={1.9} color="var(--color-primary)" />
          <p className="mt-3 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Created
          </p>
          <p className="mt-1 text-sm font-bold">{formatDate(group.createdAt)}</p>
        </article>

        <article
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Users size={20} strokeWidth={1.9} color="var(--color-primary)" />
          <p className="mt-3 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Members
          </p>
          <p className="mt-1 text-sm font-bold">{group.members.length}</p>
        </article>

        <article
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Your Role
          </p>
          <div className="mt-3">
            <GroupRoleBadge role={group.role} />
          </div>
        </article>
      </div>

      <InviteMemberModal
        groupId={group.id}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </section>
  );
}
