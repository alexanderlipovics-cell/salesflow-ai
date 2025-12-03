// ============================================================================
// FILE: src/pages/SquadCoachPageV2.tsx
// DESCRIPTION: Complete Squad Coach Analytics V2 (Production-Ready)
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Users, AlertTriangle, TrendingUp, Filter, RefreshCw } from 'lucide-react';
import { useSquadCoachReport } from '@/hooks/useSquadCoachReport';
import { PageShell } from '@/components/sf/PageShell';
import { SectionCard } from '@/components/sf/SectionCard';
import { KpiCard } from '@/components/sf/KpiCard';
import { CoachingCard } from '@/components/squad-coach/CoachingCard';
import { FocusAreaDistributionChart } from '@/components/squad-coach/FocusAreaDistributionChart';
import { TimeRangeSelector } from '@/components/squad-coach/TimeRangeSelector';
import { ExportButton } from '@/components/squad-coach/ExportButton';
import { InsightsPanel } from '@/components/squad-coach/InsightsPanel';
import { FocusAreaBadge } from '@/components/squad-coach/FocusAreaBadge';
import { SegmentButton } from '@/components/sf/SegmentButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FOCUS_AREA_CONFIGS, type FocusArea, type SquadCoachReport } from '@/types/squad-coach';

interface SquadCoachPageV2Props {
  workspaceId: string;
  workspaceName?: string;
}

type FilterOption = 'all' | FocusArea | 'needs_coaching';

const SquadCoachPageContent: React.FC<SquadCoachPageV2Props> = ({
  workspaceId,
  workspaceName = 'Workspace',
}) => {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [daysBack, setDaysBack] = useState(30);
  const [selectedReport, setSelectedReport] = useState<SquadCoachReport | null>(null);

  const squadCoach = useSquadCoachReport(workspaceId, {
    daysBack,
    refetchInterval: 300000, // 5 minutes
    onError: (error) => {
      console.error('Squad Coach error:', error);
    },
  });

  const filteredReports = useMemo(() => {
    if (filter === 'all') return squadCoach.reports;
    if (filter === 'needs_coaching') {
      return squadCoach.reports.filter((r) => r.coaching_priority <= 3);
    }
    return squadCoach.reports.filter((r) => r.focus_area === filter);
  }, [squadCoach.reports, filter]);

  const handleCoach = (userId: string) => {
    const report = squadCoach.reports.find((r) => r.user_id === userId);
    if (report) {
      setSelectedReport(report);
      console.log('Opening coaching modal for:', report.full_name);
      // TODO: Open coaching modal
    }
  };

  const handleViewDetails = (userId: string) => {
    console.log('Viewing details for user:', userId);
    // TODO: Navigate to rep dashboard
  };

  const handleRefresh = () => {
    squadCoach.refetch();
  };

  return (
    <PageShell
      title="Squad Coach – Team Analytics V2"
      subtitle="Identifiziere Engpässe und unterstütze dein Team gezielt"
      rightNode={
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={daysBack} onChange={setDaysBack} />
          <ExportButton reports={squadCoach.reports} workspaceName={workspaceName} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={squadCoach.isLoading}
            className="sf-button-secondary"
          >
            <RefreshCw
              className={cn('h-4 w-4', squadCoach.isLoading && 'animate-spin')}
            />
          </Button>
        </div>
      }
    >
      {/* Error State */}
      {squadCoach.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{squadCoach.error.message}</p>
        </div>
      )}

      {/* Overview KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Total Reps"
          value={squadCoach.analytics.totalReps}
          icon={Users}
          isLoading={squadCoach.isLoading}
        />
        <KpiCard
          label="Benötigen Coaching"
          value={squadCoach.analytics.needsCoaching}
          icon={AlertTriangle}
          isLoading={squadCoach.isLoading}
          trend={
            squadCoach.analytics.needsCoaching > squadCoach.analytics.totalReps * 0.3
              ? { value: squadCoach.analytics.needsCoaching, direction: 'up' }
              : undefined
          }
        />
        <KpiCard
          label="Ø Health Score"
          value={squadCoach.analytics.avgHealthScore.toFixed(1)}
          icon={TrendingUp}
          isLoading={squadCoach.isLoading}
        />
        <KpiCard
          label="Balanced Reps"
          value={squadCoach.analytics.focusAreaDistribution.balanced || 0}
          icon={Users}
          isLoading={squadCoach.isLoading}
        />
      </div>

      {/* Two Column Layout: Chart + Insights */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        {/* Focus Area Distribution */}
        <SectionCard
          title="Team-weite Focus Area Verteilung"
          subtitle="Wo konzentrieren sich die Engpässe?"
          isLoading={squadCoach.isLoading}
        >
          <FocusAreaDistributionChart
            distribution={squadCoach.analytics.focusAreaDistribution}
            isLoading={squadCoach.isLoading}
          />
        </SectionCard>

        {/* AI Insights */}
        <SectionCard title="AI Insights" isLoading={squadCoach.isLoading}>
          <InsightsPanel reports={squadCoach.reports} />
        </SectionCard>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-sf-text-muted flex-shrink-0" />
        <SegmentButton
          title="Alle"
          description={`${squadCoach.analytics.totalReps} Reps`}
          icon={Users}
          isActive={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <SegmentButton
          title="Brauchen Coaching"
          description={`${squadCoach.analytics.needsCoaching} Reps`}
          icon={AlertTriangle}
          isActive={filter === 'needs_coaching'}
          onClick={() => setFilter('needs_coaching')}
        />
        {(['timing_help', 'script_help', 'lead_quality', 'balanced'] as FocusArea[]).map(
          (area) => (
            <SegmentButton
              key={area}
              title={FOCUS_AREA_CONFIGS[area].label}
              description={`${squadCoach.analytics.focusAreaDistribution[area] || 0}`}
              isActive={filter === area}
              onClick={() => setFilter(area)}
            />
          )
        )}
      </div>

      {/* Rep Cards */}
      <div>
        {filteredReports.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">
              Keine Reps in diesem Filter
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Versuche einen anderen Filter oder warte auf mehr Daten
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredReports.map((report) => (
              <CoachingCard
                key={report.user_id}
                report={report}
                onCoach={handleCoach}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Last Fetched */}
      {squadCoach.lastFetched && (
        <div className="text-center text-xs text-slate-500">
          Letzte Aktualisierung:{' '}
          {squadCoach.lastFetched.toLocaleTimeString('de-DE')}
        </div>
      )}
    </PageShell>
  );
};

export const SquadCoachPageV2: React.FC<SquadCoachPageV2Props> = (props) => {
  return (
    <ErrorBoundary>
      <SquadCoachPageContent {...props} />
    </ErrorBoundary>
  );
};

export default SquadCoachPageV2;

