import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import PlanCard from "./PlanCard";
import { useUser } from "../context/UserContext";
import { useSubscription } from "../hooks/useSubscription";
import { PLAN_CATALOG, formatCurrency, getBillingPrice } from "../lib/plans";
import { createCheckoutSession } from "../lib/stripeClient";

const PricingPage = ({ focusPlan = null, onClose = null }) => {
  const { id: userId } = useUser();
  const { plan: activePlan } = useSubscription();

  const [billingInterval, setBillingInterval] = useState("month");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  const intervalCopy = useMemo(
    () =>
      billingInterval === "year"
        ? { label: "Jährliche Zahlung", helper: "20% günstiger · Abrechnung jährlich" }
        : { label: "Monatliche Zahlung", helper: "Flexibel kündbar" },
    [billingInterval]
  );

  const handleCheckout = async (planId) => {
    if (!userId) return;
    setError(null);
    setLoadingPlan(planId);

    try {
      const { checkoutUrl } = await createCheckoutSession({
        plan: planId,
        interval: billingInterval,
        userId,
      });

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
      } else {
        window.location.assign("/settings?success=true");
      }
    } catch (checkoutError) {
      console.error(checkoutError);
      setError(checkoutError.message || "Checkout konnte nicht gestartet werden.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="w-full rounded-3xl bg-gray-900/60 p-6 text-white md:p-10">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-salesflow-accent">
            SalesFlow AI Pricing
          </p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
            Wähle deinen Wachstumsplan
          </h1>
          <p className="mt-2 max-w-2xl text-base text-gray-300">
            Alle Pläne enthalten unbegrenzte Pipeline-Speicherung, DSGVO-konforme Datenverarbeitung
            und Premium-Support. Zahle monatlich oder spare 20% bei jährlicher Abrechnung.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/10 p-2 text-sm">
          <button
            onClick={() => setBillingInterval("month")}
            className={`rounded-xl px-4 py-2 font-semibold ${
              billingInterval === "month"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Monatlich
          </button>
          <button
            onClick={() => setBillingInterval("year")}
            className={`rounded-xl px-4 py-2 font-semibold ${
              billingInterval === "year"
                ? "bg-salesflow-accent/20 text-salesflow-accent"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Jährlich -20%
          </button>
        </div>
      </header>

      <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-gray-400">
        <Sparkles className="h-4 w-4 text-salesflow-accent" />
        {intervalCopy.helper}
      </p>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PLAN_CATALOG.map((plan) => {
          const amount = getBillingPrice(plan.id, billingInterval);
          const equivalent =
            billingInterval === "year"
              ? `${formatCurrency(Math.round(amount / 12))}/Monat (jährlich)`
              : "Monatlich kündbar";

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              priceLabel={`${formatCurrency(amount)}${
                billingInterval === "year" ? " / Jahr" : " / Monat"
              }`}
              priceSubline={equivalent}
              isPopular={plan.id === "pro"}
              isActive={plan.id === activePlan}
              isFocused={focusPlan === plan.id}
              loading={loadingPlan === plan.id}
              onCheckout={() => handleCheckout(plan.id)}
            />
          );
        })}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="mt-8 w-full rounded-2xl border border-white/10 py-3 text-sm text-gray-400 hover:text-white"
        >
          Schließen
        </button>
      )}

      <div className="mt-10 grid gap-4 rounded-3xl border border-white/5 bg-gray-950/40 p-5 sm:grid-cols-3">
        <StatBox title="Aktueller Plan" value={activePlan.toUpperCase()} />
        <StatBox title="Zahlungsintervall" value={intervalCopy.label} />
        <StatBox title="Support" value="Priority Chat · E-Mail" />
      </div>
    </section>
  );
};

const StatBox = ({ title, value }) => (
  <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{title}</p>
    <p className="mt-2 text-lg font-semibold text-white">{value}</p>
  </div>
);

export default PricingPage;
