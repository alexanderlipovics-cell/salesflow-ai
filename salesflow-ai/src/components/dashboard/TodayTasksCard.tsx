import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { SFTable } from '@/components/sf/SFTable';
import type { TodayTask } from '@/types/dashboard';

interface TodayTasksCardProps {
  tasks: TodayTask[];
  tasksCompleted: number;
  tasksOpen: number;
  isLoading?: boolean;
  onTaskClick?: (taskId: string) => void;
}

export const TodayTasksCard = memo<TodayTasksCardProps>(
  ({ tasks, tasksCompleted, tasksOpen, isLoading, onTaskClick }) => {
    const columns = useMemo(
      () => [
        {
          key: 'contact_name',
          header: 'Kontakt',
          render: (value: string | null) => value || 'Unbekannt',
          sortable: true,
        },
        {
          key: 'contact_status',
          header: 'Status',
          render: (value: string | null) => (
            <span className="text-xs text-sf-text-muted">{value || '–'}</span>
          ),
        },
        {
          key: 'task_type',
          header: 'Typ',
          className: 'text-xs capitalize text-sf-text-muted',
          sortable: true,
        },
        {
          key: 'task_due_at',
          header: 'Fällig',
          render: (value: string) =>
            new Date(value).toLocaleString('de-DE', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          sortable: true,
        },
      ],
      []
    );

    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-sf-border/80 bg-sf-card/95 shadow-sf-md"
      >
        <header className="flex flex-col gap-2 border-b border-sf-border/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-sf-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold tracking-tight text-sf-text">
                Heute fällige Follow-ups
              </h2>
            </div>
            <p className="text-xs text-sf-text-muted">
              Alle Tasks bis heute Nacht – perfekt für dein Power-Hour.
            </p>
          </div>
          <div className="text-xs text-sf-text-muted">
            <span className="font-semibold text-sf-text">{tasksCompleted}</span> erledigt ·{' '}
            <span className="font-semibold text-sf-text">{tasksOpen}</span> offen
          </div>
        </header>
        <div className="px-6 py-4">
          <SFTable
            data={tasks}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Keine offenen Aufgaben heute – gönn dir das Coaching-Deck!"
            onRowClick={(task) => onTaskClick?.(task.task_id)}
            keyExtractor={(task) => task.task_id}
          />
        </div>
      </motion.section>
    );
  }
);

TodayTasksCard.displayName = 'TodayTasksCard';
