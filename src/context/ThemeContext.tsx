/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
  fontScale: number;
  setFontScale: (scale: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('obra_engep_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    return 'light';
  });

  const [fontScale, setFontScaleState] = useState<number>(() => {
    const saved = localStorage.getItem('obra_engep_font_scale');
    return saved ? Number(saved) : 100;
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'dark' | 'light' =
    theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.classList.toggle('light', resolvedTheme === 'light');
    document.body.style.backgroundColor = 'var(--page)';
    document.body.style.color = 'var(--ink)';
    root.style.fontSize = `${(16 * fontScale) / 100}px`;
  }, [resolvedTheme, fontScale]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('obra_engep_theme', mode);
  };

  const setFontScale = (scale: number) => {
    setFontScaleState(scale);
    localStorage.setItem('obra_engep_font_scale', scale.toString());
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, fontScale, setFontScale }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
