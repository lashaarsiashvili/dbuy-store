import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, themes } from '../data/themes';

type ThemeContextType = {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  useEffect(() => {
    const savedThemeId = localStorage.getItem('dbuy_site_theme');
    if (savedThemeId) {
      const theme = themes.find(t => t.id === savedThemeId);
      if (theme) setCurrentTheme(theme);
    }
  }, []);

  const setTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem('dbuy_site_theme', themeId);
      applyTheme(theme);
    }
  };

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.colors.bgPrimary);
    root.style.setProperty('--bg-secondary', theme.colors.bgSecondary);
    root.style.setProperty('--card-bg', theme.colors.cardBg);
    root.style.setProperty('--card-border', theme.colors.cardBorder);
    root.style.setProperty('--text-primary', theme.colors.textPrimary);
    root.style.setProperty('--text-muted', theme.colors.textMuted);
    root.style.setProperty('--accent-primary', theme.colors.accentPrimary);
    root.style.setProperty('--accent-secondary', theme.colors.accentSecondary);
    root.style.setProperty('--accent-glow', theme.colors.accentGlow);
    root.style.setProperty('--border-radius', theme.settings.borderRadius);
    root.style.setProperty('--glass-blur', theme.settings.glassBlur);
  };

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  return <ThemeContext.Provider value={{ currentTheme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
