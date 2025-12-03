import { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, Target, TrendingUp, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { CoachingOutput, CoachingOutputRep } from '@/types/coaching';

interface CoachingSidebarProps {
  coaching: CoachingOutput | null;
  selectedRep: CoachingOutputRep | null;
  isLoading?: boolean;
  className?: string;
}

export const CoachingSidebar = memo<CoachingSidebarProps>(
  ({ coaching, selectedRep, isLoading, className }) => {
    if (isLoading) {
      return (
        <div className={className}>
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx}>
                <Skeleton className="h-4 w-48 bg-sf-surface/60" />
                <Skeleton className="mt-2 h-3 w-full bg-sf-surface/40" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!coaching) {
      return (
        <div className={className}>
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-sf-text-muted">
            <Sparkles className="mb-2 h-6 w-6 text-sf-primary" aria-hidden="true" />
            Coaching-Analyse wird geladen …
          </div>
        </div>
      );
    }

    return (
      <div className={className}>
        <div className="space-y-6">
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-3 flex items-center gap-2 text-sf-text">
              <TrendingUp className="h-4 w-4 text-sf-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Team-Fokus</h3>
            </div>
            <div className="rounded-xl border border-sf-border/60 bg-sf-surface/60 px-4 py-3">
              <p className="text-sm font-medium text-sf-text">
                {coaching.team_summary.headline}
              </p>
              <p className="mt-1 text-xs text-sf-text-muted leading-relaxed">
                {coaching.team_summary.description}
              </p>
            </div>
            {coaching.team_summary.suggested_team_actions.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-1 text-xs text-sf-text-muted">
                  <Target className="h-3 w-3 text-sf-accent" aria-hidden="true" />
                  Team Actions
                </div>
                <ul className="space-y-1 text-xs text-sf-text-muted">
                  {coaching.team_summary.suggested_team_actions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-sf-primary">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>

          <div className="h-px bg-sf-border/60" />

          {selectedRep ? (
            <motion.section
              key={selectedRep.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-sf-text">
                <Lightbulb className="h-4 w-4 text-sf-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-sf-text-muted">Coaching</p>
                  <p className="text-sm font-semibold">
                    {selectedRep.display_name ?? 'Rep Insight'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-sf-border/60 bg-sf-bg/40 p-4">
                <p className="text-xs text-sf-text-muted mb-1">Diagnose</p>
                <p className="text-xs text-sf-text leading-relaxed">{selectedRep.diagnosis}</p>
              </div>

              {!!selectedRep.suggested_actions.length && (
                <div>
                  <p className="text-xs font-semibold text-sf-text mb-2">Konkrete Maßnahmen</p>
                  <ul className="space-y-2 text-xs text-sf-text-muted">
                    {selectedRep.suggested_actions.map((action, idx) => (
                      <li
                        key={idx}
                        className="rounded-lg border border-sf-border/50 bg-sf-surface/40 px-3 py-2"
                      >
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!!selectedRep.script_ideas.length && (
                <div>
                  <p className="text-xs font-semibold text-sf-text mb-2">Script-Ideen</p>
                  <div className="space-y-2">
                    {selectedRep.script_ideas.map((idea, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-sf-border/50 bg-gradient-to-r from-sf-primary/10 to-transparent px-3 py-2 text-xs italic text-sf-text-muted"
                      >
                        “{idea}”
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRep.timeline && (
                <div className="flex items-center gap-2 rounded-lg bg-sf-surface/40 px-3 py-2 text-xs text-sf-text">
                  <Clock className="h-4 w-4 text-sf-primary" aria-hidden="true" />
                  {selectedRep.timeline}
                </div>
              )}
            </motion.section>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-sf-text-muted">
              <Sparkles className="mb-2 h-5 w-5 text-sf-primary" aria-hidden="true" />
              Wähle einen Rep aus, um personalisierte Coaching-Tipps zu sehen.
            </div>
          )}
        </div>
      </div>
    );
  }
);

CoachingSidebar.displayName = 'CoachingSidebar';

