/**
 * COMPENSATION PLANS - Registry & Exports
 * 
 * Zentrale Stelle für alle verfügbaren Compensation Plans.
 * Neue Firmen können hier einfach hinzugefügt werden.
 */

import { CompensationPlan } from '../../types/compensation';
import { ZINZINO_DE_PLAN } from './zinzino.plan';
import { PM_INTERNATIONAL_DE_PLAN } from './pm-international.plan';
import { LR_HEALTH_DE_PLAN } from './lr-health.plan';

// ============================================
// PLAN REGISTRY
// ============================================

/**
 * Alle verfügbaren Compensation Plans
 */
export const COMPENSATION_PLANS: CompensationPlan[] = [
  ZINZINO_DE_PLAN,
  PM_INTERNATIONAL_DE_PLAN,
  LR_HEALTH_DE_PLAN,
];

/**
 * Plan Registry als Map für schnellen Zugriff
 */
export const PLAN_REGISTRY: Map<string, CompensationPlan> = new Map(
  COMPENSATION_PLANS.map(plan => [`${plan.company_id}_${plan.region}`, plan])
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Holt einen Plan anhand der Firma-ID und Region
 */
export function getPlanById(
  companyId: string, 
  region: string = 'DE'
): CompensationPlan | undefined {
  return COMPENSATION_PLANS.find(
    p => p.company_id === companyId && p.region === region
  );
}

/**
 * Holt alle verfügbaren Plans
 */
export function getAllPlans(): CompensationPlan[] {
  return COMPENSATION_PLANS;
}

/**
 * Holt alle Plans für eine bestimmte Region
 */
export function getPlansByRegion(region: string): CompensationPlan[] {
  return COMPENSATION_PLANS.filter(p => p.region === region);
}

/**
 * Holt die Liste aller verfügbaren Firmen
 */
export function getAvailableCompanies(): Array<{ 
  id: string; 
  name: string; 
  logo: string;
  region: string;
}> {
  return COMPENSATION_PLANS.map(p => ({
    id: p.company_id,
    name: p.company_name,
    logo: p.company_logo ?? '🏢',
    region: p.region,
  }));
}

/**
 * Holt die Liste aller verfügbaren Firmen für eine Region
 */
export function getAvailableCompaniesByRegion(region: string): Array<{ 
  id: string; 
  name: string; 
  logo: string;
}> {
  return COMPENSATION_PLANS
    .filter(p => p.region === region)
    .map(p => ({
      id: p.company_id,
      name: p.company_name,
      logo: p.company_logo ?? '🏢',
    }));
}

/**
 * Prüft ob eine Firma verfügbar ist
 */
export function isCompanyAvailable(companyId: string, region: string = 'DE'): boolean {
  return COMPENSATION_PLANS.some(
    p => p.company_id === companyId && p.region === region
  );
}

/**
 * Flexible Plan-Lookup (sync mit Python backend)
 * Akzeptiert verschiedene ID-Formate: 'zinzino', 'zinzino_de', 'pm', 'pm_international', etc.
 */
export function getCompensationPlan(planId: string): CompensationPlan | undefined {
  const normalized = planId.toLowerCase().trim();
  
  // Alias Mapping für flexible IDs
  const aliasMap: Record<string, { company: string; region: string }> = {
    'zinzino': { company: 'zinzino', region: 'DE' },
    'zinzino_de': { company: 'zinzino', region: 'DE' },
    'pm': { company: 'pm_international', region: 'DE' },
    'pm_international': { company: 'pm_international', region: 'DE' },
    'pm_international_de': { company: 'pm_international', region: 'DE' },
    'lr': { company: 'lr_health', region: 'DE' },
    'lr_health': { company: 'lr_health', region: 'DE' },
    'lr_health_de': { company: 'lr_health', region: 'DE' },
  };
  
  const lookup = aliasMap[normalized];
  if (lookup) {
    return getPlanById(lookup.company, lookup.region);
  }
  
  // Fallback: direkte Suche
  return COMPENSATION_PLANS.find(p => 
    p.company_id === normalized || 
    `${p.company_id}_${p.region}`.toLowerCase() === normalized
  );
}

/**
 * Holt alle Ränge für eine Firma
 */
export function getRanksForCompany(companyId: string, region: string = 'DE') {
  const plan = getPlanById(companyId, region);
  return plan?.ranks ?? [];
}

/**
 * Findet den passenden Rang für ein Ziel-Einkommen
 */
export function findRankForIncome(
  companyId: string, 
  targetIncome: number,
  region: string = 'DE'
) {
  const plan = getPlanById(companyId, region);
  if (!plan) return undefined;
  
  const sortedRanks = [...plan.ranks].sort((a, b) => a.order - b.order);
  
  // Finde den ersten Rang, der das Ziel-Einkommen erreicht oder überschreitet
  return sortedRanks.find(
    r => r.earning_estimate && r.earning_estimate.avg_monthly_income >= targetIncome
  ) ?? sortedRanks[sortedRanks.length - 1]; // Falls keiner gefunden, höchsten Rang
}

// ============================================
// RE-EXPORTS
// ============================================

export { ZINZINO_DE_PLAN, ZINZINO_RANKS } from './zinzino.plan';
export { PM_INTERNATIONAL_DE_PLAN, PM_INTERNATIONAL_RANKS } from './pm-international.plan';
export { LR_HEALTH_DE_PLAN, LR_HEALTH_RANKS, LR_FAST_TRACK_INFO } from './lr-health.plan';

// Type exports
export type { CompensationPlan } from '../../types/compensation';

// Flexible plan lookup (for vertical adapters)
export { getCompensationPlan };

// ============================================
// USAGE EXAMPLE
// ============================================
/*
import { getPlanById, getAvailableCompanies, findRankForIncome } from '@/config/compensation';

// Alle Firmen laden
const companies = getAvailableCompanies();
// → [{ id: 'zinzino', name: 'Zinzino', logo: '🧬' }, ...]

// Plan für Zinzino laden
const plan = getPlanById('zinzino');
// → CompensationPlan object

// Rang für 2.000€/Monat finden
const rank = findRankForIncome('zinzino', 2000);
// → { id: 'elite', name: 'Elite', ... }
*/

