// =============================================================================
// AL SALES SOLUTIONS - COMPLETE PRICING SYSTEM (Dezember 2025)
// =============================================================================

export const PLANS = {
  free: {
    name: "Free Trial",
    price: 0,
    interval: "month",
    trialDays: 14,
    features: [
      "100 Leads",
      "500.000 AI-Tokens",
      "10 Vision Credits",
      "Command Center",
      "CHIEF AI Chat",
      "14 Tage kostenlos"
    ]
  },
  starter: {
    name: "Starter",
    price: 29,
    interval: "month",
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_STARTER || "",
    features: [
      "Unbegrenzte Leads",
      "5 Mio. AI-Tokens/Monat",
      "50 Vision Credits/Monat",
      "Command Center",
      "CHIEF AI Chat",
      "Screenshot Import",
      "Email Support"
    ]
  },
  builder: {
    name: "Builder",
    price: 69,
    interval: "month",
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_BUILDER || "",
    features: [
      "Unbegrenzte Leads",
      "15 Mio. AI-Tokens/Monat",
      "150 Vision Credits/Monat",
      "Lead Cascade",
      "Analytics Dashboard",
      "Priority Email Support"
    ]
  },
  leader: {
    name: "Leader",
    price: 149,
    interval: "month",
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_LEADER || "",
    features: [
      "Unbegrenzte Leads",
      "Unbegrenzte AI-Tokens",
      "Unbegrenzte Vision Credits",
      "WhatsApp Integration",
      "AI Ghostwriter",
      "Lead Cascade",
      "Analytics Dashboard",
      "Finanz-Modul inklusive",
      "Priority Support"
    ]
  }
};

// =============================================================================
// PLAN LIMITS - Feature Gating
// =============================================================================

export const PLAN_LIMITS = {
  free: {
    leads: 100,
    aiTokens: 500000,
    visionCredits: 10,
    trialDays: 14,
    canUseWhatsapp: false,
    canUseGhostwriter: false,
    canUseCascade: false,
    canUseAnalytics: false,
    canUseFinanz: false,
    canUseCeoEdition: false
  },
  starter: {
    leads: 999999,
    aiTokens: 5000000,
    visionCredits: 50,
    canUseWhatsapp: false,
    canUseGhostwriter: false,
    canUseCascade: false,
    canUseAnalytics: false,
    canUseFinanz: false,
    canUseCeoEdition: false
  },
  builder: {
    leads: 999999,
    aiTokens: 15000000,
    visionCredits: 150,
    canUseWhatsapp: false,
    canUseGhostwriter: false,
    canUseCascade: true,
    canUseAnalytics: true,
    canUseFinanz: false,
    canUseCeoEdition: false
  },
  leader: {
    leads: 999999,
    aiTokens: 999999999,
    visionCredits: 999999,
    canUseWhatsapp: true,
    canUseGhostwriter: true,
    canUseCascade: true,
    canUseAnalytics: true,
    canUseFinanz: true,
    canUseCeoEdition: false  // Via Add-On
  }
};

// =============================================================================
// ADD-ONS - Schalten Features frei
// =============================================================================

