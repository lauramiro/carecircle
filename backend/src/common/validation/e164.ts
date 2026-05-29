/**
 * Validates ITU-T E.164-style numbers with leading + (common Twilio input).
 * Does not validate country-specific length rules beyond a sensible range.
 */
export function isE164Phone(value: string): boolean {
  const v = value.trim();
  return /^\+[1-9]\d{7,14}$/.test(v);
}
