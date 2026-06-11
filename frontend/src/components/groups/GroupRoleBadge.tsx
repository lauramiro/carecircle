import { getCareRoleLabel } from '../../lib/careRole';
import { ROLE } from '@typings/role-enum';

interface GroupRoleBadgeProps {
  role: ROLE;
}

export default function GroupRoleBadge({ role }: GroupRoleBadgeProps) {
  const isPrimary = role === ROLE.PRIMARY_CAREGIVER;

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
      style={{
        backgroundColor: isPrimary ? 'var(--color-primary-light)' : '#EEF6F2',
        color: isPrimary ? 'var(--color-primary)' : '#2F8F6B',
      }}
    >
      {getCareRoleLabel(role)}
    </span>
  );
}
