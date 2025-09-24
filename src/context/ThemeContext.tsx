"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeClasses(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const hasDark = root.classList.contains('dark');
      const hasLight = root.classList.contains('light');
      if (hasDark || hasLight) {
        // Adota o que já foi definido no index.html (evita alternância na montagem)
        return hasDark;
      }
      // Fallback (não deve acontecer por causa do script do index.html)
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialDark = saved ? saved === 'dark' : prefersDark;
      applyThemeClasses(initialDark);
      return initialDark;
    }
    return false;
  });

  useEffect(() => {
    applyThemeClasses(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};