/** Calendar date in the user's local timezone (YYYY-MM-DD). */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as local midnight. */
export function parseLocalDateString(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}
