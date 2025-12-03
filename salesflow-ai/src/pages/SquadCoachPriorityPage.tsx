// ============================================================================
// FILE: src/pages/SquadCoachPriorityPage.tsx
// DESCRIPTION: Squad Coach Priority Analysis Dashboard
// ============================================================================

import React, { useContext } from 'react';
import { AlertTriangle, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { useSquadCoachAnalysis } from '@/hooks/useSquadCoachAnalysis';
import { PriorityDistributionChart } from '@/components/squad-coach/PriorityDistributionChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserContext } from '@/context/UserContext';

export const SquadCoachPriorityPage: React.FC = () => {
  const { workspaceId } = useContext(UserContext) || {};
  const analysis = useSquadCoachAnalysis(workspaceId || '', {
    daysBack: 7,
    refetchInterval: 300000, // 5 minutes
  });

  const repsNeedingCoaching = analysis.analysis.filter((rep) => rep.needs_coaching);
  const totalCritical = analysis.analysis.reduce((sum, rep) => sum + rep.critical_followups, 0);
  const totalOverdue = analysis.analysis.reduce((sum, rep) => sum + rep.overdue_count, 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Squad Coach – Priority Analysis
          </h1>
          <p className="text-slate-400">
            Team-weite Prioritätsverteilung und Coaching-Bedarf
          </p>
        </div>
        <Button
          onClick={() => analysis.refetch()}
          disabled={analysis.isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${analysis.isLoading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Reps needing coaching */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm text-slate-400">Coaching-Bedarf</span>
          </div>
          <div className="flex items-baseline gap-2">
            {analysis.isLoading ? (
              <div className="h-10 w-20 bg-slate-800 animate-pulse rounded" />
            ) : (
              <>
                <span className="text-4xl font-bold text-white">
                  {repsNeedingCoaching.length}
                </span>
                <span className="text-slate-500">/ {analysis.analysis.length} Reps</span>
              </>
            )}
          </div>
        </div>

        {/* Total critical follow-ups */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-sm text-slate-400">Kritische Follow-ups</span>
          </div>
          <div className="flex items-baseline gap-2">
            {analysis.isLoading ? (
              <div className="h-10 w-20 bg-slate-800 animate-pulse rounded" />
            ) : (
              <>
                <span className="text-4xl font-bold text-white">{totalCritical}</span>
                {totalOverdue > 0 && (
                  <span className="text-sm text-red-400">({totalOverdue} überfällig)</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Active reps */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Aktive Reps</span>
          </div>
          <div className="flex items-baseline gap-2">
            {analysis.isLoading ? (
              <div className="h-10 w-20 bg-slate-800 animate-pulse rounded" />
            ) : (
              <span className="text-4xl font-bold text-white">{analysis.analysis.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Priority Distribution Chart */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white mb-1">Prioritätsverteilung nach Rep</h2>
          <p className="text-sm text-slate-400">
            Kritische, sehr hohe und hohe Priorität gestapelt
          </p>
        </div>
        <PriorityDistributionChart analysis={analysis.analysis} isLoading={analysis.isLoading} />
      </div>

      {/* Reps Needing Coaching Table */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h2 className="text-xl font-bold text-white">Reps mit Coaching-Bedarf</h2>
        </div>

        {analysis.isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-800/50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : analysis.error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            Fehler beim Laden der Analyse
          </div>
        ) : repsNeedingCoaching.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Kein Coaching-Bedarf</p>
            <p className="text-sm text-slate-500 mt-1">
              Alle Reps haben ihre Prioritäten im Griff
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-3 pr-4 font-medium text-left">Rep</th>
                  <th className="py-3 pr-4 font-medium text-center">Kritisch</th>
                  <th className="py-3 pr-4 font-medium text-center">Sehr Hoch</th>
                  <th className="py-3 pr-4 font-medium text-center">Hoch</th>
                  <th className="py-3 pr-4 font-medium text-center">Überfällig</th>
                  <th className="py-3 pr-4 font-medium text-center">Ø Score</th>
                  <th className="py-3 pr-4 font-medium text-center">Max Score</th>
                </tr>
              </thead>
              <tbody>
                {repsNeedingCoaching.map((rep) => (
                  <tr
                    key={rep.user_id}
                    className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-4 pr-4">
                      <div>
                        <div className="font-medium text-white">{rep.user_name}</div>
                        <div className="text-xs text-slate-500">{rep.user_email}</div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-center">
                      <Badge
                        variant="secondary"
                        className="bg-red-500/10 text-red-400 border-red-500/20"
                      >
                        {rep.critical_followups}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4 text-center">
                      <Badge
                        variant="secondary"
                        className="bg-orange-500/10 text-orange-400 border-orange-500/20"
                      >
                        {rep.very_high_followups}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4 text-center">
                      <Badge
                        variant="secondary"
                        className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      >
                        {rep.high_followups}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4 text-center">
                      {rep.overdue_count > 0 ? (
                        <span className="text-red-400 font-medium">{rep.overdue_count}</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-center text-white font-medium">
                      {rep.avg_priority_score.toFixed(1)}
                    </td>
                    <td className="py-4 pr-4 text-center text-slate-400">
                      {rep.max_priority_score.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Reps Overview */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Alle Reps – Übersicht</h2>

        {analysis.isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-800/50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-3 pr-4 font-medium text-left">Rep</th>
                  <th className="py-3 pr-4 font-medium text-center">Total Open</th>
                  <th className="py-3 pr-4 font-medium text-center">Heute</th>
                  <th className="py-3 pr-4 font-medium text-center">Überfällig</th>
                  <th className="py-3 pr-4 font-medium text-center">Ø Score</th>
                  <th className="py-3 pr-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {analysis.analysis.map((rep) => (
                  <tr
                    key={rep.user_id}
                    className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-4 pr-4">
                      <div>
                        <div className="font-medium text-white">{rep.user_name}</div>
                        <div className="text-xs text-slate-500">{rep.user_email}</div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-center text-white">
                      {rep.total_open_followups}
                    </td>
                    <td className="py-4 pr-4 text-center text-slate-400">{rep.today_count}</td>
                    <td className="py-4 pr-4 text-center">
                      {rep.overdue_count > 0 ? (
                        <span className="text-red-400 font-medium">{rep.overdue_count}</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-center text-white">
                      {rep.avg_priority_score.toFixed(1)}
                    </td>
                    <td className="py-4 pr-4 text-center">
                      {rep.needs_coaching ? (
                        <Badge
                          variant="secondary"
                          className="bg-red-500/10 text-red-400 border-red-500/20"
                        >
                          Coaching
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/10 text-green-400 border-green-500/20"
                        >
                          OK
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SquadCoachPriorityPage;

