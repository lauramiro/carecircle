export function getNameFromEmail(email?: string | null): string {
  if (!email) return 'Caregiver';

  const localPart = email.split('@')[0]?.trim();
  if (!localPart) return 'Caregiver';

  const normalized = localPart.replace(/[._-]+/g, ' ').trim();
  if (!normalized) return 'Caregiver';

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getTimeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getPersonalizedGreeting(email?: string | null, date = new Date()): string {
  return `${getTimeOfDayGreeting(date)}, ${getNameFromEmail(email)}`;
}

export function getInitialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return 'CC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
