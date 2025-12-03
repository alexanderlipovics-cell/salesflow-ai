import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { TopTemplate } from '@/types/dashboard';

interface TemplatePerformanceCardProps {
  templates: TopTemplate[];
  isLoading?: boolean;
  daysBack?: number;
}

export const TemplatePerformanceCard = memo<TemplatePerformanceCardProps>(
  ({ templates, isLoading, daysBack = 30 }) => {
    const chartData = useMemo(
      () =>
        templates.slice(0, 10).map((template) => ({
          name: template.title || template.purpose || 'Ohne Titel',
          conversion: Number(template.conversion_rate_percent),
          contacted: template.contacts_contacted,
          signed: template.contacts_signed,
        })),
      [templates]
    );

    const getBarColor = (conversion: number) => {
      if (conversion >= 15) return '#10b981';
      if (conversion >= 10) return '#06b6d4';
      if (conversion >= 5) return '#f59e0b';
      return '#475569';
    };

    if (isLoading) {
      return (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-sf-border/80 bg-sf-card/95 p-6 shadow-sf-md"
        >
          <Skeleton className="h-5 w-48 bg-sf-surface" />
          <Skeleton className="mt-6 h-72 w-full bg-sf-surface" />
        </motion.section>
      );
    }

    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-sf-border/80 bg-sf-card/95 p-6 shadow-sf-md"
      >
        <header className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-sf-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-sf-text">
              Template-Performance
            </h2>
            <p className="text-xs text-sf-text-muted">Top 10 Templates (letzte {daysBack} Tage)</p>
          </div>
        </header>

        {chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-sf-text-muted">
            Noch keine Template-Daten – starte zuerst ein paar Kampagnen.
          </div>
        ) : (
          <div className="h-80" role="img" aria-label="Template Conversion Chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <XAxis
                  dataKey="name"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={80}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: 12,
                    border: '1px solid #334155',
                    color: '#f1f5f9',
                  }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value.toFixed(1)}%`,
                    props.payload.name,
                  ]}
                />
                <Bar dataKey="conversion">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.conversion)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.section>
    );
  }
);

TemplatePerformanceCard.displayName = 'TemplatePerformanceCard';
