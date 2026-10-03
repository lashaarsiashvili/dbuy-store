import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Language } from '../types';
import { ChevronDown, Check } from 'lucide-react';

export interface LanguageOption {
  code: Language;
  shortLabel: string; // e.g. ENG, GEO, GER, ESP, RUS, CHN
  fullLabel: string;  // e.g. English, ქართული, Deutsch, Español, Русский, 中文
}

export const CircularFlag: React.FC<{ code: Language; size?: number; className?: string }> = ({
  code,
  size = 18,
  className = '',
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full overflow-hidden shrink-0 shadow-xs border border-black/10 flex items-center justify-center relative select-none ${className}`}
    >
      {code === 'en' && (
        // British Flag (Union Jack)
        <svg viewBox="0 0 60 60" className="w-full h-full object-cover">
          <clipPath id="uk-circle">
            <circle cx="30" cy="30" r="30" />
          </clipPath>
          <g clipPath="url(#uk-circle)">
            {/* Navy Blue Background */}
            <rect width="60" height="60" fill="#012169" />
            {/* White Diagonals */}
            <path d="M 0 0 L 60 60 M 60 0 L 0 60" stroke="#ffffff" strokeWidth="10" />
            {/* Red Diagonals */}
            <path d="M 0 0 L 60 60 M 60 0 L 0 60" stroke="#C8102E" strokeWidth="5" />
            {/* White Cross */}
            <path d="M 30 0 V 60 M 0 30 H 60" stroke="#ffffff" strokeWidth="14" />
            {/* Red Cross */}
            <path d="M 30 0 V 60 M 0 30 H 60" stroke="#C8102E" strokeWidth="8" />
          </g>
        </svg>
      )}

      {code === 'ka' && (
        // Georgian Flag (Five-cross flag)
        <svg viewBox="0 0 60 60" className="w-full h-full object-cover">
          <clipPath id="geo-circle">
            <circle cx="30" cy="30" r="30" />
          </clipPath>
          <g clipPath="url(#geo-circle)">
            {/* White Background */}
            <rect width="60" height="60" fill="#ffffff" />
            {/* Red St George Cross */}
            <path d="M 30 0 V 60 M 0 30 H 60" stroke="#DC2626" strokeWidth="9" />
            {/* 4 Bolnur-Katskhuri Small Crosses */}
            {/* Top-Left */}
            <g transform="translate(14, 14)">
              <path d="M -5 0 H 5 M 0 -5 V 5" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
            </g>
            {/* Top-Right */}
            <g transform="translate(46, 14)">
              <path d="M -5 0 H 5 M 0 -5 V 5" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
            </g>
            {/* Bottom-Left */}
            <g transform="translate(14, 46)">
              <path d="M -5 0 H 5 M 0 -5 V 5" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
            </g>
            {/* Bottom-Right */}
            <g transform="translate(46, 46)">
              <path d="M -5 0 H 5 M 0 -5 V 5" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      )}

      {code === 'de' && (
        // German Flag
        <svg viewBox="0 0 60 60" className="w-full h-full object-cover">
          <clipPath id="ger-circle">
            <circle cx="30" cy="30" r="30" />
          </clipPath>
          <g clipPath="url(#ger-circle)">
            <rect y="0" width="60" height="20" fill="#18181b" />
            <rect y="20" width="60" height="20" fill="#DC2626" />
            <rect y="40" width="60" height="20" fill="#FACC15" />
          </g>
        </svg>
      )}

      {code === 'es' && (
        // Spanish Flag
        <svg viewBox="0 0 60 60" className="w-full h-full object-cover">
          <clipPath id="esp-circle">
            <circle cx="30" cy="30" r="30" />
          </clipPath>
          <g clipPath="url(#esp-circle)">
            <rect y="0" width="60" height="15" fill="#DC2626" />
            <rect y="15" width="60" height="30" fill="#FACC15" />
            <rect y="45" width="60" height="15" fill="#DC2626" />
            {/* Tiny Crest Dot */}
            <circle cx="20" cy="30" r="3.5" fill="#DC2626" />
          </g>
        </svg>
      )}

      {code === 'ru' && (
        // Russian Flag
        <svg viewBox="0 0 60 60" className="w-full h-full object-cover">
          <clipPath id="rus-circle">
            <circle cx="30" cy="30" r="30" />
          </clipPath>
          <g clipPath="url(#rus-circle)">
            <rect y="0" width="60" height="20" fill="#ffffff" />
            <rect y="20" width="60" height="20" fill="#2563EB" />
            <rect y="40" width="60" height="20" fill="#DC2626" />
          </g>
        </svg>
      )}

      {code === 'zh' && (
        // Chinese Flag
        <svg viewBox="0 0 60 60" className="w-full h-full object-cover">
          <clipPath id="chn-circle">
            <circle cx="30" cy="30" r="30" />
          </clipPath>
          <g clipPath="url(#chn-circle)">
            <rect width="60" height="60" fill="#DE2910" />
            {/* Big Yellow Star */}
            <polygon
              points="16,6 18.5,13.5 26,13.5 20,18 22.5,25.5 16,21 9.5,25.5 12,18 6,13.5 13.5,13.5"
              fill="#FFDE00"
            />
            {/* Small Stars */}
            <polygon points="30,8 31,11 34,11 31.5,13 32.5,16 30,14 27.5,16 28.5,13 26,11 29,11" fill="#FFDE00" transform="scale(0.65) translate(15, 2)" />
            <polygon points="30,8 31,11 34,11 31.5,13 32.5,16 30,14 27.5,16 28.5,13 26,11 29,11" fill="#FFDE00" transform="scale(0.65) translate(21, 9)" />
            <polygon points="30,8 31,11 34,11 31.5,13 32.5,16 30,14 27.5,16 28.5,13 26,11 29,11" fill="#FFDE00" transform="scale(0.65) translate(21, 20)" />
          </g>
        </svg>
      )}
    </div>
  );
};

export const languagesList: LanguageOption[] = [
  { code: 'ka', shortLabel: 'GEO', fullLabel: 'ქართული' },
  { code: 'en', shortLabel: 'ENG', fullLabel: 'English' },
  { code: 'de', shortLabel: 'GER', fullLabel: 'Deutsch' },
  { code: 'es', shortLabel: 'ESP', fullLabel: 'Español' },
  { code: 'ru', shortLabel: 'RUS', fullLabel: 'Русский' },
  { code: 'zh', shortLabel: 'CHN', fullLabel: '中文' },
];

export const LanguageSelector: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant = 'light' }) => {
  const { language, setLanguage, t } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = languagesList.find(l => l.code === language) || languagesList[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelectLanguage = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex items-center space-x-1.5 px-2 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none shadow-2xs ${
          variant === 'dark'
            ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800 hover:border-slate-700'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        <CircularFlag code={currentLang.code} size={16} />
        <span className="tracking-wider text-[11px] font-black">{currentLang.shortLabel}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-800"
        >
          <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('top.selectLanguage')}
          </div>
          <div className="py-1">
            {languagesList.map((item) => {
              const isSelected = item.code === language;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelectLanguage(item.code)}
                  onPointerDown={(e) => {
                    // Prevent outside touch/click dismissal race condition
                    e.stopPropagation();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CircularFlag code={item.code} size={18} />
                    <div className="flex items-baseline space-x-1.5">
                      <span className="font-extrabold tracking-wider text-[11px] text-slate-900 dark:text-slate-100">
                        {item.shortLabel}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        • {item.fullLabel}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
