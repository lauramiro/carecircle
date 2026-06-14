export interface TimezoneOption {
  value: string;
  label: string;
}

function formatUtcOffset(timeZone: string, at: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(at);
  const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
  return offset.replace('GMT', 'UTC');
}

/** All IANA time zones supported by the runtime, sorted for display. */
export function getIanaTimezoneOptions(at: Date = new Date()): TimezoneOption[] {
  const zones = Array.from(new Set(['UTC', ...Intl.supportedValuesOf('timeZone')]));
  return zones
    .map((value) => ({
      value,
      label: `${value} (${formatUtcOffset(value, at)})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function detectBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