export const ADDONS = {
  // CEO Edition - Premium Content Creation
  ceo_edition: {
    id: "ceo_edition",
    name: "CEO Edition",
    price: 79,
    interval: "month",
    description: "Multi-AI Brain + Content Creation Suite",
    unlocks: [
      "multi_ai_brain",
      "pdf_creator",
      "image_generator",
      "slide_creator",
      "voice_input",
      "document_analysis",
      "unlimited_tokens"
    ],
    availableFor: ["leader"]
  },

  // Finanz Module
  finanz_basic: {
    id: "finanz_basic",
    name: "Finanz Basic",
    price: 10,
    interval: "month",
    description: "Provisionen tracken & überwachen",
    unlocks: ["finanz_tab", "commission_tracking"],
    availableFor: ["starter", "builder"]
  },
  finanz_pro: {
    id: "finanz_pro",
    name: "Finanz Pro",
    price: 29,
    interval: "month",
    description: "Steuer-Export, Belege, Reports",
    unlocks: ["finanz_tab", "commission_tracking", "tax_export", "receipt_upload"],
    availableFor: ["starter", "builder"]
  },

  // AI Ghostwriter
  ghostwriter: {
    id: "ghostwriter",
    name: "AI Ghostwriter",
    price: 19,
    interval: "month",
    description: "Automatische Nachrichten-Generierung",
    unlocks: ["auto_messages", "message_scheduling"],
    availableFor: ["starter", "builder"]
  },

  // Vision Credits (One-time)
  vision_50: {
    id: "vision_50",
    name: "50 Vision Credits",
    price: 9,
    interval: "once",
    credits: 50,
    availableFor: ["free", "starter", "builder", "leader"]
  },
  vision_150: {
    id: "vision_150",
    name: "150 Vision Credits",
    price: 19,
    interval: "once",
    credits: 150,
    availableFor: ["free", "starter", "builder", "leader"]
  },
  vision_500: {
    id: "vision_500",
    name: "500 Vision Credits",
    price: 49,
    interval: "once",
    credits: 500,
    availableFor: ["free", "starter", "builder", "leader"]
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const getPlan = (tier) => PLANS[tier] || PLANS.free;

export const getPlanLimits = (tier) => PLAN_LIMITS[tier] || PLAN_LIMITS.free;

export const getAddon = (addonId) => ADDONS[addonId] || null;

/**
 * Check if user can access a feature
 * @param {object} user - User object with tier and addons
 * @param {string} feature - Feature to check
 * @returns {boolean}
 */
export const hasFeatureAccess = (user, feature) => {
  const tier = user?.tier || 'free';
  const limits = getPlanLimits(tier);

  // Feature mapping to plan limits
  const featureMap = {
    'whatsapp': limits.canUseWhatsapp,
    'ghostwriter': limits.canUseGhostwriter,
    'cascade': limits.canUseCascade,
    'analytics': limits.canUseAnalytics,
    'finanz': limits.canUseFinanz,
    'ceo_edition': limits.canUseCeoEdition,
    'pdf_creator': limits.canUseCeoEdition,
    'image_generator': limits.canUseCeoEdition,
    'slide_creator': limits.canUseCeoEdition,
    'voice_input': limits.canUseCeoEdition,
    'document_analysis': limits.canUseCeoEdition
  };

  // Check plan limits first
  if (featureMap[feature] === true) return true;

  // Check user's purchased add-ons
  const userAddons = user?.addons || [];
  for (const addonId of userAddons) {
    const addon = ADDONS[addonId];
    if (addon?.unlocks?.includes(feature)) {
      return true;
    }
  }

  return false;
};

/**
 * Check if trial has expired
 * @param {object} user - User object
 * @returns {boolean}
 */
export const isTrialExpired = (user) => {
  if (!user || user.tier !== 'free') return false;

  // Use trial_ends_at if available, otherwise calculate from created_at
  const expirationDate = user.trial_ends_at
    ? new Date(user.trial_ends_at)
    : new Date(new Date(user.created_at).getTime() + 14 * 24 * 60 * 60 * 1000);

  return new Date() > expirationDate;
};

/**
 * Get days remaining in trial
 * @param {object} user - User object
 * @returns {number}
 */
export const getTrialDaysRemaining = (user) => {
  if (!user || user.tier !== 'free') return 0;

  const expirationDate = user.trial_ends_at
    ? new Date(user.trial_ends_at)
    : new Date(new Date(user.created_at).getTime() + 14 * 24 * 60 * 60 * 1000);

  const now = new Date();
  const diff = expirationDate - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Format token numbers for display
 * @param {number} tokens
 * @returns {string}
 */
export const formatTokens = (tokens) => {
  if (tokens >= 999999999) return "Unbegrenzt";
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(0)} Mio.`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return tokens.toString();
};

/**
 * Get commission multiplier (for Zinzino Double Commission Month)
 * @returns {number}
 */
export const getCommissionMultiplier = () => {
  const now = new Date();
  // Januar = Double Commission Month bei Zinzino
  if (now.getMonth() === 0) return 2;
  return 1;
};

/**
 * Calculate expected revenue from lead
 * @param {number} baseCommission - Base commission value
 * @param {number} probability - Close probability (0-1)
 * @returns {number}
 */
export const calculateExpectedRevenue = (baseCommission, probability = 0.2) => {
  const multiplier = getCommissionMultiplier();
  return baseCommission * probability * multiplier;
};

// =============================================================================
// FEATURE MATRIX - Für useSubscription Hook Kompatibilität
// =============================================================================

export const FEATURE_MATRIX = {
  // Lead Management
  leads: { minPlan: "free" },
  unlimited_leads: { minPlan: "starter" },

  // AI Features
  ai_chat: { minPlan: "free" },
  ai_tokens: { minPlan: "free" },
  unlimited_ai_tokens: { minPlan: "leader" },

  // Vision Features
  vision_credits: { minPlan: "free" },
  unlimited_vision: { minPlan: "leader" },

  // WhatsApp Integration
  whatsapp: { minPlan: "leader" },

  // AI Ghostwriter
  ghostwriter: { minPlan: "leader" },

  // Lead Cascade
  cascade: { minPlan: "builder" },

  // Analytics Dashboard
  analytics: { minPlan: "builder" },

  // Finance Module
  finanz: { minPlan: "leader" },

  // CEO Edition (Add-On)
  ceo_edition: { minPlan: "leader" },

  // Add-Ons (können zu jedem Plan hinzugefügt werden)
  finanz_basic: { minPlan: "starter" },
  finanz_pro: { minPlan: "starter" },
  vision_50: { minPlan: "free" },
  vision_150: { minPlan: "free" },
  vision_500: { minPlan: "free" }
};

// Legacy exports für Kompatibilität
export const PLAN_ORDER = ["free", "starter", "builder", "leader"];
export const PLAN_LABELS = {
  free: "Free Trial",
  starter: "Starter",
  builder: "Builder",
  leader: "Leader"
};