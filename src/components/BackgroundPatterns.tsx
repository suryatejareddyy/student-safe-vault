import React from 'react';

export const SecurityAcademicBackground: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`relative min-h-screen bg-navy-950 text-slate-100 overflow-hidden ${className}`}>
      {/* 1. Base Layer: Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1528] via-[#091122] to-[#040814] pointer-events-none" />

      {/* 2. Ambient Animated Blue Lighting Orbs */}
      <div className="absolute top-[-100px] left-1/4 w-[600px] h-[600px] bg-royal-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute top-[35%] right-[-100px] w-[500px] h-[500px] bg-royal-500/10 rounded-full blur-[100px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-[-150px] left-[-100px] w-[650px] h-[650px] bg-blue-700/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 3. Subtle Academic, Document & Security Vector Grid & Pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="academicGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            {/* Fine grid lines */}
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#FFFFFF" strokeWidth="0.7" />

            {/* Document icon motif at intersection */}
            <path
              d="M 15 15 L 23 15 L 27 19 L 27 27 L 15 27 Z"
              fill="none"
              stroke="#60A5FA"
              strokeWidth="0.8"
            />
            <path d="M 18 20 H 24 M 18 23 H 23" stroke="#93C5FD" strokeWidth="0.6" />

            {/* Shield / Key motif */}
            <circle cx="45" cy="45" r="3.5" fill="none" stroke="#60A5FA" strokeWidth="0.8" />
            <path d="M 45 48.5 V 53 M 45 51 H 47.5" stroke="#60A5FA" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#academicGrid)" />
      </svg>

      {/* 4. Fine Dot Constellation Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Content wrapper */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export const AcademicWatermark: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      className={`opacity-[0.03] pointer-events-none select-none ${className}`}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Laurels & graduation cap motif */}
      <path
        d="M100 40 L160 70 L100 100 L40 70 Z"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="M60 85 V120 C60 140 100 155 100 155 C100 155 140 140 140 120 V85"
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle cx="100" cy="70" r="6" fill="currentColor" />
      <path
        d="M100 70 L145 95 V125"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Outer laurel wreath */}
      <path
        d="M30 110 C30 150 60 180 100 185 C140 180 170 150 170 110"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="6 6"
      />
    </svg>
  );
};
