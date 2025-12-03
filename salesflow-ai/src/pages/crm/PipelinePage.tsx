import { useEffect, useMemo, useState } from "react";
import { DealListItem, DealStage, DealsResponse, fetchDeals } from "@/api/crm";
import { cn } from "@/lib/utils";

const STAGE_ORDER: DealStage[] = [
  "new",
  "qualified",
  "meeting",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const STAGE_LABELS: Record<DealStage, string> = {
  new: "Neu",
  qualified: "Qualified",
  meeting: "Meeting",
  proposal: "Proposal",
  negotiation: "Verhandlung",
  won: "Won",
  lost: "Lost",
};

const currency = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const PipelinePage = () => {
  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [meta, setMeta] = useState<DealsResponse | null>(null);
  const [pipeline, setPipeline] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetchDeals({
      perPage: 250,
      pipeline: pipeline || undefined,
      search: search.trim() || undefined,
      sortBy: "stage_entered_at",
      sortOrder: "asc",
    })
      .then((response) => {
        setDeals(response.items);
        setMeta(response);
      })
      .catch((err) => setError(err.message ?? "Pipeline konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [pipeline, search]);

  const groupedDeals = useMemo(() => {
    return STAGE_ORDER.reduce<Record<DealStage, DealListItem[]>>((acc, stage) => {
      acc[stage] = deals.filter((deal) => deal.stage === stage);
      return acc;
    }, {} as Record<DealStage, DealListItem[]>);
  }, [deals]);

  const totalValue = useMemo(
    () =>
      deals.reduce((sum, deal) => {
        const numeric = Number(deal.value);
        return sum + (Number.isFinite(numeric) ? numeric : 0);
      }, 0),
    [deals]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-gray-500">CRM · Pipeline</p>
          <h1 className="text-3xl font-semibold text-white">Dealboard</h1>
          <p className="text-sm text-gray-400">
            Sicht auf alle aktiven Opportunities inkl. Stage-Progression.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Pipeline</p>
            <p className="text-xl font-semibold text-white">{currency.format(totalValue)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Deals oder Kontakte durchsuchen"
          className="col-span-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-salesflow-accent/70 focus:outline-none"
        />
        <input
          value={pipeline}
          onChange={(event) => setPipeline(event.target.value)}
          placeholder="Pipeline-Key (z.B. default)"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-salesflow-accent/70 focus:outline-none"
        />
      </div>

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-center text-gray-400">
          Pipeline wird geladen …
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-100">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 lg:grid-cols-7">
          {STAGE_ORDER.map((stage) => {
            const items = groupedDeals[stage];
            const columnValue = items.reduce((sum, deal) => {
              const numeric = Number(deal.value);
              return sum + (Number.isFinite(numeric) ? numeric : 0);
            }, 0);

            return (
              <section
                key={stage}
                className="flex min-h-[24rem] flex-col rounded-3xl border border-white/5 bg-black/30 p-4"
              >
                <header className="mb-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                    {STAGE_LABELS[stage]}
                  </p>
                  <p className="text-lg font-semibold text-white">{items.length}</p>
                  <p className="text-xs text-gray-400">{currency.format(columnValue)}</p>
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                  {items.length === 0 && (
                    <p className="rounded-2xl border border-white/5 bg-black/40 px-3 py-4 text-center text-xs text-gray-500">
                      Keine Deals
                    </p>
                  )}
                  {items.map((deal) => (
                    <article
                      key={deal.id}
                      className={cn(
                        "space-y-2 rounded-2xl border border-white/5 bg-white/5 p-3 text-xs text-gray-200",
                        stage === "won" && "border-emerald-400/40 bg-emerald-400/5",
                        stage === "lost" && "border-rose-400/40 bg-rose-400/5"
                      )}
                    >
                      <p className="text-sm font-semibold text-white">{deal.title}</p>
                      <p className="text-gray-400">{deal.contact_name ?? "Unbekannter Kontakt"}</p>
                      <p className="text-sm font-semibold text-white">
                        {currency.format(Number(deal.value) || 0)}
                      </p>
                      {deal.expected_close_date && (
                        <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">
                          Close {new Date(deal.expected_close_date).toLocaleDateString("de-AT")}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {meta && (
        <p className="text-center text-xs uppercase tracking-[0.3em] text-gray-500">
          Total Deals: {meta.total}
        </p>
      )}
    </div>
  );
};

export default PipelinePage;

