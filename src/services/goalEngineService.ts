/**
 * GOAL ENGINE SERVICE
 * 
 * Berechnet aus Einkommens-/Rang-Zielen die nötigen Aktivitäten:
 * Ziel → Volumen → Kunden/Partner → Daily/Weekly Tasks
 * 
 * Flow:
 * 1. User gibt Ziel ein (z.B. 2.000€/Monat in 6 Monaten)
 * 2. Engine findet passenden Rang (z.B. Team Leader)
 * 3. Berechnet benötigtes Gruppenvolumen
 * 4. Schätzt Anzahl Kunden/Partner
 * 5. Konvertiert zu täglichen/wöchentlichen Aktivitäten
 * 
 * NEU: Unterstützt jetzt Vertical Adapters für branchenspezifische Berechnungen.
 */

import {
  CompensationPlan,
  RankDefinition,
  GoalCalculationInput,
  GoalCalculationResult,
  DailyFlowConfig,
  DailyFlowTargets,
  DEFAULT_DAILY_FLOW_CONFIG,
} from '../types/compensation';

// Vertical Adapter System
import {
  getAdapterById,
  computeGoalBreakdownForVertical,
  calculateWithAdapter,
  GoalInput,
  GoalBreakdown,
  GoalKind,
  AdapterCalculationResult,
} from '../config/verticals/adapters';
import { VerticalId } from '../config/verticals/types';

// ============================================
// MAIN CALCULATION
// ============================================

/**
 * Hauptfunktion: Berechnet aus Ziel alle nötigen Werte
 */
export function calculateGoal(input: GoalCalculationInput): GoalCalculationResult {
  const { plan, goal_type, timeframe_months, config } = input;
  
  // 1. Ziel-Rang bestimmen
  const targetRank = goal_type === 'income'
    ? findRankByIncome(plan, input.target_monthly_income ?? 0)
    : findRankById(plan, input.target_rank_id ?? '');
  
  if (!targetRank) {
    throw new Error('Could not determine target rank for the given goal');
  }
  
  // 2. Benötigtes Volumen berechnen
  const requiredVolume = targetRank.requirements.min_group_volume ?? 0;
  const currentVolume = input.current_group_volume ?? 0;
  const missingVolume = Math.max(0, requiredVolume - currentVolume);
  
  // 3. Kunden/Partner-Schätzung basierend auf Plan-Durchschnittswerten
  const avgCustomerVolume = plan.avg_personal_volume_per_customer ?? 60;
  const avgPartnerVolume = plan.avg_personal_volume_per_partner ?? 100;
  
  // Annahme: 70% über Kunden, 30% über Partner (typische Verteilung)
  const customerVolumeShare = 0.7;
  const partnerVolumeShare = 0.3;
  
  const customerVolume = missingVolume * customerVolumeShare;
  const partnerVolume = missingVolume * partnerVolumeShare;
  
  const estimatedCustomers = Math.ceil(customerVolume / avgCustomerVolume);
  const estimatedPartners = Math.ceil(partnerVolume / avgPartnerVolume);
  
  // 4. Zeitliche Aufteilung
  const weeks = timeframe_months * 4.33; // Durchschnittliche Wochen pro Monat
  const perMonthVolume = missingVolume / timeframe_months;
  const perWeekVolume = missingVolume / weeks;
  const perDayVolume = perWeekVolume / config.working_days_per_week;
  
  // 5. Daily Flow Targets berechnen
  const dailyTargets = calculateDailyTargets(
    estimatedCustomers,
    estimatedPartners,
    timeframe_months,
    config
  );
  
  return {
    target_rank: targetRank,
    required_group_volume: requiredVolume,
    missing_group_volume: missingVolume,
    estimated_customers: estimatedCustomers,
    estimated_partners: estimatedPartners,
    per_month_volume: round(perMonthVolume, 0),
    per_week_volume: round(perWeekVolume, 0),
    per_day_volume: round(perDayVolume, 0),
    daily_targets: dailyTargets,
  };
}

// ============================================
// DAILY TARGETS CALCULATION
// ============================================

/**
 * Berechnet tägliche und wöchentliche Aktivitäts-Targets
 */
