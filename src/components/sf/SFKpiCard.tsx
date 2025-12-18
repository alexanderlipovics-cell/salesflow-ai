import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SFKpiCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  subline?: string;
  isLoading?: boolean;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  className?: string;
  onClick?: () => void;
}

export const SFKpiCard = memo<SFKpiCardProps>(
  ({ label, value, icon: Icon, subline, isLoading, trend, className, onClick }) => {
    const formattedValue =
      typeof value === 'number' ? value.toLocaleString('de-DE') : value;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        whileHover={onClick ? { scale: 1.02 } : undefined}
        className={cn(
          'relative overflow-hidden rounded-2xl border border-sf-border/80 bg-sf-card/90 p-6 shadow-sf-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sf-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sf-bg',
          onClick && 'cursor-pointer hover:border-sf-primary/60',
          className
        )}
        role={onClick ? 'button' : 'region'}
        tabIndex={onClick ? 0 : undefined}
        aria-label={`${label}: ${formattedValue}`}
        onClick={onClick}
        onKeyDown={(event) => {
          if (!onClick) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sf-primary/5 via-transparent to-sf-accent/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-sf-text-muted">
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="mt-4 h-8 w-28 bg-sf-surface" />
            ) : (
              <div className="mt-4 text-3xl font-semibold tracking-tight text-sf-text">
                {formattedValue}
              </div>
            )}
            {isLoading ? (
              <Skeleton className="mt-2 h-3 w-32 bg-sf-surface" />
            ) : (
              subline && <p className="mt-2 text-xs text-sf-text-muted">{subline}</p>
            )}
          </div>
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sf-border bg-sf-surface">
              <Icon className="h-5 w-5 text-sf-primary" aria-hidden="true" />
            </div>
          )}
        </div>
        {!isLoading && trend && (
          <span
            className={cn(
              'mt-3 inline-flex items-center text-xs font-semibold',
              trend.direction === 'up' ? 'text-sf-success' : 'text-sf-error'
            )}
          >
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
          </span>
        )}
      </motion.div>
    );
  }
);

SFKpiCard.displayName = 'SFKpiCard';
