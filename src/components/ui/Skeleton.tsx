import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('skeleton-shimmer rounded-xl bg-muted/60', className)}
      aria-hidden="true"
      {...props}
    />
  );
};
