import { Check, Sparkles } from "lucide-react";
import clsx from "clsx";

const PlanCard = ({
  plan,
  priceLabel,
  priceSubline,
  isPopular,
  isActive,
  isFocused,
  onCheckout,
  loading,
}) => {
  return (
    <div
      className={clsx(
        "relative flex flex-col rounded-3xl border px-6 py-8 shadow-2xl transition duration-200 md:px-8",
        "bg-gray-900/70 hover:scale-105 hover:border-salesflow-accent/60",
        isPopular ? "border-salesflow-accent/60 shadow-glow" : "border-white/5",
        isFocused && "ring-2 ring-salesflow-accent",
        isActive && "outline outline-1 outline-salesflow-accent/40"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-salesflow-accent/40 bg-gray-900 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-salesflow-accent">
          Beliebt
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-gray-400">
            {plan.name}
          </p>
          <p className="mt-3 text-4xl font-semibold text-white">{priceLabel}</p>
          <p className="text-sm text-gray-400">{priceSubline}</p>
        </div>
        {isActive && (
          <span className="rounded-full border border-salesflow-accent/40 px-3 py-1 text-xs font-semibold text-salesflow-accent">
            Aktiver Plan
          </span>
        )}
      </div>

      <ul className="mt-6 space-y-3 text-sm text-gray-200">
        {plan.featureBullets.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-salesflow-accent" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onCheckout}
        disabled={loading || isActive}
        className={clsx(
          "mt-8 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
          isActive
            ? "cursor-not-allowed border border-white/10 text-gray-400"
            : "bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong text-black shadow-glow hover:scale-[1.02]"
        )}
      >
        {isActive ? "Aktiver Plan" : loading ? "Weiterleitung ..." : "Jetzt starten"}
        {!isActive && !loading && <Sparkles className="h-4 w-4" />}
      </button>
    </div>
  );
};

export default PlanCard;
