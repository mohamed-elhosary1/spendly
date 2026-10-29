import React from 'react';
import { Skeleton } from './Skeleton';
import { Card } from './Card';

export const WishlistSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div className="space-y-1">
          <Skeleton className="h-6 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-60 rounded-md" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* 2. Three Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 space-y-2 border-border/60">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </Card>
        ))}
      </div>

      {/* 3. Wishlist Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-5 space-y-4 border-border/60">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-3.5 w-full rounded-md" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full shrink-0" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-border/50">
              <Skeleton className="h-7 w-20 rounded-lg" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
