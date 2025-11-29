import { Activity, Flame, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import DailyCommandCard from "../features/daily-command/DailyCommandCard";
import SalesSidebar from "../components/SalesSidebar";
import { usePricingModal } from "../context/PricingModalContext";
import { useSubscription } from "../hooks/useSubscription";
import { useUser } from "../context/UserContext";

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

const NEEDS_ACTION_LEADS = [
  {
    id: "lead-1",
    name: "Lena Storm",
    company: "Voltify",
    priority: "high",
    blocker: "CFO wartezeit · Bitte champion aufwärmen",
    lastTouch: "vor 4h",
    owner: "Timo",
    channel: "WhatsApp",
  },
  {
    id: "lead-2",
    name: "Noah Braun",
    company: "Flowmatic",
    priority: "high",
    blocker: "Demo offen, Decision Maker ungeklärt",
    lastTouch: "gestern",
    owner: "Lena",
    channel: "LinkedIn",
  },
  {
    id: "lead-3",
    name: "Sofia Reich",
    company: "Nordbyte",
    priority: "medium",
    blocker: "Security Fragen warten auf Antwort",
    lastTouch: "vor 2 Tagen",
    owner: "Mara",
    channel: "E-Mail",
  },
];

const dealHighlights = [
  {
    label: "Aktive Sequenzen",
    value: "12",
    helper: "+3 seit Montag",
  },
  {
    label: "AI-Touchpoints heute",
    value: "18",
    helper: "WhatsApp · Voice Drops",
  },
];

const speedHunterMetrics = [
  { label: "Aktive Kampagnen", value: "4", helper: "2 kurz vor Versand" },
  { label: "Geplante Nachrichten", value: "28", helper: "inkl. Warm Intros" },
  { label: "Signal Alerts", value: "+58", helper: "letzte 24h" },
];

const phoenixMetrics = [
  { label: "Reaktivierte Kontakte", value: "12", helper: "5 erneut aktiv" },
  { label: "Offene Reaktivierungen", value: "7", helper: "Need Touchpoint" },
  { label: "Pipeline zurückgewonnen", value: "€190k", helper: "Q4 Fokus" },
];

const insightItems = [
  {
    title: "Mid-Market reagiert 18% schneller auf hybride Touchpoints.",
    description:
      "Kombiniere WhatsApp + Voice Drop bei Champions, die in den letzten 48h geghostet haben.",
    action: "Playbook 'Board Ping' kurz halten (max. 70 Wörter).",
  },
  {
    title: "Renewals mit Risk Alerts drohen in KW49 zu kippen.",
    description:
      "Priorisiere Accounts mit 'Renewals gefährdet' und verteile die Pings auf Morgen früh.",
    action: "Speed-Hunter: Alert-Filter auf >40% Risk stellen.",
  },
  {
    title: "Phönix liefert warmes Re-Engagement nach 2 Tagen Ruhe.",
    description:
      "Nutze das 'Reignite' Skript erst nach einer persönlichen Notiz, um Antwortquoten zu halten.",
    action: "Füge kurze Loom-Notiz für Top 3 Deals hinzu.",
  },
];

const DashboardPage = () => {
  const { openPricing } = usePricingModal();
  const { plan, planLabel, status } = useSubscription();
  const user = useUser();

  const highPriorityLeadCount = NEEDS_ACTION_LEADS.filter(
    (lead) => lead.priority === "high"
  ).length;

  const dailyFocusItems = [
    `${highPriorityLeadCount} heiße Leads im Follow-up`,
    `${NEEDS_ACTION_LEADS.length - highPriorityLeadCount} geplante Touchpoints finalisieren`,
    "CSV-Import mit 120 Kontakten prüfen",
  ];

  return (
    <main className="flex-1">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 text-white lg:grid-cols-[320px,1fr]">
        <SalesSidebar
          user={user}
          plan={plan}
          planLabel={planLabel}
          planStatus={status || "inactive"}
          needsActionLeads={NEEDS_ACTION_LEADS}
          onUpgrade={() => openPricing("pro")}
        />

        <div className="space-y-6">
          <section className="card-surface p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Willkommen zurück, {user?.name?.split(" ")[0] || "Crew"}
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
                Pro Plan freischalten
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Daily Focus</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-50">Heute musst du…</h2>
                <p className="text-sm text-slate-400">
                  {planLabel} · Fokus auf Qualität statt Masse.
                </p>
              </div>
              <ul className="space-y-1.5 text-sm text-slate-200">
                {dailyFocusItems.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/daily-command"
                className="mt-2 inline-flex items-center text-sm font-medium text-emerald-400 hover:text-emerald-300"
              >
                Zur Daily Command Ansicht →
              </Link>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6 space-y-4">
              <header className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold text-slate-50">Dein aktueller Deal-Status</h2>
                <p className="text-xs text-slate-400">
                  Kurzer Überblick – Details findest du in Speed-Hunter und Playbooks.
                </p>
              </header>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Pipeline (90 Tage)</p>
                <p className="mt-1 text-2xl font-semibold text-slate-50">1.450.000 €</p>
                <p className="text-xs text-emerald-400">+18% vs. letzte Woche</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {dealHighlights.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">{metric.value}</p>
                    <p className="text-xs text-slate-400">{metric.helper}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6 space-y-4">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-50">
                Speed-Hunter & Phönix – aktuelle Aktionen
              </h2>
              <p className="text-xs text-slate-500">Autopilot zuletzt aktualisiert vor 2 Stunden.</p>
            </header>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Speed-Hunter</p>
                <p className="mt-1 text-sm text-slate-400">Kampagnen & Buying Signals</p>
                <dl className="mt-4 space-y-3">
                  {speedHunterMetrics.map((metric) => (
                    <div key={metric.label} className="flex items-baseline justify-between">
                      <dt className="text-sm text-slate-300">{metric.label}</dt>
                      <dd className="text-base font-semibold text-slate-50">{metric.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-slate-500">
                  Fokus: Neue Buying Signals sofort in Playbooks mappen.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Phönix</p>
                <p className="mt-1 text-sm text-slate-400">Reaktivierungen & Wärmegrad</p>
                <dl className="mt-4 space-y-3">
                  {phoenixMetrics.map((metric) => (
                    <div key={metric.label} className="flex items-baseline justify-between">
                      <dt className="text-sm text-slate-300">{metric.label}</dt>
                      <dd className="text-base font-semibold text-slate-50">{metric.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-slate-500">
                  Reminder: Persönlichen Kontext hinzufügen, bevor die AI sendet.
                </p>
              </article>
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
                  <p className="mt-3 text-2xl font-semibold text-slate-50">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.helper}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="card-surface p-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
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
                  <p className="mt-2 text-2xl font-semibold text-slate-50">{insight.value}</p>
                  <p className="text-xs text-slate-400">{insight.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Insights & Ideen</h2>
              <p className="mt-1 text-xs text-slate-400">
                Optionale Vorschläge & Analysen – nice to have, aber nicht täglich Pflicht.
              </p>
            </div>
            <div className="space-y-4">
              {insightItems.map((insight) => (
                <article
                  key={insight.title}
                  className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4"
                >
                  <p className="text-sm font-medium text-slate-200">{insight.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{insight.description}</p>
                  <p className="mt-2 text-xs text-emerald-400">{insight.action}</p>
                </article>
              ))}
            </div>
          </section>

          <DailyCommandCard horizonDays={3} limit={6} />
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
