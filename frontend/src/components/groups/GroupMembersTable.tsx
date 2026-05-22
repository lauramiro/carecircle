import type { GroupMember, GroupRole } from '../../api/groups/groups.types';
import { formatDate } from '../../utils/formatters';

const MANAGEABLE_ROLES: GroupRole[] = ['Admin', 'Member', 'Observer'];

interface GroupMembersTableProps {
  members: GroupMember[];
  canManageMembers: boolean;
  onRemoveMember: (member: GroupMember) => void;
  onRoleChange: (member: GroupMember, role: GroupRole) => void;
  onStatusChange: (member: GroupMember, status: GroupMember['status']) => void;
}

function StatusPill({ status }: { status: GroupMember['status'] }) {
  const suspended = status === 'Suspended';

  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{
        backgroundColor: suspended
          ? 'var(--color-status-overdue-bg)'
          : 'var(--color-primary-light)',
        color: suspended ? 'var(--color-status-overdue)' : 'var(--color-primary)',
      }}
    >
      {status}
    </span>
  );
}

export default function GroupMembersTable({
  members,
  canManageMembers,
  onRemoveMember,
  onRoleChange,
  onStatusChange,
}: GroupMembersTableProps) {
  return (
    <section
      className="mt-5 overflow-hidden rounded-xl border bg-white"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h2 className="text-base font-extrabold">Members</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Manage group access, roles, and member status.
          </p>
        </div>
        <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
          {members.length} total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr
              className="border-b text-[11px] uppercase tracking-wide"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-hint)',
              }}
            >
              <th className="px-4 py-2 font-bold">Name</th>
              <th className="px-4 py-2 font-bold">Email</th>
              <th className="px-4 py-2 font-bold">Join Date</th>
              <th className="px-4 py-2 font-bold">Role</th>
              {canManageMembers && <th className="px-4 py-2 font-bold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b last:border-b-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{member.name}</span>
                    <StatusPill status={member.status} />
                  </div>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {member.email}
                </td>
                <td className="px-4 py-3 text-xs font-semibold">
                  {formatDate(member.joinedAt)}
                </td>
                <td className="px-4 py-3">
                  {canManageMembers ? (
                    <select
                      aria-label={`Change role for ${member.name}`}
                      value={member.role}
                      onChange={(event) =>
                        onRoleChange(member, event.target.value as GroupRole)
                      }
                      className="h-8 rounded-lg border bg-white px-2 text-xs font-bold"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {MANAGEABLE_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                      {Object.values(ROLE).map((role) => <option key={role} value={role}>{mapRole(role)}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                      {member.role}
                    </span>
                  )}
                </td>
                {canManageMembers && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onRemoveMember(member)}
                        className="h-8 rounded-lg border px-3 text-xs font-bold"
                        style={{
                          borderColor: 'var(--color-status-critical)',
                          color: 'var(--color-status-critical)',
                        }}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onStatusChange(
                            member,
                            member.status === 'Suspended' ? 'Active' : 'Suspended',
                          )
                        }
                        className="h-8 rounded-lg border px-3 text-xs font-bold"
                        style={{
                          borderColor: 'var(--color-border)',
                          color:
                            member.status === 'Suspended'
                              ? 'var(--color-primary)'
                              : 'var(--color-status-overdue)',
                        }}
                      >
                        {member.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
