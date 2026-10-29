import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Mascot, MascotMood } from './Mascot';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  mascotMood?: MascotMood;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  mascotMood = 'curious',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl border border-dashed border-border/70 bg-card/40 backdrop-blur-sm max-w-lg mx-auto',
        className
      )}
    >
      {/* Mascot illustration */}
      <div className="mb-4 relative">
        <Mascot mood={mascotMood} size="lg" />
        {Icon && (
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Title & Description */}
      <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {/* Action Buttons */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} size="sm" className="font-semibold shadow-md shadow-emerald-600/15">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button onClick={onSecondaryAction} variant="outline" size="sm">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
