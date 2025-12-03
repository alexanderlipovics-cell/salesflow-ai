// ============================================================================
// FILE: src/components/squad-coach/FocusAreaDistributionChart.tsx
// DESCRIPTION: Bar chart showing focus area distribution across team
// ============================================================================

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FOCUS_AREA_CONFIGS } from '@/types/squad-coach';

interface FocusAreaDistributionChartProps {
  distribution: Record<string, number>;
  isLoading?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  timing_help: '#ef4444', // red
  script_help: '#f97316', // orange
  lead_quality: '#eab308', // yellow
  balanced: '#22c55e', // green
};

export const FocusAreaDistributionChart = React.memo<FocusAreaDistributionChartProps>(
  ({ distribution, isLoading }) => {
    const chartData = React.useMemo(() => {
      return Object.entries(distribution).map(([key, value]) => ({
        name: FOCUS_AREA_CONFIGS[key as keyof typeof FOCUS_AREA_CONFIGS]?.label || key,
        value,
        color: COLOR_MAP[key] || '#64748b',
      }));
    }, [distribution]);

    if (isLoading) {
      return (
        <div className="h-64 flex items-center justify-center text-sf-text-muted">
          Lädt...
        </div>
      );
    }

    if (chartData.length === 0 || chartData.every((d) => d.value === 0)) {
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
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
);

FocusAreaDistributionChart.displayName = 'FocusAreaDistributionChart';

