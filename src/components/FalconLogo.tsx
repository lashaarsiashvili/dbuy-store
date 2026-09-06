import React from 'react';

interface FalconLogoProps {
  className?: string;
  size?: number;
}

export const FalconLogo: React.FC<FalconLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="falconGradientComp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="wingGradientComp" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="128" fill="#0F172A" />
      <rect x="16" y="16" width="480" height="480" rx="112" fill="none" stroke="url(#falconGradientComp)" strokeWidth="8" opacity="0.4" />

      <g transform="translate(256, 256)">
        <path d="M 0 -130 L 170 -70 L 110 -20 Z" fill="url(#wingGradientComp)" opacity="0.8" />
        <path d="M 0 -130 L 190 -20 L 100 20 Z" fill="url(#falconGradientComp)" />
        <path d="M 0 -130 L 200 40 L 60 70 Z" fill="url(#falconGradientComp)" />

        <path d="M 0 -130 L -170 -70 L -110 -20 Z" fill="url(#wingGradientComp)" opacity="0.8" />
        <path d="M 0 -130 L -190 -20 L -100 20 Z" fill="url(#falconGradientComp)" />
        <path d="M 0 -130 L -200 40 L -60 70 Z" fill="url(#falconGradientComp)" />

        <path d="M 0 -150 L 35 -70 L 45 0 L 0 50 L -45 0 L -35 -70 Z" fill="#1E293B" stroke="url(#falconGradientComp)" strokeWidth="8" />
        <path d="M 0 -20 L 25 35 L 0 90 L -25 35 Z" fill="url(#falconGradientComp)" />

        <polygon points="-25,-40 -10,-48 -12,-32" fill="#00F2FE" />
        <polygon points="25,-40 10,-48 12,-32" fill="#00F2FE" />

        <path d="M 0 50 L 50 150 L 0 130 L -50 150 Z" fill="url(#wingGradientComp)" opacity="0.9" />
      </g>
    </svg>
  );
};
