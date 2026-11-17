import React from 'react';

interface YouTubeLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showHoverEffect?: boolean;
}

/**
 * Official-style YouTube / YouTube Shorts Badge
 * Mirrors TikTokOriginalLogo sizing and visual weight.
 */
export const YouTubeShortsLogo: React.FC<YouTubeLogoProps> = ({
  size = 'md',
  className = '',
  showHoverEffect = true,
}) => {
  const sizeMap = {
    xs: { container: 'w-5 h-5 rounded-[6px]', icon: 'w-3.5 h-3.5' },
    sm: { container: 'w-7 h-7 rounded-[8px]', icon: 'w-4 h-4' },
    md: { container: 'w-10 h-10 rounded-[12px]', icon: 'w-5 h-5' },
    lg: { container: 'w-12 h-12 rounded-[14px]', icon: 'w-6 h-6' },
    xl: { container: 'w-14 h-14 rounded-[16px]', icon: 'w-7 h-7' },
  };

  const { container, icon } = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`${container} flex items-center justify-center bg-[#FF0000] border border-white/20 text-white shadow-md shrink-0 relative overflow-hidden ${
        showHoverEffect ? 'group-hover:scale-105 transition-transform duration-200' : ''
      } ${className}`}
      aria-label="YouTube Shorts Logo"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${icon} relative z-10`}
        aria-hidden="true"
      >
        <path
          d="M17.77 10.32l-1.2-.5L18 9.06a3.74 3.74 0 0 0 1.4-4.95 3.63 3.63 0 0 0-4.91-1.56l-8.1 4.65a3.74 3.74 0 0 0-1.8 4.44 3.66 3.66 0 0 0 1.98 2.24l1.2.5-1.43.76a3.74 3.74 0 0 0-1.4 4.95 3.63 3.63 0 0 0 4.91 1.56l8.1-4.65a3.74 3.74 0 0 0 1.8-4.44 3.66 3.66 0 0 0-1.98-2.24Z"
          fill="#FFFFFF"
        />
        <path d="M10 14.65v-5.3L14.6 12 10 14.65Z" fill="#FF0000" />
      </svg>
    </div>
  );
};
