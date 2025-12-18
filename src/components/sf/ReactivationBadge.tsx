// ============================================================================
// FILE: src/components/sf/ReactivationBadge.tsx
// DESCRIPTION: Badge component for reactivation priority display
// ============================================================================

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { REACTIVATION_PRIORITY_COLORS, REACTIVATION_PRIORITY_LABELS } from '@/types/reactivation';
import type { ReactivationCandidate } from '@/types/reactivation';

interface ReactivationBadgeProps {
  priority: ReactivationCandidate['reactivation_priority'];
  score?: number;
  showScore?: boolean;
  className?: string;
}

export const ReactivationBadge = React.memo<ReactivationBadgeProps>(
  ({ priority, score, showScore = false, className }) => {
    const colorClass = REACTIVATION_PRIORITY_COLORS[priority];
    const label = REACTIVATION_PRIORITY_LABELS[priority];

    return (
      <Badge
        variant="secondary"
        className={cn('border font-medium', colorClass, className)}
      >
        {label}
        {showScore && score !== undefined && ` (${score.toFixed(0)})`}
      </Badge>
    );
  }
);

ReactivationBadge.displayName = 'ReactivationBadge';

