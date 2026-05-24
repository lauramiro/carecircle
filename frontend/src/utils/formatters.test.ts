import { describe, expect, it } from 'vitest';
import { formatDate, formatLocalDateTime, truncateText } from './formatters';

describe('formatters', () => {
  it('formats dates with day, short month, and year', () => {
    expect(formatDate('2025-05-12T09:00:00.000Z')).toBe('12 May 2025');
  });

  it('formats local timestamps with date and time', () => {
    expect(
      formatLocalDateTime('2025-05-12T09:00:00.000Z', { timeZone: 'UTC' }),
    ).toBe('12 May 2025, 09:00');
  });

  it('truncates long text with an ellipsis', () => {
    expect(truncateText('Daily support and medication coordination', 30)).toBe(
      'Daily support and medication…',
    );
  });

  it('does not truncate short text', () => {
    expect(truncateText('Short text', 30)).toBe('Short text');
  });
});
