import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type FontSize = 'standard' | 'large' | 'extra-large';

export const FONT_SIZE_STORAGE_KEY = 'carecircle:font-size';

const VALID_FONT_SIZES: FontSize[] = ['standard', 'large', 'extra-large'];

interface FontSizeContextValue {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

export function readStoredFontSize(): FontSize | null {
  const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
  if (stored && VALID_FONT_SIZES.includes(stored as FontSize)) {
    return stored as FontSize;
  }
  return null;
}

export function resolveFontSize(stored: FontSize | null = readStoredFontSize()): FontSize {
  return stored ?? 'standard';
}

function applyFontSize(fontSize: FontSize) {
  if (fontSize === 'standard') {
    document.documentElement.removeAttribute('data-font-size');
  } else {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => resolveFontSize());

  useEffect(() => {
    applyFontSize(fontSize);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  const value = useMemo(
    () => ({
      fontSize,
      setFontSize: (nextSize: FontSize) => setFontSizeState(nextSize),
    }),
    [fontSize],
  );

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useFontSize() {
  const context = useContext(FontSizeContext);

  if (!context) {
    throw new Error('useFontSize must be used within FontSizeProvider');
  }

  return context;
}
