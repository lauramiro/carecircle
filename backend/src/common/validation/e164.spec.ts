import { describe, expect, it } from 'vitest';
import { isE164Phone } from './e164';

describe('isE164Phone', () => {
  it('accepts typical E.164 values', () => {
    expect(isE164Phone('+447911123456')).toBe(true);
    expect(isE164Phone('+12025550123')).toBe(true);
  });

  it('rejects invalid inputs', () => {
    expect(isE164Phone('07911123456')).toBe(false);
    expect(isE164Phone('+')).toBe(false);
    expect(isE164Phone('+01234')).toBe(false);
    expect(isE164Phone('')).toBe(false);
    expect(isE164Phone('+1')).toBe(false);
  });
});
