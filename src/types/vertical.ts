/**
 * Vertical Architecture - Shared Types
 * 
 * Definiert die JSON-Struktur für Vertical-Configs
 * Wird sowohl im Frontend (TypeScript) als auch Backend (Pydantic) verwendet
 */

/**
 * Feature-Flags für verschiedene Funktionsbereiche
 */
export interface VerticalFeatures {
  crm: boolean;
  finance: boolean;
  gamification: boolean;
  team: boolean;
  analytics: boolean;
  ai_coach: boolean;
  lead_hunter: boolean;
  follow_ups: boolean;
  templates: boolean;
  autopilot: boolean;
  cold_call: boolean;
  closing_coach: boolean;
  performance_insights: boolean;
  commission_tracker: boolean;
  genealogy: boolean;
  power_hour: boolean;
  churn_radar: boolean;
  roleplay_dojo: boolean;
  network_graph: boolean;
  field_ops: boolean;
  route_planner: boolean;
}

/**
 * Terminologie-Mapping für branchenspezifische Begriffe
 */
export interface VerticalTerminology {
  lead: string;
  deal: string;
  revenue: string;
  commission: string;
  prospect: string;
  customer: string;
  contact: string;
  pipeline: string;
  closing: string;
  sales: string;
  team: string;
  downline: string;
  partner: string;
  enrollment: string;
  signup: string;
  [key: string]: string; // Erlaubt zusätzliche benutzerdefinierte Begriffe
}

/**
 * AI-Kontext für branchenspezifische Prompts
 */
export interface VerticalAIContext {
  persona: string; // Beschreibung der AI-Persona
  focus_topics: string[]; // Themen, auf die sich die AI konzentrieren soll
  industry_terms: string[]; // Branchenspezifische Begriffe
  tone: string; // Kommunikationston (z.B. "professionell", "freundlich", "motivierend")
  examples: string[]; // Beispiel-Interaktionen
  avoid_topics: string[]; // Themen, die vermieden werden sollen
}

/**
 * Route-Konfiguration
 */
export interface VerticalRoutes {
  hidden: string[]; // Routes, die ausgeblendet werden sollen
  priority: string[]; // Routes, die priorisiert werden sollen
  custom_labels?: Record<string, string>; // Custom Labels für Routes
}

/**
 * Vollständige Vertical-Config
 */
export interface VerticalConfig {
  features: VerticalFeatures;
  terminology: VerticalTerminology;
  ai_context: VerticalAIContext;
  routes: VerticalRoutes;
}

/**
 * Vertical-Metadaten
 */
export interface Vertical {
  id: string;
  key: string; // z.B. "mlm", "real_estate", "finance"
  name: string; // Anzeigename
  description?: string;
  config: VerticalConfig;
  created_at?: string;
  updated_at?: string;
}

/**
 * Default MLM Config (Fallback)
 */
export const DEFAULT_MLM_CONFIG: VerticalConfig = {
  features: {
    crm: true,
    finance: true,
    gamification: true,
    team: true,
    analytics: true,
    ai_coach: true,
    lead_hunter: true,
    follow_ups: true,
    templates: true,
    autopilot: true,
    cold_call: true,
    closing_coach: true,
    performance_insights: true,
    commission_tracker: true,
    genealogy: true,
    power_hour: true,
    churn_radar: true,
    roleplay_dojo: true,
    network_graph: true,
    field_ops: false,
    route_planner: false,
  },
  terminology: {
    lead: "Lead",
    deal: "Einschreiben",
    revenue: "Umsatz",
    commission: "Provision",
    prospect: "Interessent",
    customer: "Partner",
    contact: "Kontakt",
    pipeline: "Pipeline",
    closing: "Abschluss",
    sales: "Verkauf",
    team: "Team",
    downline: "Downline",
    partner: "Partner",
    enrollment: "Einschreibung",
    signup: "Anmeldung",
  },
  ai_context: {
    persona: "Du bist ein erfahrener Network Marketing Coach, der motivierend und unterstützend kommuniziert.",
    focus_topics: [
      "Network Marketing",
      "Team-Aufbau",
      "Downline-Management",
      "Provisionen",
      "Motivation",
      "Einschreibungen",
    ],
    industry_terms: [
      "Einschreibung",
      "Downline",
      "Upline",
      "Provision",
      "PV",
      "GV",
      "Partner",
      "Team",
    ],
    tone: "motivierend",
    examples: [
      "Wie kann ich mein Team besser motivieren?",
      "Was sind die besten Strategien für Einschreibungen?",
    ],
    avoid_topics: ["Pyramid Scheme", "Betrug"],
  },
  routes: {
    hidden: [],
    priority: ["/dashboard", "/leads", "/team", "/genealogy"],
  },
};

/**
 * Default Real Estate Config (Beispiel)
 */
export const DEFAULT_REAL_ESTATE_CONFIG: VerticalConfig = {
  features: {
    crm: true,
    finance: true,
    gamification: false,
    team: false,
    analytics: true,
    ai_coach: true,
    lead_hunter: true,
    follow_ups: true,
    templates: true,
    autopilot: true,
    cold_call: true,
    closing_coach: true,
    performance_insights: true,
    commission_tracker: true,
    genealogy: false,
    power_hour: false,
    churn_radar: false,
    roleplay_dojo: true,
    network_graph: false,
    field_ops: true,
    route_planner: true,
  },
  terminology: {
    lead: "Interessent",
    deal: "Abschluss",
    revenue: "Umsatz",
    commission: "Provision",
    prospect: "Käufer",
    customer: "Kunde",
    contact: "Kontakt",
    pipeline: "Pipeline",
    closing: "Abschluss",
    sales: "Verkauf",
    team: "Team",
    downline: "",
    partner: "Partner",
    enrollment: "",
    signup: "Anmeldung",
  },
  ai_context: {
    persona: "Du bist ein professioneller Immobilienmakler mit langjähriger Erfahrung.",
    focus_topics: [
      "Immobilienverkauf",
      "Kundenberatung",
      "Objektpräsentation",
      "Verhandlungen",
      "Abschlüsse",
    ],
    industry_terms: [
      "Immobilie",
      "Objekt",
      "Käufer",
      "Verkäufer",
      "Maklerprovision",
      "Besichtigung",
    ],
    tone: "professionell",
    examples: [
      "Wie präsentiere ich eine Immobilie am besten?",
      "Wie verhandle ich erfolgreich einen Abschluss?",
    ],
    avoid_topics: [],
  },
  routes: {
    hidden: ["/genealogy", "/power-hour", "/churn-radar"],
    priority: ["/dashboard", "/leads", "/pipeline", "/field-ops"],
  },
};

