import { Activity, Flame, Sparkles, TrendingUp } from "lucide-react";
import { usePricingModal } from "../context/PricingModalContext";
import { useSubscription } from "../hooks/useSubscription";
import { useUser } from "../context/UserContext";
import DailyCommandCard from "../features/daily-command/DailyCommandCard";

const keyStats = [
  {
    label: "Pipeline (90d)",
    value: "€1.45M",
    helper: "+18% vs. letzte Woche",
    icon: TrendingUp,
  },
  {
    label: "AI Touchpoints heute",
    value: "27",
    helper: "6 fällig · 21 geplant",
    icon: Sparkles,
  },
  {
    label: "Aktive Sequenzen",
    value: "14",
    helper: "6 laufen im Autopilot",
    icon: Activity,
  },
];

const sequenceInsights = [
  {
    label: "WhatsApp Warm-Up",
    value: "92%",
    detail: "Antwortquote",
  },
  {
    label: "Phoenix Reactivations",
    value: "38",
    detail: "Deals wieder geöffnet",
  },
  {
    label: "Speed-Hunter Kampagnen",
    value: "5",
    detail: "aktiv · 2 warten",
  },
];

const DashboardPage = () => {
  const { openPricing } = usePricingModal();
  const { planLabel } = useSubscription();
  const user = useUser();

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
        <section className="card-surface p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Willkommen zurück, {user.name?.split(" ")[0] || "Crew"}
              </p>
              <h1 className="text-xl font-semibold text-slate-50">
                Deine AI Revenue Workbench
              </h1>
              <p className="text-sm text-slate-300">
                Aktueller Plan:{" "}
                <span className="font-semibold text-emerald-400">{planLabel}</span>{" "}
                · Upgrade für volle Speed-Hunter Automation.
              </p>
            </div>
            <button
              onClick={() => openPricing("pro")}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Upgrade entdecken
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {keyStats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <stat.icon className="h-4 w-4 text-slate-400" />
                  {stat.label}
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-50">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500">{stat.helper}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Pipeline-Überblick
              </p>
              <h2 className="text-lg font-semibold text-slate-50">
                Fokus auf Deals mit Buying Window {"<"} 30 Tage
              </h2>
            </div>
            <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400">
              Sync alle 5 min
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-4xl font-semibold text-emerald-400">€420k</p>
              <p className="text-sm text-slate-400">Net-new Pipeline · 24 Accounts</p>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" />
                8 Hot Deals brauchen nächste Aktion
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                Speed-Hunter hat 3 neue ICP Signale
              </div>
            </div>
          </div>
        </section>

        <section className="card-surface p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Aktive Sequenzen & AI Touchpoints
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {sequenceInsights.map((insight) => (
              <article
                key={insight.label}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <p className="text-xs text-slate-500">{insight.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {insight.value}
                </p>
                <p className="text-xs text-slate-400">{insight.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <DailyCommandCard horizonDays={3} limit={6} />
      </div>
    </main>
  );
};

export default DashboardPage;
