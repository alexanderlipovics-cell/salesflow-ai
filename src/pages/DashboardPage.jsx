import { useMemo } from "react";
import { usePricingModal } from "../context/PricingModalContext";
import { useSubscription } from "../hooks/useSubscription";
import { useUser } from "../context/UserContext";
import { PLAN_LABELS } from "../lib/plans";
import SalesSidebar from "../components/SalesSidebar";
import DailyCommandCard from "../features/daily-command/DailyCommandCard";
import SpeedHunterPanel from "../features/speedhunter/SpeedHunterPanel";

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
        <section className="rounded-3xl border border-white/5 bg-gray-900/60 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-500">
                Revenue Operations
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                Deine AI Revenue Workbench
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Aktueller Plan:{" "}
                <span className="text-salesflow-accent font-semibold">
                  {planLabel}
                </span>{" "}
                · Upgrade für volle SpeedHunter-Automation.
              </p>
            </div>
            <button
              onClick={() => openPricing("pro")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-salesflow-accent/40 px-5 py-2 text-sm font-semibold text-salesflow-accent hover:bg-salesflow-accent/10"
            >
              Upgrade entdecken
            </button>
          </div>
        </section>

        <SpeedHunterPanel onUpgrade={() => openPricing("pro")} />

        <DailyCommandCard horizonDays={3} limit={20} />
      </div>
    </div>
  );
};

export default DashboardPage;
