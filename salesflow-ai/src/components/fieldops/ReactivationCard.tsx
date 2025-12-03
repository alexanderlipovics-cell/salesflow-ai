// ============================================================================
// FILE: src/components/fieldops/ReactivationCard.tsx
// DESCRIPTION: Card component for displaying reactivation candidates
// ============================================================================

import React from 'react';
import { History, MessageCircle, Calendar, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReactivationBadge } from '@/components/sf/ReactivationBadge';
import { cn } from '@/lib/utils';
import type { ReactivationCandidate } from '@/types/reactivation';

interface ReactivationCardProps {
  candidate: ReactivationCandidate;
  onReactivate?: (contactId: string) => void;
  className?: string;
}

export const ReactivationCard = React.memo<ReactivationCardProps>(
  ({ candidate, onReactivate, className }) => {
    return (
      <div
        className={cn(
          'rounded-xl border border-sf-border/60 bg-sf-bg/40 p-4 hover:border-sf-primary/50 hover:bg-sf-bg/70 transition-all',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-sf-text">
              {candidate.full_name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {candidate.status}
              </Badge>
              <ReactivationBadge
                priority={candidate.reactivation_priority}
                score={candidate.reactivation_score}
                showScore
              />
            </div>
          </div>
          <History className="h-4 w-4 text-sf-primary flex-shrink-0" aria-hidden="true" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="flex items-center gap-1 text-sf-text-muted">
            <Calendar className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span>{candidate.days_since_last_contact} Tage seit Kontakt</span>
          </div>
          <div className="flex items-center gap-1 text-sf-text-muted">
            <MessageCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span>{candidate.total_events} Interaktionen</span>
          </div>
          <div className="flex items-center gap-1 text-sf-text-muted">
            <TrendingUp className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span>{candidate.reply_count} Antworten</span>
          </div>
          {candidate.last_action_type && (
            <div className="text-sf-text-subtle text-xs">
              Letzte Aktion: {candidate.last_action_type}
            </div>
          )}
        </div>

        {/* Last Contact */}
        <div className="text-xs text-sf-text-subtle mb-3">
          Letzter Kontakt:{' '}
          {new Date(candidate.last_contact_at).toLocaleDateString('de-DE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>

        {/* Action */}
        {onReactivate && (
          <Button
            onClick={() => onReactivate(candidate.contact_id)}
            className="w-full"
            variant="primary"
            size="sm"
          >
            Kontakt reaktivieren
          </Button>
        )}
      </div>
    );
  }
);

ReactivationCard.displayName = 'ReactivationCard';

