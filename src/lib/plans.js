const envSource =
  (typeof import.meta !== "undefined" && import.meta.env) || (typeof process !== "undefined" && process.env) || {};

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    features: ["5 AI-Anfragen/Tag", "Basis-Module", "Community Support"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 29,
    priceId:
      envSource.VITE_STRIPE_PRICE_STARTER ||
      envSource.VITE_STRIPE_PRICE_STARTER_MONTH ||
      envSource.STRIPE_PRICE_STARTER_MONTH,
    features: ["100 AI-Anfragen/Tag", "Alle Module", "CSV Import"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 79,
    priceId:
      envSource.VITE_STRIPE_PRICE_PRO || envSource.VITE_STRIPE_PRICE_PRO_MONTH || envSource.STRIPE_PRICE_PRO_MONTH,
    features: ["Unlimited AI", "Team Features", "Priority Support"],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 149,
    priceId:
      envSource.VITE_STRIPE_PRICE_ENTERPRISE ||
      envSource.VITE_STRIPE_PRICE_ENTERPRISE_MONTH ||
      envSource.STRIPE_PRICE_ENTERPRISE_MONTH,
    features: ["Dedicated CSM", "Unbegrenzte Module", "Custom Integrationen"],
  },
};

export const getPlan = (planId) => {
  const normalized = planId?.toLowerCase?.() || planId;
  return PLANS[normalized] || PLANS.free;
};

export const PLAN_ORDER = Object.keys(PLANS);

export const PLAN_LABELS = PLAN_ORDER.reduce((labels, planId) => {
  labels[planId] = PLANS[planId].name;
  return labels;
}, {});

export const PLAN_LIMITS = {
  free: { maxLeads: 50, maxAiRequests: 50, maxTeamMembers: 1 },
  starter: { maxLeads: 1000, maxAiRequests: 500, maxTeamMembers: 3 },
  pro: { maxLeads: 10000, maxAiRequests: Infinity, maxTeamMembers: 10 },
  enterprise: { maxLeads: Infinity, maxAiRequests: Infinity, maxTeamMembers: Infinity },
};

export const FEATURE_MATRIX = {
  email: { minPlan: "starter" },
  whatsapp: { minPlan: "pro" },
  sequences: { minPlan: "starter" },
  webhooks: { minPlan: "pro" },
  whiteLabel: { minPlan: "enterprise" },
  prioritySupport: { minPlan: "pro" },
};

export const PLAN_CATALOG = PLAN_ORDER.map((planId) => {
  const plan = PLANS[planId];
  return {
    id: planId,
    name: plan.name,
    featureBullets: plan.features,
  };
});

export const formatCurrency = (value) => {
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  });
  return formatter.format(value);
};

/**
 * Helper to retrieve the labeled price per billing interval.
 * Yearly prices apply a 20% discount by default.
 */
export const getBillingPrice = (planId, interval = "month") => {
  const plan = getPlan(planId);
  const basePrice = plan.price ?? 0;

  if (interval === "year") {
    return Math.round(basePrice * 12 * 0.8);
  }

  return basePrice;
};
