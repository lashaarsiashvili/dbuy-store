import React from 'react';
import { Instagram } from 'lucide-react';

interface InstagramLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showHoverEffect?: boolean;
}

/**
 * Authentic Original Instagram App Logo
 * Built with the official Instagram multi-stop radial gradient
 * and compliant with lucide-react icon guidelines.
 */
export const InstagramOriginalLogo: React.FC<InstagramLogoProps> = ({
  size = 'md',
  className = '',
  showHoverEffect = true,
}) => {
  const sizeMap = {
    xs: { container: 'w-5 h-5 rounded-[6px]', icon: 'w-3 h-3' },
    sm: { container: 'w-7 h-7 rounded-[8px]', icon: 'w-4 h-4' },
    md: { container: 'w-10 h-10 rounded-[12px]', icon: 'w-5 h-5' },
    lg: { container: 'w-12 h-12 rounded-[14px]', icon: 'w-6 h-6' },
    xl: { container: 'w-14 h-14 rounded-[16px]', icon: 'w-7 h-7' },
  };

  const { container, icon } = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`${container} flex items-center justify-center text-white shadow-md shrink-0 relative overflow-hidden ${
        showHoverEffect ? 'group-hover:scale-105 transition-transform duration-200' : ''
      } ${className}`}
      style={{
        background:
          'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
      }}
      aria-label="Instagram Logo"
    >
      {/* Subtle authentic lighting sheen */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
      <Instagram className={`${icon} text-white stroke-[2.3] relative z-10 drop-shadow-xs`} />
    </div>
  );
};
