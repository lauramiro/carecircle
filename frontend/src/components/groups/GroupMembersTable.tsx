import type { GroupMember } from '../../api/groups/groups.types';
import { getAssignableRolesForMember } from '../../lib/carePermissions';
import { getCareRoleLabel } from '../../lib/careRole';
import { ROLE } from '@typings/role-enum';
import { formatDate } from '../../utils/formatters';

interface GroupMembersTableProps {
  members: GroupMember[];
  currentUserId?: string;
  canManageMembers: boolean;
  onRemoveMember: (member: GroupMember) => void;
  onRoleChange: (member: GroupMember, role: ROLE) => void;
  onStatusChange: (member: GroupMember, status: GroupMember['status']) => void;
  embedded?: boolean;
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
  currentUserId,
  canManageMembers,
  onRemoveMember,
  onRoleChange,
  onStatusChange,
  embedded = false,
}: GroupMembersTableProps) {
  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white ${embedded ? '' : 'mt-5'}`}
      style={{ borderColor: 'var(--color-border)' }}
    >
      {!embedded && (
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
      )}

      {embedded && (
        <div
          className="flex items-center justify-end border-b px-4 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            {members.length} total
          </span>
        </div>
      )}

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
            {members.map((member) => {
              const assignableRoles = getAssignableRolesForMember(member, currentUserId, members);
              const roleSelectDisabled = assignableRoles.length === 1;

              return (
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
                      disabled={roleSelectDisabled}
                      onChange={(event) =>
                        onRoleChange(member, event.target.value as ROLE)
                      }
                      className="h-8 rounded-lg border bg-white px-2 text-xs font-bold"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {getCareRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                      {getCareRoleLabel(member.role)}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
