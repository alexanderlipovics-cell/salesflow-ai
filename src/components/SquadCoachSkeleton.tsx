// components/SquadCoachSkeleton.tsx

import React from 'react';

export const SquadCoachSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
        <div className="h-9 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
      
      {/* Summary skeleton */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <div className="h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-600 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-600 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
      </div>
      
      {/* Cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div 
          key={i}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
        >
          <div className="h-5 w-40 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-600 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-600 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

