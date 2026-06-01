import type { CSSProperties } from 'react';

const SESSIONS_PER_WEEK = 28;

export function shiftCoverageBadgeStyles(hasGaps: boolean): CSSProperties {
  return {
    borderColor: hasGaps ? 'var(--color-status-overdue)' : 'var(--color-border)',
    color: hasGaps ? 'var(--color-status-overdue)' : 'var(--color-text-secondary)',
    backgroundColor: hasGaps ? 'var(--color-status-overdue-bg)' : 'var(--color-card)',
  };
}

export function shiftCoverageBadgeLabel(unassignedCount: number): string {
  if (unassignedCount <= 0) return 'All sessions covered this week';
  return `${unassignedCount} of ${SESSIONS_PER_WEEK} sessions need coverage`;
}

export function shiftAssignmentSelectStyles(isUnassigned: boolean): CSSProperties {
  return {
    borderColor: isUnassigned ? 'var(--color-status-overdue)' : 'var(--color-border)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-input-bg)',
  };
}

export function shiftAssignmentHintStyles(isUnassigned: boolean): CSSProperties {
  return {
    color: isUnassigned ? 'var(--color-status-overdue)' : 'var(--color-text-secondary)',
  };
}

export function shiftAssignmentDayCardStyles(isUnassigned: boolean): CSSProperties {
  return {
    borderColor: isUnassigned ? 'var(--color-status-overdue)' : 'var(--color-border)',
    backgroundColor: 'var(--color-card)',
  };
}
