export function normalizeTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  return h * 60 + (m || 0);
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function compareTimes(a: string, b: string): number {
  return timeToMinutes(a) - timeToMinutes(b);
}

export function sortTimes(times: string[]): string[] {
  return [...times].sort(compareTimes);
}
