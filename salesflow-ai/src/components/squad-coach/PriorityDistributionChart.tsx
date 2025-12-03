// ============================================================================
// FILE: src/components/squad-coach/PriorityDistributionChart.tsx
// DESCRIPTION: Bar chart showing priority distribution across team members
// ============================================================================

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { SquadCoachPriorityAnalysis } from '@/types/squad-coach';

interface PriorityDistributionChartProps {
  analysis: SquadCoachPriorityAnalysis[];
  isLoading?: boolean;
}

export const PriorityDistributionChart = React.memo<PriorityDistributionChartProps>(
  ({ analysis, isLoading }) => {
    const chartData = analysis.map((rep) => ({
      name: rep.user_name,
      critical: rep.critical_followups,
      very_high: rep.very_high_followups,
      high: rep.high_followups,
      total: rep.total_open_followups,
    }));

    if (isLoading) {
      return (
        <div className="h-64 flex items-center justify-center text-sf-text-muted">
          Lädt...
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-sf-text-muted">
          Keine Daten verfügbar
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <XAxis
            dataKey="name"
            angle={-30}
            textAnchor="end"
            interval={0}
            height={80}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
          />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#020617',
              borderRadius: 12,
              border: '1px solid #334155',
              fontSize: 12,
            }}
            labelStyle={{ color: '#f1f5f9' }}
          />
          <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Kritisch" />
          <Bar dataKey="very_high" stackId="a" fill="#f97316" name="Sehr Hoch" />
          <Bar dataKey="high" stackId="a" fill="#eab308" name="Hoch" />
        </BarChart>
      </ResponsiveContainer>
    );
  }
);

PriorityDistributionChart.displayName = 'PriorityDistributionChart';