function calculateDailyTargets(
  totalCustomers: number,
  totalPartners: number,
  timeframeMonths: number,
  config: DailyFlowConfig
): DailyFlowTargets {
  const weeks = timeframeMonths * 4.33;
  const workingDaysPerWeek = config.working_days_per_week;
  
  // Pro Woche benötigte Kunden/Partner
  const customersPerWeek = totalCustomers / weeks;
  const partnersPerWeek = totalPartners / weeks;
  
  // Kontakte basierend auf Conversion Rate
  // Formel: Kontakte = Ziel / Conversion Rate
  const contactsForCustomers = config.contact_to_customer_rate > 0
    ? customersPerWeek / config.contact_to_customer_rate
    : 0;
  const contactsForPartners = config.contact_to_partner_rate > 0
    ? partnersPerWeek / config.contact_to_partner_rate
    : 0;
  
  const totalContactsPerWeek = contactsForCustomers + contactsForPartners;
  
  // Follow-ups pro Woche
  // Basiert auf durchschnittliche Follow-ups pro Kunde/Partner
  const followupsPerWeek = 
    customersPerWeek * config.followups_per_customer +
    partnersPerWeek * config.followups_per_partner;
  
  // Reaktivierungen (alte Kontakte wieder ansprechen)
  const reactivationsPerWeek = totalContactsPerWeek * config.reactivation_share;
  
  // Umrechnung auf Tageswerte
  const contactsPerDay = totalContactsPerWeek / workingDaysPerWeek;
  const followupsPerDay = followupsPerWeek / workingDaysPerWeek;
  const reactivationsPerDay = reactivationsPerWeek / workingDaysPerWeek;
  
  return {
    weekly: {
      new_customers: round(customersPerWeek, 1),
      new_partners: round(partnersPerWeek, 1),
      new_contacts: round(totalContactsPerWeek, 0),
      followups: round(followupsPerWeek, 0),
      reactivations: round(reactivationsPerWeek, 0),
    },
    daily: {
      new_contacts: round(contactsPerDay, 0),
      followups: round(followupsPerDay, 0),
      reactivations: round(reactivationsPerDay, 0),
    },
  };
}

// ============================================
// RANK FINDING HELPERS
// ============================================

/**
 * Findet den passenden Rang für ein Ziel-Einkommen
 */
export function findRankByIncome(
  plan: CompensationPlan, 
  targetIncome: number
): RankDefinition | undefined {
  const sorted = [...plan.ranks].sort((a, b) => a.order - b.order);
  
  // Finde den ersten Rang, der das Ziel-Einkommen erreicht
  const matchingRank = sorted.find(
    r => r.earning_estimate && r.earning_estimate.avg_monthly_income >= targetIncome
  );
  
  // Falls kein Rang gefunden, höchsten Rang zurückgeben
  return matchingRank ?? sorted[sorted.length - 1];
}

/**
 * Findet einen Rang anhand seiner ID
 */
export function findRankById(
  plan: CompensationPlan, 
  rankId: string
): RankDefinition | undefined {
  return plan.ranks.find(r => r.id === rankId);
}

/**
 * Findet den nächsthöheren Rang
 */
export function findNextRank(
  plan: CompensationPlan, 
  currentRankId: string
): RankDefinition | undefined {
  const currentRank = findRankById(plan, currentRankId);
  if (!currentRank) return undefined;
  
  return plan.ranks.find(r => r.order === currentRank.order + 1);
}

// ============================================
// PROGRESS CALCULATION
// ============================================

/**
 * Berechnet den Fortschritt zum Ziel
 */
export function calculateProgress(
  currentVolume: number,
  targetVolume: number
): { 
  percent: number; 
  remaining: number;
  isAchieved: boolean;
} {
  const remaining = Math.max(0, targetVolume - currentVolume);
  const percent = targetVolume > 0 
    ? Math.min(100, (currentVolume / targetVolume) * 100)
    : 0;
  
  return {
    percent: round(percent, 1),
    remaining,
    isAchieved: remaining === 0,
  };
}

/**
 * Berechnet verbleibende Tage und Wochen
 */
export function calculateTimeRemaining(
  endDate: Date | string
): {
  days: number;
  weeks: number;
  months: number;
  isExpired: boolean;
} {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    days: Math.max(0, diffDays),
    weeks: Math.max(0, Math.ceil(diffDays / 7)),
    months: Math.max(0, Math.ceil(diffDays / 30)),
    isExpired: diffDays <= 0,
  };
}

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Formatiert die Ergebniszusammenfassung als Text
 */
