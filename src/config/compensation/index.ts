/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMPENSATION PLANS REGISTRY                                               ║
 * ║  Zentrale Registry für alle Compensation Plans                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { CompensationPlan, RankDefinition } from '../../types/compensation';
import { CompanyKey, normalizeCompanyKey, COMPANY_REGISTRY, getCompanyInfo } from '../companies';
import { ZINZINO_PLAN } from './zinzino';
import { HERBALIFE_PLAN } from './herbalife';
import { DOTERRA_PLAN } from './doterra';
import { PM_INTERNATIONAL_PLAN } from './pm-international';
import { LR_HEALTH_PLAN } from './lr-health';

// ============================================
// COMPENSATION PLANS REGISTRY
// ============================================

/**
 * Registry aller verfügbaren Compensation Plans
 * 
 * ✅ DACH TOP 5 Network Marketing Firmen implementiert:
 * - Zinzino (Schweden, Omega-3)
 * - Herbalife (USA, Ernährung) 
 * - PM-International (Deutschland, FitLine)
 * - LR Health & Beauty (Deutschland, Aloe Vera)
 * - doTERRA (USA, Ätherische Öle)
 */
export const COMPENSATION_PLANS: Partial<Record<CompanyKey, CompensationPlan>> = {
  zinzino: ZINZINO_PLAN,
  herbalife: HERBALIFE_PLAN,
  doterra: DOTERRA_PLAN,
  'pm-international': PM_INTERNATIONAL_PLAN,
  'lr-health': LR_HEALTH_PLAN,
} as const;

// ============================================
// PLAN ACCESS FUNCTIONS
// ============================================

/**
 * Holt einen Compensation Plan für eine Firma.
 * Normalisiert automatisch den Company-Key.
 * 
 * @param companyKey - Company-ID/Slug (wird normalisiert)
 * @param region - Region (aktuell nur für Logging, alle Pläne sind DE-basiert)
 * @returns CompensationPlan oder null wenn nicht gefunden
 * 
 * @example
 * const plan = getPlanById('ZINZINO'); // Funktioniert
 * const plan = getPlanById('zinzino'); // Funktioniert auch
 */
export function getPlanById(
  companyKey: string,
  region: string = 'DE'
): CompensationPlan | null {
  const normalizedKey = normalizeCompanyKey(companyKey);
  
  // Prüfe ob Plan existiert
  if (normalizedKey in COMPENSATION_PLANS) {
    const plan = COMPENSATION_PLANS[normalizedKey as keyof typeof COMPENSATION_PLANS];
    
    // Region-Logging (später: Region-spezifische Pläne)
    if (plan && plan.region !== region) {
      console.log(`Note: Using ${plan.region} plan for ${normalizedKey} (requested: ${region})`);
    }
    
    return plan || null;
  }
  
  return null;
}

/**
 * Gibt alle verfügbaren Plans zurück
 */
export function getAllPlans(): CompensationPlan[] {
  return Object.values(COMPENSATION_PLANS).filter((p): p is CompensationPlan => p !== undefined);
}

/**
 * Gibt alle Firmen zurück, die einen Plan haben
 */
export function getAvailableCompanies(): Array<{ id: CompanyKey; name: string; hasCompPlan: boolean }> {
  return Object.entries(COMPANY_REGISTRY).map(([id, company]) => ({
    id: id as CompanyKey,
    name: company.name,
    hasCompPlan: id in COMPENSATION_PLANS,
  }));
}

/**
 * Prüft ob für eine Firma ein Plan existiert
 */
export function hasPlan(companyKey: string): boolean {
  const normalizedKey = normalizeCompanyKey(companyKey);
  return normalizedKey in COMPENSATION_PLANS;
}

// ============================================
// RANK HELPER FUNCTIONS
// ============================================

/**
 * Findet einen Rang nach ID in einem Plan
 */
export function findRankById(
  plan: CompensationPlan,
  rankId: string
): RankDefinition | undefined {
  return plan.ranks.find(r => r.id === rankId);
}

/**
 * Findet den Rang, der einem Gruppenvolumen entspricht
 */
export function findRankByVolume(
  plan: CompensationPlan,
  groupVolume: number
): RankDefinition {
  // Sortiere absteigend nach Level
  const sortedRanks = [...plan.ranks].sort((a, b) => b.level - a.level);
  
  for (const rank of sortedRanks) {
    if (groupVolume >= rank.requirements.min_group_volume) {
      return rank;
    }
  }
  
  // Fallback auf niedrigsten Rang
  return plan.ranks[0];
}

/**
 * Findet den niedrigsten Rang, der ein Einkommensziel ermöglicht
 */
export function findRankByIncome(
  plan: CompensationPlan,
  targetIncome: number
): RankDefinition | undefined {
  // Sortiere aufsteigend nach Level
  const sortedRanks = [...plan.ranks].sort((a, b) => a.level - b.level);
  
  for (const rank of sortedRanks) {
    if (rank.earning_estimate && rank.earning_estimate.avg_monthly_income >= targetIncome) {
      return rank;
    }
  }
  
  // Höchster Rang wenn kein passender gefunden
  return sortedRanks[sortedRanks.length - 1];
}

/**
 * Gibt den nächsthöheren Rang zurück
 */
export function getNextRank(
  plan: CompensationPlan,
  currentRankId: string
): RankDefinition | null {
  const currentIndex = plan.ranks.findIndex(r => r.id === currentRankId);
  
  if (currentIndex === -1 || currentIndex >= plan.ranks.length - 1) {
    return null;
  }
  
  return plan.ranks[currentIndex + 1];
}

// ============================================
// CALCULATION HELPERS
// ============================================

/**
 * Berechnet geschätzte Kunden-/Partner-Anzahl für ein Volumen
 */
export function estimateTeamSize(
  plan: CompensationPlan,
  targetVolume: number,
  options?: {
    customerRatio?: number; // Standard: 0.7 (70% Kunden, 30% Partner)
  }
): { customers: number; partners: number } {
  const customerRatio = options?.customerRatio ?? 0.7;
  const partnerRatio = 1 - customerRatio;
  
  const avgCustomerVolume = plan.avg_personal_volume_per_customer;
  const avgPartnerVolume = plan.avg_personal_volume_per_partner;
  
  // Gewichteter Durchschnitt
  const avgVolumePerPerson = 
    (avgCustomerVolume * customerRatio) + 
    (avgPartnerVolume * partnerRatio);
  
  const totalPeople = Math.ceil(targetVolume / avgVolumePerPerson);
  
  return {
    customers: Math.ceil(totalPeople * customerRatio),
    partners: Math.ceil(totalPeople * partnerRatio),
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  ZINZINO_PLAN,
};

export default {
  getPlanById,
  getAllPlans,
  getAvailableCompanies,
  hasPlan,
  findRankById,
  findRankByVolume,
  findRankByIncome,
  getNextRank,
  estimateTeamSize,
};

