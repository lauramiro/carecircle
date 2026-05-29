import { describe, expect, it } from 'vitest';
import { detectBrowserTimezone, getIanaTimezoneOptions } from './ianaTimezones';

describe('ianaTimezones', () => {
  it('getIanaTimezoneOptions includes Europe/London', () => {
    const options = getIanaTimezoneOptions(new Date('2026-01-15T12:00:00Z'));
    expect(options.some((o) => o.value === 'Europe/London')).toBe(true);
  });

  it('detectBrowserTimezone returns a non-empty IANA id', () => {
    const tz = detectBrowserTimezone();
    expect(tz.length).toBeGreaterThan(0);
    expect(getIanaTimezoneOptions().some((o) => o.value === tz)).toBe(true);
  });
});
