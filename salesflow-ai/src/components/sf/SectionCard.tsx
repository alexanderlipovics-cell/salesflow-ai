// ============================================================================
// FILE: src/components/sf/SectionCard.tsx
// DESCRIPTION: Card wrapper for sections with title
// ============================================================================

import React from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  icon,
  isLoading,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/50 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  );
};

