import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'auto';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'auto',
  showText = true,
  className = '',
  onClick,
}) => {
  // Dimensions map
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base font-bold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-extrabold',
    xl: 'text-3xl font-extrabold',
  };

  const subSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-xs font-medium',
    xl: 'text-sm font-medium',
  };

  // Determine text color based on variant
  const titleColor =
    variant === 'light'
      ? 'text-navy-900'
      : variant === 'dark'
      ? 'text-white'
      : 'text-slate-900 dark:text-white';

  const subtitleColor =
    variant === 'light'
      ? 'text-royal-600'
      : variant === 'dark'
      ? 'text-royal-400'
      : 'text-royal-600 dark:text-royal-400';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      role="banner"
      aria-label="Student Safe Vault Logo"
    >
      <div className={`relative flex-shrink-0 ${iconSizes[size]}`}>
        {/* Custom SVG combining Shield + Padlock + Graduation Cap */}
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            {/* Deep Navy to Royal Blue Gradient for Shield */}
            <linearGradient id="shieldGrad" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="50%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#0B1528" />
            </linearGradient>

            {/* Inner Shield Luster */}
            <linearGradient id="innerShieldGrad" x1="16" y1="16" x2="48" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0F1F3D" stopOpacity="0.9" />
            </linearGradient>

            {/* Padlock Body Gradient */}
            <linearGradient id="padlockGrad" x1="22" y1="32" x2="42" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            {/* Mortarboard Grad */}
            <linearGradient id="capGrad" x1="10" y1="8" x2="54" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#EFF6FF" />
              <stop offset="100%" stopColor="#BFDBFE" />
            </linearGradient>
          </defs>

          {/* 1. OUTER SHIELD BASE */}
          <path
            d="M32 4L10 13V29C10 44.5 19.4 56.8 32 60C44.6 56.8 54 44.5 54 29V13L32 4Z"
            fill="url(#shieldGrad)"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Inner Shield Accent Rim */}
          <path
            d="M32 8L14 16V28.5C14 41.5 21.8 51.8 32 54.5C42.2 51.8 50 41.5 50 28.5V16L32 8Z"
            fill="url(#innerShieldGrad)"
            stroke="#93C5FD"
            strokeWidth="0.8"
            strokeOpacity="0.5"
          />

          {/* 2. PADLOCK SHACKLE (Arch) */}
          <path
            d="M26 31V25C26 21.6863 28.6863 19 32 19C35.3137 19 38 25 38 25V31"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 2. PADLOCK BODY */}
          <rect
            x="22"
            y="30"
            width="20"
            height="17"
            rx="3.5"
            fill="url(#padlockGrad)"
            stroke="#1E3A8A"
            strokeWidth="1"
          />

          {/* Padlock Keyhole */}
          <circle cx="32" cy="36" r="2.2" fill="#0B1528" />
          <path
            d="M31 36L30.5 42H33.5L33 36H31Z"
            fill="#0B1528"
          />

          {/* 3. GRADUATION CAP (Mortarboard) - Perched proudly at the upper crest */}
          {/* Cap Diamond Top */}
          <path
            d="M32 6L49 14L32 21L15 14L32 6Z"
            fill="url(#capGrad)"
            stroke="#1D4ED8"
            strokeWidth="1.2"
          />

          {/* Cap Skull Under-band */}
          <path
            d="M22 17.5V21.5C22 23.5 26.5 25 32 25C37.5 25 42 23.5 42 21.5V17.5"
            fill="#1E40AF"
            stroke="#DBEAFE"
            strokeWidth="0.8"
          />

          {/* Cap Button / Button Center */}
          <ellipse cx="32" cy="13.5" rx="1.6" ry="1.1" fill="#1D4ED8" />

          {/* Flowing Academic Tassel */}
          <path
            d="M32 13.5L44 18V25"
            stroke="#F59E0B"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Tassel fringe */}
          <path
            d="M43 25L45 27.5M44 25V28M45 25L43 27.5"
            stroke="#F59E0B"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col tracking-tight">
          <div className={`flex items-center gap-1.5 leading-none ${titleColor} ${textSizes[size]}`}>
            <span>Student Safe</span>
            <span className="text-royal-500 font-black">Vault</span>
          </div>
          <span className={`tracking-wider uppercase font-semibold ${subtitleColor} ${subSizes[size]} mt-0.5`}>
            Digital Academic Locker
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
