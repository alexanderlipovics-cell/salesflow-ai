/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LR HEALTH & BEAUTY COMPENSATION PLAN                                      ║
 * ║  Basierend auf dem offiziellen LR Karriereplan (DACH 2024)                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * HINWEIS: LR nutzt ein Unilevel-System mit:
 * - Bonus-Punkte (BP)
 * - Provisions-Stufen
 * - Auto-Bonus bei höheren Rängen
 */

import { CompensationPlan, RankDefinition } from '../../types/compensation';

// ============================================
// RANG-DEFINITIONEN
// ============================================

const LR_RANKS: RankDefinition[] = [
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
    id: 'junior_partner',
    name: 'Junior Partner',
    level: 2,
    emoji: '⭐',
    color: '#f59e0b',
    requirements: {
      min_group_volume: 200, // 200 BP
      min_personal_volume: 50,
      min_active_partners: 0,
      special_requirements: ['3% Basis-Provision'],
    },
    earning_estimate: {
      avg_monthly_income: 150,
      range: [50, 300],
      percentile: 65,
    },
  },
  {
    id: 'partner_1',
    name: 'Partner 1',
    level: 3,
    emoji: '🥉',
    color: '#22c55e',
    requirements: {
      min_group_volume: 500,
      min_personal_volume: 100,
      min_active_partners: 1,
      special_requirements: ['6% Provision'],
    },
    earning_estimate: {
      avg_monthly_income: 350,
      range: [150, 600],
      percentile: 45,
    },
  },
  {
    id: 'partner_2',
    name: 'Partner 2',
    level: 4,
    emoji: '🥈',
    color: '#3b82f6',
    requirements: {
      min_group_volume: 1500,
      min_personal_volume: 100,
      min_active_partners: 2,
      special_requirements: ['9% Provision', '1 Partner 1 in der Gruppe'],
    },
    earning_estimate: {
      avg_monthly_income: 700,
      range: [350, 1200],
      percentile: 30,
    },
  },
  {
    id: 'partner_3',
    name: 'Partner 3',
    level: 5,
    emoji: '🥇',
    color: '#8b5cf6',
    requirements: {
      min_group_volume: 4000,
      min_personal_volume: 100,
      min_active_partners: 3,
      special_requirements: ['12% Provision', '2 Partner 2s'],
    },
    earning_estimate: {
      avg_monthly_income: 1400,
      range: [700, 2500],
      percentile: 18,
    },
  },
  {
    id: 'organisation_partner',
    name: 'Organisations-Partner',
    level: 6,
    emoji: '🏆',
    color: '#06b6d4',
    requirements: {
      min_group_volume: 10000,
      min_personal_volume: 100,
      min_active_partners: 4,
      min_frontline_partners: 2,
      special_requirements: ['15% Provision', '2 Partner 3s', 'Auto-Bonus berechtigt'],
    },
    earning_estimate: {
      avg_monthly_income: 3000,
      range: [1500, 5000],
      percentile: 8,
    },
  },
  {
    id: '1_star_op',
    name: '1-Stern Organisations-Partner',
    level: 7,
    emoji: '⭐',
    color: '#0ea5e9',
    requirements: {
      min_group_volume: 25000,
      min_personal_volume: 100,
      min_active_partners: 5,
      min_frontline_partners: 3,
      special_requirements: ['18% Provision', '3 OPs in der Gruppe'],
    },
    earning_estimate: {
      avg_monthly_income: 6000,
      range: [3500, 10000],
      percentile: 4,
    },
  },
  {
    id: '2_star_op',
    name: '2-Stern Organisations-Partner',
    level: 8,
    emoji: '⭐⭐',
    color: '#eab308',
    requirements: {
      min_group_volume: 50000,
      min_personal_volume: 100,
      min_active_partners: 6,
      min_frontline_partners: 4,
      special_requirements: ['21% Provision', '3 1-Stern OPs'],
    },
    earning_estimate: {
      avg_monthly_income: 12000,
      range: [7000, 20000],
      percentile: 1.5,
    },
  },
  {
    id: '3_star_op',
    name: '3-Stern Organisations-Partner',
    level: 9,
    emoji: '⭐⭐⭐',
    color: '#dc2626',
    requirements: {
      min_group_volume: 100000,
      min_personal_volume: 100,
      min_active_partners: 8,
      min_frontline_partners: 5,
      special_requirements: ['23% Provision', '3 2-Stern OPs', 'Reise-Bonus'],
    },
    earning_estimate: {
      avg_monthly_income: 25000,
      range: [15000, 45000],
      percentile: 0.5,
    },
  },
  {
    id: 'president',
    name: 'President',
    level: 10,
    emoji: '👑',
    color: '#7c3aed',
    requirements: {
      min_group_volume: 250000,
      min_personal_volume: 100,
      min_active_partners: 12,
      min_frontline_partners: 7,
      special_requirements: ['25% Provision', '5 3-Stern OPs', 'President Club'],
    },
    earning_estimate: {
      avg_monthly_income: 55000,
      range: [35000, 100000],
      percentile: 0.1,
    },
  },
];

// ============================================
// LR HEALTH COMPENSATION PLAN
// ============================================

/**
 * Vollständiger LR Health & Beauty Compensation Plan für DACH-Region
 */
export const LR_HEALTH_PLAN: CompensationPlan = {
  company_id: 'lr-health',
  company_name: 'LR Health & Beauty',
  company_logo: '🌿',
  region: 'DE',
  plan_type: 'unilevel',
  unit_label: 'BP',
  unit_code: 'bp',
  currency: 'EUR',
  ranks: LR_RANKS,
  
  // Durchschnittliche Volumenwerte
  avg_personal_volume_per_customer: 65, // Aloe Vera Set
  avg_personal_volume_per_partner: 120, // Partner mit eigenem Verbrauch
  
  version: '2024.1',
  updated_at: '2024-12-01',
  external_plan_url: 'https://www.lrworld.com/business',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Findet den Rang für ein gegebenes Volumen
 */
export function getRankForVolume(groupVolume: number): RankDefinition {
  const sortedRanks = [...LR_RANKS].sort((a, b) => b.level - a.level);
  
  for (const rank of sortedRanks) {
    if (groupVolume >= rank.requirements.min_group_volume) {
      return rank;
    }
  }
  
  return LR_RANKS[0];
}

/**
 * Berechnet das benötigte Volumen für ein Einkommensziel
 */
export function getVolumeForIncome(targetIncome: number): { rank: RankDefinition; volume: number } {
  for (const rank of LR_RANKS) {
    if (rank.earning_estimate && rank.earning_estimate.avg_monthly_income >= targetIncome) {
      return {
        rank,
        volume: rank.requirements.min_group_volume,
      };
    }
  }
  
  const highestRank = LR_RANKS[LR_RANKS.length - 1];
  return {
    rank: highestRank,
    volume: highestRank.requirements.min_group_volume,
  };
}

/**
 * Gibt den nächsthöheren Rang zurück
 */
export function getNextRank(currentRankId: string): RankDefinition | null {
  const currentIndex = LR_RANKS.findIndex(r => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex >= LR_RANKS.length - 1) {
    return null;
  }
  return LR_RANKS[currentIndex + 1];
}

// ============================================
// EXPORTS
// ============================================

export { LR_RANKS };
export default LR_HEALTH_PLAN;

