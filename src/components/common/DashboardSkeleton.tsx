/**
 * Dashboard Skeleton Loader
 * 
 * Shows while dashboard data is loading
 * Prevents layout shift and improves perceived performance
 * 
 * @author Gemini 3 Ultra - Frontend Optimization
 */

import React from 'react';

export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#0a0a0a] p-6">
    {/* Header Skeleton */}
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="h-8 w-64 animate-pulse rounded-lg bg-white/5" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded-lg bg-white/5" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-32 animate-pulse rounded-lg bg-white/5" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-white/5" />
      </div>
    </div>

    {/* Stats Grid Skeleton */}
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>

    {/* Content Grid Skeleton */}
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <div className="h-96 animate-pulse rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md lg:col-span-2" />
      <div className="h-96 animate-pulse rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md" />
    </div>
  </div>
);

