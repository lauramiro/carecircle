import { describe, expect, it } from 'vitest';
import { getInitialsFromLabel, getNameFromEmail, getPersonalizedGreeting } from './greeting';

describe('greeting', () => {
  it('derives a display name from an email address', () => {
    expect(getNameFromEmail('obinna.ezedei@gmail.com')).toBe('Obinna Ezedei');
    expect(getNameFromEmail(null)).toBe('Caregiver');
  });

  it('builds initials from a label', () => {
    expect(getInitialsFromLabel('Dad Care Circle')).toBe('DC');
    expect(getInitialsFromLabel('Mum')).toBe('MU');
  });

  it('builds a personalized greeting', () => {
    const greeting = getPersonalizedGreeting('sarah.care@example.com', new Date('2026-05-24T09:00:00'));
    expect(greeting).toBe('Good morning, Sarah Care');
  });
});
