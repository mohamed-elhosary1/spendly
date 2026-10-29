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

  // Determine color based on threshold if auto
  const getColor = () => {
    if (colorScheme !== 'auto') {
      switch (colorScheme) {
        case 'emerald':
          return 'bg-emerald-500';
        case 'amber':
          return 'bg-amber-500';
        case 'rose':
          return 'bg-rose-500';
        case 'blue':
          return 'bg-sky-500';
      }
    }
    if (value >= 100) return 'bg-rose-500';
    if (value >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full space-y-1', className)}>
      <div className={cn('w-full overflow-hidden rounded-full bg-secondary/80 relative', heights[size])}>
        <div
          className={cn('h-full transition-all duration-500 ease-out rounded-full', getColor(), barClassName)}
          style={{ width: `${visualPct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground font-medium pt-0.5">
          <span>{value.toFixed(1)}%</span>
          {value > 100 && (
            <span className="text-rose-500 font-semibold">Exceeded by {(value - 100).toFixed(1)}%</span>
          )}
        </div>
      )}
    </div>
  );
};
