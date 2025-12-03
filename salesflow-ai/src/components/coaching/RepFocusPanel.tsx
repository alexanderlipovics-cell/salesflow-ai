import { memo } from 'react';
import { AlertCircle, Clock, Flame, MessageCircle, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { SquadCoachRow, FocusArea } from '@/types/coaching';
import { FOCUS_AREA_CONFIGS } from '@/types/squad-coach';

interface RepFocusPanelProps {
  rep: SquadCoachRow | null;
  isLoading?: boolean;
  className?: string;
}

export const RepFocusPanel = memo<RepFocusPanelProps>(({ rep, isLoading, className }) => {
  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <Skeleton key={idx} className="h-20 rounded-xl bg-sf-surface/60" />
          ))}
        </div>
      </div>
    );
  }

  if (!rep) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-sf-border/60 bg-sf-surface/60 py-10 text-center text-sm text-sf-text-muted">
          <AlertCircle className="mb-2 h-6 w-6" aria-hidden="true" />
          Wähle einen Rep aus der Tabelle
        </div>
      </div>
    );
  }

  const focusConfig = FOCUS_AREA_CONFIGS[rep.focus_area as FocusArea];

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard icon={<Flame className="h-4 w-4" aria-hidden="true" />} label="Leads (30d)" value={rep.leads_created} />
          <MetricCard
            icon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
            label="Reply Rate"
            value={`${rep.reply_rate_percent.toFixed(1)}%`}
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            label="Conversion"
            value={`${rep.conversion_rate_percent.toFixed(1)}%`}
          />
        </div>

        <div className="rounded-xl border border-sf-border/70 bg-sf-bg/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-sf-text-muted mb-1">Haupt-Fokus</p>
              <div className="text-sm font-semibold text-sf-text">{focusConfig.label}</div>
              <p className="mt-2 text-xs text-sf-text-muted leading-relaxed">{focusConfig.description}</p>
            </div>
            <Clock className="h-5 w-5 text-sf-primary" aria-hidden="true" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBadge title="Überfällig" value={rep.overdue_followups} highlight={rep.overdue_followups >= 5} />
          <StatBadge title="High Priority" value={rep.high_priority_open_followups} />
        </div>
      </div>
    </div>
  );
});

RepFocusPanel.displayName = 'RepFocusPanel';

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-sf-border/70 bg-sf-bg/40 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-sf-text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-sf-text">{value}</div>
    </div>
  );
}

function StatBadge({
  title,
  value,
  highlight,
}: {
  title: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-sf-surface/60 px-3 py-2">
      <p className="text-xs text-sf-text-muted">{title}</p>
      <div className="text-lg font-semibold text-sf-text">
        {value}
        {highlight && <span className="ml-1 text-sf-error text-xs font-medium">(hoch)</span>}
      </div>
    </div>
  );
}

