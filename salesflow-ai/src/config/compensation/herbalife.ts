/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  HERBALIFE COMPENSATION PLAN                                               ║
 * ║  Basierend auf dem offiziellen Herbalife Marketing Plan (DACH 2024)        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * HINWEIS: Herbalife nutzt ein Hybrid-System mit:
 * - Retail Profit (25-50% Rabatt)
 * - Wholesale Profit 
 * - Royalty Overrides (1-5%)
 * - Production Bonus
 * - Mark Hughes Bonus (Top Earner)
 */

import { CompensationPlan, RankDefinition } from '../../types/compensation';

// ============================================
// RANG-DEFINITIONEN (Discount Levels)
// ============================================

const HERBALIFE_RANKS: RankDefinition[] = [
  {
    id: 'member',
    name: 'Member',
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
    id: 'senior_consultant',
    name: 'Senior Consultant',
    level: 2,
    emoji: '⭐',
    color: '#f59e0b',
    requirements: {
      min_group_volume: 500, // 500 VP
      min_personal_volume: 0,
      min_active_partners: 0,
      special_requirements: ['35% Rabatt'],
    },
    earning_estimate: {
      avg_monthly_income: 200,
      range: [50, 500],
      percentile: 60,
    },
  },
  {
    id: 'success_builder',
    name: 'Success Builder',
    level: 3,
    emoji: '🏗️',
    color: '#22c55e',
    requirements: {
      min_group_volume: 1000, // 1000 VP
      min_personal_volume: 0,
      min_active_partners: 0,
      special_requirements: ['38% Rabatt'],
    },
    earning_estimate: {
      avg_monthly_income: 400,
      range: [150, 800],
      percentile: 45,
    },
  },
  {
    id: 'qualified_producer',
    name: 'Qualified Producer',
    level: 4,
    emoji: '🎯',
    color: '#3b82f6',
    requirements: {
      min_group_volume: 2500, // 2500 VP
      min_personal_volume: 500,
      min_active_partners: 0,
      special_requirements: ['42% Rabatt', 'Royalty Berechtigt'],
    },
    earning_estimate: {
      avg_monthly_income: 800,
      range: [300, 1500],
      percentile: 30,
    },
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    level: 5,
    emoji: '👔',
    color: '#8b5cf6',
    requirements: {
      min_group_volume: 4000, // 4000 VP in 1-12 Monaten
      min_personal_volume: 1000,
      min_active_partners: 0,
      special_requirements: ['50% Rabatt', '1-5% Royalties'],
    },
    earning_estimate: {
      avg_monthly_income: 1500,
      range: [600, 3000],
      percentile: 18,
    },
  },
  {
    id: 'world_team',
    name: 'World Team',
    level: 6,
    emoji: '🌍',
    color: '#06b6d4',
    requirements: {
      min_group_volume: 10000,
      min_personal_volume: 2500,
      min_active_partners: 2,
      special_requirements: ['2 Supervisors in 1. Generation', '1% Production Bonus'],
    },
    earning_estimate: {
      avg_monthly_income: 3000,
      range: [1500, 6000],
      percentile: 8,
    },
  },
  {
    id: 'global_expansion_team',
    name: 'GET (Global Expansion Team)',
    level: 7,
    emoji: '🚀',
    color: '#0ea5e9',
    requirements: {
      min_group_volume: 25000,
      min_personal_volume: 2500,
      min_active_partners: 3,
      min_frontline_partners: 3,
      special_requirements: ['3 aktive Supervisors', '2-4% Production Bonus'],
    },
    earning_estimate: {
      avg_monthly_income: 6000,
      range: [3000, 12000],
      percentile: 4,
    },
  },
  {
    id: 'millionaire_team',
    name: 'Millionaire Team',
    level: 8,
    emoji: '💰',
    color: '#eab308',
    requirements: {
      min_group_volume: 50000,
      min_personal_volume: 2500,
      min_active_partners: 5,
      min_frontline_partners: 4,
      special_requirements: ['3 GETs in der Organisation', '4-6% Production Bonus'],
    },
    earning_estimate: {
      avg_monthly_income: 12000,
      range: [6000, 25000],
      percentile: 1.5,
    },
  },
  {
    id: 'presidents_team',
    name: "President's Team",
    level: 9,
    emoji: '👑',
    color: '#dc2626',
    requirements: {
      min_group_volume: 100000,
      min_personal_volume: 2500,
      min_active_partners: 7,
      min_frontline_partners: 5,
      special_requirements: ['3 Millionaire Teams', 'Mark Hughes Bonus berechtigt'],
    },
    earning_estimate: {
      avg_monthly_income: 25000,
      range: [15000, 50000],
      percentile: 0.5,
    },
  },
  {
    id: 'chairmans_club',
    name: "Chairman's Club",
    level: 10,
    emoji: '💎',
    color: '#7c3aed',
    requirements: {
      min_group_volume: 250000,
      min_personal_volume: 2500,
      min_active_partners: 10,
      min_frontline_partners: 6,
      special_requirements: ["3 President's Teams", 'Top 50 weltweit'],
    },
    earning_estimate: {
      avg_monthly_income: 60000,
      range: [35000, 150000],
      percentile: 0.1,
    },
  },
  {
    id: 'founders_circle',
    name: "Founder's Circle",
    level: 11,
    emoji: '🏆',
    color: '#fbbf24',
    requirements: {
      min_group_volume: 500000,
      min_personal_volume: 2500,
      min_active_partners: 15,
      min_frontline_partners: 8,
      special_requirements: ["5 Chairman's Club Members", 'Top 10 weltweit'],
    },
    earning_estimate: {
      avg_monthly_income: 150000,
      range: [80000, 500000],
      percentile: 0.01,
    },
  },
];

