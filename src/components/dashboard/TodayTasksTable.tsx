import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import type { TodayTask } from '@/types/dashboard';
import { Badge } from '@/components/ui/Badge';

const ROW_HEIGHT = 64;

type SortableFields = Extract<
  keyof TodayTask,
  'contact_name' | 'task_type' | 'task_due_at' | 'contact_lead_score' | 'priority'
>;

type TodayTasksTableProps = {
  tasks: TodayTask[];
  isLoading?: boolean;
  onTaskClick?: (taskId: string) => void;
};

export const TodayTasksTable = memo(
  ({ tasks, isLoading, onTaskClick }: TodayTasksTableProps) => {
    const [sortField, setSortField] = useState<SortableFields>('task_due_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerHeight, setContainerHeight] = useState(360);
    const [scrollTop, setScrollTop] = useState(0);

    const handleResize = useCallback(() => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight || 360);
      }
    }, []);

    useEffect(() => {
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    const sortedTasks = useMemo(() => {
      return [...tasks].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (aValue === bValue) return 0;

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        const compare = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return sortDirection === 'asc' ? compare : -compare;
      });
    }, [tasks, sortField, sortDirection]);

    const shouldVirtualize = sortedTasks.length > 25;
    const visibleCount = shouldVirtualize
      ? Math.ceil(containerHeight / ROW_HEIGHT) + 4
      : sortedTasks.length;
    const startIndex = shouldVirtualize ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT)) : 0;
    const endIndex = shouldVirtualize
      ? Math.min(sortedTasks.length, startIndex + visibleCount)
      : sortedTasks.length;
    const visibleRows = sortedTasks.slice(startIndex, endIndex);
    const topPadding = shouldVirtualize ? startIndex * ROW_HEIGHT : 0;
    const bottomPadding = shouldVirtualize ? (sortedTasks.length - endIndex) * ROW_HEIGHT : 0;

    const handleSort = (field: SortableFields) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    };

    const getPriorityTone = (priority: string) => {
      switch (priority) {
        case 'urgent':
        case 'high':
          return 'bg-rose-100 text-rose-700 border-rose-200';
        case 'medium':
          return 'bg-amber-100 text-amber-700 border-amber-200';
        default:
          return 'bg-slate-100 text-slate-600 border-slate-200';
      }
    };

    if (isLoading) {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Heute fällige Follow-ups</h2>
            <Badge variant="secondary">{tasks.length}</Badge>
          </header>
          <div className="space-y-3" role="status" aria-live="polite">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Heute fällige Follow-ups
            </p>
            <p className="text-sm text-slate-500">
              {tasks.length === 0 ? 'Alles erledigt – stark!' : 'Priorisierte Aufgabenliste'}
            </p>
          </div>
          <Badge variant="secondary" aria-label={`${tasks.length} Aufgaben`}>
            {tasks.length} offen
          </Badge>
        </header>

        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-center text-sm text-emerald-700">
            Keine Tasks für heute. Nutze die freie Zeit für Coaching ✨
          </div>
        ) : (
          <div
            ref={containerRef}
            className={clsx(
              'overflow-y-auto rounded-xl border border-slate-100',
              shouldVirtualize ? 'max-h-[420px]' : ''
            )}
            onScroll={
              shouldVirtualize
                ? (event) => setScrollTop(event.currentTarget.scrollTop)
                : undefined
            }
            role="region"
            aria-label="Aufgabenliste"
          >
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <SortableHead
                    label="Kontakt"
                    field="contact_name"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th scope="col" className="px-4 py-3 text-left">
                    Priorität
                  </th>
                  <SortableHead
                    label="Typ"
                    field="task_type"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Fällig"
                    field="task_due_at"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Score"
                    field="contact_lead_score"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                    numeric
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shouldVirtualize && topPadding > 0 && (
                  <tr style={{ height: topPadding }}>
                    <td colSpan={5} />
                  </tr>
                )}

                {visibleRows.map((task) => (
                  <tr
                    key={task.task_id}
                    tabIndex={0}
                    className="cursor-pointer transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    onClick={() => onTaskClick?.(task.task_id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onTaskClick?.(task.task_id);
                      }
                    }}
                    role="button"
                    aria-label={`Aufgabe für ${task.contact_name || 'unbekannten Kontakt'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {task.contact_name || 'Unbekannter Kontakt'}
                      </div>
                      <p className="text-xs text-slate-500">
                        {task.contact_status || 'Status offen'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={clsx('capitalize', getPriorityTone(task.priority))}
                      >
                        {task.priority || 'normal'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{task.task_type}</td>
                    <td className="px-4 py-3">
                      <time
                        dateTime={task.task_due_at}
                        className="text-xs font-medium text-slate-600"
                      >
                        {task.task_due_at
                          ? new Date(task.task_due_at).toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Heute'}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="secondary">{task.contact_lead_score}</Badge>
                    </td>
                  </tr>
                ))}

                {shouldVirtualize && bottomPadding > 0 && (
                  <tr style={{ height: bottomPadding }}>
                    <td colSpan={5} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }
);

TodayTasksTable.displayName = 'TodayTasksTable';

type SortableHeadProps = {
  label: string;
  field: SortableFields;
  currentField: SortableFields;
  direction: 'asc' | 'desc';
  numeric?: boolean;
  onSort: (field: SortableFields) => void;
};

function SortableHead({
  label,
  field,
  currentField,
  direction,
  numeric,
  onSort,
}: SortableHeadProps) {
  const isActive = currentField === field;

  return (
    <th
      scope="col"
      className={clsx(
        'px-4 py-3 text-left text-xs font-semibold tracking-wide',
        numeric ? 'text-right' : ''
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"
        aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">
          {isActive ? (direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

