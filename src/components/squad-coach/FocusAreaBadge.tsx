// ============================================================================
// FILE: src/components/squad-coach/FocusAreaBadge.tsx
// DESCRIPTION: Badge component for Focus Area display (FIXED)
// ============================================================================

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, MessageSquare, Target, CheckCircle, type LucideIcon } from 'lucide-react';
import { FOCUS_AREA_CONFIGS, type FocusArea } from '@/types/squad-coach';

interface FocusAreaBadgeProps {
  focusArea: FocusArea;
  showDescription?: boolean;
  className?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Clock,
  MessageSquare,
  Target,
  CheckCircle,
};

export const FocusAreaBadge = React.memo<FocusAreaBadgeProps>(
  ({ focusArea, showDescription = false, className }) => {
    const config = FOCUS_AREA_CONFIGS[focusArea];

    const colorClasses: Record<string, string> = {
      red: 'bg-red-500/10 text-red-400 border-red-500/20',
      orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      green: 'bg-green-500/10 text-green-400 border-green-500/20',
    };

    const Icon = ICON_MAP[config.icon] || CheckCircle;

    return (
      <div className={cn('inline-flex flex-col gap-1', className)}>
        <Badge
          variant="secondary"
          className={cn(
            'border font-medium inline-flex items-center',
            colorClasses[config.color] || colorClasses.green
          )}
        >
          <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
          {config.label}
        </Badge>
        {showDescription && (
          <span className="text-xs text-sf-text-muted">{config.description}</span>
        )}
      </div>
    );
  }
);

FocusAreaBadge.displayName = 'FocusAreaBadge';

