/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  dōTERRA COMPENSATION PLAN                                                 ║
 * ║  Basierend auf dem offiziellen doTERRA Empowerment Plan (DACH 2024)        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * HINWEIS: doTERRA nutzt ein Unilevel-System mit:
 * - PV (Personal Volume)
 * - OV (Organization Volume)
 * - Wellness Advocate Ranks
 */

import { CompensationPlan, RankDefinition } from '../../types/compensation';

// ============================================
// RANG-DEFINITIONEN
// ============================================

const DOTERRA_RANKS: RankDefinition[] = [
  {
    id: 'wellness_advocate',
    name: 'Wellness Advocate',
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
      range: [0, 50],
      percentile: 100,
    },
  },
  {
    id: 'wellness_advocate_builder',
    name: 'Builder',
    level: 2,
    emoji: '🏗️',
    color: '#f59e0b',
    requirements: {
      min_group_volume: 500, // 500 OV
      min_personal_volume: 100, // 100 PV
      min_active_partners: 0,
      special_requirements: ['Fast Start Bonus berechtigt'],
    },
    earning_estimate: {
      avg_monthly_income: 200,
      range: [50, 400],
      percentile: 60,
    },
  },
  {
    id: 'manager',
    name: 'Manager',
    level: 3,
    emoji: '📊',
    color: '#22c55e',
    requirements: {
      min_group_volume: 2000,
      min_personal_volume: 100,
      min_active_partners: 2,
      special_requirements: ['Power of 3 Bonus'],
    },
    earning_estimate: {
      avg_monthly_income: 500,
      range: [200, 900],
      percentile: 40,
    },
  },
  {
    id: 'director',
    name: 'Director',
    level: 4,
    emoji: '🎯',
    color: '#3b82f6',
    requirements: {
      min_group_volume: 4000,
      min_personal_volume: 100,
      min_active_partners: 3,
      special_requirements: ['2 Manager in der Gruppe'],
    },
    earning_estimate: {
      avg_monthly_income: 1000,
      range: [500, 1800],
      percentile: 25,
    },
  },
  {
    id: 'executive',
    name: 'Executive',
    level: 5,
    emoji: '💼',
    color: '#8b5cf6',
    requirements: {
      min_group_volume: 6000,
      min_personal_volume: 100,
      min_active_partners: 4,
      min_frontline_partners: 2,
      special_requirements: ['3 Directors', 'Leadership Bonus berechtigt'],
    },
    earning_estimate: {
      avg_monthly_income: 2000,
      range: [1000, 3500],
      percentile: 15,
    },
  },
  {
    id: 'elite',
    name: 'Elite',
    level: 6,
    emoji: '🌟',
    color: '#06b6d4',
    requirements: {
      min_group_volume: 10000,
      min_personal_volume: 100,
      min_active_partners: 5,
      min_frontline_partners: 3,
      special_requirements: ['3 Executives', 'Incentive Trip berechtigt'],
    },
    earning_estimate: {
      avg_monthly_income: 4000,
      range: [2000, 7000],
      percentile: 7,
    },
  },
  {
    id: 'premier',
    name: 'Premier',
    level: 7,
    emoji: '💎',
    color: '#0ea5e9',
    requirements: {
      min_group_volume: 20000,
      min_personal_volume: 100,
      min_active_partners: 6,
      min_frontline_partners: 4,
      special_requirements: ['3 Elites', 'Diamond Club berechtigt'],
    },
    earning_estimate: {
      avg_monthly_income: 8000,
      range: [4500, 15000],
      percentile: 3,
    },
  },
  {
    id: 'silver',
    name: 'Silver',
    level: 8,
    emoji: '🥈',
    color: '#94a3b8',
    requirements: {
      min_group_volume: 35000,
      min_personal_volume: 100,
      min_active_partners: 7,
      min_frontline_partners: 5,
      special_requirements: ['3 Premiers'],
    },
    earning_estimate: {
      avg_monthly_income: 15000,
      range: [8000, 25000],
      percentile: 1.2,
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    level: 9,
    emoji: '🥇',
    color: '#eab308',
    requirements: {
      min_group_volume: 70000,
      min_personal_volume: 100,
      min_active_partners: 9,
      min_frontline_partners: 6,
      special_requirements: ['3 Silvers', 'Global Incentive Trip'],
    },
    earning_estimate: {
      avg_monthly_income: 30000,
      range: [18000, 50000],
      percentile: 0.5,
    },
  },
  {
    id: 'platinum',
    name: 'Platinum',
    level: 10,
    emoji: '💠',
    color: '#a3e635',
    requirements: {
      min_group_volume: 150000,
      min_personal_volume: 100,
      min_active_partners: 12,
      min_frontline_partners: 7,
      special_requirements: ['3 Golds', 'Diamond Bonus Pool'],
    },
    earning_estimate: {
      avg_monthly_income: 55000,
      range: [35000, 90000],
      percentile: 0.2,
    },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    level: 11,
    emoji: '💎',
    color: '#818cf8',
    requirements: {
      min_group_volume: 300000,
      min_personal_volume: 100,
      min_active_partners: 15,
      min_frontline_partners: 8,
      special_requirements: ['3 Platinums', 'Presidential Diamond Pool'],
    },
    earning_estimate: {
      avg_monthly_income: 100000,
      range: [60000, 200000],
      percentile: 0.05,
    },
  },
  {
    id: 'blue_diamond',
    name: 'Blue Diamond',
    level: 12,
    emoji: '💙',
    color: '#2563eb',
    requirements: {
      min_group_volume: 600000,
      min_personal_volume: 100,
      min_active_partners: 18,
      min_frontline_partners: 10,
      special_requirements: ['5 Diamonds', 'Top 100 weltweit'],
    },
    earning_estimate: {
      avg_monthly_income: 200000,
      range: [120000, 500000],
      percentile: 0.01,
    },
  },
  {
    id: 'presidential_diamond',
    name: 'Presidential Diamond',
    level: 13,
    emoji: '👑',
    color: '#7c3aed',
    requirements: {
      min_group_volume: 1000000,
      min_personal_volume: 100,
      min_active_partners: 22,
      min_frontline_partners: 12,
      special_requirements: ['5 Blue Diamonds', 'Gründer-Bonus'],
    },
    earning_estimate: {
      avg_monthly_income: 400000,
      range: [250000, 1000000],
      percentile: 0.001,
    },
  },
];

