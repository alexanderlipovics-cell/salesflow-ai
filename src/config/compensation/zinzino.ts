/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ZINZINO COMPENSATION PLAN                                                 ║
 * ║  Basierend auf dem offiziellen Zinzino Compensation Plan (Stand: 2024)     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * HINWEIS: Diese Werte sind Annäherungen basierend auf öffentlich verfügbaren
 * Informationen. Für aktuelle, verbindliche Werte siehe:
 * https://www.zinzino.com/compensation-plan
 */

import { CompensationPlan, RankDefinition } from '../../types/compensation';

// ============================================
// RANG-DEFINITIONEN
// ============================================

const ZINZINO_RANKS: RankDefinition[] = [
  {
    id: 'partner',
    name: 'Partner',
    level: 1,
    emoji: '🌱',
    color: '#94a3b8',
    requirements: {
      min_group_volume: 0,
      min_personal_volume: 0,
      min_active_partners: 0,
    },
    earning_estimate: {
      avg_monthly_income: 0,
      range: [0, 100],
      percentile: 100,
    },
  },
  {
    id: 'z4f',
    name: 'Zinzino 4 Free (Z4F)',
    level: 2,
    emoji: '⭐',
    color: '#f59e0b',
    requirements: {
      min_group_volume: 200,
      min_personal_volume: 100,
      min_active_partners: 0,
      special_requirements: ['4 Kunden mit Auto-Ship'],
    },
    earning_estimate: {
      avg_monthly_income: 150,
      range: [50, 300],
      percentile: 70,
    },
  },
  {
    id: 'executive',
    name: 'Executive',
    level: 3,
    emoji: '💼',
    color: '#3b82f6',
    requirements: {
      min_group_volume: 1000,
      min_personal_volume: 100,
      min_active_partners: 2,
      special_requirements: ['2 aktive Partner in 1. Linie'],
    },
    earning_estimate: {
      avg_monthly_income: 500,
      range: [200, 1000],
      percentile: 40,
    },
  },
  {
    id: 'team_manager',
    name: 'Team Manager',
    level: 4,
    emoji: '👥',
    color: '#8b5cf6',
    requirements: {
      min_group_volume: 3000,
      min_personal_volume: 100,
      min_active_partners: 3,
      min_frontline_partners: 2,
      special_requirements: ['2 Executives in der Struktur'],
    },
    earning_estimate: {
      avg_monthly_income: 1200,
      range: [600, 2500],
      percentile: 25,
    },
  },
  {
    id: 'director',
    name: 'Director',
    level: 5,
    emoji: '🎯',
    color: '#06b6d4',
    requirements: {
      min_group_volume: 8000,
      min_personal_volume: 100,
      min_active_partners: 4,
      min_frontline_partners: 3,
      special_requirements: ['3 Team Managers in der Struktur'],
    },
    earning_estimate: {
      avg_monthly_income: 2500,
      range: [1500, 5000],
      percentile: 12,
    },
  },
  {
    id: 'senior_director',
    name: 'Senior Director',
    level: 6,
    emoji: '💎',
    color: '#0ea5e9',
    requirements: {
      min_group_volume: 20000,
      min_personal_volume: 100,
      min_active_partners: 5,
      min_frontline_partners: 4,
      special_requirements: ['2 Directors in verschiedenen Linien'],
    },
    earning_estimate: {
      avg_monthly_income: 5000,
      range: [3000, 10000],
      percentile: 5,
    },
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    level: 7,
    emoji: '💙',
    color: '#2563eb',
    requirements: {
      min_group_volume: 50000,
      min_personal_volume: 100,
      min_active_partners: 6,
      min_frontline_partners: 5,
      special_requirements: ['3 Senior Directors in verschiedenen Linien'],
    },
    earning_estimate: {
      avg_monthly_income: 10000,
      range: [6000, 20000],
      percentile: 2,
    },
  },
  {
    id: 'ruby',
    name: 'Ruby',
    level: 8,
    emoji: '❤️',
    color: '#dc2626',
    requirements: {
      min_group_volume: 100000,
      min_personal_volume: 100,
      min_active_partners: 7,
      min_frontline_partners: 6,
      special_requirements: ['3 Sapphires in verschiedenen Linien'],
    },
    earning_estimate: {
      avg_monthly_income: 20000,
      range: [12000, 40000],
      percentile: 0.8,
    },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    level: 9,
    emoji: '💎',
    color: '#818cf8',
    requirements: {
      min_group_volume: 250000,
      min_personal_volume: 100,
      min_active_partners: 8,
      min_frontline_partners: 7,
      special_requirements: ['3 Rubies in verschiedenen Linien'],
    },
    earning_estimate: {
      avg_monthly_income: 40000,
      range: [25000, 80000],
      percentile: 0.3,
    },
  },
  {
    id: 'crown_diamond',
    name: 'Crown Diamond',
    level: 10,
    emoji: '👑',
    color: '#fbbf24',
    requirements: {
      min_group_volume: 500000,
      min_personal_volume: 100,
      min_active_partners: 10,
      min_frontline_partners: 8,
      special_requirements: ['3 Diamonds in verschiedenen Linien', 'Qualifikation über 6 Monate'],
    },
    earning_estimate: {
      avg_monthly_income: 80000,
      range: [50000, 150000],
      percentile: 0.1,
    },
  },
];

