import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getCookie, setCookie } from '../lib/cookies';

// Three modes: 'system' follows the OS (prefers-color-scheme); 'light'/'dark'
// force a theme. First load defaults to 'system'. The choice is stamped on
// <html data-theme> and CSS (tokens.css) does the rest.
export type ThemeMode = 'system' | 'light' | 'dark';

const COOKIE_KEY = 'selectedTheme';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function readStoredTheme(): ThemeMode {
  const saved = getCookie(COOKIE_KEY);
  return isMode(saved) ? saved : 'system';
}

/**
 * Reflect the mode onto <html>. 'system' removes the attribute so the
 * prefers-color-scheme media query governs (and live OS changes apply).
 * Exported so main.tsx can call it before first paint to avoid a flash.
 */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    setCookie(COOKIE_KEY, next);
    setThemeState(next);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system';
      setCookie(COOKIE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, cycleTheme }),
    [theme, setTheme, cycleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
