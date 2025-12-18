/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - BASE VERTICAL ADAPTER                                    ║
 * ║  Abstrakte Basisklasse für Branchen-Adapter                               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Sync mit Python:
 *   → backend/app/domain/goals/vertical_adapter.py
 */

import type {
  GoalInput,
  GoalBreakdown,
  DailyFlowConfig,
  DailyFlowTargets,
  KpiDefinition,
  VerticalId,
} from '../../domain/goals/types';
import { DEFAULT_DAILY_FLOW_CONFIG } from '../../domain/goals/types';

// Re-export for convenience
export { DEFAULT_DAILY_FLOW_CONFIG };

/**
 * Abstrakte Basisklasse für Vertical-Adapter.
 * 
 * Jeder Adapter muss folgende Methoden implementieren:
 * - verticalId: Eindeutige ID der Branche
 * - getLabel(): Anzeigename
 * - computeGoalBreakdown(): Ziel → Breakdown
 * - getDefaultConversionConfig(): Standard-Conversion-Rates
 * - getKpiDefinitions(): KPIs für Dashboard
 */
export abstract class BaseVerticalAdapter {
  
  /** Eindeutige ID der Branche (z.B. 'network_marketing'). */
  abstract readonly verticalId: VerticalId;
  
  /** Anzeigename der Branche (z.B. 'Network Marketing / MLM'). */
  abstract getLabel(): string;
  
  /**
   * Berechnet aus einem Ziel den vollständigen Breakdown.
   * 
   * @param goalInput - Ziel-Definition (Art, Wert, Zeitraum, etc.)
   * @returns GoalBreakdown mit allen berechneten Werten
   */
  abstract computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown;
  
  /**
   * Standard-Conversion-Rates für diese Branche.
   */
  abstract getDefaultConversionConfig(): DailyFlowConfig;
  
  /**
   * KPI-Definitionen für das Dashboard.
   */
  abstract getKpiDefinitions(): KpiDefinition[];
  
  // ═══════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Berechnet tägliche Aktivitäts-Targets aus dem Breakdown.
   */
  computeDailyFlowTargets(
    breakdown: GoalBreakdown,
    config: DailyFlowConfig = DEFAULT_DAILY_FLOW_CONFIG
  ): DailyFlowTargets {
    const weeks = breakdown.timeframeMonths * 4.33;
    const workingDays = weeks * config.workingDaysPerWeek;
    
    // Kontakte basierend auf Conversion Rate
    const contactsNeeded = breakdown.primaryUnits / config.contactToPrimaryUnit;
    const contactsPerDay = contactsNeeded / workingDays;
    
    // Follow-ups
    const secondaryUnits = breakdown.secondaryUnits ?? 0;
    const followupsPerSecondary = config.followupsPerSecondary ?? 5;
    const totalFollowups = (
      breakdown.primaryUnits * config.followupsPerPrimary +
      secondaryUnits * followupsPerSecondary
    );
    const followupsPerDay = totalFollowups / workingDays;
    
    // Reaktivierungen
    const reactivationsPerDay = contactsPerDay * config.reactivationShare;
    
    return {
      userId: '',
      companyId: '',
      verticalId: breakdown.verticalId,
      newContacts: Math.round(contactsPerDay),
      followups: Math.round(followupsPerDay),
      reactivations: Math.round(reactivationsPerDay),
    };
  }
  
  /**
   * Formatiert den Breakdown als lesbaren Text.
   */
  formatBreakdownSummary(breakdown: GoalBreakdown): string {
    const requiredVolume = breakdown.requiredVolume ?? 0;
    const secondaryUnits = breakdown.secondaryUnits ?? 0;
    
    return `
🎯 Ziel-Breakdown (${this.getLabel()})

📊 Benötigtes Volumen: ${requiredVolume.toLocaleString('de-DE')}
   • Pro Monat: ${breakdown.perMonthVolume.toLocaleString('de-DE')}
   • Pro Woche: ${breakdown.perWeekVolume.toLocaleString('de-DE')}
   • Pro Tag: ${breakdown.perDayVolume.toLocaleString('de-DE')}

👥 Geschätzte Einheiten:
   • Primär (Kunden): ${Math.round(breakdown.primaryUnits)}
   • Sekundär (Partner): ${Math.round(secondaryUnits)}

📝 ${breakdown.notes ?? ''}
    `.trim();
  }
  
  /**
   * Hilfsfunktion: Rundet auf n Dezimalstellen.
   */
  protected round(value: number, decimals: number = 1): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}
