/**
 * SALES FLOW AI - PRIORITY BADGE COMPONENT
 * 
 * Visual indicator for priority scores
 * Version: 2.0.0
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getPriorityLevel, getPriorityColorClass } from '@/lib/utils/priority';

interface PriorityBadgeProps {
  score: number;
  showScore?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const PriorityBadge = React.memo<PriorityBadgeProps>(
  ({ score, showScore = false, showIcon = false, className }) => {
    const level = getPriorityLevel(score);
    const colorClass = getPriorityColorClass(score);

    const iconMap: Record<string, string> = {
      red: '🔴',
      orange: '🟠',
      yellow: '🟡',
      blue: '🔵',
      gray: '⚪',
    };

    return (
      <Badge
        variant="secondary"
        className={cn(
          'border font-medium text-xs',
          colorClass,
          className
        )}
        title={level.description}
      >
        {showIcon && <span className="mr-1">{iconMap[level.color]}</span>}
        {level.label}
        {showScore && <span className="ml-1 opacity-75">({score.toFixed(0)})</span>}
      </Badge>
    );
  }
);

PriorityBadge.displayName = 'PriorityBadge';

