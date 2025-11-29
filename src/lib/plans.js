const BASE_PLAN_PRICES = {
  free: 0,
  starter: 69,
  pro: 149,
  enterprise: 349,
};

export const PLAN_ORDER = ["free", "starter", "pro", "enterprise"];

export const PLAN_LABELS = {
  free: "Free",
  starter: "Starter",
  pro: "Professional",
  enterprise: "Enterprise",
};

export const PLAN_LIMITS = {
  free: { maxLeads: 50, maxAiRequests: 200, maxTeamMembers: 1 },
  starter: { maxLeads: 500, maxAiRequests: 2000, maxTeamMembers: 3 },
  pro: { maxLeads: 5000, maxAiRequests: 10000, maxTeamMembers: 10 },
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

export const PLAN_CATALOG = [
  {
    id: "free",
    name: "Free",
    featureBullets: [
      "Daily Command Light",
      "Basis Lead-Import",
      "Community Support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    featureBullets: [
      "Sales Flow AI · Chat",
      "Speed-Hunter Playbooks",
      "Automatischer CSV Import",
    ],
  },
  {
    id: "pro",
    name: "Professional",
    featureBullets: [
      "Team Seats & Rollen",
      "Screenshot AI",
      "Phönix Sequenzen",
      "Priority Support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    featureBullets: [
      "Dedicated CSM & SLA",
      "Alle Tools unbegrenzt",
      "Einwand-Killer Automationen",
      "Custom Integrationen",
    ],
  },
];

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
  const normalized = planId?.toLowerCase();
  const basePrice = BASE_PLAN_PRICES[normalized] ?? BASE_PLAN_PRICES.free;

  if (interval === "year") {
    const yearly = Math.round(basePrice * 12 * 0.8);
    return yearly;
  }

  return basePrice;
};
