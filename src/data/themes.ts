export type Theme = {
  id: string;
  name: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textMuted: string;
    accentPrimary: string;
    accentSecondary: string;
    accentGlow: string;
  };
  settings: {
    borderRadius: string;
    glassBlur: string;
  };
};

export const themes: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bgPrimary: '#020617',
      bgSecondary: '#0f172a',
      cardBg: '#1e293b',
      cardBorder: '#334155',
      textPrimary: '#f8fafc',
      textMuted: '#94a3b8',
      accentPrimary: '#38bdf8',
      accentSecondary: '#818cf8',
      accentGlow: 'rgba(56, 189, 248, 0.3)',
    },
    settings: { borderRadius: '12px', glassBlur: '8px' },
  },
  {
    id: 'gold',
    name: 'Gold',
    colors: {
      bgPrimary: '#1a1814',
      bgSecondary: '#262420',
      cardBg: '#33302c',
      cardBorder: '#4a4640',
      textPrimary: '#f5e6d3',
      textMuted: '#bcaaa4',
      accentPrimary: '#d4af37',
      accentSecondary: '#f0c75e',
      accentGlow: 'rgba(212, 175, 55, 0.2)',
    },
    settings: { borderRadius: '8px', glassBlur: '4px' },
  },
  {
    id: 'apple',
    name: 'Apple',
    colors: {
      bgPrimary: '#f5f5f7',
      bgSecondary: '#ffffff',
      cardBg: '#ffffff',
      cardBorder: '#e8e8ed',
      textPrimary: '#1d1d1f',
      textMuted: '#86868b',
      accentPrimary: '#0071e3',
      accentSecondary: '#0066cc',
      accentGlow: 'rgba(0, 113, 227, 0.15)',
    },
    settings: { borderRadius: '16px', glassBlur: '12px' },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      bgPrimary: '#064e3b',
      bgSecondary: '#065f46',
      cardBg: '#10b981',
      cardBorder: '#34d399',
      textPrimary: '#ecfdf5',
      textMuted: '#a7f3d0',
      accentPrimary: '#10b981',
      accentSecondary: '#34d399',
      accentGlow: 'rgba(16, 185, 129, 0.3)',
    },
    settings: { borderRadius: '10px', glassBlur: '6px' },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    colors: {
      bgPrimary: '#4c0519',
      bgSecondary: '#881337',
      cardBg: '#9f1239',
      cardBorder: '#e11d48',
      textPrimary: '#fff1f2',
      textMuted: '#fecdd3',
      accentPrimary: '#e11d48',
      accentSecondary: '#f43f5e',
      accentGlow: 'rgba(225, 29, 72, 0.3)',
    },
    settings: { borderRadius: '14px', glassBlur: '10px' },
  },
];
