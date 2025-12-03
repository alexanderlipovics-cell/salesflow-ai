/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL PLAN ADAPTER                                    ║
 * ║  TypeScript Interface für Multi-Vertical Goal Engine                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Das Herz der Erweiterbarkeit - jedes Vertical implementiert dieses Interface.
 */

import {
  GoalInput,
  GoalBreakdown,
  DailyFlowConfig,
  DailyFlowTargets,
  KpiDefinition,
  VerticalId,
  DEFAULT_DAILY_FLOW_CONFIG,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interface für Vertical-spezifische Logik.
 * 
 * Jedes Vertical muss implementieren:
 * 1. computeGoalBreakdown: Ziel → konkrete Zahlen
 * 2. getDefaultConversionConfig: Standard-Konversionsannahmen
 * 3. getKpiDefinitions: Welche KPIs zeigt das Dashboard
 */
export interface VerticalPlanAdapter {
  readonly verticalId: VerticalId;
  
  /** Human-readable Name des Verticals */
  getLabel(): string;
  
  /** Rechnet aus einem GoalInput einen konkreten GoalBreakdown */
  computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown;
  
  /** Liefert Default-Konversionsannahmen für dieses Vertical */
  getDefaultConversionConfig(): DailyFlowConfig;
  
  /** Beschreibt, welche KPIs dieses Vertical primär kennt */
  getKpiDefinitions(): KpiDefinition[];
  
  /** Berechnet aus GoalBreakdown die täglichen Targets */
  computeDailyFlowTargets(
    goalBreakdown: GoalBreakdown,
    config?: DailyFlowConfig
  ): DailyFlowTargets;
}

// ═══════════════════════════════════════════════════════════════════════════
// BASE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Abstrakte Basisklasse für Vertical Adapters.
 * 
 * Bietet gemeinsame Funktionalität wie computeDailyFlowTargets.
 */
export abstract class BaseVerticalAdapter implements VerticalPlanAdapter {
  abstract readonly verticalId: VerticalId;
  
  abstract getLabel(): string;
  abstract computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown;
  abstract getDefaultConversionConfig(): DailyFlowConfig;
  abstract getKpiDefinitions(): KpiDefinition[];
  
  /**
   * Berechnet aus GoalBreakdown die täglichen Targets.
   * 
   * Standard-Algorithmus:
   * 1. primaryUnits / Tage = Units pro Tag
   * 2. Units pro Tag / Konversionsrate = Kontakte pro Tag
   * 3. Kontakte * Follow-up-Faktor = Follow-ups pro Tag
   */
  computeDailyFlowTargets(
    goalBreakdown: GoalBreakdown,
    config?: DailyFlowConfig
  ): DailyFlowTargets {
    const cfg = config ?? this.getDefaultConversionConfig();
    
    // Basis-Berechnungen
    const workingDays = cfg.workingDaysPerWeek;
    const weeksPerMonth = 4.33;
    const daysPerMonth = workingDays * weeksPerMonth;
    
    // Primary units pro Tag
    const totalDays = goalBreakdown.timeframeMonths * daysPerMonth;
    const primaryPerDay = goalBreakdown.primaryUnits / totalDays;
    
    // Kontakte nötig (basierend auf Konversionsrate)
    const contactsPerDay = cfg.contactToPrimaryUnit > 0
      ? primaryPerDay / cfg.contactToPrimaryUnit
      : primaryPerDay * 5; // Fallback
    
    // Follow-ups
    const followupsPerDay = primaryPerDay * cfg.followupsPerPrimary;
    
    // Reaktivierungen
    const totalDaily = contactsPerDay + followupsPerDay;
    const reactivationsPerDay = totalDaily * cfg.reactivationShare;
    
    return {
      userId: '',
      companyId: '',
      verticalId: goalBreakdown.verticalId,
      newContacts: Math.max(1, Math.round(contactsPerDay)),
      followups: Math.max(1, Math.round(followupsPerDay)),
      reactivations: Math.max(0, Math.round(reactivationsPerDay)),
    };
  }
  
  /**
   * Validiert einen GoalInput.
   */
  validateGoalInput(goalInput: GoalInput): string[] {
    const errors: string[] = [];
    
    if (goalInput.timeframeMonths < 1) {
      errors.push('Zeitraum muss mindestens 1 Monat sein');
    }
    
    if (goalInput.timeframeMonths > 60) {
      errors.push('Zeitraum darf maximal 60 Monate sein');
    }
    
    if (goalInput.targetValue !== undefined && goalInput.targetValue <= 0) {
      errors.push('Zielwert muss positiv sein');
    }
    
    return errors;
  }
  
  /**
   * Formatiert eine lesbare Zusammenfassung.
   */
  formatSummary(breakdown: GoalBreakdown, targets: DailyFlowTargets): string {
    const perMonth = breakdown.primaryUnits / breakdown.timeframeMonths;
    const perWeek = perMonth / 4.33;
    
    const lines = [
      `🎯 Dein ${breakdown.timeframeMonths}-Monats-Plan:`,
      '',
      `📊 Ziel: ${breakdown.primaryUnits.toFixed(0)} Einheiten`,
      `   └─ ${perMonth.toFixed(1)} pro Monat`,
      `   └─ ${perWeek.toFixed(1)} pro Woche`,
      '',
      '📅 Tägliche Aktivitäten:',
      `   • ${targets.newContacts} neue Kontakte`,
      `   • ${targets.followups} Follow-ups`,
      `   • ${targets.reactivations} Reaktivierungen`,
    ];
    
    return lines.join('\n');
  }
}
