import type { GroupRole } from '../../api/groups/groups.types';

interface GroupRoleBadgeProps {
  role: GroupRole;
}

export default function GroupRoleBadge({ role }: GroupRoleBadgeProps) {
  const isAdmin = role === 'Admin';

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
      style={{
        backgroundColor: isAdmin ? 'var(--color-primary-light)' : '#EEF6F2',
        color: isAdmin ? 'var(--color-primary)' : '#2F8F6B',
      }}
    >
      {role}
    </span>
  );
}
