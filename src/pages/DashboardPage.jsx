import { Link } from "react-router-dom";
import DailyCommandCard from "../features/daily-command/DailyCommandCard";
import SalesSidebar from "../components/SalesSidebar";
import { usePricingModal } from "../context/PricingModalContext";
import { useSubscription } from "../hooks/useSubscription";
import { useUser } from "../context/UserContext";

const NEEDS_ACTION_LEADS = [
  {
    id: "ld-101",
    name: "Sabrina König",
    company: "Volt Labs",
    priority: "high",
    blocker: "Budget-Freigabe hängt noch beim CFO – brauchst ein kurzes Exec-Summary.",
    lastTouch: "vor 2h",
    owner: "Du",
    channel: "WhatsApp",
  },
  {
    id: "ld-102",
    name: "Jonas Pfeiffer",
    company: "Northbase",
    priority: "medium",
    blocker: "Wartet auf Phoenix-Recordings zur letzten Kampagne.",
    lastTouch: "gestern",
    owner: "Aylin",
    channel: "Email",
  },
  {
    id: "ld-103",
    name: "Marina Alvarez",
    company: "Flowgrid",
    priority: "high",
    blocker: "Speed-Hunter Sequenz pausiert – Champion braucht neuen Touchpoint.",
    lastTouch: "vor 30 min",
    owner: "Du",
    channel: "Voice Drop",
  },
  {
    id: "ld-104",
    name: "Lea Sommer",
    company: "SupplyFox",
    priority: "medium",
    blocker: "CSV-Import wartet auf Datenbereinigung (120 Kontakte).",
    lastTouch: "vor 1 Tag",
    owner: "Ravi",
    channel: "Slack",
  },
];

const DEAL_HIGHLIGHTS = [
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

const SPEED_HUNTER_METRICS = [
  { label: "Aktive Kampagnen", value: "4", helper: "2 kurz vor Versand" },
  { label: "Geplante Nachrichten", value: "28", helper: "inkl. Warm Intros" },
  { label: "Signal Alerts", value: "+58", helper: "letzte 24h" },
];

const PHOENIX_METRICS = [
  { label: "Reaktivierte Kontakte", value: "12", helper: "5 erneut aktiv" },
  { label: "Offene Reaktivierungen", value: "7", helper: "Need Touchpoint" },
  { label: "Pipeline zurückgewonnen", value: "€190k", helper: "Q4 Fokus" },
];

const INSIGHT_ITEMS = [
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

const PIPELINE_OVERVIEW = {
  label: "Pipeline (90 Tage)",
  value: "1.450.000 €",
  helper: "+18% vs. letzte Woche",
};

const DashboardPage = () => {
  const { openPricing } = usePricingModal();
  const { plan, planLabel, status } = useSubscription();
  const user = useUser();

  const highPriorityLeadCount = NEEDS_ACTION_LEADS.filter(
    (lead) => lead.priority === "high"
  ).length;
  const warmLeadCount = Math.max(NEEDS_ACTION_LEADS.length - highPriorityLeadCount, 0);

  const dailyFocusItems = [
    `${highPriorityLeadCount || 3} heiße Leads im Follow-up`,
    `${warmLeadCount || 2} geplante Touchpoints finalisieren`,
    "CSV-Import mit 120 Kontakten prüfen",
  ];

  return (
    <main className="flex-1">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 text-white lg:grid-cols-[320px,1fr]">
        <SalesSidebar
          user={user}
          plan={plan}
          planLabel={planLabel}
          planStatus={status || "inactive"}
          needsActionLeads={NEEDS_ACTION_LEADS}
          onUpgrade={() => openPricing("pro")}
        />

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6">
              <header className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">Daily Focus</p>
                <h2 className="text-lg font-semibold text-slate-50">Heute musst du…</h2>
                <p className="text-sm text-slate-400">
                  {planLabel} · Fokus auf wenige, saubere Schritte.
                </p>
              </header>
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

            <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6">
              <header>
                <h2 className="text-lg font-semibold text-slate-50">Dein aktueller Deal-Status</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Kurzer Überblick – Details findest du in Speed-Hunter und Playbooks.
                </p>
              </header>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {PIPELINE_OVERVIEW.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-50">
                  {PIPELINE_OVERVIEW.value}
                </p>
                <p className="text-xs text-emerald-400">{PIPELINE_OVERVIEW.helper}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {DEAL_HIGHLIGHTS.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
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

          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6">
            <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-50">
                Speed-Hunter &amp; Phönix – aktuelle Aktionen
              </h2>
              <p className="text-xs text-slate-500">Autopilot zuletzt aktualisiert vor 2 Stunden.</p>
            </header>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Speed-Hunter</p>
                <p className="mt-1 text-sm text-slate-400">Kampagnen &amp; Buying Signals</p>
                <dl className="mt-4 space-y-3">
                  {SPEED_HUNTER_METRICS.map((metric) => (
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
                <p className="mt-1 text-sm text-slate-400">Reaktivierungen &amp; Wärmegrad</p>
                <dl className="mt-4 space-y-3">
                  {PHOENIX_METRICS.map((metric) => (
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
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Insights &amp; Ideen</h2>
              <p className="mt-1 text-xs text-slate-400">
                Optionale Vorschläge &amp; Analysen – nice to have, aber nicht täglich Pflicht.
              </p>
            </div>
            <div className="space-y-4">
              {INSIGHT_ITEMS.map((insight) => (
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