// ============================================
// DOTERRA COMPENSATION PLAN
// ============================================

/**
 * Vollständiger doTERRA Compensation Plan für DACH-Region
 */
export const DOTERRA_PLAN: CompensationPlan = {
  company_id: 'doterra',
  company_name: 'dōTERRA',
  company_logo: '🌸',
  region: 'DE',
  plan_type: 'unilevel',
  unit_label: 'OV',
  unit_code: 'ov',
  currency: 'EUR',
  ranks: DOTERRA_RANKS,
  
  // Durchschnittliche Volumenwerte
  avg_personal_volume_per_customer: 95, // Home Essentials Kit
  avg_personal_volume_per_partner: 180, // Wellness Advocates bestellen mehr
  
  version: '2024.1',
  updated_at: '2024-12-01',
  external_plan_url: 'https://www.doterra.com/business',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Findet den Rang für ein gegebenes Volumen
 */
export function getRankForVolume(groupVolume: number): RankDefinition {
  const sortedRanks = [...DOTERRA_RANKS].sort((a, b) => b.level - a.level);
  
  for (const rank of sortedRanks) {
    if (groupVolume >= rank.requirements.min_group_volume) {
      return rank;
    }
  }
  
  return DOTERRA_RANKS[0];
}

/**
 * Berechnet das benötigte Volumen für ein Einkommensziel
 */
export function getVolumeForIncome(targetIncome: number): { rank: RankDefinition; volume: number } {
  for (const rank of DOTERRA_RANKS) {
    if (rank.earning_estimate && rank.earning_estimate.avg_monthly_income >= targetIncome) {
      return {
        rank,
        volume: rank.requirements.min_group_volume,
      };
    }
  }
  
  const highestRank = DOTERRA_RANKS[DOTERRA_RANKS.length - 1];
  return {
    rank: highestRank,
    volume: highestRank.requirements.min_group_volume,
  };
}

/**
 * Gibt den nächsthöheren Rang zurück
 */
export function getNextRank(currentRankId: string): RankDefinition | null {
  const currentIndex = DOTERRA_RANKS.findIndex(r => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex >= DOTERRA_RANKS.length - 1) {
    return null;
  }
  return DOTERRA_RANKS[currentIndex + 1];
}

// ============================================
// EXPORTS
// ============================================

export { DOTERRA_RANKS };
export default DOTERRA_PLAN;

