// ============================================================================
// FILE: src/components/sf/PageShell.tsx
// DESCRIPTION: Page shell wrapper with title and subtitle
// ============================================================================

import React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  title: string;
  subtitle?: string;
  rightNode?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  rightNode,
  children,
  className,
}) => {
  return (
    <div className={cn('p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-24', className)}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          {subtitle && <p className="text-slate-400">{subtitle}</p>}
        </div>
        {rightNode && <div className="flex items-center gap-2">{rightNode}</div>}
      </div>

      {/* Content */}
      {children}
    </div>
  );
};

