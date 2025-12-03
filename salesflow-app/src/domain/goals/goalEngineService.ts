/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - GOAL ENGINE SERVICE                                      ║
 * ║  Vereinheitlichter Service für Goal-Berechnungen                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Dieser Service kombiniert:
 * - Vertical Adapter Pattern für Multi-Vertical Support
 * - Einfache API für Frontend-Integration
 * - Formatierung für Daily Flow Dashboard
 */

import {
  GoalInput,
  GoalBreakdown,
  DailyFlowConfig,
  DailyFlowTargets,
  KpiDefinition,
  VerticalId,
  GoalProgress,
  TimeRemaining,
  calculateGoalProgress,
  calculateTimeRemaining,
} from './types';

import { getAdapter, getAdapterOrDefault } from './registry';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Berechnet aus einem GoalInput das komplette Ergebnis.
 * 
 * @example
 * ```typescript
 * const result = calculateGoalComplete({
 *   vertical_id: 'network_marketing',
 *   goal_type: 'income',
 *   timeframe_months: 6,
 *   target_value: 2000,
 * });
 * 
 * console.log(result.daily_targets.new_contacts);
 * console.log(result.summary);
 * ```
 */
export function calculateGoalComplete(goalInput: GoalInput): GoalCalculationResult {
  const adapter = getAdapterOrDefault(goalInput.vertical_id);
  
  // Validierung
  const validationErrors = adapter.validateGoalInput(goalInput);
  if (validationErrors.length > 0) {
    throw new ValidationError(validationErrors);
  }
  
  // Berechnung
  const breakdown = adapter.computeGoalBreakdown(goalInput);
  const dailyTargets = adapter.computeDailyFlowTargets(breakdown);
  const summary = adapter.formatSummary(breakdown, dailyTargets);
  
  return {
    breakdown,
    daily_targets: dailyTargets,
    summary,
    kpis: adapter.getKpiDefinitions(),
    vertical_label: adapter.getLabel(),
  };
}

/**
 * Berechnet nur den Breakdown (ohne Daily Targets).
 */
export function calculateBreakdown(goalInput: GoalInput): GoalBreakdown {
  const adapter = getAdapterOrDefault(goalInput.vertical_id);
  return adapter.computeGoalBreakdown(goalInput);
}

/**
 * Berechnet nur die Daily Targets.
 */
export function calculateDailyTargets(
  goalInput: GoalInput,
  config?: DailyFlowConfig
): DailyFlowTargets {
  const adapter = getAdapterOrDefault(goalInput.vertical_id);
  const breakdown = adapter.computeGoalBreakdown(goalInput);
  return adapter.computeDailyFlowTargets(breakdown, config);
}

/**
 * Holt die KPIs für ein Vertical.
 */
export function getKpisForVertical(verticalId: VerticalId | string): KpiDefinition[] {
  const adapter = getAdapterOrDefault(verticalId);
  return adapter.getKpiDefinitions();
}

/**
 * Holt die Default-Konversionsconfig für ein Vertical.
 */
export function getDefaultConfig(verticalId: VerticalId | string): DailyFlowConfig {
  const adapter = getAdapterOrDefault(verticalId);
  return adapter.getDefaultConversionConfig();
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS & TIME TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Berechnet den Fortschritt zum Ziel.
 */
export function getProgress(current: number, target: number): GoalProgress {
  return calculateGoalProgress(current, target);
}

/**
 * Berechnet die verbleibende Zeit.
 */
export function getTimeRemaining(endDate: Date | string): TimeRemaining {
  return calculateTimeRemaining(endDate);
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTING FOR DAILY FLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatiert das Ergebnis für die Daily Flow Integration.
 */
export function formatForDailyFlow(result: GoalCalculationResult): DailyFlowDisplay {
  const { daily_targets, breakdown } = result;
  
  return {
    daily_contacts: daily_targets.new_contacts,
    daily_followups: daily_targets.followups,
    daily_reactivations: daily_targets.reactivations,
    weekly_summary: `${daily_targets.weekly_contacts} Kontakte · ${daily_targets.weekly_followups} Follow-ups`,
    goal_summary: `${breakdown.primary_units.toFixed(0)} ${breakdown.primary_unit_label} in ${breakdown.timeframe_months} Monaten`,
    appointments_per_week: daily_targets.appointments,
  };
}

/**
 * Formatiert das Ergebnis für Chief AI Coaching.
 */
export function formatForChiefCoaching(result: GoalCalculationResult): string {
  const { breakdown, daily_targets } = result;
  
  const lines = [
    `🎯 **Dein ${breakdown.timeframe_months}-Monats-Ziel**`,
    '',
    `Du willst **${breakdown.primary_units.toFixed(0)} ${breakdown.primary_unit_label}** erreichen.`,
    '',
    `Das bedeutet:`,
    `• **${breakdown.primary_units_per_week.toFixed(1)}** pro Woche`,
    `• **${breakdown.primary_units_per_month.toFixed(1)}** pro Monat`,
    '',
    `📅 **Dein täglicher Fokus:**`,
    `• 👋 ${daily_targets.new_contacts} neue Kontakte`,
    `• 📞 ${daily_targets.followups} Follow-ups`,
    `• 🔄 ${daily_targets.reactivations} Reaktivierungen`,
  ];
  
  if (daily_targets.appointments) {
    lines.push(`• 📆 ${daily_targets.appointments} Termine/Woche`);
  }
  
  if (breakdown.target_income_monthly) {
    lines.push('');
    lines.push(`💰 **Ziel-Einkommen:** ${breakdown.target_income_monthly.toLocaleString('de-DE')} €/Monat`);
  }
  
  lines.push('');
  lines.push(`💡 _Bleib dran! Kleine tägliche Aktionen führen zu großen Ergebnissen._`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GoalCalculationResult {
  breakdown: GoalBreakdown;
  daily_targets: DailyFlowTargets;
  summary: string;
  kpis: KpiDefinition[];
  vertical_label: string;
}

export interface DailyFlowDisplay {
  daily_contacts: number;
  daily_followups: number;
  daily_reactivations: number;
  weekly_summary: string;
  goal_summary: string;
  appointments_per_week?: number;
}

export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Validierungsfehler: ${errors.join(', ')}`);
    this.name = 'ValidationError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS for convenience
// ═══════════════════════════════════════════════════════════════════════════

export { getAdapter, getAdapterOrDefault } from './registry';
export type { GoalInput, GoalBreakdown, DailyFlowTargets, DailyFlowConfig } from './types';

