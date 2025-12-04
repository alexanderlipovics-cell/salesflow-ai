import { useMemo, useState } from "react";
import { Sparkles, Check, Zap, TrendingUp, Users } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useSubscription } from "../hooks/useSubscription";
import { 
  PLAN_CATALOG, 
  ADDON_CATALOG,
  FINANZ_ADDONS,
  LEADGEN_ADDONS,
  formatCurrency, 
  formatCurrencyEn,
  getBillingPrice,
  getAddonBillingPrice,
} from "../lib/plans";
import { createCheckoutSession } from "../lib/stripeClient";
import { useTranslation } from "react-i18next";

const PricingPage = ({ focusPlan = null, onClose = null }) => {
  const { id: userId } = useUser();
  const { plan: activePlan } = useSubscription();
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [billingInterval, setBillingInterval] = useState("month");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [showAddons, setShowAddons] = useState(false);

  const t = useMemo(() => ({
    title: isEn ? "Choose Your Growth Plan" : "Wähle deinen Wachstumsplan",
    subtitle: isEn 
      ? "All plans include unlimited pipeline storage, GDPR-compliant data processing, and premium support."
      : "Alle Pläne enthalten unbegrenzte Pipeline-Speicherung, DSGVO-konforme Datenverarbeitung und Premium-Support.",
    monthly: isEn ? "Monthly" : "Monatlich",
    yearly: isEn ? "Yearly -20%" : "Jährlich -20%",
    yearlyHelper: isEn ? "20% cheaper · Billed annually" : "20% günstiger · Abrechnung jährlich",
    monthlyHelper: isEn ? "Cancel anytime" : "Flexibel kündbar",
    popular: isEn ? "Most Popular" : "Beliebteste Wahl",
    currentPlan: isEn ? "Current Plan" : "Aktueller Plan",
    upgrade: isEn ? "Upgrade Now" : "Jetzt upgraden",
    contact: isEn ? "Contact Sales" : "Vertrieb kontaktieren",
    perMonth: isEn ? "/month" : "/Monat",
    perYear: isEn ? "/year" : "/Jahr",
    addons: isEn ? "Power Add-Ons" : "Power Add-Ons",
    addonsSubtitle: isEn ? "Supercharge your sales with these add-ons" : "Verstärke deinen Vertrieb mit diesen Add-Ons",
    finanzTitle: isEn ? "Finance Autopilot" : "Finanz Autopilot",
    leadgenTitle: isEn ? "Lead Generator" : "Lead Generator",
    close: isEn ? "Close" : "Schließen",
    showAddons: isEn ? "Show Add-Ons" : "Add-Ons anzeigen",
  }), [isEn]);

  const format = isEn ? formatCurrencyEn : formatCurrency;

  const handleCheckout = async (planId) => {
    if (!userId) return;
    setError(null);
    setLoadingPlan(planId);

    try {
      const result = await createCheckoutSession({
        plan: planId,
        interval: billingInterval,
        userId,
      });

      if (!result?.redirected) {
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
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Sales Flow AI Pricing
          </p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
            {t.title}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-gray-300">
            {t.subtitle}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5 text-sm">
          <button
            onClick={() => setBillingInterval("month")}
            className={`rounded-xl px-4 py-2 font-semibold transition-all ${
              billingInterval === "month"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.monthly}
          </button>
          <button
            onClick={() => setBillingInterval("year")}
            className={`rounded-xl px-4 py-2 font-semibold transition-all ${
              billingInterval === "year"
                ? "bg-gradient-to-r from-cyan-500/20 to-lime-500/20 text-cyan-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.yearly}
          </button>
        </div>
      </header>

      {/* Helper Text */}
      <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/5 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-gray-400">
        <Sparkles className="h-4 w-4 text-cyan-400" />
        {billingInterval === "year" ? t.yearlyHelper : t.monthlyHelper}
      </p>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Main Plans */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {PLAN_CATALOG.map((plan) => {
          const amount = getBillingPrice(plan.id, billingInterval);
          const features = isEn ? plan.featureBulletsEn : plan.featureBullets;
          const isActive = plan.id === activePlan;
          const isFocused = focusPlan === plan.id;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border p-6 transition-all ${
                isPopular
                  ? "border-cyan-500/50 bg-gradient-to-b from-cyan-500/10 to-transparent shadow-lg shadow-cyan-500/10"
                  : "border-white/10 bg-black/20"
              } ${isFocused ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900" : ""}`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-lime-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-black">
                  {t.popular}
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-lg font-semibold text-white">
                {isEn ? plan.nameEn : plan.name}
              </h3>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">
                  {format(billingInterval === "year" ? Math.round(amount / 12) : amount)}
                </span>
                <span className="text-gray-400">{t.perMonth}</span>
              </div>
              {billingInterval === "year" && (
                <p className="mt-1 text-sm text-gray-500">
                  {format(amount)} {t.perYear}
                </p>
              )}

              {/* Features */}
              <ul className="mt-6 flex-1 space-y-3">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={isActive || loadingPlan === plan.id}
                className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "cursor-default bg-gray-700 text-gray-400"
                    : isPopular
                    ? "bg-gradient-to-r from-cyan-500 to-lime-500 text-black hover:from-cyan-400 hover:to-lime-400"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {loadingPlan === plan.id
                  ? "..."
                  : isActive
                  ? t.currentPlan
                  : plan.id === "enterprise"
                  ? t.contact
                  : t.upgrade}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add-Ons Section */}
      <div className="mt-12">
        <button
          onClick={() => setShowAddons(!showAddons)}
          className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300"
        >
          <Zap className="h-4 w-4" />
          {t.showAddons}
        </button>

        {showAddons && (
          <div className="mt-6 space-y-8">
            {/* Finanz Autopilot */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-lime-400" />
                <h3 className="text-lg font-semibold text-white">{t.finanzTitle}</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.values(FINANZ_ADDONS).map((addon) => (
                  <AddonCard
                    key={addon.id}
                    addon={addon}
                    isEn={isEn}
                    format={format}
                    billingInterval={billingInterval}
                    perMonth={t.perMonth}
                  />
                ))}
              </div>
            </div>

            {/* Lead Generator */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">{t.leadgenTitle}</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.values(LEADGEN_ADDONS).map((addon) => (
                  <AddonCard
                    key={addon.id}
                    addon={addon}
                    isEn={isEn}
                    format={format}
                    billingInterval={billingInterval}
                    perMonth={t.perMonth}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="mt-8 w-full rounded-2xl border border-white/10 py-3 text-sm text-gray-400 hover:text-white"
        >
          {t.close}
        </button>
      )}
    </section>
  );
};

// Add-On Card Component
const AddonCard = ({ addon, isEn, format, billingInterval, perMonth }) => {
  const price = getAddonBillingPrice(addon.id, billingInterval);
  const features = isEn ? addon.featuresEn : addon.features;
  const name = isEn ? addon.nameEn : addon.name;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h4 className="font-semibold text-white">{name}</h4>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">
          {format(billingInterval === "year" ? Math.round(price / 12) : price)}
        </span>
        <span className="text-sm text-gray-400">{perMonth}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-gray-400">
            <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-cyan-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button className="mt-4 w-full rounded-lg bg-white/5 py-2 text-xs font-semibold text-white hover:bg-white/10">
        {isEn ? "Add to plan" : "Hinzufügen"}
      </button>
    </div>
  );
};

export default PricingPage;
