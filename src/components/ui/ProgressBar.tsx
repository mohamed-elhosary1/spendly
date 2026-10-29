import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number; // Real percentage, can exceed 100%
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  barClassName?: string;
  colorScheme?: 'auto' | 'emerald' | 'amber' | 'rose' | 'blue';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  className,
  barClassName,
  colorScheme = 'auto',
}) => {
  // Clamped visual percentage for bar width
  const visualPct = Math.min(100, Math.max(0, (value / max) * 100));

  // Determine gradient and glow based on threshold if auto
  const getColorClasses = () => {
    if (colorScheme !== 'auto') {
      switch (colorScheme) {
        case 'emerald':
          return 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.45)]';
        case 'amber':
          return 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.45)]';
        case 'rose':
          return 'bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 shadow-[0_0_12px_rgba(244,63,94,0.45)]';
        case 'blue':
          return 'bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-400 shadow-[0_0_12px_rgba(6,182,212,0.45)]';
      }
    }
    if (value >= 100) {
      return 'bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 shadow-[0_0_12px_rgba(244,63,94,0.45)]';
    }
    if (value >= 80) {
      return 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.45)]';
    }
    return 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.45)]';
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-secondary/80 dark:bg-secondary/40 border border-border/40 relative p-[1px]',
          heights[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-700 ease-out rounded-full relative',
            getColorClasses(),
            barClassName
          )}
          style={{ width: `${visualPct}%` }}
        >
          {/* Subtle leading sheen tip */}
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full blur-[1px]" />
        </div>
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground font-medium pt-0.5">
          <span>{value.toFixed(1)}% consumed</span>
          <span>{visualPct < 100 ? `${(100 - visualPct).toFixed(1)}% remaining` : 'Limit reached'}</span>
        </div>
      )}
    </div>
  );
};
