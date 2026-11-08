import React from 'react';
import { LogoOptionId } from '../types';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark'; // 'light' for light backgrounds, 'dark' for dark backgrounds
  showText?: boolean;
  className?: string;
  circularBadge?: boolean;
  styleOverride?: LogoOptionId;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'light',
  showText = true,
  className = '',
  circularBadge = false,
  styleOverride = 'bag-cart',
}) => {
  // Height / scale configurations
  const config = {
    sm: { height: 'h-7', iconBox: 'w-7 h-7', textSize: 'text-xl', subText: 'text-[7px]' },
    md: { height: 'h-8 sm:h-9', iconBox: 'w-9 h-9 sm:w-10 sm:h-10', textSize: 'text-2xl sm:text-[26px]', subText: 'text-[8.5px]' },
    lg: { height: 'h-11 sm:h-12', iconBox: 'w-12 h-12', textSize: 'text-3xl sm:text-4xl', subText: 'text-[10.5px]' },
    xl: { height: 'h-14 sm:h-16', iconBox: 'w-16 h-16', textSize: 'text-4xl sm:text-5xl', subText: 'text-xs' },
  }[size];

  const isDark = variant === 'dark';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  // Renders the icon/symbol mark based on the selected logo option
  const renderIconMark = () => {
    // If standalone badge or icon-only requested
    if (!showText || circularBadge) {
      return (
        <div className="relative flex items-center justify-center shrink-0">
          <svg viewBox="0 0 100 100" className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-md" fill="none">
            <defs>
              <linearGradient id="db-bag-icon-badge" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="#1e293b" strokeWidth="2.5" />
            <path
              d="M 39 36 V 29 C 39 23, 44 19, 50 19 C 56 19, 61 23, 61 29 V 36"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 28 36 H 72 L 67 78 C 66 81, 63 83, 60 83 H 40 C 37 83, 34 81, 33 78 Z"
              fill="url(#db-bag-icon-badge)"
            />
            <path
              d="M 44 48 C 44 48, 50 56, 56 48"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
    }

    switch (styleOverride) {
      // -------------------------------------------------------------
      // OPTION 1: Cyber Dynamic D with Energy Arrow in Circle
      // -------------------------------------------------------------
      case 'cyber-d':
        return (
          <div className="relative flex items-center justify-center shrink-0 mr-2.5">
            <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-md" fill="none">
              <defs>
                <linearGradient id="cyber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="60%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="#090d16" stroke="#1e293b" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="44" stroke="url(#cyber-grad)" strokeWidth="1.5" strokeOpacity="0.4" />
              <path
                d="M 30 25 H 48 C 64 25, 75 36, 75 50 C 75 64, 64 75, 48 75 H 30 Z"
                fill="none"
                stroke="url(#cyber-grad)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 40 40 L 52 50 L 40 60"
                stroke="#ffffff"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );

      // -------------------------------------------------------------
      // OPTION 2: Official DBuy 3D Blue Shopping Bag with Checkmark
      // -------------------------------------------------------------
      case 'bag-cart':
        return (
          <div className="relative flex items-center justify-center shrink-0 mr-3">
            <svg viewBox="0 0 48 48" className="w-10 h-10 sm:w-11 sm:h-11" fill="none">
              <defs>
                <linearGradient id="brand-bag-front" x1="6" y1="42" x2="30" y2="12" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#19B5FE" />
                  <stop offset="55%" stopColor="#0D92FF" />
                  <stop offset="100%" stopColor="#0066FF" />
                </linearGradient>
                <linearGradient id="brand-bag-side" x1="29" y1="13" x2="41" y2="41" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0052E8" />
                  <stop offset="100%" stopColor="#0035B5" />
                </linearGradient>
                <linearGradient id="brand-bag-handle" x1="12" y1="4" x2="26" y2="16" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1D63F0" />
                  <stop offset="100%" stopColor="#003EC2" />
                </linearGradient>
              </defs>
              <path
                d="M19.5 14.5V10.5C19.5 6.8 22.4 4.2 26 4.2C29.6 4.2 32.5 6.8 32.5 10.5V14.5"
                stroke="#0037B3"
                strokeWidth="3.1"
                strokeLinecap="round"
              />
              <path d="M10 13.5L31 12.2L39.5 14.8L29.5 16Z" fill="#002B94" />
              <path
                d="M29.5 13.2L39.5 14.8L41.5 36.5C41.7 38.7 40.2 40.6 38 41L29.5 42.5V13.2Z"
                fill="url(#brand-bag-side)"
              />
              <path
                d="M8.5 16.5C8.7 14.5 10.3 13 12.3 13H28.5C30.5 13 32.1 14.5 32.3 16.5L34 38.2C34.2 40.7 32.2 42.8 29.7 42.8H10.5C8 42.8 6 40.7 6.2 38.2L8.5 16.5Z"
                fill="url(#brand-bag-front)"
              />
              <path
                d="M13 16V11.2C13 7.2 15.9 4.5 19.6 4.5C23.3 4.5 26.2 7.2 26.2 11.2V16"
                stroke="url(#brand-bag-handle)"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path
                d="M15.2 27.5L19.2 31.8L25.8 23.8"
                stroke="#FFFFFF"
                strokeWidth="3.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );

      // -------------------------------------------------------------
      // OPTION 3: Infinity Interlocking "D + B"
      // -------------------------------------------------------------
      case 'infinity-loop':
        return (
          <div className="relative flex items-center justify-center shrink-0 mr-2.5">
            <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-md" fill="none">
              <defs>
                <linearGradient id="loop-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="loop-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="#070a13" stroke="#1e293b" strokeWidth="2" />
              <path
                d="M 45 32 C 34 32, 25 40, 25 50 C 25 60, 34 68, 45 68 C 55 68, 62 50, 62 50"
                stroke="url(#loop-grad-1)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M 55 68 C 66 68, 75 60, 75 50 C 75 40, 66 32, 55 32 C 45 32, 38 50, 38 50"
                stroke="url(#loop-grad-2)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx="50" cy="50" r="4" fill="#ffffff" />
            </svg>
          </div>
        );

      // -------------------------------------------------------------
      // OPTION 4: Clean Wordmark Only (NO redundant DB box in front)
      // -------------------------------------------------------------
      case 'geometric-tech':
        return null;

      // -------------------------------------------------------------
      // OPTION 5: Luxury Obsidian Badge
      // -------------------------------------------------------------
      case 'circle-monogram':
      default:
        return (
          <div className="relative flex items-center justify-center shrink-0 mr-2.5">
            <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-md" fill="none">
              <defs>
                <linearGradient id="lux-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="#020617" stroke="#1e293b" strokeWidth="2" />
              <circle cx="50" cy="50" r="44" stroke="url(#lux-purple-grad)" strokeWidth="1.5" strokeDasharray="3 2" />
              <text
                x="32"
                y="59"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize="30"
                fontWeight="900"
                fill="#ffffff"
                textAnchor="middle"
              >
                D
              </text>
              <text
                x="65"
                y="59"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize="30"
                fontWeight="900"
                fill="url(#lux-purple-grad)"
                textAnchor="middle"
              >
                B
              </text>
            </svg>
          </div>
        );
    }
  };

  // Text Typography rendering
  const renderWordmark = () => {
    switch (styleOverride) {
      case 'cyber-d':
        return (
          <div className="flex flex-col">
            <div className={`flex items-baseline font-black tracking-tight leading-none ${config.textSize}`}>
              <span className={isDark ? 'text-white' : 'text-slate-950 dark:text-white'}>D</span>
              <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Buy
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-1 mb-0.5 animate-pulse" />
            </div>
            <span className={`font-bold tracking-[0.24em] uppercase ${config.subText} ${isDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'} mt-0.5`}>
              Cyber • Store
            </span>
          </div>
        );

      case 'geometric-tech':
        return (
          <div className="flex flex-col">
            <div className={`flex items-baseline font-black tracking-tight leading-none ${config.textSize}`}>
              <span className={isDark ? 'text-white' : 'text-slate-950 dark:text-white'}>D</span>
              <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                B
              </span>
              <span className={isDark ? 'text-slate-100' : 'text-slate-900 dark:text-slate-100'}>uy</span>
            </div>
            <span className={`font-black tracking-[0.26em] uppercase ${config.subText} ${isDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'} mt-0.5`}>
              Smart Living Store
            </span>
          </div>
        );

      case 'bag-cart':
      default:
        return (
          <div className="flex flex-col justify-center">
            <span className={`font-extrabold tracking-[-0.02em] leading-[0.95] ${config.textSize} ${isDark ? 'text-white' : 'text-[#0A1122] dark:text-white'}`}>
              DBuy
            </span>
            <span className={`text-[11px] font-medium tracking-[-0.01em] leading-none mt-[6px] whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-[#475569] dark:text-slate-400'}`}>
              Tech for a Better You
            </span>
          </div>
        );

      case 'infinity-loop':
        return (
          <div className="flex flex-col">
            <div className={`flex items-baseline font-extrabold tracking-tight leading-none ${config.textSize}`}>
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent font-black">
                DBUY
              </span>
            </div>
            <span className={`font-black tracking-[0.28em] uppercase ${config.subText} ${isDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'} mt-0.5`}>
              Tech Innovation
            </span>
          </div>
        );

      case 'circle-monogram':
        return (
          <div className="flex flex-col">
            <div className={`flex items-baseline font-black tracking-wider leading-none ${config.textSize}`}>
              <span className={isDark ? 'text-white' : 'text-slate-950 dark:text-white'}>D</span>
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                BUY
              </span>
            </div>
            <span className={`font-extrabold tracking-[0.3em] uppercase ${config.subText} text-purple-400 mt-0.5`}>
              Premium Edition
            </span>
          </div>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center select-none group transition-transform duration-200 hover:scale-[1.02] cursor-pointer ${className}`}
    >
      {/* Icon Mark (if applicable) */}
      {renderIconMark()}

      {/* Wordmark */}
      {showText && !circularBadge && renderWordmark()}
    </div>
  );
};
