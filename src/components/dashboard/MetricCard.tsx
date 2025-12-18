import { ReactNode, memo } from 'react';
import clsx from 'clsx';

type MetricCardProps = {
  title: string;
  value: number | string;
  isLoading?: boolean;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  format?: 'number' | 'currency' | 'percentage';
  icon?: ReactNode;
  accentColorClass?: string;
};

const formatter = {
  number: (value: number | string) =>
    typeof value === 'number' ? value.toLocaleString('de-DE') : value,
  currency: (value: number | string) =>
    typeof value === 'number'
      ? value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
      : value,
  percentage: (value: number | string) =>
    typeof value === 'number' ? `${value.toFixed(1)} %` : value,
};

export const MetricCard = memo(
  ({
    title,
    value,
    isLoading,
    trend,
    format = 'number',
    icon,
    accentColorClass = 'text-emerald-500',
  }: MetricCardProps) => {
    const displayValue =
      typeof value === 'number' ? formatter[format](value) : (value as string);

    return (
      <section
        className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:shadow-md"
        aria-live="polite"
      >
        <header className="flex items-center justify-between text-sm font-medium text-slate-500">
          <span>{title}</span>
          {icon && <span className={clsx('text-slate-400', accentColorClass)}>{icon}</span>}
        </header>
        {isLoading ? (
          <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-slate-200" />
        ) : (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{displayValue}</span>
            {trend && (
              <span
                className={clsx(
                  'flex items-center gap-1 text-xs font-semibold',
                  trend.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'
                )}
                aria-label={`Veränderung ${trend.direction === 'up' ? 'steigend' : 'fallend'}`}
              >
                {trend.direction === 'up' ? '▲' : '▼'}
                {Math.abs(trend.value).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </section>
    );
  }
);

MetricCard.displayName = 'MetricCard';

