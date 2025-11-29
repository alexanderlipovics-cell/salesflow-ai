import {
  Activity,
  ArrowUpRight,
  Bell,
  Flame,
  Radar,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { formatCurrency } from "../lib/plans";

const opportunityStats = [
  {
    label: "Pipeline (90d)",
    value: formatCurrency(1450000),
    delta: "+18% vs. letzte Woche",
  },
  {
    label: "AI Touchpoints",
    value: "312",
    delta: "27 heute geplant",
  },
  {
    label: "Aktive Sequenzen",
    value: "14",
    delta: "6 mit Autopilot",
  },
];

const radarSegments = [
  {
    label: "ICP Coverage",
    value: 82,
    helper: "DACH SaaS",
  },
  {
    label: "Buying Window",
    value: 64,
    helper: "< 14 Tage",
  },
  {
    label: "Multi-Threading",
    value: 48,
    helper: "Accounts mit 3+ Kontakten",
  },
];

const quickActions = [
  { icon: Sparkles, label: "AI Playbook", helper: "Neues Rezept" },
  { icon: Flame, label: "Follow-up", helper: "WhatsApp + Voice" },
  { icon: Activity, label: "Live Feed", helper: "Signale prüfen" },
  { icon: Bell, label: "Reminder", helper: "Slack Push" },
];

const SalesSidebar = ({
  user,
  planLabel,
  plan,
  planStatus,
  needsActionLeads = [],
  onUpgrade,
}) => {
  const showUpgradeCta =
    typeof onUpgrade === "function" && plan !== "enterprise";

  return (
    <aside className="space-y-6 lg:sticky lg:top-28">
      <section className="rounded-3xl border border-white/5 bg-gradient-to-b from-gray-900/80 to-black/60 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">
              SalesFlow Command Deck
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Willkommen{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Dein Plan: {planLabel} · Status {planStatus}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right text-xs">
            <p className="font-semibold text-white">{user?.company || "Speed Squad"}</p>
            <p className="text-gray-400">EU · SDR Team</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {opportunityStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/5 bg-black/30 p-4"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {stat.value}
              </p>
              <p className="text-xs text-salesflow-accent">{stat.delta}</p>
            </div>
          ))}
        </div>

        {showUpgradeCta && (
          <button
            onClick={onUpgrade}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong px-4 py-3 text-sm font-semibold text-black shadow-glow hover:scale-[1.01]"
          >
            Unlock mehr Automationen
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </section>

      <section className="rounded-3xl border border-white/5 bg-gray-950/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Signal Radar
            </p>
            <h3 className="text-lg font-semibold text-white">SpeedHunter Scope</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
            <Radar className="h-4 w-4 text-salesflow-accent" />
            Live
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {radarSegments.map((segment) => (
            <div key={segment.label}>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{segment.label}</span>
                <span>{segment.helper}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/5">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong"
                  style={{ width: `${segment.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-left text-gray-300 hover:border-salesflow-accent/40"
            >
              <action.icon className="h-4 w-4 text-salesflow-accent" />
              <div>
                <p className="text-sm text-white">{action.label}</p>
                <p className="text-xs text-gray-500">{action.helper}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/5 bg-gray-950/90 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Kontakte ohne Status
            </p>
            <h3 className="text-lg font-semibold text-white">
              {needsActionLeads.length} Leads brauchen Kontext
            </h3>
          </div>
          <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
            Sync alle 5 min
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {needsActionLeads.map((lead) => (
            <article
              key={`${lead.id}-${lead.name}`}
              className="rounded-2xl border border-white/5 bg-black/30 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{lead.name}</p>
                  <p className="text-xs text-gray-400">{lead.company}</p>
                </div>
                <span
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase",
                    lead.priority === "high"
                      ? "bg-red-500/10 text-red-200"
                      : "bg-amber-500/10 text-amber-200"
                  )}
                >
                  {lead.priority === "high" ? "Hot" : "Warm"}
                </span>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {lead.blocker}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{lead.lastTouch}</span>
                <span>{lead.owner} · {lead.channel}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
};

export default SalesSidebar;
