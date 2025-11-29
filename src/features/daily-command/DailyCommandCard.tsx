import { useEffect, useMemo, useState } from "react";
import { DailyCommandItem } from "../../api/dailyCommand";

type DailyCommandCardProps = {
  horizonDays?: number;
  limit?: number;
};

const mockDailyCommand = {
  message: "Heute: 5 Follow-ups, 2 Demos geplant",
  leads: [
    { name: "Max Müller", action: "Follow-up senden" },
    { name: "Anna Schmidt", action: "Demo bestätigen" },
  ],
};

const buildMockDailyCommandItems = (
  limit: number,
  horizonDays: number
): DailyCommandItem[] => {
  const now = new Date();
  const horizon = Math.max(1, horizonDays);

  return mockDailyCommand.leads.slice(0, limit).map((lead, index) => {
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + Math.min(index + 1, horizon));

    const statusCycle = ["hot", "warm", "neu"];
    const status = statusCycle[index % statusCycle.length];

    return {
      id: `mock-${index}`,
      name: lead.name,
      company: "Pipeline",
      status,
      next_action: lead.action,
      next_action_at: dueDate.toISOString(),
      deal_value: null,
      needs_action: true,
    };
  });
};

const statusStyles: Record<
  string,
  { label: string; classes: string }
> = {
  hot: {
    label: "Hot",
    classes:
      "border-red-500/40 bg-red-500/10 text-red-200",
  },
  warm: {
    label: "Warm",
    classes:
      "border-orange-500/40 bg-orange-500/10 text-orange-100",
  },
  cold: {
    label: "Cold",
    classes: "border-blue-500/40 bg-blue-500/10 text-blue-100",
  },
  customer: {
    label: "Customer",
    classes:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  },
  neu: {
    label: "Neu",
    classes:
      "border-zinc-700 bg-zinc-800/80 text-zinc-200",
  },
};

const skeletonItems = Array.from({ length: 3 });

export const DailyCommandCard = ({
  horizonDays = 3,
  limit = 20,
}: DailyCommandCardProps) => {
  const [items, setItems] = useState<DailyCommandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      if (!active) return;
      setItems(buildMockDailyCommandItems(limit, horizonDays));
      setLoading(false);
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [horizonDays, limit]);

  const statusHint = useMemo(
    () => `Nächste ${horizonDays} Tage`,
    [horizonDays]
  );

  const renderItems = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {skeletonItems.map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="h-4 w-2/3 rounded bg-zinc-800" />
              <div className="mt-2 h-3 w-1/3 rounded bg-zinc-800" />
              <div className="mt-4 h-3 w-full rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-300">
          Du hast aktuell keine fälligen Aufgaben.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item) => {
          const displayName = item.name?.trim() || "Unbekannter Kontakt";
          const company =
            item.company?.trim() || "Keine Firma hinterlegt";

          const normalizedStatus =
            item.status?.toLowerCase() || "neu";
          const status =
            statusStyles[normalizedStatus] ?? statusStyles.neu;

          const needsManualPlan =
            item.needs_action && !item.next_action_at;
          const nextActionLabel =
            item.next_action?.trim() ||
            (needsManualPlan
              ? "Planung nötig"
              : "Keine nächste Aktion geplant");

          const nextActionAt = formatDateTime(item.next_action_at);
          const currencyValue =
            typeof item.deal_value === "number"
              ? item.deal_value.toLocaleString("de-AT", {
                  style: "currency",
                  currency: "EUR",
                })
              : null;

          return (
            <div
              key={`${item.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-zinc-50">
                    {displayName}
                  </p>
                  <p className="text-sm text-zinc-400">{company}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${status.classes}`}
                >
                  {status.label}
                </span>
              </div>

              <dl className="mt-4 grid gap-4 text-sm text-zinc-200 md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Nächste Aktion
                  </dt>
                  <dd className="mt-1 text-zinc-100">
                    {nextActionLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Fällig am
                  </dt>
                  <dd className="mt-1">{nextActionAt}</dd>
                </div>
                {currencyValue && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      Deal Value
                    </dt>
                    <dd className="mt-1">{currencyValue}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Status
                  </dt>
                  <dd className="mt-1 capitalize">
                    {status.label}
                  </dd>
                </div>
              </dl>

              {needsManualPlan && (
                <div className="mt-4 inline-flex items-center rounded-full border border-yellow-400/60 bg-yellow-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-yellow-200">
                  Manuell planen
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 text-zinc-100 shadow-2xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Heute musst du…
          </p>
          <h2 className="text-2xl font-semibold text-zinc-50">
            Daily Command
          </h2>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {statusHint}
        </p>
      </div>
      <p className="mt-3 text-sm text-zinc-300">
        {mockDailyCommand.message}
      </p>
      <div className="mt-6">{renderItems()}</div>
    </section>
  );
};

const formatDateTime = (input?: string | null) => {
  if (!input) {
    return "—";
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("de-DE", {
    dateStyle: "full",
    timeStyle: "short",
  });
};

export default DailyCommandCard;
