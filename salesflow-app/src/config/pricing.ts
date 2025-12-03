/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - PRICING KONZEPT                                                 ║
 * ║  Skalierbar für Millionen User mit 90% Gewinnmarge                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * STRUKTUR:
 * ├── BASIC (€30/Monat) - Kernfunktionen
 * └── ADD-ONS (je €10-30/Monat) - Premium Features
 *     ├── 🤖 Autopilot (3 Stufen)
 *     ├── 💰 Finanzen (3 Stufen)
 *     └── 🎯 Lead-Generierung (3 Stufen)
 * 
 * GEWINNMARGE-KALKULATION:
 * ├── API-Kosten (Claude): ~€0.02/Analyse
 * ├── Hosting/DB: ~€0.10/User/Monat
 * ├── Support Anteil: ~€0.50/User/Monat
 * └── TOTAL Kosten: ~€1-3/User/Monat = 90%+ Marge bei €30
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PricingTier {
  id: string;
  name: string;
  price: number;           // Monatlich in EUR
  yearlyPrice: number;     // Jährlich (2 Monate gratis)
  limits: Record<string, number>;
  features: string[];
  popular?: boolean;
  costPerUser: number;     // Interne Kosten
  marginPercent: number;   // Gewinnmarge
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  icon: string;
  tiers: PricingTier[];
}

// ═══════════════════════════════════════════════════════════════════════════
// BASIC PLAN (€30/Monat)
// ═══════════════════════════════════════════════════════════════════════════