// ============================================
// HERBALIFE COMPENSATION PLAN
// ============================================

/**
 * Vollständiger Herbalife Compensation Plan für DACH-Region
 */
export const HERBALIFE_PLAN: CompensationPlan = {
  company_id: 'herbalife',
  company_name: 'Herbalife',
  company_logo: '🌿',
  region: 'DE',
  plan_type: 'hybrid', // Hybrid aus Unilevel + Breakaway
  unit_label: 'VP',
  unit_code: 'vp',
  currency: 'EUR',
  ranks: HERBALIFE_RANKS,
  
  // Durchschnittliche Volumenwerte
  avg_personal_volume_per_customer: 120, // Durchschnittlicher Shake-Besteller
  avg_personal_volume_per_partner: 250, // Partner mit eigenem Verbrauch
  
  version: '2024.1',
  updated_at: '2024-12-01',
  external_plan_url: 'https://www.herbalife.com/business-opportunity',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Berechnet den Rabatt-Level basierend auf VP
 */
export function getDiscountLevel(totalVP: number): number {
  if (totalVP >= 4000) return 50;
  if (totalVP >= 2500) return 42;
  if (totalVP >= 1000) return 38;
  if (totalVP >= 500) return 35;
  return 25; // Basis-Rabatt für Members
}

/**
 * Findet den Rang für ein gegebenes Volumen
 */
export function getRankForVolume(groupVolume: number): RankDefinition {
  const sortedRanks = [...HERBALIFE_RANKS].sort((a, b) => b.level - a.level);
  
  for (const rank of sortedRanks) {
    if (groupVolume >= rank.requirements.min_group_volume) {
      return rank;
    }
  }
  
  return HERBALIFE_RANKS[0];
}

/**
 * Berechnet das benötigte Volumen für ein Einkommensziel
 */
export function getVolumeForIncome(targetIncome: number): { rank: RankDefinition; volume: number } {
  for (const rank of HERBALIFE_RANKS) {
    if (rank.earning_estimate && rank.earning_estimate.avg_monthly_income >= targetIncome) {
      return {
        rank,
        volume: rank.requirements.min_group_volume,
      };
    }
  }
  
  const highestRank = HERBALIFE_RANKS[HERBALIFE_RANKS.length - 1];
  return {
    rank: highestRank,
    volume: highestRank.requirements.min_group_volume,
  };
}

/**
 * Gibt den nächsthöheren Rang zurück
 */
export function getNextRank(currentRankId: string): RankDefinition | null {
  const currentIndex = HERBALIFE_RANKS.findIndex(r => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex >= HERBALIFE_RANKS.length - 1) {
    return null;
  }
  return HERBALIFE_RANKS[currentIndex + 1];
}

// ============================================
// EXPORTS
// ============================================

export { HERBALIFE_RANKS };
export default HERBALIFE_PLAN;

