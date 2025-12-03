/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  BASE VERTICAL ADAPTER                                                    ║
 * ║  Abstrakte Basisklasse für alle Vertical-spezifischen Adapter             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { VerticalId } from '../types';
import {
  GoalInput,
  GoalBreakdown,
  GoalKind,
  VerticalDailyFlowConfig,
  AdapterKpiDefinition,
  AdapterCalculationContext,
  AdapterCalculationResult,
  DEFAULT_VERTICAL_DAILY_FLOW_CONFIG,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// BASE VERTICAL ADAPTER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interface für alle Vertical Adapter.
 * Jeder Adapter implementiert vertikalspezifische Logik für:
 * - Goal Breakdown (Ziel → Aktivitäten)
 * - KPI Definitionen
 * - Daily Flow Konfiguration
 */
export interface IVerticalAdapter {
  /** Unique Vertical ID */
  readonly verticalId: VerticalId;
  
  /** Display Label */
  getLabel(): string;
  
  /** Berechnet Goal Breakdown aus Input */
  computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown;
  
  /** Standard Daily Flow Konfiguration */
  getDefaultConversionConfig(): VerticalDailyFlowConfig;
  
  /** KPI Definitionen für Dashboard */
  getKpiDefinitions(): AdapterKpiDefinition[];
  
  /** Vollständige Berechnung mit Kontext */
  calculate(context: AdapterCalculationContext): AdapterCalculationResult;
}

// ═══════════════════════════════════════════════════════════════════════════
// BASE VERTICAL ADAPTER (Abstract Class)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Abstrakte Basisklasse mit gemeinsamer Logik.
 * Konkrete Adapter (NetworkMarketing, RealEstate, etc.) erben davon.
 */
export abstract class BaseVerticalAdapter implements IVerticalAdapter {
  abstract readonly verticalId: VerticalId;
  
  abstract getLabel(): string;
  
  abstract computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown;
  
  abstract getKpiDefinitions(): AdapterKpiDefinition[];
  
  /**
   * Standard-Konversionskonfiguration.
   * Kann von konkreten Adaptern überschrieben werden.
   */
  getDefaultConversionConfig(): VerticalDailyFlowConfig {
    return { ...DEFAULT_VERTICAL_DAILY_FLOW_CONFIG };
  }
  
  /**
   * Vollständige Berechnung mit Kontext.
   * Kombiniert Breakdown, Config und KPIs.
   */
  calculate(context: AdapterCalculationContext): AdapterCalculationResult {
    const breakdown = this.computeGoalBreakdown(context.goal_input);
    const daily_flow_config = this.getDefaultConversionConfig();
    const kpis = this.getKpiDefinitions();
    
    return {
      breakdown,
      daily_flow_config,
      kpis,
      warnings: this.getWarnings(context),
    };
  }
  
  /**
   * Generiert Warnungen basierend auf Kontext.
   * Überschreibbar für spezifische Warnlogik.
   */
  protected getWarnings(context: AdapterCalculationContext): string[] {
    const warnings: string[] = [];
    
    // Warnung bei fehlendem Compensation Plan für MLM
    if (this.requiresCompensationPlan() && !context.compensation_plan) {
      warnings.push('Kein Compensation Plan ausgewählt. Berechnung basiert auf Heuristiken.');
    }
    
    // Warnung bei sehr kurzem Zeitraum
    if (context.goal_input.timeframe_months < 3) {
      warnings.push('Kurzer Zeitraum gewählt. Ziele können unrealistisch sein.');
    }
    
    return warnings;
  }
  
  /**
   * Gibt an, ob dieser Adapter einen Compensation Plan benötigt.
   * Standard: false. MLM-Adapter überschreibt auf true.
   */
  protected requiresCompensationPlan(): boolean {
    return false;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Berechnet zeitliche Aufteilung.
   */
  protected calculateTimeBreakdown(
    totalVolume: number,
    months: number,
    workingDaysPerWeek: number = 5
  ): { perMonth: number; perWeek: number; perDay: number } {
    const perMonth = totalVolume / months;
    const perWeek = perMonth / 4;
    const perDay = perMonth / 30;
    
    return {
      perMonth: this.round(perMonth, 2),
      perWeek: this.round(perWeek, 2),
      perDay: this.round(perDay, 2),
    };
  }
  
  /**
   * Rundet eine Zahl auf die angegebene Anzahl Dezimalstellen.
   */
  protected round(value: number, decimals: number = 1): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
  
  /**
   * Erstellt ein leeres GoalBreakdown-Objekt.
   */
  protected createEmptyBreakdown(
    goalKind: GoalKind,
    months: number
  ): GoalBreakdown {
    return {
      vertical_id: this.verticalId,
      goal_kind: goalKind,
      timeframe_months: months,
      primary_units: 0,
      secondary_units: 0,
      required_volume: 0,
      per_month_volume: 0,
      per_week_volume: 0,
      per_day_volume: 0,
      vertical_details: {},
      notes: '',
    };
  }
}

