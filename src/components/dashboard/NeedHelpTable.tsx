import { memo } from 'react';
import type { NeedHelpRep } from '@/types/dashboard';
import { Badge } from '@/components/ui/Badge';

type NeedHelpTableProps = {
  reps: NeedHelpRep[];
  isLoading?: boolean;
  onCoachClick?: (userId: string) => void;
};

export const NeedHelpTable = memo(
  ({ reps, isLoading, onCoachClick }: NeedHelpTableProps) => {
    if (isLoading) {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Need Help Reps</h2>
            <p className="text-xs text-slate-500">Hohe Aktivität, niedrige Conversion</p>
          </header>
          <div className="space-y-3" aria-live="polite">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Need Help Reps</h2>
          <p className="text-xs text-slate-500">Hohe Aktivität, niedrige Conversion</p>
        </header>

        {reps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-center text-sm text-emerald-700">
            Keine auffälligen Reps – weiter so! 🎯
          </div>
        ) : (
          <div className="space-y-3" role="list">
            {reps.map((rep) => (
              <article
                key={rep.user_id}
                role="listitem"
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{rep.full_name}</p>
                    <p className="text-xs text-slate-500">{rep.email}</p>
                  </div>
                  <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">
                    {rep.conversion_rate_percent.toFixed(1)}% Conversion
                  </Badge>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs text-slate-600 md:grid-cols-4">
                  <div>
                    <dt className="text-slate-500">Kontakte</dt>
                    <dd className="font-semibold text-slate-900">{rep.contacts_contacted}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Signups</dt>
                    <dd className="font-semibold text-slate-900">{rep.contacts_signed}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Aktive Tage</dt>
                    <dd className="font-semibold text-slate-900">
                      {rep.active_days_last_30} / 30
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Ø Response</dt>
                    <dd className="font-semibold text-slate-900">
                      {rep.avg_response_time_hours.toFixed(1)}h
                    </dd>
                  </div>
                </dl>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onCoachClick?.(rep.user_id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    Coaching starten
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }
);

NeedHelpTable.displayName = 'NeedHelpTable';

