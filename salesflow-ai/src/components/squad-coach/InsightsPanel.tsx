// ============================================================================
// FILE: src/components/squad-coach/InsightsPanel.tsx
// DESCRIPTION: AI-powered insights panel for Squad Coach
// ============================================================================

import React from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SquadCoachReport } from '@/types/squad-coach';

interface InsightsPanelProps {
  reports: SquadCoachReport[];
  className?: string;
}

interface Insight {
  type: 'success' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const InsightsPanel = React.memo<InsightsPanelProps>(({ reports, className }) => {
  const insights: Insight[] = React.useMemo(() => {
    if (reports.length === 0) return [];

    const insights: Insight[] = [];

    // Check for team-wide patterns
    const avgConversion =
      reports.reduce((sum, r) => sum + r.conversion_rate_percent, 0) / reports.length;
    const avgReplyRate =
      reports.reduce((sum, r) => sum + r.reply_rate_percent, 0) / reports.length;

    if (avgConversion < 5) {
      insights.push({
        type: 'warning',
        icon: <TrendingDown className="h-4 w-4" />,
        title: 'Team-weite niedrige Conversion',
        description: `Durchschnittliche Conversion Rate von ${avgConversion.toFixed(1)}% deutet auf systematische Lead Quality Issues hin.`,
      });
    }

    if (avgReplyRate > 20) {
      insights.push({
        type: 'success',
        icon: <TrendingUp className="h-4 w-4" />,
        title: 'Starkes Team Engagement',
        description: `Durchschnittliche Reply Rate von ${avgReplyRate.toFixed(1)}% ist überdurchschnittlich gut!`,
      });
    }

    const highOverdue = reports.filter((r) => r.overdue_followups >= 5).length;
    if (highOverdue > reports.length * 0.3) {
      insights.push({
        type: 'warning',
        icon: <AlertCircle className="h-4 w-4" />,
        title: 'Follow-up Disziplin-Problem',
        description: `${highOverdue} von ${reports.length} Reps haben 5+ überfällige Tasks. Zeit für ein Team-Training?`,
      });
    }

    return insights;
  }, [reports]);

  if (insights.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Sparkles className="h-8 w-8 text-sf-text-muted mx-auto mb-2" />
        <p className="text-sm text-sf-text-muted">Sammle mehr Daten für AI Insights</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-sf-primary" />
        <h3 className="text-sm font-semibold text-sf-text">AI Insights</h3>
      </div>

      {insights.map((insight, index) => (
        <div
          key={index}
          className={cn(
            'rounded-lg p-4 border',
            insight.type === 'success' && 'border-green-500/20 bg-green-500/5',
            insight.type === 'warning' && 'border-yellow-500/20 bg-yellow-500/5',
            insight.type === 'info' && 'border-blue-500/20 bg-blue-500/5'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'p-2 rounded-lg flex-shrink-0',
                insight.type === 'success' && 'bg-green-500/10 text-green-400',
                insight.type === 'warning' && 'bg-yellow-500/10 text-yellow-400',
                insight.type === 'info' && 'bg-blue-500/10 text-blue-400'
              )}
            >
              {insight.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-sf-text mb-1">{insight.title}</h4>
              <p className="text-xs text-sf-text-muted">{insight.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

InsightsPanel.displayName = 'InsightsPanel';

