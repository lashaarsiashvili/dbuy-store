import React from 'react';

interface TikTokLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showHoverEffect?: boolean;
}

/**
 * Authentic TikTok App Logo Badge
 * Matches InstagramOriginalLogo sizing and visual weight in SocialShareModal.
 */
export const TikTokOriginalLogo: React.FC<TikTokLogoProps> = ({
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
      className={`${container} flex items-center justify-center bg-[#020611] border border-white/15 text-white shadow-md shrink-0 relative overflow-hidden ${
        showHoverEffect ? 'group-hover:scale-105 transition-transform duration-200' : ''
      } ${className}`}
      aria-label="TikTok Logo"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(37, 244, 238, 0.45), transparent 55%), radial-gradient(circle at 80% 80%, rgba(254, 44, 85, 0.45), transparent 55%)',
        }}
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${icon} relative z-10`}
        aria-hidden="true"
      >
        {/* Cyan offset layer */}
        <path
          d="M15.8 3.2c.6 1.9 2 3.4 3.9 4v2.6c-1.5 0-2.9-.5-4.1-1.3v5.7a5.1 5.1 0 1 1-4.5-5.1v2.7a2.5 2.5 0 1 0 1.8 2.4V3.2h2.9Z"
          fill="#25F4EE"
          transform="translate(-0.7, -0.5)"
        />
        {/* Red-pink offset layer */}
        <path
          d="M15.8 3.2c.6 1.9 2 3.4 3.9 4v2.6c-1.5 0-2.9-.5-4.1-1.3v5.7a5.1 5.1 0 1 1-4.5-5.1v2.7a2.5 2.5 0 1 0 1.8 2.4V3.2h2.9Z"
          fill="#FE2C55"
          transform="translate(0.7, 0.5)"
        />
        {/* Crisp white foreground glyph */}
        <path
          d="M15.8 3.2c.6 1.9 2 3.4 3.9 4v2.6c-1.5 0-2.9-.5-4.1-1.3v5.7a5.1 5.1 0 1 1-4.5-5.1v2.7a2.5 2.5 0 1 0 1.8 2.4V3.2h2.9Z"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
};
