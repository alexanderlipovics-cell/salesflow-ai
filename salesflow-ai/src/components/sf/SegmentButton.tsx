// ============================================================================
// FILE: src/components/sf/SegmentButton.tsx
// DESCRIPTION: Segment filter button component
// ============================================================================

import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SegmentButtonProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export const SegmentButton = React.memo<SegmentButtonProps>(
  ({ title, description, icon: Icon, isActive, onClick, className }) => {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap',
          isActive
            ? 'border-sf-primary bg-sf-primary/10 text-sf-primary'
            : 'border-sf-border bg-sf-surface text-sf-text hover:border-sf-primary/50',
          className
        )}
      >
        {Icon && <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">{title}</span>
          {description && <span className="text-xs opacity-70">{description}</span>}
        </div>
      </button>
    );
  }
);

SegmentButton.displayName = 'SegmentButton';

