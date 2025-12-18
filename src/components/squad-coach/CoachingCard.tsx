// ============================================================================
// FILE: src/components/squad-coach/CoachingCard.tsx
// DESCRIPTION: Card component for individual rep coaching overview
// ============================================================================

import React from 'react';
import { User, TrendingUp, MessageCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FocusAreaBadge } from './FocusAreaBadge';
import { cn } from '@/lib/utils';
import { formatHealthScore } from '@/lib/utils/formatting';
import type { SquadCoachReport } from '@/types/squad-coach';

interface CoachingCardProps {
  report: SquadCoachReport;
  onCoach?: (userId: string) => void;
  onViewDetails?: (userId: string) => void;
  className?: string;
}

export const CoachingCard = React.memo<CoachingCardProps>(
  ({ report, onCoach, onViewDetails, className }) => {
    const healthInfo = formatHealthScore(report.health_score);

    return (
      <div
        className={cn(
          'rounded-xl border border-sf-border/60 bg-sf-bg/40 p-4 hover:border-sf-primary/50 hover:bg-sf-bg/70 transition-all',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-sf-surface rounded-lg">
              <User className="h-4 w-4 text-sf-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-sf-text">{report.full_name}</h4>
              <p className="text-xs text-sf-text-muted">{report.email}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {report.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Health Score */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-sf-text-muted">Health Score</span>
            <span className="text-lg font-bold text-sf-text">
              {healthInfo.emoji} {report.health_score.toFixed(0)}
            </span>
          </div>
          <div className="h-2 bg-sf-surface rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                healthInfo.color === 'green' && 'bg-green-500',
                healthInfo.color === 'yellow' && 'bg-yellow-500',
                healthInfo.color === 'orange' && 'bg-orange-500',
                healthInfo.color === 'red' && 'bg-red-500'
              )}
              style={{ width: `${Math.min(report.health_score, 100)}%` }}
            />
          </div>
        </div>

        {/* Focus Area */}
        <div className="mb-3">
          <FocusAreaBadge focusArea={report.focus_area} />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="flex items-center gap-1 text-sf-text-muted">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            <span>{report.conversion_rate_percent.toFixed(1)}% Conv.</span>
          </div>
          <div className="flex items-center gap-1 text-sf-text-muted">
            <MessageCircle className="h-3 w-3" aria-hidden="true" />
            <span>{report.reply_rate_percent.toFixed(1)}% Reply</span>
          </div>
          <div className="flex items-center gap-1 text-sf-text-muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{report.overdue_followups} Überfällig</span>
          </div>
          <div className="flex items-center gap-1 text-sf-text-muted">
            <User className="h-3 w-3" aria-hidden="true" />
            <span>{report.contacts_signed} Signed</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onCoach && (
            <Button
              onClick={() => onCoach(report.user_id)}
              size="sm"
              variant="primary"
              className="flex-1"
            >
              Coach
            </Button>
          )}
          {onViewDetails && (
            <Button
              onClick={() => onViewDetails(report.user_id)}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Details
            </Button>
          )}
        </div>
      </div>
    );
  }
);

CoachingCard.displayName = 'CoachingCard';

