import { Activity, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { usePricingModal } from "../context/PricingModalContext";
import { useSubscription } from "../hooks/useSubscription";
import { useUser } from "../context/UserContext";

const heroStats = [
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

const touchpointMetrics = [
  {
    label: "Speed-Hunter Kampagnen",
    value: "5",
    helper: "2 warten auf Versand",
  },
  {
    label: "Phoenix Reaktivierungen",
    value: "38",
    helper: "Deals wieder geöffnet",
  },
  {
    label: "Signal Alerts",
    value: "+58",
    helper: "letzte 24h",
  },
];

const dailyFocus = [
  "3 heiße Leads im Follow-up abschließen",
  "CSV-Import mit 120 Kontakten prüfen",
  "Speed-Hunter Kampagne „Phönix“ triggern",
];

const DashboardPage = () => {
  const { openPricing } = usePricingModal();
  const { planLabel } = useSubscription();
  const user = useUser();
  const firstName = user.name?.split(" ")[0] ?? "Crew";

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
        <section className="card-surface space-y-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Willkommen zurück, {firstName}
              </p>
              <h1 className="text-xl font-semibold text-slate-50">
                Deine AI Revenue Workbench
              </h1>
              <p className="text-sm text-slate-300">
                Aktueller Plan:{" "}
                <span className="font-semibold text-emerald-400">{planLabel}</span> ·
                Upgrade für volle Speed-Hunter Automation.
              </p>
            </div>
            <button
              onClick={() => openPricing("pro")}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Upgrade entdecken
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {heroStats.map((stat) => (
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

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card-surface space-y-4 p-6">
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Pipeline-Überblick
              </p>
              <h2 className="text-lg font-semibold text-slate-50">
                Fokus auf Deals mit Buying Window {"<"} 30 Tage
              </h2>
            </header>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-4xl font-semibold text-emerald-400">€420k</p>
                <p className="text-sm text-slate-400">Net-new Pipeline · 24 Accounts</p>
                <p className="text-xs text-emerald-400">+18% vs. letzte Woche</p>
              </div>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-400" />
                  8 Hot Deals brauchen eine neue Aktion
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  Speed-Hunter hat 3 neue ICP Signale
                </div>
              </div>
            </div>
          </section>

          <section className="card-surface space-y-4 p-6">
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Aktive Sequenzen & Touchpoints
              </p>
              <h2 className="text-lg font-semibold text-slate-50">
                Autopilot-Status in Echtzeit
              </h2>
            </header>
            <div className="grid gap-3">
              {touchpointMetrics.map((metric) => (
                <article
                  key={metric.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {metric.label}
                    </p>
                    <p className="text-xs text-slate-500">{metric.helper}</p>
                  </div>
                  <p className="text-xl font-semibold text-slate-50">{metric.value}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="card-surface space-y-4 p-6">
          <header>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Heute
            </p>
            <h2 className="text-lg font-semibold text-slate-50">
              Daily Command Fokus
            </h2>
            <p className="text-xs text-slate-500">
              Kurzer Fokus-Plan – tiefer einsteigen im Daily Command Modul.
            </p>
          </header>
          <ul className="space-y-2 text-sm text-slate-200">
            {dailyFocus.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-emerald-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/daily-command"
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Zur Daily Command Ansicht →
          </Link>
        </section>
      </div>
    </main>
  );
};

export default DashboardPage;