// ============================================
// ZINZINO COMPENSATION PLAN
// ============================================

/**
 * Vollständiger Zinzino Compensation Plan für DACH-Region
 */
export const ZINZINO_PLAN: CompensationPlan = {
  company_id: 'zinzino',
  company_name: 'Zinzino',
  company_logo: '🧬',
  region: 'DE',
  plan_type: 'unilevel',
  unit_label: 'QV',
  unit_code: 'qv',
  currency: 'EUR',
  ranks: ZINZINO_RANKS,
  
  // Durchschnittliche Volumenwerte
  avg_personal_volume_per_customer: 89, // Durchschnittlicher BalanceOil+ Bestellwert in QV
  avg_personal_volume_per_partner: 150, // Partner bestellen oft mehr + Starter-Kit
  
  version: '2024.1',
  updated_at: '2024-12-01',
  external_plan_url: 'https://www.zinzino.com/compensation-plan',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Findet den Rang für ein gegebenes Gruppenvolumen
 */
export function getRankForVolume(groupVolume: number): RankDefinition {
  // Sortiere absteigend nach Level und finde den höchsten passenden Rang
  const sortedRanks = [...ZINZINO_RANKS].sort((a, b) => b.level - a.level);
  
  for (const rank of sortedRanks) {
    if (groupVolume >= rank.requirements.min_group_volume) {
      return rank;
    }
  }
  
  // Fallback auf Partner
  return ZINZINO_RANKS[0];
}

/**
 * Berechnet das benötigte Gruppenvolumen für ein Einkommensziel
 */
export function getVolumeForIncome(targetIncome: number): { rank: RankDefinition; volume: number } {
  // Finde den niedrigsten Rang, der das Einkommensziel ermöglicht
  for (const rank of ZINZINO_RANKS) {
    if (rank.earning_estimate && rank.earning_estimate.avg_monthly_income >= targetIncome) {
      return {
        rank,
        volume: rank.requirements.min_group_volume,
      };
    }
  }
  
  // Höchster Rang wenn kein passender gefunden
  const highestRank = ZINZINO_RANKS[ZINZINO_RANKS.length - 1];
  return {
    rank: highestRank,
    volume: highestRank.requirements.min_group_volume,
  };
}

/**
 * Gibt den nächsthöheren Rang zurück
 */
export function getNextRank(currentRankId: string): RankDefinition | null {
  const currentIndex = ZINZINO_RANKS.findIndex(r => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex >= ZINZINO_RANKS.length - 1) {
    return null;
  }
  return ZINZINO_RANKS[currentIndex + 1];
}

// ============================================
// EXPORTS
// ============================================

export { ZINZINO_RANKS };
export default ZINZINO_PLAN;

