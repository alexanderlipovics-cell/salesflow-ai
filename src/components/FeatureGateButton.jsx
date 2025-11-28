import { Lock, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { useSubscription } from "../hooks/useSubscription";
import { useFeatureGate } from "../context/FeatureGateContext";
import { FEATURE_MATRIX, PLAN_LABELS } from "../lib/plans";

const FeatureGateButton = ({ featureKey, label, description }) => {
  const { canUse } = useSubscription();
  const { requestGate } = useFeatureGate();
  const feature = FEATURE_MATRIX[featureKey];

  const locked = !canUse(featureKey);

  const handleClick = () => {
    if (!locked) return;
    requestGate({
      featureLabel: label,
      requiredPlan: feature?.minPlan || "starter",
    });
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
        "border-white/5 bg-gray-900/40 hover:border-salesflow-accent/40",
        locked ? "text-gray-400" : "text-gray-100"
      )}
    >
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {locked ? (
        <div className="flex items-center gap-2 text-salesflow-accent">
          <Lock className="h-4 w-4" />
          <span className="text-xs">
            {PLAN_LABELS[feature?.minPlan] || "Upgrade"}
          </span>
        </div>
      ) : (
        <CheckCircle2 className="h-5 w-5 text-salesflow-accent" />
      )}
    </button>
  );
};

export default FeatureGateButton;
