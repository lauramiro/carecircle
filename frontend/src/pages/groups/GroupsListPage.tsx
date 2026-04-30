import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GroupRoleBadge from '../../components/groups/GroupRoleBadge';
import { useGroups } from '../../hooks/groups/useGroups';
import { formatDate, truncateText } from '../../utils/formatters';

export default function GroupsListPage() {
  const navigate = useNavigate();
  const { groups, loading, error } = useGroups();

  if (loading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Groups</h1>
        <div
          className="mt-6 rounded-xl border bg-white p-6 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Loading groups...
        </div>
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
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => navigate(`/groups/${group.id}`)}
              className="rounded-xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
              style={{
                borderColor: 'var(--color-border)',
                cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold">{group.name}</h2>
                  <p
                    className="mt-1 font-mono text-xs"
                    style={{ color: 'var(--color-text-hint)' }}
                  >
                    {group.id}
                  </p>
                </div>
                <GroupRoleBadge role={group.role} />
              </div>

              <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {truncateText(group.description, 30)}
              </p>

              <div
                className="mt-5 flex items-center justify-between border-t pt-4 text-xs font-semibold"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span>{formatDate(group.createdAt)}</span>
                <span>{group.memberCount} members</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
