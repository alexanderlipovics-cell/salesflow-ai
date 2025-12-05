/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMPENSATION TYPES                                                        ║
 * ║  Typen für Compensation Plans, Ziele und Goal Engine                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================
// RANK DEFINITIONS
// ============================================

/**
 * Anforderungen für einen Rang
 */
export interface RankRequirements {
  /** Minimales Gruppenvolumen */
  min_group_volume: number;
  /** Minimales persönliches Volumen */
  min_personal_volume?: number;
  /** Minimale Anzahl aktiver Partner */
  min_active_partners?: number;
  /** Minimale Anzahl Partner in der ersten Linie */
  min_frontline_partners?: number;
  /** Spezielle Anforderungen als Text */
  special_requirements?: string[];
}

/**
 * Einkommensschätzung für einen Rang
 */
export interface EarningEstimate {
  /** Durchschnittliches Monatseinkommen */
  avg_monthly_income: number;
  /** Einkommensbereich [min, max] */
  range?: [number, number];
  /** Anteil der Partner, die diesen Rang erreichen */
  percentile?: number;
}

/**
 * Definition eines Rangs im Compensation Plan
 */
export interface RankDefinition {
  /** Eindeutige ID */
  id: string;
  /** Rang-Name */
  name: string;
  /** Rang-Level (aufsteigend) */
  level: number;
  /** Anforderungen */
  requirements: RankRequirements;
  /** Einkommensschätzung (optional) */
  earning_estimate?: EarningEstimate;
  /** Emoji/Icon für UI */
  emoji?: string;
  /** Farbe für UI */
  color?: string;
}

// ============================================
// COMPENSATION PLAN
// ============================================

/**
 * Plan-Typ
 */
export type PlanType = 'unilevel' | 'binary' | 'matrix' | 'hybrid' | 'breakaway';

/**
 * Vollständiger Compensation Plan einer Firma
 */
export interface CompensationPlan {
  /** Firmen-ID (slug) */
  company_id: string;
  /** Firmen-Name */
  company_name: string;
  /** Firmen-Logo (Emoji oder URL) */
  company_logo?: string;
  /** Region (DE, AT, CH etc.) */
  region: string;
  /** Plan-Typ */
  plan_type: PlanType;
  /** Einheitenlabel (z.B. "PV", "QV", "BV") */
  unit_label: string;
  /** Einheitencode */
  unit_code: string;
  /** Währung */
  currency: string;
  /** Rang-Definitionen */
  ranks: RankDefinition[];
  /** Durchschnittliches PV pro Kunde */
  avg_personal_volume_per_customer: number;
  /** Durchschnittliches PV pro Partner */
  avg_personal_volume_per_partner: number;
  /** Plan-Version */
  version: string;
  /** Letztes Update */
  updated_at?: string;
  /** Externe URL zum vollständigen Plan */
  external_plan_url?: string;
}

// ============================================
// GOAL TYPES
// ============================================

/**
 * Ziel-Typ: Einkommen oder Rang
 */
export type GoalType = 'income' | 'rank';

/**
 * Wöchentliche Ziele
 */
export interface WeeklyTargets {
  new_customers: number;
  new_partners: number;
  new_contacts: number;
  followups: number;
  reactivations: number;
}

/**
 * Tägliche Ziele
 */
export interface DailyTargets {
  new_contacts: number;
  followups: number;
  reactivations: number;
}

/**
 * Zusammengefasste Tages-/Wochenziele
 */
export interface FlowTargets {
  weekly: WeeklyTargets;
  daily: DailyTargets;
}

/**
 * Ergebnis der Zielberechnung
 */
export interface GoalCalculationResult {
  /** Ziel-Rang */
  target_rank: RankDefinition;
  /** Aktueller Rang (falls bekannt) */
  current_rank?: RankDefinition;
  /** Fehlendes Gruppenvolumen */
  missing_group_volume: number;
  /** Geschätzte Kunden-Anzahl */
  estimated_customers: number;
  /** Geschätzte Partner-Anzahl */
  estimated_partners: number;
  /** Volumen pro Monat */
  per_month_volume: number;
  /** Tages-/Wochenziele */
  daily_targets: FlowTargets;
  /** Berechnetes monatliches Einkommen */
  estimated_monthly_income?: number;
}

// ============================================
// USER GOAL (DB Schema)
// ============================================

/**
 * User-Ziel (wie in DB gespeichert)
 */
export interface UserGoal {
  id: string;
  user_id: string;
  workspace_id: string;
  company_id: string;
  goal_type: GoalType;
  target_monthly_income?: number;
  target_rank_id: string;
  target_rank_name: string;
  timeframe_months: number;
  calculated_group_volume: number;
  calculated_customers: number;
  calculated_partners: number;
  status: 'active' | 'achieved' | 'paused' | 'cancelled';
  created_at: string;
  updated_at: string;
  achieved_at?: string;
}

/**
 * User-Ziel aus DB
 */
export type UserGoalDB = UserGoal;

/**
 * Daily Flow Targets (wie in DB gespeichert)
 */
export interface UserDailyFlowTargetsDB {
  id: string;
  user_id: string;
  workspace_id: string;
  goal_id: string;
  company_id: string;
  weekly_new_customers: number;
  weekly_new_partners: number;
  weekly_new_contacts: number;
  weekly_followups: number;
  weekly_reactivations: number;
  daily_new_contacts: number;
  daily_followups: number;
  daily_reactivations: number;
  config: DailyFlowConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONFIG TYPES
// ============================================

/**
 * Konfiguration für Daily Flow Berechnung
 */
export interface DailyFlowConfig {
  /** Arbeitstage pro Woche */
  working_days_per_week: number;
  /** Conversion Rate: Kontakte → Kunden */
  contact_to_customer_rate: number;
  /** Conversion Rate: Kontakte → Partner */
  contact_to_partner_rate: number;
  /** Follow-up Frequenz pro Kontakt */
  followup_frequency: number;
  /** Reaktivierungs-Quote */
  reactivation_rate: number;
}

/**
 * Standard Daily Flow Config
 */
export const DEFAULT_DAILY_FLOW_CONFIG: DailyFlowConfig = {
  working_days_per_week: 5,
  contact_to_customer_rate: 0.1,
  contact_to_partner_rate: 0.05,
  followup_frequency: 3,
  reactivation_rate: 0.15,
};

// ============================================
// WIZARD TYPES
// ============================================

/**
 * Wizard Step
 */
export type WizardStep = 'company' | 'goal' | 'summary' | 'complete';

// ============================================
// DISCLAIMER
// ============================================

/**
 * Rechtlicher Disclaimer für Einkommensschätzungen
 */
export const DISCLAIMER_TEXT = `
Diese Berechnung basiert auf Durchschnittswerten und dient nur zur Orientierung. 
Tatsächliche Ergebnisse können variieren und hängen von deiner individuellen 
Aktivität, Marktbedingungen und anderen Faktoren ab. Es gibt keine Garantie 
für bestimmte Einkommensniveaus.
`.trim();

// ============================================
// EXPORTS
// ============================================

export type {
  RankRequirements,
  EarningEstimate,
  RankDefinition,
  CompensationPlan,
  GoalCalculationResult,
  UserGoal,
  WeeklyTargets,
  DailyTargets,
  FlowTargets,
  DailyFlowConfig,
};