export const BASIC_PLAN: PricingTier = {
  id: 'basic',
  name: 'Basic',
  price: 30,
  yearlyPrice: 300,  // 2 Monate gratis
  costPerUser: 2.50, // €2.50 Kosten
  marginPercent: 91.7, // 91.7% Marge
  limits: {
    leads: 100,              // Max 100 Leads
    chats_import: 50,        // 50 Chat-Imports/Monat
    ai_analyses: 100,        // 100 KI-Analysen/Monat
    follow_ups: 200,         // 200 Follow-Up Erinnerungen
    templates: 20,           // 20 gespeicherte Templates
    team_members: 1,         // Nur 1 User
  },
  features: [
    '📥 Chat-Import (Copy-Paste)',
    '🤖 KI-Analyse & Lead-Erkennung',
    '📋 Follow-Up Management',
    '📊 Basis-Dashboard',
    '💬 CHIEF Coach (Basis)',
    '📱 Mobile App',
    '🔔 Push-Benachrichtigungen',
    '📈 Basis-Statistiken',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// ADD-ON: AUTOPILOT 🤖
// ═══════════════════════════════════════════════════════════════════════════

export const AUTOPILOT_ADDON: AddOn = {
  id: 'autopilot',
  name: 'Autopilot',
  description: 'KI arbeitet automatisch für dich',
  icon: '🤖',
  tiers: [
    {
      id: 'autopilot_starter',
      name: 'Starter',
      price: 10,
      yearlyPrice: 100,
      costPerUser: 0.80,  // ~8 Cent pro Auto-Action
      marginPercent: 92,
      limits: {
        auto_actions: 100,        // 100 automatische Aktionen/Monat
        draft_reviews: 50,        // 50 Entwürfe zur Bestätigung
        ghost_reengages: 20,      // 20 Ghost-Buster Aktionen
        scheduled_messages: 30,   // 30 geplante Nachrichten
      },
      features: [
        '🤖 100 Auto-Aktionen/Monat',
        '📝 Entwürfe zur Bestätigung',
        '👻 Ghost-Buster (20x)',
        '⏰ Nachricht planen (30x)',
      ],
    },
    {
      id: 'autopilot_pro',
      name: 'Pro',
      price: 20,
      yearlyPrice: 200,
      costPerUser: 1.50,
      marginPercent: 92.5,
      popular: true,
      limits: {
        auto_actions: 500,
        draft_reviews: 200,
        ghost_reengages: 100,
        scheduled_messages: 200,
        smart_sequences: 10,      // 10 automatische Sequenzen
      },
      features: [
        '🤖 500 Auto-Aktionen/Monat',
        '📝 Unlimitierte Entwürfe',
        '👻 Ghost-Buster (100x)',
        '⏰ Nachricht planen (200x)',
        '🔄 Smart Sequences (10)',
        '📊 Autopilot-Analytics',
      ],
    },
    {
      id: 'autopilot_unlimited',
      name: 'Unlimited',
      price: 30,
      yearlyPrice: 300,
      costPerUser: 2.50,
      marginPercent: 91.7,
      limits: {
        auto_actions: -1,         // Unlimited
        draft_reviews: -1,
        ghost_reengages: -1,
        scheduled_messages: -1,
        smart_sequences: -1,
        priority_processing: 1,   // Prioritäts-Verarbeitung
      },
      features: [
        '🤖 UNBEGRENZTE Auto-Aktionen',
        '📝 Unbegrenzte Entwürfe',
        '👻 Unbegrenzt Ghost-Buster',
        '⏰ Unbegrenzt planen',
        '🔄 Unbegrenzte Sequences',
        '⚡ Prioritäts-Verarbeitung',
        '🎯 A/B Testing',
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// ADD-ON: FINANZEN 💰
// ═══════════════════════════════════════════════════════════════════════════

export const FINANCE_ADDON: AddOn = {
  id: 'finance',
  name: 'Finanzen',
  description: 'Provisionen, Steuern & Ausgaben',
  icon: '💰',
  tiers: [
    {
      id: 'finance_starter',
      name: 'Starter',
      price: 10,
      yearlyPrice: 100,
      costPerUser: 0.50,  // Sehr geringe Kosten (nur DB)
      marginPercent: 95,
      limits: {
        transactions: 100,        // 100 Transaktionen/Monat
        income_tracking: 1,       // Basis Einnahmen-Tracking
        expense_categories: 5,    // 5 Ausgaben-Kategorien
        reports: 2,               // 2 Reports/Monat
      },
      features: [
        '💵 Provisions-Tracking (100x)',
        '📊 Basis-Übersicht',
        '🏷️ 5 Ausgaben-Kategorien',
        '📄 2 Reports/Monat',
      ],
    },
    {
      id: 'finance_pro',
      name: 'Pro',
      price: 20,
      yearlyPrice: 200,
      costPerUser: 1.00,
      marginPercent: 95,
      popular: true,
      limits: {
        transactions: 500,
        income_tracking: 1,
        expense_categories: -1,   // Unlimited
        reports: -1,
        tax_prep: 1,              // Steuer-Vorbereitung
        mileage_tracking: 1,      // Kilometer-Tracking
      },
      features: [
        '💵 Provisions-Tracking (500x)',
        '📊 Detaillierte Übersicht',
        '🏷️ Unbegrenzte Kategorien',
        '📄 Unbegrenzte Reports',
        '🧾 Steuer-Vorbereitung',
        '🚗 Kilometer-Tracking',
        '📱 Beleg-Scanner',
      ],
    },
    {
      id: 'finance_business',
      name: 'Business',
      price: 30,
      yearlyPrice: 300,
      costPerUser: 1.50,
      marginPercent: 95,
      limits: {
        transactions: -1,
        income_tracking: 1,
        expense_categories: -1,
        reports: -1,
        tax_prep: 1,
        mileage_tracking: 1,
        tax_export: 1,            // DATEV Export
        team_finance: 5,          // 5 Team-Mitglieder
        forecasting: 1,           // KI-Prognosen
      },
      features: [
        '💵 UNBEGRENZTE Transaktionen',
        '📊 Business Dashboard',
        '🧾 Steuer-Export (DATEV)',
        '👥 Team-Finanzen (5 User)',
        '🔮 KI-Umsatzprognose',
        '📈 ROI-Tracking',
        '🏦 Multi-Konto',
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// ADD-ON: LEAD-GENERIERUNG 🎯
// ═══════════════════════════════════════════════════════════════════════════

export const LEADGEN_ADDON: AddOn = {
  id: 'leadgen',
  name: 'Lead-Generierung',
  description: 'Neue Kontakte automatisch finden',
  icon: '🎯',
  tiers: [
    {
      id: 'leadgen_starter',
      name: 'Starter',
      price: 10,
      yearlyPrice: 100,
      costPerUser: 1.00,  // Scraping/API Kosten
      marginPercent: 90,
      limits: {
        lead_suggestions: 50,     // 50 Lead-Vorschläge/Monat
        profile_enrichment: 20,   // 20 Profil-Anreicherungen
        ideal_customer: 1,        // 1 Ideal Customer Profile
        saved_searches: 3,        // 3 gespeicherte Suchen
      },
      features: [
        '🎯 50 Lead-Vorschläge/Monat',
        '👤 20 Profil-Anreicherungen',
        '🎨 1 Ideal Customer Profile',
        '🔍 3 gespeicherte Suchen',
      ],
    },
    {
      id: 'leadgen_pro',
      name: 'Pro',
      price: 20,
      yearlyPrice: 200,
      costPerUser: 2.00,
      marginPercent: 90,
      popular: true,
      limits: {
        lead_suggestions: 200,
        profile_enrichment: 100,
        ideal_customer: 5,
        saved_searches: -1,
        lookalike: 1,             // Lookalike Audiences
        intent_signals: 1,        // Kauf-Intent Erkennung
      },
      features: [
        '🎯 200 Lead-Vorschläge/Monat',
        '👤 100 Profil-Anreicherungen',
        '🎨 5 Ideal Customer Profiles',
        '🔍 Unbegrenzte Suchen',
        '👥 Lookalike Audiences',
        '🔥 Kauf-Intent Erkennung',
      ],
    },
    {
      id: 'leadgen_unlimited',
      name: 'Unlimited',
      price: 30,
      yearlyPrice: 300,
      costPerUser: 3.00,
      marginPercent: 90,
      limits: {
        lead_suggestions: -1,
        profile_enrichment: -1,
        ideal_customer: -1,
        saved_searches: -1,
        lookalike: 1,
        intent_signals: 1,
        competitor_leads: 1,      // Mitbewerber-Leads
        auto_outreach: 100,       // Auto-Outreach
      },
      features: [
        '🎯 UNBEGRENZTE Vorschläge',
        '👤 Unbegrenzte Anreicherung',
        '🎨 Unbegrenzte ICPs',
        '🔍 Unbegrenzte Suchen',
        '👥 Lookalike Audiences',
        '🔥 Kauf-Intent Erkennung',
        '⚔️ Mitbewerber-Leads',
        '📤 Auto-Outreach (100x)',
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// ALLE ADD-ONS
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_ADDONS: AddOn[] = [
  AUTOPILOT_ADDON,
  FINANCE_ADDON,
  LEADGEN_ADDON,
];

// ═══════════════════════════════════════════════════════════════════════════
// BUNDLES (Rabatt bei Kombination)
// ═══════════════════════════════════════════════════════════════════════════

export interface Bundle {
  id: string;
  name: string;
  description: string;
  includedAddons: string[];  // Add-On Tier IDs
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPercent: number;
}

export const BUNDLES: Bundle[] = [
  {
    id: 'starter_bundle',
    name: 'Starter Bundle',
    description: 'Basic + alle Starter Add-Ons',
    includedAddons: ['autopilot_starter', 'finance_starter', 'leadgen_starter'],
    originalPrice: 60,  // 30 + 10 + 10 + 10
    bundlePrice: 49,
    savings: 11,
    savingsPercent: 18,
  },
  {
    id: 'pro_bundle',
    name: 'Pro Bundle',
    description: 'Basic + alle Pro Add-Ons',
    includedAddons: ['autopilot_pro', 'finance_pro', 'leadgen_pro'],
    originalPrice: 90,  // 30 + 20 + 20 + 20
    bundlePrice: 69,
    savings: 21,
    savingsPercent: 23,
  },
  {
    id: 'unlimited_bundle',
    name: 'Unlimited Bundle',
    description: 'Basic + alle Unlimited Add-Ons',
    includedAddons: ['autopilot_unlimited', 'finance_business', 'leadgen_unlimited'],
    originalPrice: 120, // 30 + 30 + 30 + 30
    bundlePrice: 89,
    savings: 31,
    savingsPercent: 26,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// TEAM PLANS
// ═══════════════════════════════════════════════════════════════════════════

export interface TeamPlan {
  id: string;
  name: string;
  pricePerSeat: number;
  minSeats: number;
  features: string[];
}

export const TEAM_PLANS: TeamPlan[] = [
  {
    id: 'team_small',
    name: 'Team Small',
    pricePerSeat: 25,  // €25/User statt €30
    minSeats: 3,
    features: [
      '👥 3-10 Team-Mitglieder',
      '📊 Team-Dashboard',
      '🏆 Team-Leaderboard',
      '📈 Team-Analytics',
      '💬 Team-Chat',
    ],
  },
  {
    id: 'team_business',
    name: 'Team Business',
    pricePerSeat: 20,  // €20/User
    minSeats: 10,
    features: [
      '👥 10-50 Team-Mitglieder',
      '📊 Advanced Team-Dashboard',
      '🏆 Gamification & Challenges',
      '📈 Performance-Tracking',
      '🔒 Admin-Kontrolle',
      '📞 Prioritäts-Support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    pricePerSeat: 15,  // €15/User bei 50+
    minSeats: 50,
    features: [
      '👥 50+ Team-Mitglieder',
      '🏢 Multi-Team Management',
      '🔐 SSO/SAML',
      '📊 Custom Reports',
      '🛠️ API-Zugang',
      '👤 Dedicated Account Manager',
      '📞 24/7 Support',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS KALKULATION
// ═══════════════════════════════════════════════════════════════════════════

export const BUSINESS_METRICS = {
  // Annahmen bei 1 Million User
  targetUsers: 1_000_000,
  
  // Conversion Funnel
  freeToBasic: 0.05,        // 5% werden zahlende Kunden
  basicToAddon: 0.30,       // 30% kaufen Add-Ons
  avgAddonsPerUser: 1.5,    // Durchschnittlich 1.5 Add-Ons
  
  // Pricing
  avgBasicPrice: 30,
  avgAddonPrice: 17,        // Durchschnitt aller Tiers
  
  // Kosten
  costPerFreeUser: 0.10,    // €0.10/Monat für Free User
  costPerPayingUser: 2.50,  // €2.50/Monat für zahlende User
  
  // Berechnung bei 1M Usern:
  // ├── Free Users: 950,000 × €0.10 = €95,000 Kosten
  // ├── Paying Users: 50,000 × €30 = €1,500,000 Umsatz
  // ├── Add-On Revenue: 15,000 × €17 × 1.5 = €382,500
  // ├── TOTAL Revenue: €1,882,500/Monat
  // ├── TOTAL Costs: €95,000 + (50,000 × €2.50) = €220,000
  // └── PROFIT: €1,662,500/Monat = 88.3% Marge
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function calculateMonthlyRevenue(users: number): {
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
} {
  const payingUsers = Math.floor(users * BUSINESS_METRICS.freeToBasic);
  const freeUsers = users - payingUsers;
  const addonUsers = Math.floor(payingUsers * BUSINESS_METRICS.basicToAddon);
  
  const basicRevenue = payingUsers * BUSINESS_METRICS.avgBasicPrice;
  const addonRevenue = addonUsers * BUSINESS_METRICS.avgAddonPrice * BUSINESS_METRICS.avgAddonsPerUser;
  const totalRevenue = basicRevenue + addonRevenue;
  
  const freeCosts = freeUsers * BUSINESS_METRICS.costPerFreeUser;
  const payingCosts = payingUsers * BUSINESS_METRICS.costPerPayingUser;
  const totalCosts = freeCosts + payingCosts;
  
  const profit = totalRevenue - totalCosts;
  const margin = (profit / totalRevenue) * 100;
  
  return { revenue: totalRevenue, costs: totalCosts, profit, margin };
}

export function formatPrice(price: number): string {
  return `€${price.toLocaleString('de-DE')}`;
}

export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════════════════════════════════════

export default {
  BASIC_PLAN,
  AUTOPILOT_ADDON,
  FINANCE_ADDON,
  LEADGEN_ADDON,
  ALL_ADDONS,
  BUNDLES,
  TEAM_PLANS,
  BUSINESS_METRICS,
  calculateMonthlyRevenue,
  formatPrice,
  isUnlimited,
};

