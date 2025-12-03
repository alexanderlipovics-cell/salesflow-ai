/**
 * COMPENSATION PLAN - Interface Definitions
 * 
 * Interfaces für die Plan-Konfigurationen.
 * Re-exportiert Types aus dem zentralen Types-Modul.
 */

// Re-export all types from central location
export type {
  CompensationPlan,
  RankDefinition,
  RankRequirement,
  RankEarningEstimate,
  PlanType,
  PlanUnit,
  Region,
  GoalType,
  GoalStatus,
  DailyFlowConfig,
  DailyFlowTargets,
  WeeklyTargets,
  DailyTargets,
  GoalCalculationInput,
  GoalCalculationResult,
  CompanyOption,
  WizardStep,
  GoalWizardState,
} from '../../types/compensation';

// Re-export constants
export {
  DEFAULT_DAILY_FLOW_CONFIG,
  DISCLAIMER_TEXT,
  MIN_TIMEFRAME_MONTHS,
  MAX_TIMEFRAME_MONTHS,
  DEFAULT_TIMEFRAME_MONTHS,
  MIN_TARGET_INCOME,
  MAX_TARGET_INCOME,
  DEFAULT_TARGET_INCOME,
} from '../../types/compensation';

/**
 * Helper: Erstellt einen neuen Rang
 */
export function createRank(
  id: string,
  name: string,
  order: number,
  unit: 'credits' | 'pv' | 'points' | 'volume',
  requirements: {
    min_personal_volume?: number;
    min_group_volume?: number;
    min_legs?: number;
    leg_volume_requirements?: {
      legs_required: number;
      min_volume_per_leg: number;
    };
  },
  earning_estimate?: {
    avg_monthly_income: number;
    range?: [number, number];
  }
) {
  return {
    id,
    name,
    order,
    unit,
    requirements,
    earning_estimate,
  };
}

/**
 * Helper: Sortiert Ränge nach Order
 */
export function sortRanksByOrder<T extends { order: number }>(ranks: T[]): T[] {
  return [...ranks].sort((a, b) => a.order - b.order);
}

/**
 * Helper: Findet Rang nach ID
 */
export function findRankById<T extends { id: string }>(
  ranks: T[],
  rankId: string
): T | undefined {
  return ranks.find(r => r.id === rankId);
}

/**
 * Helper: Findet Rang nach Mindest-Einkommen
 */
export function findRankByMinIncome<T extends { earning_estimate?: { avg_monthly_income: number } }>(
  ranks: T[],
  minIncome: number
): T | undefined {
  const sorted = [...ranks].sort((a, b) => 
    (a.earning_estimate?.avg_monthly_income ?? 0) - (b.earning_estimate?.avg_monthly_income ?? 0)
  );
  return sorted.find(r => (r.earning_estimate?.avg_monthly_income ?? 0) >= minIncome);
}

