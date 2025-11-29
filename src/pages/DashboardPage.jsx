import { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePricingModal } from "../context/PricingModalContext";
import { useSubscription } from "../hooks/useSubscription";
import { useUser } from "../context/UserContext";
import { PLAN_LABELS } from "../lib/plans";
import SalesSidebar from "../components/SalesSidebar";

const NEEDS_ACTION_LEADS = [
  {
    id: "1",
    name: "Lena Maurer",
    company: "Nexonic GmbH",
    priority: "high",
    blocker: "Kein Status nach Import · AI braucht letzten Kontakt",
    lastTouch: "vor 3 Std.",
    owner: "Sabine",
    channel: "LinkedIn DM",
  },
  {
    id: "2",
    name: "Tom Stein",
    company: "BoldCart",
    priority: "medium",
    blocker: "Deal Value fehlt · KPIs offen",
    lastTouch: "gestern",
    owner: "Lena",
    channel: "WhatsApp",
  },
  {
    id: "3",
    name: "Ayşe K.",
    company: "Cloudberg",
    priority: "high",
    blocker: "Nächste Aktion nicht geplant",
    lastTouch: "vor 2 Tagen",
    owner: "Marco",
    channel: "Voice Drop",
  },
];

const DashboardPage = () => {
  const { openPricing } = usePricingModal();
  const { plan, status } = useSubscription();
  const user = useUser();

  const planLabel = useMemo(
    () => PLAN_LABELS[plan] || plan?.toUpperCase() || "Free",
    [plan]
  );

  const highPriorityLeadCount = NEEDS_ACTION_LEADS.filter(
    (lead) => lead.priority === "high"
  ).length;
  const dailyFocusItems = [
    `${highPriorityLeadCount} heiße Leads im Follow-up`,
    `${NEEDS_ACTION_LEADS.length - highPriorityLeadCount} geplante Touchpoints finalisieren`,
    "CSV-Import mit 120 Kontakten prüfen",
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

  return (
    <div className="mx-auto grid max-w-6xl gap-6 text-white lg:grid-cols-[320px,1fr]">
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
          <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Daily Focus
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                Heute musst du…
              </h2>
              <p className="text-sm text-slate-400">
                {planLabel} · Fokus auf Qualität statt Masse.
              </p>
            </div>
            <ul className="text-sm text-slate-200 space-y-1.5">
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
              <h2 className="text-lg font-semibold text-slate-50">
                Dein aktueller Deal-Status
              </h2>
              <p className="text-xs text-slate-400">
                Kurzer Überblick – Details findest du in Speed-Hunter und
                Playbooks.
              </p>
            </header>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Pipeline (90 Tage)
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-50">
                1.450.000 €
              </p>
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
                  <p className="mt-2 text-xl font-semibold text-slate-50">
                    {metric.value}
                  </p>
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
            <p className="text-xs text-slate-500">
              Autopilot zuletzt aktualisiert vor 2 Stunden.
            </p>
          </header>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Speed-Hunter
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Kampagnen & Buying Signals
              </p>
              <dl className="mt-4 space-y-3">
                {speedHunterMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-baseline justify-between"
                  >
                    <dt className="text-sm text-slate-300">{metric.label}</dt>
                    <dd className="text-base font-semibold text-slate-50">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-slate-500">
                Fokus: Neue Buying Signals sofort in Playbooks mappen.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Phönix
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Reaktivierungen & Wärmegrad
              </p>
              <dl className="mt-4 space-y-3">
                {phoenixMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-baseline justify-between"
                  >
                    <dt className="text-sm text-slate-300">{metric.label}</dt>
                    <dd className="text-base font-semibold text-slate-50">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-slate-500">
                Reminder: Persönlichen Kontext hinzufügen, bevor die AI sendet.
              </p>
            </article>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">
              Insights & Ideen
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Optionale Vorschläge & Analysen – nice to have, aber nicht täglich
              Pflicht.
            </p>
          </div>
          <div className="space-y-4">
            {insightItems.map((insight) => (
              <article
                key={insight.title}
                className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4"
              >
                <p className="text-sm font-medium text-slate-200">
                  {insight.title}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {insight.description}
                </p>
                <p className="mt-2 text-xs text-emerald-400">{insight.action}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
