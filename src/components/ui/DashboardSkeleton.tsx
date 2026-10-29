import React from 'react';
import { Skeleton } from './Skeleton';
import { Card } from './Card';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Daily Financial Assessment Banner Skeleton */}
      <Card className="p-5 border-border/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2.5 max-w-xl w-full">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-4/5 rounded-lg" />
            <Skeleton className="h-3 w-2/3 rounded-lg" />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </Card>

      {/* 2. Four Key Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 sm:p-5 space-y-3 border-border/60">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </Card>
        ))}
      </div>

      {/* 3. Monthly Budget Progress Card */}
      <Card className="p-5 sm:p-6 space-y-4 border-border/60">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-full rounded-full" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>
      </Card>

      {/* 4. Daily Spending and Category Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5 sm:p-6 space-y-4 border-border/60">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </Card>

        <Card className="p-5 sm:p-6 space-y-4 border-border/60">
          <div className="space-y-1">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
          <div className="flex items-center justify-center py-4">
            <Skeleton className="h-44 w-44 rounded-full" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex justify-between items-center">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 5. Recent Transactions List */}
      <Card className="p-5 sm:p-6 space-y-4 border-border/60">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="space-y-3 divide-y divide-border/40">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
