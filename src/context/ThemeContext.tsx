"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Função para obter o tema inicial, garantindo que o estado do React comece sincronizado com o DOM.
const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    // Respeita o que o script inicial no index.html já definiu.
    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
  }
  // O padrão é 'light' se a classe 'dark' não estiver presente.
  return 'light';
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Este efeito sincroniza qualquer mudança de estado do React com o DOM e o localStorage.
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Limpa classes antigas e aplica a nova.
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Salva a preferência do usuário.
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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