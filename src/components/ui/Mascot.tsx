import React from 'react';
import { cn } from '@/lib/utils';

export type MascotMood = 'loading' | 'celebrate' | 'curious' | 'error' | 'idle';

interface MascotProps {
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

/**
 * Spendy — The official Spendly mascot.
 * A friendly, geometric personal finance companion that guides users through
 * loading states, empty states, celebrating goals, and helpful error recovery.
 */
export const Mascot: React.FC<MascotProps> = ({
  mood = 'idle',
  size = 'md',
  className,
  animate = true,
}) => {
  const sizePixels = {
    sm: 44,
    md: 68,
    lg: 104,
    xl: 140,
  }[size];

  const animationClass = animate
    ? mood === 'loading'
      ? 'animate-mascot-float'
      : mood === 'celebrate'
      ? 'animate-mascot-bounce'
      : mood === 'curious'
      ? 'animate-mascot-tilt'
      : 'animate-mascot-breathe'
    : '';

  return (
    <div
      className={cn('inline-flex items-center justify-center select-none', animationClass, className)}
      style={{ width: sizePixels, height: sizePixels }}
      role="img"
      aria-label={`Spendly Mascot (${mood})`}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          {/* Body gradient */}
          <linearGradient id="spendyBodyGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="0.6" stopColor="#059669" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>

          {/* Belly gradient */}
          <linearGradient id="spendyBellyGrad" x1="40" y1="50" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ECFDF5" />
            <stop offset="1" stopColor="#D1FAE5" />
          </linearGradient>

          {/* Coin Badge gradient */}
          <linearGradient id="spendyCoinGrad" x1="50" y1="65" x2="70" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#059669" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Shadow under mascot */}
        <ellipse cx="60" cy="112" rx="34" ry="5" fill="#000000" fillOpacity="0.12" />

        {/* Mascot Main Body: Friendly rounded teardrop / pebble */}
        <rect
          x="26"
          y="24"
          width="68"
          height="76"
          rx="34"
          fill="url(#spendyBodyGrad)"
          filter="url(#softGlow)"
        />

        {/* Left Ear / Antenna tip */}
        <circle cx="36" cy="22" r="6" fill="#10B981" />
        <path d="M36 26L38 32" stroke="#059669" strokeWidth="3" strokeLinecap="round" />

        {/* Right Ear / Antenna tip */}
        <circle cx="84" cy="22" r="6" fill="#10B981" />
        <path d="M84 26L82 32" stroke="#059669" strokeWidth="3" strokeLinecap="round" />

        {/* Soft Belly Plate */}
        <ellipse cx="60" cy="72" rx="24" ry="22" fill="url(#spendyBellyGrad)" />

        {/* Golden Coin Emblem on Belly */}
        <circle cx="60" cy="74" r="11" fill="url(#spendyCoinGrad)" stroke="#B45309" strokeWidth="1.5" />
        {/* Coin Symbol: S or currency mark */}
        <path
          d="M60 67V81M57 70.5C57 69.5 58.5 68.5 60 68.5C61.5 68.5 63 69.5 63 71C63 72.8 60 73.2 60 74.5C60 76 61.5 76.5 63 76.5"
          stroke="#78350F"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Eyes according to mood */}
        {mood === 'loading' && (
          // Focused/blinking eyes with gentle curiosity
          <g>
            <ellipse cx="48" cy="46" rx="4" ry="5.5" fill="#064E3B" />
            <ellipse cx="72" cy="46" rx="4" ry="5.5" fill="#064E3B" />
            <circle cx="49.5" cy="44.5" r="1.5" fill="#FFFFFF" />
            <circle cx="73.5" cy="44.5" r="1.5" fill="#FFFFFF" />
            {/* Soft smiling mouth */}
            <path d="M55 56C58 58.5 62 58.5 65 56" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {mood === 'celebrate' && (
          // Joyful closed happy curve eyes and open happy smile
          <g>
            <path d="M44 47C46 43 50 43 52 47" stroke="#064E3B" strokeWidth="3" strokeLinecap="round" />
            <path d="M68 47C70 43 74 43 76 47" stroke="#064E3B" strokeWidth="3" strokeLinecap="round" />
            {/* Happy open smile */}
            <path
              d="M53 54C53 58 57 61 60 61C63 61 67 58 67 54H53Z"
              fill="#E11D48"
              stroke="#064E3B"
              strokeWidth="2"
            />
            {/* Confetti stars */}
            <path d="M22 28L24 23L26 28L31 29L26 31L24 36L22 31L17 29L22 28Z" fill="#FBBF24" />
            <path d="M96 24L98 20L100 24L104 25L100 27L98 31L96 27L92 25L96 24Z" fill="#FBBF24" />
          </g>
        )}

        {mood === 'curious' && (
          // Inquisitive tilted glance
          <g>
            <ellipse cx="49" cy="45" rx="5" ry="6" fill="#064E3B" />
            <ellipse cx="71" cy="44" rx="4" ry="5" fill="#064E3B" />
            <circle cx="47.5" cy="43" r="1.8" fill="#FFFFFF" />
            <circle cx="69.5" cy="42" r="1.5" fill="#FFFFFF" />
            {/* Wondering small mouth */}
            <circle cx="61" cy="56" r="2.5" fill="#064E3B" />
          </g>
        )}

        {mood === 'error' && (
          // Concerned eyes
          <g>
            <circle cx="48" cy="47" r="4.5" fill="#064E3B" />
            <circle cx="72" cy="47" r="4.5" fill="#064E3B" />
            <path d="M44 40L52 43" stroke="#064E3B" strokeWidth="2" strokeLinecap="round" />
            <path d="M76 40L68 43" stroke="#064E3B" strokeWidth="2" strokeLinecap="round" />
            {/* Small wavy or straight mouth */}
            <path d="M55 57C57 56 63 56 65 57" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {mood === 'idle' && (
          // Calm standard friendly eyes and smile
          <g>
            <ellipse cx="48" cy="46" rx="4" ry="5.5" fill="#064E3B" />
            <ellipse cx="72" cy="46" rx="4" ry="5.5" fill="#064E3B" />
            <circle cx="49.5" cy="44.5" r="1.5" fill="#FFFFFF" />
            <circle cx="73.5" cy="44.5" r="1.5" fill="#FFFFFF" />
            {/* Gentle smile */}
            <path d="M55 55C58 58 62 58 65 55" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* Rosy cheeks */}
        <circle cx="39" cy="53" r="4" fill="#F43F5E" fillOpacity="0.3" />
        <circle cx="81" cy="53" r="4" fill="#F43F5E" fillOpacity="0.3" />
      </svg>
    </div>
  );
};
