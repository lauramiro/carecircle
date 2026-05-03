import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('useReducedMotion', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('framer-motion', () => ({
      useReducedMotion: () =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }));
  });

  it('returns true when reduced motion is preferred', async () => {
    mockMatchMedia(true);
    const { useReducedMotion } = await import('./useReducedMotion');

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it('returns false when reduced motion is not preferred', async () => {
    mockMatchMedia(false);
    const { useReducedMotion } = await import('./useReducedMotion');

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});
