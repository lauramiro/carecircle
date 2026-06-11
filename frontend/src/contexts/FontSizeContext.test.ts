import { describe, expect, it, beforeEach } from 'vitest';
import { readStoredFontSize, resolveFontSize } from './FontSizeContext';

describe('FontSizeContext helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads a stored font size preference', () => {
    localStorage.setItem('carecircle:font-size', 'large');
    expect(readStoredFontSize()).toBe('large');
  });

  it('reads extra-large from storage', () => {
    localStorage.setItem('carecircle:font-size', 'extra-large');
    expect(readStoredFontSize()).toBe('extra-large');
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredFontSize()).toBeNull();
  });

  it('returns null for an unrecognised stored value', () => {
    localStorage.setItem('carecircle:font-size', 'huge');
    expect(readStoredFontSize()).toBeNull();
  });

  it('defaults to standard when no stored preference', () => {
    expect(resolveFontSize(null)).toBe('standard');
  });

  it('returns the explicit font size when provided', () => {
    expect(resolveFontSize('large')).toBe('large');
    expect(resolveFontSize('extra-large')).toBe('extra-large');
    expect(resolveFontSize('standard')).toBe('standard');
  });
});
