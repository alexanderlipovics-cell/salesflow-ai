/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  VERTICAL CONTEXT                                                           ║
 * ║  Zentrale Konfiguration für Verticals und Module                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

export type VerticalId = 
  | 'network_marketing' 
  | 'field_sales' 
  | 'real_estate' 
  | 'finance' 
  | 'coaching' 
  | 'general';

export type ModuleId = 
  | 'mentor' 
  | 'dmo_tracker' 
  | 'phoenix' 
  | 'delay_master' 
  | 'ghostbuster' 
  | 'team_dashboard' 
  | 'scripts' 
  | 'cockpit' 
  | 'route_planner' 
  | 'industry_radar' 
  | 'contacts';

export interface VerticalConfig {
  id: VerticalId;
  name: string;
  icon: string;
  color: string;
  modules: ModuleId[];
  aiName: string;
  description: string;
}

export const VERTICALS: Record<VerticalId, VerticalConfig> = {
  network_marketing: {
    id: 'network_marketing',
    name: 'Network Marketing',
    icon: '👥',
    color: '#10B981',
    modules: ['mentor', 'dmo_tracker', 'team_dashboard', 'scripts', 'contacts'],
    aiName: 'MENTOR',
    description: 'Persönlicher Network Marketing Coach mit DMO Tracker, Team Dashboard und 52 fertigen Scripts',
  },
  
  field_sales: {
    id: 'field_sales',
    name: 'Außendienst B2B',
    icon: '💼',
    color: '#3B82F6',
    modules: ['mentor', 'cockpit', 'phoenix', 'delay_master', 'route_planner', 'industry_radar', 'contacts'],
    aiName: 'CHIEF',
    description: 'Außendienst-Coach mit Phoenix (Lead Wiederbelebung), DelayMaster (Timing) und Industry Radar',
  },
  
  real_estate: {
    id: 'real_estate',
    name: 'Immobilien',
    icon: '🏠',
    color: '#F59E0B',
    modules: ['mentor', 'contacts'],
    aiName: 'CHIEF',
    description: 'Immobilien-Coach für Makler und Verkäufer',
  },
  
  finance: {
    id: 'finance',
    name: 'Finanzvertrieb',
    icon: '💰',
    color: '#8B5CF6',
    modules: ['mentor', 'contacts'],
    aiName: 'CHIEF',
    description: 'Finanzvertrieb-Coach für Versicherungen und Finanzprodukte',
  },
  
  coaching: {
    id: 'coaching',
    name: 'Coaching',
    icon: '📈',
    color: '#EC4899',
    modules: ['mentor', 'contacts'],
    aiName: 'CHIEF',
    description: 'Coaching-Coach für High-Ticket Sales und Beratung',
  },
  
  general: {
    id: 'general',
    name: 'Allgemein',
    icon: '⭐',
    color: '#6B7280',
    modules: ['mentor', 'contacts'],
    aiName: 'CHIEF',
    description: 'Allgemeiner Sales-Coach für alle Vertriebsarten',
  },
};

/**
 * Holt die Konfiguration für ein Vertical
 */
export function getVerticalConfig(verticalId: VerticalId): VerticalConfig {
  return VERTICALS[verticalId] || VERTICALS.general;
}

/**
 * Prüft ob ein Modul für ein Vertical verfügbar ist
 */
export function isModuleAvailable(verticalId: VerticalId, moduleId: ModuleId): boolean {
  const config = getVerticalConfig(verticalId);
  return config.modules.includes(moduleId);
}

/**
 * Gibt alle verfügbaren Module für ein Vertical zurück
 */
export function getAvailableModules(verticalId: VerticalId): ModuleId[] {
  const config = getVerticalConfig(verticalId);
  return config.modules;
}

/**
 * Gibt den AI-Namen für ein Vertical zurück
 */
export function getAIName(verticalId: VerticalId): string {
  const config = getVerticalConfig(verticalId);
  return config.aiName;
}

/**
 * Liste aller Verticals (für Dropdowns, etc.)
 */
export const VERTICAL_LIST: VerticalConfig[] = Object.values(VERTICALS);

/**
 * Default Vertical
 */
export const DEFAULT_VERTICAL: VerticalId = 'network_marketing';

