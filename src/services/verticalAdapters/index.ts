/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL ADAPTERS                                        ║
 * ║  Branchen-spezifische Goal-Berechnungslogik                               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Unterstützte Verticals:
 *   → Network Marketing / MLM
 *   → (geplant) Real Estate
 *   → (geplant) Coaching
 *   → (geplant) Finance
 *   → (geplant) Insurance
 *   → (geplant) Solar
 * 
 * Sync mit Python:
 *   → backend/app/verticals/__init__.py
 */

import type { VerticalId } from '../../domain/goals/types';
import { NetworkMarketingAdapter, networkMarketingAdapter } from './networkMarketing';

// Adapter Interface Type
interface IVerticalAdapter {
  readonly verticalId: VerticalId;
  getLabel(): string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const VERTICAL_ADAPTERS: Record<string, IVerticalAdapter> = {
  network_marketing: networkMarketingAdapter,
  // Weitere Adapter hier registrieren:
  // real_estate: realEstateAdapter,
  // coaching: coachingAdapter,
  // etc.
};

/**
 * Gibt den Adapter für ein Vertical zurück.
 * 
 * @param verticalId - ID des Verticals (z.B. "network_marketing")
 * @returns Adapter oder undefined wenn nicht implementiert
 */
export function getAdapter(verticalId: string): IVerticalAdapter | undefined {
  return VERTICAL_ADAPTERS[verticalId];
}

/**
 * Listet alle verfügbaren Vertical-Adapter.
 */
export function listAvailableAdapters(): Array<{ id: string; label: string }> {
  return Object.values(VERTICAL_ADAPTERS).map(adapter => ({
    id: adapter.verticalId,
    label: adapter.getLabel(),
  }));
}

/**
 * Prüft ob ein Adapter für ein Vertical existiert.
 */
export function hasAdapter(verticalId: string): boolean {
  return verticalId in VERTICAL_ADAPTERS;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Base Class
export { BaseVerticalAdapter } from './baseAdapter';

// Adapter Classes
export { NetworkMarketingAdapter } from './networkMarketing';

// Singleton Instances
export { networkMarketingAdapter };

// Registry Functions
export { getAdapter, listAvailableAdapters, hasAdapter };

// Types (re-export from domain for convenience)
export type {
  GoalInput,
  GoalBreakdown,
  DailyFlowConfig,
  DailyFlowTargets,
  KpiDefinition,
  VerticalId,
  CompensationPlan,
  RankDefinition,
} from '../../domain/goals/types';
