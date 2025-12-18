import { memo, useState } from 'react';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TopTemplate } from '@/types/dashboard';

type TemplatePerformanceChartProps = {
  templates: TopTemplate[];
  isLoading?: boolean;
  daysBack?: number;
};

export const TemplatePerformanceChart = memo(
  ({ templates, isLoading, daysBack = 30 }: TemplatePerformanceChartProps) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const chartData = templates.slice(0, 10).map((item) => ({
      name: item.title || item.purpose || 'Ohne Titel',
      conversion: Number(item.conversion_rate_percent),
      contacted: item.contacts_contacted,
      signed: item.contacts_signed,
    }));

    const getBarColor = (index: number) => {
      if (hoveredIndex === index) return '#ea580c';
      const conversion = chartData[index]?.conversion ?? 0;
      if (conversion >= 15) return '#16a34a';
      if (conversion >= 10) return '#f97316';
      return '#ef4444';
    };

    if (isLoading) {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Template-Performance</h2>
            <p className="text-xs text-slate-500">Top 10 Templates (letzte {daysBack} Tage)</p>
          </header>
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Template-Performance</h2>
          <p className="text-xs text-slate-500">Top 10 Templates (letzte {daysBack} Tage)</p>
        </header>

        {chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
            Noch keine Template-Daten verfügbar
          </div>
        ) : (
          <div className="h-80" role="img" aria-label="Template Performance Chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 12, left: 0, bottom: 60 }}
                accessibilityLayer
              >
                <XAxis
                  dataKey="name"
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Conversion Rate (%)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: '#475569' },
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
                        <p className="font-semibold text-slate-900">{data.name}</p>
                        <p className="text-slate-600">
                          Conversion: <strong>{data.conversion.toFixed(1)}%</strong>
                        </p>
                        <p className="text-slate-500">Kontaktiert: {data.contacted}</p>
                        <p className="text-slate-500">Signups: {data.signed}</p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="conversion"
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    );
  }
);

TemplatePerformanceChart.displayName = 'TemplatePerformanceChart';

