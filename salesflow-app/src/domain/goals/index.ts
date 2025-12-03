/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - GOAL ENGINE DOMAIN                                       ║
 * ║  Multi-Vertical Goal Planning & Daily Flow Integration                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Dieses Modul enthält die gesamte Goal-Engine Logik:
 * 
 * 📦 Types (types.ts)
 *    - GoalInput, GoalBreakdown, DailyFlowConfig, DailyFlowTargets
 *    - KpiDefinition, VerticalId, GoalKind
 *    - CompensationPlan, RankDefinition
 * 
 * 🔌 Vertical Adapter (VerticalPlanAdapter.ts)
 *    - VerticalPlanAdapter Interface
 *    - BaseVerticalAdapter Abstract Class
 * 
 * 🏭 Concrete Adapters (adapters/)
 *    - MLMAdapter: Network Marketing
 *    - RealEstateAdapter: Immobilien
 *    - FinanceAdapter: Finanzvertrieb
 *    - CoachingAdapter: Coaching & Beratung
 * 
 * 📋 Registry (registry.ts)
 *    - VerticalAdapterRegistry
 *    - getAdapter() Convenience-Funktion
 * 
 * @example
 * ```typescript
 * import { getAdapter, GoalInput } from '@/domain/goals';
 * 
 * // Adapter für MLM holen
 * const adapter = getAdapter('network_marketing');
 * 
 * // Goal berechnen
 * const goalInput: GoalInput = {
 *   verticalId: 'network_marketing',
 *   goalKind: 'income',
 *   targetValue: 2000, // €/Monat
 *   timeframeMonths: 6,
 * };
 * 
 * const breakdown = adapter.computeGoalBreakdown(goalInput);
 * const targets = adapter.computeDailyFlowTargets(breakdown);
 * 
 * console.log(`Tägliche Kontakte: ${targets.newContacts}`);
 * console.log(`Tägliche Follow-ups: ${targets.followups}`);
 * ```
 */

// Types
export type {
  VerticalId,
  GoalKind,
  GoalInput,
  GoalBreakdown,
  DailyFlowConfig,
  DailyFlowTargets,
  KpiDefinition,
  ProgressItem,
  DailyFlowStatus,
  VerticalInfo,
  RankDefinition,
  CompensationPlan,
  CompensationPlanOption,
} from './types';

export {
  DEFAULT_DAILY_FLOW_CONFIG,
  calculateGoalProgress,
  calculateTimeRemaining,
} from './types';

// Adapter Interface
export {
  VerticalPlanAdapter,
  BaseVerticalAdapter,
} from './VerticalPlanAdapter';

// Concrete Adapters
export {
  MLMAdapter,
  RealEstateAdapter,
  FinanceAdapter,
  CoachingAdapter,
} from './adapters';

// Registry
export {
  VerticalAdapterRegistry,
  getRegistry,
  getAdapter,
  getAdapterOrDefault,
} from './registry';
