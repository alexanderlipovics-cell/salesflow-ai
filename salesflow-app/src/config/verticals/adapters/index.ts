/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  VERTICAL ADAPTERS - Registry & Exports                                   ║
 * ║  Zentrale Stelle für alle Vertical Adapter                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { VerticalId } from '../types';
import { IVerticalAdapter, BaseVerticalAdapter } from './base.adapter';
import { NetworkMarketingAdapter, networkMarketingAdapter } from './network-marketing.adapter';
import {
  GoalInput,
  GoalBreakdown,
  GoalKind,
  VerticalDailyFlowConfig,
  AdapterKpiDefinition,
  AdapterCalculationContext,
  AdapterCalculationResult,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registry aller verfügbaren Vertical Adapter.
 * Neue Adapter hier hinzufügen.
 */
const ADAPTER_REGISTRY: Map<VerticalId, IVerticalAdapter> = new Map([
  ['network_marketing', networkMarketingAdapter],
  // Weitere Adapter können hier hinzugefügt werden:
  // ['real_estate', realEstateAdapter],
  // ['coaching', coachingAdapter],
  // ['finance', financeAdapter],
  // ['insurance', insuranceAdapter],
  // ['solar', solarAdapter],
]);

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt einen Adapter anhand der Vertical ID.
 */
export function getAdapterById(verticalId: VerticalId): IVerticalAdapter | undefined {
  return ADAPTER_REGISTRY.get(verticalId);
}

/**
 * Holt einen Adapter oder wirft einen Fehler.
 */
export function getAdapterByIdOrThrow(verticalId: VerticalId): IVerticalAdapter {
  const adapter = ADAPTER_REGISTRY.get(verticalId);
  if (!adapter) {
    throw new Error(`No adapter found for vertical: ${verticalId}`);
  }
  return adapter;
}

/**
 * Prüft ob ein Adapter für ein Vertical existiert.
 */
export function hasAdapter(verticalId: VerticalId): boolean {
  return ADAPTER_REGISTRY.has(verticalId);
}

/**
 * Holt alle registrierten Adapter.
 */
export function getAllAdapters(): IVerticalAdapter[] {
  return Array.from(ADAPTER_REGISTRY.values());
}

/**
 * Holt alle Vertical IDs mit registrierten Adaptern.
 */
export function getAdapterVerticalIds(): VerticalId[] {
  return Array.from(ADAPTER_REGISTRY.keys());
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Berechnet Goal Breakdown für ein Vertical.
 * Fällt auf generische Berechnung zurück wenn kein Adapter existiert.
 */
export function computeGoalBreakdownForVertical(
  verticalId: VerticalId,
  goalInput: GoalInput
): GoalBreakdown {
  const adapter = ADAPTER_REGISTRY.get(verticalId);
  
  if (adapter) {
    return adapter.computeGoalBreakdown(goalInput);
  }
  
  // Fallback: Generische Berechnung
  return computeGenericBreakdown(verticalId, goalInput);
}

/**
 * Holt die KPIs für ein Vertical.
 */
export function getKpisForVerticalAdapter(verticalId: VerticalId): AdapterKpiDefinition[] {
  const adapter = ADAPTER_REGISTRY.get(verticalId);
  return adapter?.getKpiDefinitions() ?? [];
}

/**
 * Holt die Daily Flow Config für ein Vertical.
 */
export function getDailyFlowConfigForVertical(verticalId: VerticalId): VerticalDailyFlowConfig {
  const adapter = ADAPTER_REGISTRY.get(verticalId);
  return adapter?.getDefaultConversionConfig() ?? {
    working_days_per_week: 5,
    contact_to_primary_unit: 0.20,
    contact_to_secondary_unit: 0.05,
    followups_per_primary: 3,
    followups_per_secondary: 5,
    reactivation_share: 0.20,
  };
}

/**
 * Vollständige Berechnung mit Kontext.
 */
export function calculateWithAdapter(
  verticalId: VerticalId,
  context: AdapterCalculationContext
): AdapterCalculationResult {
  const adapter = ADAPTER_REGISTRY.get(verticalId);
  
  if (adapter) {
    return adapter.calculate(context);
  }
  
  // Fallback
  const breakdown = computeGenericBreakdown(verticalId, context.goal_input);
  return {
    breakdown,
    daily_flow_config: getDailyFlowConfigForVertical(verticalId),
    kpis: [],
    warnings: ['Kein spezifischer Adapter für dieses Vertical. Generische Berechnung verwendet.'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generische Breakdown-Berechnung für Verticals ohne spezifischen Adapter.
 */
function computeGenericBreakdown(
  verticalId: VerticalId,
  goalInput: GoalInput
): GoalBreakdown {
  const target = goalInput.target_value;
  const months = goalInput.timeframe_months;
  
  // Generische Annahmen
  let requiredVolume: number;
  
  switch (goalInput.goal_kind) {
    case 'income':
      requiredVolume = target * months; // 1:1 Umsatz zu Einkommen
      break;
    case 'deals':
    case 'clients':
      requiredVolume = target * 1000; // 1.000€ pro Deal/Client
      break;
    default:
      requiredVolume = target;
  }
  
  const estPrimaryUnits = requiredVolume / 500; // 500€ pro Primary Unit
  const estSecondaryUnits = estPrimaryUnits / 10; // 10:1 Ratio
  
  const perMonth = requiredVolume / months;
  const perWeek = perMonth / 4;
  const perDay = perMonth / 30;
  
  return {
    vertical_id: verticalId,
    goal_kind: goalInput.goal_kind,
    timeframe_months: months,
    primary_units: Math.round(estPrimaryUnits),
    secondary_units: Math.round(estSecondaryUnits),
    required_volume: requiredVolume,
    per_month_volume: Math.round(perMonth * 100) / 100,
    per_week_volume: Math.round(perWeek * 100) / 100,
    per_day_volume: Math.round(perDay * 100) / 100,
    vertical_details: { generic: true },
    notes: 'Generische Berechnung – spezifischer Adapter empfohlen.',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Types
export type {
  GoalInput,
  GoalBreakdown,
  GoalKind,
  VerticalDailyFlowConfig,
  AdapterKpiDefinition,
  AdapterCalculationContext,
  AdapterCalculationResult,
} from './types';

export {
  GoalKindSchema,
  GoalInputSchema,
  GoalBreakdownSchema,
  VerticalDailyFlowConfigSchema,
  AdapterKpiDefinitionSchema,
  DEFAULT_VERTICAL_DAILY_FLOW_CONFIG,
  toCompPlanReference,
} from './types';

// Base
export { IVerticalAdapter, BaseVerticalAdapter } from './base.adapter';

// Adapters
export { NetworkMarketingAdapter, networkMarketingAdapter } from './network-marketing.adapter';

// ═══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════
/*
import { 
  getAdapterById, 
  computeGoalBreakdownForVertical,
  calculateWithAdapter 
} from '@/config/verticals/adapters';

// 1. Direkt mit Adapter
const adapter = getAdapterById('network_marketing');
const breakdown = adapter?.computeGoalBreakdown({
  goal_kind: 'income',
  target_value: 2000,
  timeframe_months: 6,
  vertical_meta: { comp_plan_id: 'zinzino' }
});

// 2. Mit Convenience Function
const breakdown2 = computeGoalBreakdownForVertical('network_marketing', {
  goal_kind: 'rank',
  target_value: 3, // Rang-Index
  timeframe_months: 12,
  vertical_meta: { comp_plan_id: 'pm-international' }
});

// 3. Vollständige Berechnung mit Kontext
const result = calculateWithAdapter('network_marketing', {
  goal_input: { goal_kind: 'income', target_value: 3000, timeframe_months: 6 },
  compensation_plan: myPlan, // Optional
});
console.log(result.breakdown, result.daily_flow_config, result.kpis);
*/

