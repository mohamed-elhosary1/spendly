import React from 'react';
import { Skeleton } from './Skeleton';
import { Card } from './Card';

export const BudgetsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div className="space-y-1">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* 2. Monthly Budget Overview Card */}
      <Card className="p-6 space-y-5 border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-8 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-3.5 w-full rounded-full" />
        <div className="grid grid-cols-3 gap-4 pt-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </Card>

      {/* 3. Category Budgets Breakdown */}
      <Card className="p-6 space-y-4 border-border/60">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <div className="space-y-3.5 divide-y divide-border/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="pt-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
