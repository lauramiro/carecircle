import { describe, expect, it, beforeEach } from 'vitest';
import { readStoredTheme, resolveTheme } from './ThemeContext';

describe('ThemeContext helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads a stored theme preference', () => {
    localStorage.setItem('carecircle:theme', 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('falls back to light when nothing is stored and system preference is light', () => {
    expect(resolveTheme(null)).toBe('light');
  });

  it('uses an explicit stored theme over system preference', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });
});
