/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL ADAPTER REGISTRY                                ║
 * ║  Zentrale Verwaltung aller Vertical Adapters                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { VerticalPlanAdapter } from './VerticalPlanAdapter';
import { VerticalId } from './types';

import { MLMAdapter } from './adapters/MLMAdapter';
import { RealEstateAdapter } from './adapters/RealEstateAdapter';
import { FinanceAdapter } from './adapters/FinanceAdapter';
import { CoachingAdapter } from './adapters/CoachingAdapter';

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registry für Vertical Adapters.
 * 
 * @example
 * ```typescript
 * const registry = new VerticalAdapterRegistry();
 * 
 * // Adapter holen
 * const adapter = registry.get('network_marketing');
 * 
 * // Alle verfügbaren Verticals
 * const verticals = registry.listVerticals();
 * ```
 */
export class VerticalAdapterRegistry {
  private adapters: Map<string, VerticalPlanAdapter>;
  
  constructor() {
    this.adapters = new Map();
    this.registerDefaults();
  }
  
  private registerDefaults(): void {
    this.register(new MLMAdapter());
    this.register(new RealEstateAdapter());
    this.register(new FinanceAdapter());
    this.register(new CoachingAdapter());
  }
  
  /**
   * Registriert einen neuen Adapter.
   */
  register(adapter: VerticalPlanAdapter): void {
    this.adapters.set(adapter.verticalId, adapter);
  }
  
  /**
   * Holt einen Adapter nach vertical_id.
   * 
   * @throws Error wenn kein Adapter für diese ID existiert
   */
  get(verticalId: VerticalId | string): VerticalPlanAdapter {
    const adapter = this.adapters.get(verticalId);
    
    if (!adapter) {
      throw new Error(
        `Kein Adapter für Vertical '${verticalId}' registriert. ` +
        `Verfügbar: ${Array.from(this.adapters.keys()).join(', ')}`
      );
    }
    
    return adapter;
  }
  
  /**
   * Holt einen Adapter, oder einen Default falls nicht gefunden.
   */
  getOrDefault(
    verticalId: VerticalId | string,
    defaultId: VerticalId = 'network_marketing'
  ): VerticalPlanAdapter {
    try {
      return this.get(verticalId);
    } catch {
      return this.get(defaultId);
    }
  }
  
  /**
   * Prüft ob ein Vertical registriert ist.
   */
  has(verticalId: VerticalId | string): boolean {
    return this.adapters.has(verticalId);
  }
  
  /**
   * Listet alle verfügbaren Verticals.
   */
  listVerticals(): Array<{ id: string; label: string }> {
    return Array.from(this.adapters.values()).map(adapter => ({
      id: adapter.verticalId,
      label: adapter.getLabel(),
    }));
  }
  
  /**
   * Gibt alle registrierten Adapters zurück.
   */
  allAdapters(): VerticalPlanAdapter[] {
    return Array.from(this.adapters.values());
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let _registry: VerticalAdapterRegistry | null = null;

/**
 * Holt die globale Registry-Instanz (Singleton).
 */
export function getRegistry(): VerticalAdapterRegistry {
  if (!_registry) {
    _registry = new VerticalAdapterRegistry();
  }
  return _registry;
}

/**
 * Convenience-Funktion: Holt einen Adapter direkt.
 */
export function getAdapter(verticalId: VerticalId | string): VerticalPlanAdapter {
  return getRegistry().get(verticalId);
}

/**
 * Convenience-Funktion: Holt einen Adapter mit Fallback.
 */
export function getAdapterOrDefault(
  verticalId: VerticalId | string,
  defaultId: VerticalId = 'network_marketing'
): VerticalPlanAdapter {
  return getRegistry().getOrDefault(verticalId, defaultId);
}

