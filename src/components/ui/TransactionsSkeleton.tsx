import React from 'react';
import { Skeleton } from './Skeleton';
import { Card } from './Card';

export const TransactionsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div className="space-y-1">
          <Skeleton className="h-6 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <Card className="p-4 border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Skeleton className="h-10 w-full sm:col-span-2 rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </Card>

      {/* 3. Monthly Summary Pills */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-3.5 space-y-1.5 border-border/60">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-6 w-28 rounded-lg" />
          </Card>
        ))}
      </div>

      {/* 4. Transaction Rows */}
      <Card className="p-4 sm:p-5 space-y-3 border-border/60">
        <div className="space-y-2.5 divide-y divide-border/40">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3.5">
                <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                    <Skeleton className="h-3.5 w-20 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="text-right space-y-1.5">
                <Skeleton className="h-5 w-24 rounded-md ms-auto" />
                <Skeleton className="h-3 w-14 rounded-md ms-auto" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
