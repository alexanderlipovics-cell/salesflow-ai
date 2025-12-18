/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  PM-INTERNATIONAL COMPENSATION PLAN                                        ║
 * ║  Basierend auf dem offiziellen FitLine Karriereplan (DACH 2024)            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * HINWEIS: PM-International nutzt ein Unilevel-System mit:
 * - TQV (Team Qualifying Volume)
 * - GQV (Group Qualifying Volume)
 * - Karrierestufen von Teampartner bis President
 */

import { CompensationPlan, RankDefinition } from '../../types/compensation';

// ============================================
// RANG-DEFINITIONEN
// ============================================

const PM_RANKS: RankDefinition[] = [
  {
    id: 'teampartner',
    name: 'Teampartner',
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
    id: 'sales_manager',
    name: 'Sales Manager',
    level: 2,
    emoji: '⭐',
    color: '#f59e0b',
    requirements: {
      min_group_volume: 300, // 300 GQV
      min_personal_volume: 100, // 100 TQV
      min_active_partners: 0,
      special_requirements: ['Basis-Provision freigeschaltet'],
    },
    earning_estimate: {
      avg_monthly_income: 300,
      range: [100, 600],
      percentile: 55,
    },
  },
  {
    id: 'executive_manager',
    name: 'Executive Manager',
    level: 3,
    emoji: '💼',
    color: '#22c55e',
    requirements: {
      min_group_volume: 1000,
      min_personal_volume: 100,
      min_active_partners: 2,
      special_requirements: ['2 aktive Teampartner'],
    },
    earning_estimate: {
      avg_monthly_income: 700,
      range: [300, 1200],
      percentile: 35,
    },
  },
  {
    id: 'senior_executive',
    name: 'Senior Executive Manager',
    level: 4,
    emoji: '🎯',
    color: '#3b82f6',
    requirements: {
      min_group_volume: 3000,
      min_personal_volume: 100,
      min_active_partners: 3,
      special_requirements: ['1 Executive Manager in der Gruppe'],
    },
    earning_estimate: {
      avg_monthly_income: 1500,
      range: [700, 2500],
      percentile: 20,
    },
  },
  {
    id: 'director',
    name: 'Director',
    level: 5,
    emoji: '🏆',
    color: '#8b5cf6',
    requirements: {
      min_group_volume: 6000,
      min_personal_volume: 100,
      min_active_partners: 4,
      min_frontline_partners: 2,
      special_requirements: ['2 Executive Managers', 'Auto-Bonus berechtigt'],
    },
    earning_estimate: {
      avg_monthly_income: 3000,
      range: [1500, 5000],
      percentile: 10,
    },
  },
  {
    id: 'senior_director',
    name: 'Senior Director',
    level: 6,
    emoji: '💎',
    color: '#06b6d4',
    requirements: {
      min_group_volume: 12000,
      min_personal_volume: 100,
      min_active_partners: 5,
      min_frontline_partners: 3,
      special_requirements: ['2 Directors in der Gruppe'],
    },
    earning_estimate: {
      avg_monthly_income: 5500,
      range: [3000, 9000],
      percentile: 5,
    },
  },
  {
    id: 'executive_director',
    name: 'Executive Director',
    level: 7,
    emoji: '🚀',
    color: '#0ea5e9',
    requirements: {
      min_group_volume: 25000,
      min_personal_volume: 100,
      min_active_partners: 6,
      min_frontline_partners: 4,
      special_requirements: ['3 Senior Directors', 'Reise-Bonus berechtigt'],
    },
    earning_estimate: {
      avg_monthly_income: 10000,
      range: [6000, 18000],
      percentile: 2,
    },
  },
  {
    id: 'vice_president',
    name: 'Vice President',
    level: 8,
    emoji: '👔',
    color: '#eab308',
    requirements: {
      min_group_volume: 50000,
      min_personal_volume: 100,
      min_active_partners: 8,
      min_frontline_partners: 5,
      special_requirements: ['3 Executive Directors'],
    },
    earning_estimate: {
      avg_monthly_income: 20000,
      range: [12000, 35000],
      percentile: 0.8,
    },
  },
  {
    id: 'senior_vice_president',
    name: 'Senior Vice President',
    level: 9,
    emoji: '👑',
    color: '#dc2626',
    requirements: {
      min_group_volume: 100000,
      min_personal_volume: 100,
      min_active_partners: 10,
      min_frontline_partners: 6,
      special_requirements: ['3 Vice Presidents', 'Lifestyle-Bonus'],
    },
    earning_estimate: {
      avg_monthly_income: 40000,
      range: [25000, 70000],
      percentile: 0.3,
    },
  },
  {
    id: 'president',
    name: 'President',
    level: 10,
    emoji: '🏅',
    color: '#7c3aed',
    requirements: {
      min_group_volume: 250000,
      min_personal_volume: 100,
      min_active_partners: 15,
      min_frontline_partners: 8,
      special_requirements: ['5 Senior Vice Presidents', 'Top 20 Europa'],
    },
    earning_estimate: {
      avg_monthly_income: 80000,
      range: [50000, 200000],
      percentile: 0.05,
    },
  },
];

// ============================================
// PM-INTERNATIONAL COMPENSATION PLAN
// ============================================

/**
 * Vollständiger PM-International/FitLine Compensation Plan für DACH-Region
 */
export const PM_INTERNATIONAL_PLAN: CompensationPlan = {
  company_id: 'pm-international',
  company_name: 'PM-International',
  company_logo: '💪',
  region: 'DE',
  plan_type: 'unilevel',
  unit_label: 'GQV',
  unit_code: 'gqv',
  currency: 'EUR',
  ranks: PM_RANKS,
  
  // Durchschnittliche Volumenwerte
  avg_personal_volume_per_customer: 80, // FitLine Basics Set
  avg_personal_volume_per_partner: 150, // Partner mit eigenem Verbrauch
  
  version: '2024.1',
  updated_at: '2024-12-01',
  external_plan_url: 'https://www.pm-international.com/career',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Findet den Rang für ein gegebenes Volumen
 */
export function getRankForVolume(groupVolume: number): RankDefinition {
  const sortedRanks = [...PM_RANKS].sort((a, b) => b.level - a.level);
  
  for (const rank of sortedRanks) {
    if (groupVolume >= rank.requirements.min_group_volume) {
      return rank;
    }
  }
  
  return PM_RANKS[0];
}

/**
 * Berechnet das benötigte Volumen für ein Einkommensziel
 */
export function getVolumeForIncome(targetIncome: number): { rank: RankDefinition; volume: number } {
  for (const rank of PM_RANKS) {
    if (rank.earning_estimate && rank.earning_estimate.avg_monthly_income >= targetIncome) {
      return {
        rank,
        volume: rank.requirements.min_group_volume,
      };
    }
  }
  
  const highestRank = PM_RANKS[PM_RANKS.length - 1];
  return {
    rank: highestRank,
    volume: highestRank.requirements.min_group_volume,
  };
}

/**
 * Gibt den nächsthöheren Rang zurück
 */
export function getNextRank(currentRankId: string): RankDefinition | null {
  const currentIndex = PM_RANKS.findIndex(r => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex >= PM_RANKS.length - 1) {
    return null;
  }
  return PM_RANKS[currentIndex + 1];
}

// ============================================
// EXPORTS
// ============================================

export { PM_RANKS };
export default PM_INTERNATIONAL_PLAN;