export function formatTargetSummary(
  result: GoalCalculationResult, 
  plan: CompensationPlan
): string {
  const { daily_targets, target_rank, missing_group_volume, estimated_customers, estimated_partners } = result;
  
  return `
🎯 Um ${target_rank.name} bei ${plan.company_name} zu erreichen:

📊 Benötigtes Volumen: ${missing_group_volume.toLocaleString('de-DE')} ${plan.unit_label}

👥 Das bedeutet ca.:
• ${estimated_customers} neue Kunden
• ${estimated_partners} aktive Partner

📅 Pro Woche:
• ${daily_targets.weekly.new_contacts} neue Kontakte
• ${daily_targets.weekly.followups} Follow-ups
• ${daily_targets.weekly.reactivations} Reaktivierungen

🎯 Pro Tag (${5} Arbeitstage):
• ${daily_targets.daily.new_contacts} Kontakte ansprechen
• ${daily_targets.daily.followups} Follow-ups
• ${daily_targets.daily.reactivations} alte Kontakte reaktivieren
  `.trim();
}

/**
 * Formatiert das Ergebnis für die Daily Flow Integration
 */
export function formatForDailyFlow(result: GoalCalculationResult): {
  daily_contacts: number;
  daily_followups: number;
  daily_reactivations: number;
  weekly_summary: string;
} {
  return {
    daily_contacts: result.daily_targets.daily.new_contacts,
    daily_followups: result.daily_targets.daily.followups,
    daily_reactivations: result.daily_targets.daily.reactivations,
    weekly_summary: `${result.daily_targets.weekly.new_contacts} Kontakte · ${result.daily_targets.weekly.followups} Follow-ups`,
  };
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validiert die Goal-Engine-Eingaben
 */
export function validateGoalInput(input: Partial<GoalCalculationInput>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!input.plan) {
    errors.push('Kein Compensation Plan ausgewählt');
  }
  
  if (!input.goal_type) {
    errors.push('Kein Ziel-Typ ausgewählt');
  }
  
  if (input.goal_type === 'income' && (!input.target_monthly_income || input.target_monthly_income <= 0)) {
    errors.push('Ungültiges Ziel-Einkommen');
  }
  
  if (input.goal_type === 'rank' && !input.target_rank_id) {
    errors.push('Kein Ziel-Rang ausgewählt');
  }
  
  if (!input.timeframe_months || input.timeframe_months < 1) {
    errors.push('Ungültiger Zeitraum');
  }
  
  if (input.timeframe_months && input.timeframe_months > 60) {
    errors.push('Zeitraum zu lang (max. 60 Monate)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Rundet eine Zahl auf die angegebene Anzahl Dezimalstellen
 */
function round(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Berechnet die Anzahl der Arbeitstage zwischen zwei Daten
 */
export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  workingDaysPerWeek: number = 5
): number {
  const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const fullWeeks = Math.floor(diffDays / 7);
  const remainingDays = diffDays % 7;
  
  return (fullWeeks * workingDaysPerWeek) + Math.min(remainingDays, workingDaysPerWeek);
}

// ============================================
// VERTICAL ADAPTER INTEGRATION
// ============================================

/**
 * Berechnet Goal Breakdown mit Vertical Adapter.
 * Nutzt branchenspezifische Logik für genauere Berechnungen.
 */
export function calculateGoalWithAdapter(
  verticalId: VerticalId,
  goalInput: GoalInput,
  compensationPlan?: CompensationPlan
): AdapterCalculationResult {
  return calculateWithAdapter(verticalId, {
    goal_input: goalInput,
    compensation_plan: compensationPlan,
  });
}

/**
 * Schnelle Goal Breakdown Berechnung für ein Vertical.
 */
export function getGoalBreakdown(
  verticalId: VerticalId,
  goalKind: GoalKind,
  targetValue: number,
  timeframeMonths: number,
  verticalMeta?: Record<string, unknown>
): GoalBreakdown {
  return computeGoalBreakdownForVertical(verticalId, {
    goal_kind: goalKind,
    target_value: targetValue,
    timeframe_months: timeframeMonths,
    vertical_meta: verticalMeta ?? {},
  });
}

/**
 * Konvertiert GoalBreakdown zu DailyFlowTargets.
 * Verbindet Adapter-System mit bestehendem Daily Flow.
 */
export function breakdownToDailyTargets(
  breakdown: GoalBreakdown,
  config: DailyFlowConfig = DEFAULT_DAILY_FLOW_CONFIG
): DailyFlowTargets {
  const { primary_units, secondary_units, timeframe_months } = breakdown;
  
  const weeks = timeframe_months * 4.33;
  const workingDaysPerWeek = config.working_days_per_week;
  
  // Pro Woche benötigte Kunden/Partner
  const customersPerWeek = primary_units / weeks;
  const partnersPerWeek = secondary_units / weeks;
  
  // Kontakte basierend auf Conversion Rate
  const contactsForCustomers = config.contact_to_customer_rate > 0
    ? customersPerWeek / config.contact_to_customer_rate
    : 0;
  const contactsForPartners = config.contact_to_partner_rate > 0
    ? partnersPerWeek / config.contact_to_partner_rate
    : 0;
  
  const totalContactsPerWeek = contactsForCustomers + contactsForPartners;
  
  // Follow-ups pro Woche
  const followupsPerWeek = 
    customersPerWeek * config.followups_per_customer +
    partnersPerWeek * config.followups_per_partner;
  
  // Reaktivierungen
  const reactivationsPerWeek = totalContactsPerWeek * config.reactivation_share;
  
  // Tageswerte
  const contactsPerDay = totalContactsPerWeek / workingDaysPerWeek;
  const followupsPerDay = followupsPerWeek / workingDaysPerWeek;
  const reactivationsPerDay = reactivationsPerWeek / workingDaysPerWeek;
  
  return {
    weekly: {
      new_customers: round(customersPerWeek, 1),
      new_partners: round(partnersPerWeek, 1),
      new_contacts: round(totalContactsPerWeek, 0),
      followups: round(followupsPerWeek, 0),
      reactivations: round(reactivationsPerWeek, 0),
    },
    daily: {
      new_contacts: round(contactsPerDay, 0),
      followups: round(followupsPerDay, 0),
      reactivations: round(reactivationsPerDay, 0),
    },
  };
}

/**
 * Formatiert GoalBreakdown als lesbare Zusammenfassung.
 */
export function formatBreakdownSummary(
  breakdown: GoalBreakdown,
  companyName?: string
): string {
  const { goal_kind, primary_units, secondary_units, required_volume, vertical_details } = breakdown;
  
  const rankName = vertical_details?.target_rank_name as string | undefined;
  const company = companyName ?? (vertical_details?.plan_id as string) ?? 'Deine Firma';
  
  let header: string;
  switch (goal_kind) {
    case 'income':
      header = `🎯 Um ${vertical_details?.target_income?.toLocaleString('de-DE') ?? '?'}€/Monat zu erreichen`;
      break;
    case 'rank':
      header = `🏆 Um ${rankName ?? 'deinen Ziel-Rang'} zu erreichen`;
      break;
    case 'volume':
      header = `📊 Um ${required_volume.toLocaleString('de-DE')} Volumen zu erreichen`;
      break;
    default:
      header = '🎯 Um dein Ziel zu erreichen';
  }
  
  return `
${header}${rankName ? ` (${rankName})` : ''} bei ${company}:

📊 Benötigtes Volumen: ${required_volume.toLocaleString('de-DE')}

👥 Das bedeutet ca.:
• ${Math.round(primary_units)} neue Kunden
• ${Math.round(secondary_units)} aktive Partner

📅 Pro Monat: ${breakdown.per_month_volume.toLocaleString('de-DE')}
📅 Pro Woche: ${breakdown.per_week_volume.toLocaleString('de-DE')}
📅 Pro Tag: ${breakdown.per_day_volume.toLocaleString('de-DE')}

${breakdown.notes ?? ''}
  `.trim();
}

// ============================================
// EXPORTS
// ============================================

export {
  DEFAULT_DAILY_FLOW_CONFIG,
};

// Re-export Adapter Types for convenience
export type { GoalInput, GoalBreakdown, GoalKind, AdapterCalculationResult };

// Default export for convenience
export default {
  // Original functions
  calculateGoal,
  findRankByIncome,
  findRankById,
  findNextRank,
  calculateProgress,
  calculateTimeRemaining,
  formatTargetSummary,
  formatForDailyFlow,
  validateGoalInput,
  calculateWorkingDays,
  // New Adapter functions
  calculateGoalWithAdapter,
  getGoalBreakdown,
  breakdownToDailyTargets,
  formatBreakdownSummary,
};

