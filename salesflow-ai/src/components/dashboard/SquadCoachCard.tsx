import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertTriangle } from 'lucide-react';
import { SFTable } from '@/components/sf/SFTable';
import type { NeedHelpRep, TopNetworker } from '@/types/dashboard';

interface SquadCoachCardProps {
  topNetworkers: TopNetworker[];
  needHelpReps: NeedHelpRep[];
  isLoading?: boolean;
  onRepClick?: (userId: string) => void;
}

export const SquadCoachCard = memo<SquadCoachCardProps>(
  ({ topNetworkers, needHelpReps, isLoading, onRepClick }) => {
    const networkerColumns = useMemo(
      () => [
        {
          key: 'name',
          header: 'Rep',
          render: (_value: string, row: TopNetworker) => row.name || row.email,
          sortable: true,
        },
        {
          key: 'contacts_contacted',
          header: 'Kontakte',
          sortable: true,
        },
        {
          key: 'contacts_signed',
          header: 'Signups',
          sortable: true,
        },
        {
          key: 'conversion_rate_percent',
          header: 'Conversion',
          render: (value: number) => `${value.toFixed(1)}%`,
          sortable: true,
        },
      ],
      []
    );

    const needHelpColumns = useMemo(
      () => [
        {
          key: 'full_name',
          header: 'Rep',
          render: (_value: string, row: NeedHelpRep) => row.full_name || row.email,
          sortable: true,
        },
        {
          key: 'active_days_last_30',
          header: 'Aktive Tage',
          sortable: true,
        },
        {
          key: 'contacts_contacted',
          header: 'Kontakte',
          sortable: true,
        },
        {
          key: 'conversion_rate_percent',
          header: 'Conversion',
          render: (value: number) => (
            <span className="text-sf-error">{value.toFixed(1)}%</span>
          ),
          sortable: true,
        },
      ],
      []
    );

    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl border border-sf-border/80 bg-sf-card/95 p-6 shadow-sf-md"
        >
          <header className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-sf-success" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-sf-text">
                Top Networker
              </h2>
              <p className="text-xs text-sf-text-muted">Letzte 30 Tage</p>
            </div>
          </header>
          <SFTable
            data={topNetworkers}
            columns={networkerColumns}
            isLoading={isLoading}
            emptyMessage="Noch keine Aktivitätsdaten – erst ein paar Kontakte starten."
            onRowClick={(row) => onRepClick?.(row.user_id)}
            keyExtractor={(row) => row.user_id}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-2xl border border-sf-border/80 bg-sf-card/95 p-6 shadow-sf-md"
        >
          <header className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-sf-warning" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-sf-text">
                Reps mit Potenzial
              </h2>
              <p className="text-xs text-sf-text-muted">Viel Aktivität, wenig Conversion</p>
            </div>
          </header>
          <SFTable
            data={needHelpReps}
            columns={needHelpColumns}
            isLoading={isLoading}
            emptyMessage="Momentan keine auffälligen Reps – weiter so."
            onRowClick={(row) => onRepClick?.(row.user_id)}
            keyExtractor={(row) => row.user_id}
          />
        </motion.section>
      </div>
    );
  }
);

SquadCoachCard.displayName = 'SquadCoachCard';
