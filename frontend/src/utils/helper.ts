export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  const visiblePrefix = localPart.slice(0, 2);
  const visibleSuffix = localPart.length > 4 ? localPart.slice(-2) : '';

  return `${visiblePrefix}******${visibleSuffix}@${domain}`;
}
