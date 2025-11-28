import { usePricingModal } from "../context/PricingModalContext";
import { useSubscription } from "../hooks/useSubscription";
import DailyCommandCard from "../features/daily-command/DailyCommandCard";

const DashboardPage = () => {
  const { openPricing } = usePricingModal();
  const { plan } = useSubscription();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-3xl bg-gray-900/40 p-8 text-white">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
          Willkommen zurück
        </p>
        <h1 className="mt-3 text-4xl font-semibold">
          Deine AI Revenue Workbench
        </h1>
        <p className="mt-2 text-gray-400">
          Aktueller Plan:{" "}
          <span className="text-salesflow-accent font-semibold uppercase">
            {plan}
          </span>
          . Upgrade jederzeit, um weitere Playbooks freizuschalten.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <DailyCommandCard horizonDays={3} limit={20} />
        </div>
        <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
          <p className="text-sm text-gray-400">Lead Scanner</p>
          <p className="mt-2 text-2xl font-semibold">500 neue Signale</p>
          <p className="text-sm text-gray-500">
            Lass SalesFlow deine heißesten Accounts priorisieren.
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
          <p className="text-sm text-gray-400">Playbooks</p>
          <p className="mt-2 text-2xl font-semibold">12 aktive Sequenzen</p>
          <p className="text-sm text-gray-500">
            Kombiniere E-Mail, WhatsApp und Voice Drops.
          </p>
        </div>
      </div>
      <button
        onClick={() => openPricing()}
        className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-salesflow-accent/40 px-6 py-3 text-sm font-semibold text-salesflow-accent hover:bg-salesflow-accent/10"
      >
        Upgrade entdecken
      </button>
    </div>
  );
};

export default DashboardPage;
