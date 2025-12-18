const envSource =
  (typeof import.meta !== "undefined" && import.meta.env) || (typeof process !== "undefined" && process.env) || {};

// =============================================================================
// MAIN PLANS
// =============================================================================

export const PLANS = {
  free: {
    id: "free",
    name: "Free Trial",
    nameEn: "Free Trial",
    price: 0,
    features: [
      "14 Tage kostenlos testen",
      "Alle PRO Features",
      "Keine Kreditkarte nötig",
    ],
    featuresEn: [
      "14 days free trial",
      "All PRO features",
      "No credit card required",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    nameEn: "Starter",
    price: 29,
    priceId: envSource.VITE_STRIPE_PRICE_STARTER_MONTH,
    priceIdYear: envSource.VITE_STRIPE_PRICE_STARTER_YEAR,
    features: [
      "100 AI-Messages/Monat",
      "500 Leads",
      "Unbegrenzte Follow-ups",
      "50 Einwand-Analysen/Monat",
      "Daily Command",
      "Mobile App (iOS & Android)",
      "Deutsch + Englisch",
    ],
    featuresEn: [
      "100 AI messages/month",
      "500 leads",
      "Unlimited follow-ups",
      "50 objection analyses/month",
      "Daily Command",
      "Mobile App (iOS & Android)",
      "German + English",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    nameEn: "Pro",
    price: 79,
    priceId: envSource.VITE_STRIPE_PRICE_PRO_MONTH,
    priceIdYear: envSource.VITE_STRIPE_PRICE_PRO_YEAR,
    popular: true,
    features: [
      "Unbegrenzte AI-Messages",
      "5.000 Leads",
      "Unbegrenzte Einwand-Analysen",
      "WhatsApp Integration (500 Msg/Monat)",
      "Team Dashboard (bis 10 Mitglieder)",
      "Analytics Dashboard",
      "Priority Support",
      "Alle Starter Features",
    ],
    featuresEn: [
      "Unlimited AI messages",
      "5,000 leads",
      "Unlimited objection analyses",
      "WhatsApp Integration (500 msg/month)",
      "Team Dashboard (up to 10 members)",
      "Analytics Dashboard",
      "Priority Support",
      "All Starter features",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    nameEn: "Enterprise",
    price: 199,
    priceId: envSource.VITE_STRIPE_PRICE_ENTERPRISE_MONTH,
    priceIdYear: envSource.VITE_STRIPE_PRICE_ENTERPRISE_YEAR,
    features: [
      "Unbegrenzte Leads",
      "WhatsApp (2.000 Msg/Monat)",
      "Unbegrenzte Team-Mitglieder",
      "White-Label Option",
      "API Zugang",
      "Dedicated Support Manager",
      "Custom Playbooks",
      "Alle Pro Features",
    ],
    featuresEn: [
      "Unlimited leads",
      "WhatsApp (2,000 msg/month)",
      "Unlimited team members",
      "White-label option",
      "API access",
      "Dedicated Support Manager",
      "Custom Playbooks",
      "All Pro features",
    ],
  },
};

// =============================================================================
// ADD-ONS: FINANZ AUTOPILOT
// =============================================================================

export const FINANZ_ADDONS = {
  finanz_basic: {
    id: "finanz_basic",
    name: "Finanz Basic",
    nameEn: "Finance Basic",
    price: 10,
    priceId: envSource.VITE_STRIPE_PRICE_FINANZ_BASIC,
    features: [
      "Provision-Tracking",
      "Einnahmen-Dashboard",
      "Monatsübersicht",
    ],
    featuresEn: [
      "Commission tracking",
      "Revenue dashboard",
      "Monthly overview",
    ],
  },
  finanz_pro: {
    id: "finanz_pro",
    name: "Finanz Pro",
    nameEn: "Finance Pro",
    price: 25,
    priceId: envSource.VITE_STRIPE_PRICE_FINANZ_PRO,
    features: [
      "Alles aus Basic",
      "Steuer-Export",
      "Team-Provisionen",
      "Revenue Forecasting",
    ],
    featuresEn: [
      "Everything in Basic",
      "Tax export",
      "Team commissions",
      "Revenue forecasting",
    ],
  },
  finanz_ultimate: {
    id: "finanz_ultimate",
    name: "Finanz Ultimate",
    nameEn: "Finance Ultimate",
    price: 49,
    priceId: envSource.VITE_STRIPE_PRICE_FINANZ_ULTIMATE,
    features: [
      "Alles aus Pro",
      "Automatische Rechnungen",
      "Multi-Company Support",
      "API für Buchhaltung",
    ],
    featuresEn: [
      "Everything in Pro",
      "Automatic invoices",
      "Multi-company support",
      "Accounting API",
    ],
  },
};

// =============================================================================
// ADD-ONS: LEAD GENERATOR
// =============================================================================

export const LEADGEN_ADDONS = {
  leadgen_basic: {
    id: "leadgen_basic",
    name: "Lead Gen Basic",
    nameEn: "Lead Gen Basic",
    price: 10,
    priceId: envSource.VITE_STRIPE_PRICE_LEADGEN_BASIC,
    features: [
      "50 Leads/Monat",
      "Name + Branche + Region",
      "AI-Matching",
    ],
    featuresEn: [
      "50 leads/month",
      "Name + Industry + Region",
      "AI matching",
    ],
  },
  leadgen_pro: {
    id: "leadgen_pro",
    name: "Lead Gen Pro",
    nameEn: "Lead Gen Pro",
    price: 35,
    priceId: envSource.VITE_STRIPE_PRICE_LEADGEN_PRO,
    features: [
      "200 Leads/Monat",
      "LinkedIn Profil",
      "Email-Adresse",
      "Alle Basic Features",
    ],
    featuresEn: [
      "200 leads/month",
      "LinkedIn profile",
      "Email address",
      "All Basic features",
    ],
  },
  leadgen_ultimate: {
    id: "leadgen_ultimate",
    name: "Lead Gen Ultimate",
    nameEn: "Lead Gen Ultimate",
    price: 79,
    priceId: envSource.VITE_STRIPE_PRICE_LEADGEN_ULTIMATE,
    features: [
      "500 Leads/Monat",
      "Telefonnummer",
      "Firmengröße",
      "Decision Maker Info",
      "Alle Pro Features",
    ],
    featuresEn: [
      "500 leads/month",
      "Phone number",
      "Company size",
      "Decision maker info",
      "All Pro features",
    ],
  },
};

// =============================================================================
// HELPERS
// =============================================================================

export const getPlan = (planId) => {
  const normalized = planId?.toLowerCase?.() || planId;
  return PLANS[normalized] || PLANS.free;
};

export const getAddon = (addonId) => {
  return FINANZ_ADDONS[addonId] || LEADGEN_ADDONS[addonId] || null;
};

export const PLAN_ORDER = ["free", "starter", "pro", "enterprise"];

export const PLAN_LABELS = PLAN_ORDER.reduce((labels, planId) => {
  labels[planId] = PLANS[planId].name;
  return labels;
}, {});

// =============================================================================
// PLAN LIMITS (for feature gating)
// =============================================================================

export const PLAN_LIMITS = {
  free: { 
    maxLeads: 100, 
    maxAiMessages: 50, 
    maxTeamMembers: 1,
    maxObjectionAnalyses: 10,
    hasWhatsApp: false,
    hasTeamDashboard: false,
    hasAnalytics: false,
    hasApi: false,
  },
  starter: { 
    maxLeads: 500, 
    maxAiMessages: 100, 
    maxTeamMembers: 1,
    maxObjectionAnalyses: 50,
    hasWhatsApp: false,
    hasTeamDashboard: false,
    hasAnalytics: false,
    hasApi: false,
  },
  pro: { 
    maxLeads: 5000, 
    maxAiMessages: Infinity, 
    maxTeamMembers: 10,
    maxObjectionAnalyses: Infinity,
    maxWhatsAppMessages: 500,
    hasWhatsApp: true,
    hasTeamDashboard: true,
    hasAnalytics: true,
    hasApi: false,
  },
  enterprise: { 
    maxLeads: Infinity, 
    maxAiMessages: Infinity, 
    maxTeamMembers: Infinity,
    maxObjectionAnalyses: Infinity,
    maxWhatsAppMessages: 2000,
    hasWhatsApp: true,
    hasTeamDashboard: true,
    hasAnalytics: true,
    hasApi: true,
    hasWhiteLabel: true,
    hasDedicatedSupport: true,
  },
};

// =============================================================================
// FEATURE MATRIX (for feature gating)
// =============================================================================

export const FEATURE_MATRIX = {
  aiChat: { minPlan: "free" },
  dailyCommand: { minPlan: "free" },
  followUps: { minPlan: "free" },
  objectionBrain: { minPlan: "free" },
  csvImport: { minPlan: "starter" },
  whatsapp: { minPlan: "pro" },
  teamDashboard: { minPlan: "pro" },
  analytics: { minPlan: "pro" },
  sequences: { minPlan: "starter" },
  webhooks: { minPlan: "pro" },
  api: { minPlan: "enterprise" },
  whiteLabel: { minPlan: "enterprise" },
  prioritySupport: { minPlan: "pro" },
  dedicatedSupport: { minPlan: "enterprise" },
};

// =============================================================================
// PLAN CATALOG (for PricingPage)
// =============================================================================

export const PLAN_CATALOG = PLAN_ORDER.filter(id => id !== "free").map((planId) => {
  const plan = PLANS[planId];
  return {
    id: planId,
    name: plan.name,
    nameEn: plan.nameEn,
    featureBullets: plan.features,
    featureBulletsEn: plan.featuresEn,
    popular: plan.popular || false,
  };
});

export const ADDON_CATALOG = [
  ...Object.values(FINANZ_ADDONS),
  ...Object.values(LEADGEN_ADDONS),
];

// =============================================================================
// CURRENCY & BILLING
// =============================================================================

export const formatCurrency = (value, currency = "EUR") => {
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  });
  return formatter.format(value);
};

export const formatCurrencyEn = (value, currency = "USD") => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  });
  return formatter.format(value);
};

/**
 * Get price for billing interval (20% discount for yearly)
 */
export const getBillingPrice = (planId, interval = "month") => {
  const plan = getPlan(planId);
  const basePrice = plan.price ?? 0;

  if (interval === "year") {
    return Math.round(basePrice * 12 * 0.8); // 20% Rabatt
  }

  return basePrice;
};

/**
 * Get addon price for billing interval
 */
export const getAddonBillingPrice = (addonId, interval = "month") => {
  const addon = getAddon(addonId);
  if (!addon) return 0;
  
  const basePrice = addon.price ?? 0;

  if (interval === "year") {
    return Math.round(basePrice * 12 * 0.8); // 20% Rabatt
  }

  return basePrice;
};
