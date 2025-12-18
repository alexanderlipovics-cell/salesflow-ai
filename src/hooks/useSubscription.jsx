import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FEATURE_MATRIX,
  PLAN_LABELS,
  PLAN_LIMITS,
  PLAN_ORDER,
} from "../lib/plans";
import { fetchSubscription } from "../lib/stripeClient";

const SubscriptionContext = createContext(null);

const useProvideSubscription = (userId) => {
  const [plan, setPlan] = useState("free");
  const [status, setStatus] = useState("inactive");
  const [interval, setInterval] = useState("month");
  const [nextCharge, setNextCharge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) return null;
    setLoading(true);
    try {
      const payload = await fetchSubscription({ userId });
      setPlan((payload?.plan || "free").toLowerCase());
      setStatus(payload?.status || "inactive");
      setInterval(payload?.interval || payload?.billingInterval || "month");
      setNextCharge(payload?.nextCharge || payload?.currentPeriodEnd || null);
      setError(null);
      return payload;
    } catch (err) {
      console.error("Failed to load subscription:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const limits = useMemo(
    () => PLAN_LIMITS[plan] || PLAN_LIMITS.free,
    [plan]
  );

  const canUse = useCallback(
    (featureKey) => {
      const feature = FEATURE_MATRIX[featureKey];
      if (!feature) return true;
      const currentRank = PLAN_ORDER.indexOf(plan);
      const requiredRank = PLAN_ORDER.indexOf(feature.minPlan);
      if (requiredRank === -1) return true;
      return currentRank >= requiredRank;
    },
    [plan]
  );

  return {
    plan,
    planLabel: PLAN_LABELS[plan] || PLAN_LABELS.free,
    status,
    interval,
    nextCharge,
    limits,
    canUse,
    refresh,
    loading,
    error,
  };
};

export const SubscriptionProvider = ({ userId, children }) => {
  const value = useProvideSubscription(userId);
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
