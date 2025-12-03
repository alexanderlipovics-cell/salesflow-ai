import { useMemo, useState } from 'react';
import { AlertCircle, Calendar, RefreshCw, Users } from 'lucide-react';
import { useSquadCoachCoaching } from '@/hooks/useSquadCoachCoaching';
import { PageShell } from '@/components/sf/PageShell';
import { SectionCard } from '@/components/sf/SectionCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { TimeRangeSelector } from '@/components/squad-coach/TimeRangeSelector';
import { CoachingSidebar } from '@/components/coaching/CoachingSidebar';
import { RepFocusPanel } from '@/components/coaching/RepFocusPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FocusAreaBadge } from '@/components/squad-coach/FocusAreaBadge';
import type { FocusArea } from '@/types/coaching';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

interface SquadCoachPageProps {
  workspaceId: string;
}

const CACHE_REFRESH_MS = 300_000;

const SquadCoachPageContent: React.FC<SquadCoachPageProps> = ({ workspaceId }) => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);

  const coaching = useSquadCoachCoaching({
    workspaceId,
    daysBack,
    language: 'de',
    refreshInterval: CACHE_REFRESH_MS,
    enabled: Boolean(workspaceId),
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Fehler beim Laden',
        description: error.message,
      }),
    onSuccess: () =>
      toast({
        title: 'Coaching aktualisiert',
        description: 'Neue Insights verfügbar',
      }),
  });

  const rows = coaching.report ?? [];

  const selectedRow = useMemo(() => {
    if (!rows.length) return null;
    const found = rows.find((row) => row.user_id === selectedUserId);
    return found ?? rows[0];
  }, [rows, selectedUserId]);

  const selectedCoachingRep = useMemo(() => {
    if (!coaching.coaching || !selectedRow) return null;
    return coaching.coaching.reps.find((rep) => rep.user_id === selectedRow.user_id) ?? null;
  }, [coaching.coaching, selectedRow]);

  const handleRefresh = async () => {
    await coaching.refetch(true);
  };

  return (
    <PageShell
      title="Squad Coach – Team Diagnose"
      subtitle="KI-gestützte Performance-Analyse mit individualisierten Coaching-Tipps"
      rightNode={
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={daysBack} onChange={setDaysBack} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={coaching.loading || coaching.isRefetching}
          >
            <RefreshCw
              className={cn(
                'mr-2 h-4 w-4',
                (coaching.loading || coaching.isRefetching) && 'animate-spin'
              )}
            />
            Aktualisieren
          </Button>
        </div>
      }
    >
      {coaching.error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">{coaching.error.message}</p>
              {coaching.error.details && (
                <p className="text-xs opacity-80 mt-1">{String(coaching.error.details)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr,1.1fr]">
        <SectionCard
          title="Team-Übersicht"
          subtitle="Performance-Metriken aller Reps"
          isLoading={coaching.loading && !rows.length}
        >
          {!rows.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-sf-text-muted">
              <Users className="mb-2 h-8 w-8" aria-hidden="true" />
              Noch keine Team-Daten verfügbar
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-sf-border/70 text-xs uppercase tracking-wide text-sf-text-muted">
                    <th className="py-2 pr-4 text-left font-medium">Rep</th>
                    <th className="py-2 pr-4 text-right font-medium">Reply %</th>
                    <th className="py-2 pr-4 text-right font-medium">Conv %</th>
                    <th className="py-2 pr-4 text-right font-medium">Overdue</th>
                    <th className="py-2 pr-0 text-right font-medium">Fokus</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.user_id}
                      className={cn(
                        'border-b border-sf-border/40 last:border-0 cursor-pointer transition-colors',
                        row.user_id === selectedRow?.user_id ? 'bg-sf-primary/5' : 'hover:bg-white/5'
                      )}
                      onClick={() => setSelectedUserId(row.user_id)}
                    >
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-sf-text">
                            {row.full_name || row.email || row.user_id}
                          </span>
                          <span className="text-xs text-sf-text-muted">
                            {row.contacts_contacted} Kontakte · {row.contacts_signed} Signups
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {row.reply_rate_percent.toFixed(1)}%
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {row.conversion_rate_percent.toFixed(1)}%
                      </td>
                      <td className="py-2 pr-4 text-right">{row.overdue_followups}</td>
                      <td className="py-2 pl-2 text-right">
                        <FocusAreaBadge focusArea={row.focus_area as FocusArea} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Rep Details"
          subtitle={selectedRow?.full_name || selectedRow?.email || 'Wähle einen Rep'}
          isLoading={coaching.loading && !selectedRow}
        >
          <RepFocusPanel rep={selectedRow} isLoading={coaching.loading} />
        </SectionCard>

        <SectionCard
          title="CHIEF Coaching"
          subtitle="KI-generierte Insights"
          isLoading={coaching.loading && !coaching.coaching}
        >
          <CoachingSidebar
            coaching={coaching.coaching}
            selectedRep={selectedCoachingRep}
            isLoading={coaching.loading && !coaching.coaching}
          />
        </SectionCard>
      </div>

      {coaching.lastFetched && (
        <div className="flex items-center justify-center gap-2 text-xs text-sf-text-muted">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          Zuletzt aktualisiert: {coaching.lastFetched.toLocaleTimeString('de-DE')}
        </div>
      )}
    </PageShell>
  );
};

export const SquadCoachPage: React.FC<SquadCoachPageProps> = (props) => (
  <ErrorBoundary>
    <SquadCoachPageContent {...props} />
  </ErrorBoundary>
);

export default function SquadCoachPageWithUser() {
  const user = useUser();
  const workspaceId = (user?.workspace_id as string) ?? 'demo-workspace';
  return <SquadCoachPage workspaceId={workspaceId} />;
}

