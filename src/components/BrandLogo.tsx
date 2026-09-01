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
  styleOverride = 'geometric-tech',
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
              <linearGradient id="db-pure-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#090d16" stroke="#1e293b" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="44" stroke="url(#db-pure-grad)" strokeWidth="1.5" strokeOpacity="0.4" />
            <text
              x="32"
              y="59"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="32"
              fontWeight="900"
              fill="#ffffff"
              textAnchor="middle"
            >
              D
            </text>
            <text
              x="66"
              y="59"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="32"
              fontWeight="900"
              fill="url(#db-pure-grad)"
              textAnchor="middle"
            >
              B
            </text>
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
      // OPTION 2: Modern Shopping Bag & Smart Cart "D"
      // -------------------------------------------------------------
      case 'bag-cart':
        return (
          <div className="relative flex items-center justify-center shrink-0 mr-2.5">
            <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-md" fill="none">
              <defs>
                <linearGradient id="bag-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
              <path
                d="M 39 36 V 29 C 39 23, 44 19, 50 19 C 56 19, 61 23, 61 29 V 36"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 28 36 H 72 L 67 78 C 66 81, 63 83, 60 83 H 40 C 37 83, 34 81, 33 78 Z"
                fill="url(#bag-grad)"
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
              <span className={isDark ? 'text-white' : 'text-slate-950'}>D</span>
              <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Buy
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-1 mb-0.5 animate-pulse" />
            </div>
            <span className={`font-bold tracking-[0.24em] uppercase ${config.subText} ${textMuted} mt-0.5`}>
              Cyber • Store
            </span>
          </div>
        );

      case 'bag-cart':
        return (
          <div className="flex flex-col">
            <div className={`flex items-baseline font-black tracking-tight leading-none ${config.textSize}`}>
              <span className={isDark ? 'text-white' : 'text-slate-950'}>D</span>
              <span className="text-sky-500">Buy</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 ml-1.5 uppercase border border-sky-500/20">
                Shop
              </span>
            </div>
            <span className={`font-bold tracking-[0.2em] uppercase ${config.subText} ${textMuted} mt-0.5`}>
              Smart Commerce
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
            <span className={`font-black tracking-[0.28em] uppercase ${config.subText} ${textMuted} mt-0.5`}>
              Tech Innovation
            </span>
          </div>
        );

      case 'geometric-tech':
      default:
        return (
          <div className="flex flex-col">
            <div className={`flex items-baseline font-black tracking-tight leading-none ${config.textSize}`}>
              <span className={isDark ? 'text-white' : 'text-slate-950'}>D</span>
              <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                B
              </span>
              <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>uy</span>
            </div>
            <span className={`font-black tracking-[0.26em] uppercase ${config.subText} ${textMuted} mt-0.5`}>
              Smart Living Store
            </span>
          </div>
        );

      case 'circle-monogram':
        return (
          <div className="flex flex-col">
            <div className={`flex items-baseline font-black tracking-wider leading-none ${config.textSize}`}>
              <span className={isDark ? 'text-white' : 'text-slate-950'}>D</span>
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
