import { memo } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { FunnelStats } from '@/types/dashboard';

interface FunnelStatsCardProps {
  stats: FunnelStats | null | undefined;
  isLoading?: boolean;
}

export const FunnelStatsCard = memo<FunnelStatsCardProps>(({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-sf-border/80 bg-sf-card/95 p-6 shadow-sf-md"
      >
        <Skeleton className="h-5 w-56 bg-sf-surface" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-12 w-full bg-sf-surface" />
          <Skeleton className="h-12 w-full bg-sf-surface" />
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-2xl border border-sf-border/80 bg-sf-card/95 p-6 shadow-sf-md"
    >
      <header className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-sf-primary" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-sf-text">
            Funnel-Geschwindigkeit
          </h2>
          <p className="text-xs text-sf-text-muted">First Contact → Signup</p>
        </div>
      </header>

      {!stats ? (
        <div className="py-12 text-center text-sm text-sf-text-muted">
          Noch nicht genug Daten für eine verlässliche Funnel-Auswertung.
        </div>
      ) : (
        <div className="space-y-3">
          <StatRow label="Ø Tage bis Signup" value={stats.avg_days_to_signup} />
          <StatRow label="Median" value={stats.median_days_to_signup} />
          <p className="text-center text-xs text-sf-text-muted">
            Basis: {stats.contacts_with_signup} Kontakte
          </p>
        </div>
      )}
    </motion.section>
  );
});

FunnelStatsCard.displayName = 'FunnelStatsCard';

function StatRow({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-sf-border/60 bg-sf-surface/70 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">
        {label}
      </span>
      <span className="text-2xl font-bold text-sf-text">{value?.toFixed(1) ?? '–'}</span>
    </div>
  );
}
