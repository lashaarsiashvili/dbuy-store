import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { themes } from '../data/themes';

export const ThemeCustomizer: React.FC = () => {
  const { currentTheme, setTheme } = useTheme();

  return (
    <div className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--border-radius)]">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Theme & Appearance</h3>
      <div className="grid grid-cols-2 gap-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={`p-2 rounded text-sm transition-all duration-200 ${currentTheme.id === theme.id ? 'ring-2 ring-[var(--accent-primary)]' : 'hover:opacity-80'}`}
            style={{ backgroundColor: theme.colors.cardBg, color: theme.colors.textPrimary }}
          >
            {theme.name}
          </button>
        ))}
      </div>
    </div>
  );
};
