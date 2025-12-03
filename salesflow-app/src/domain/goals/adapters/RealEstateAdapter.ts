/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - REAL ESTATE ADAPTER                                      ║
 * ║  Goal Engine für Immobilienmakler                                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { BaseVerticalAdapter } from '../VerticalPlanAdapter';
import type {
  GoalInput,
  GoalBreakdown,
  DailyFlowConfig,
  KpiDefinition,
  VerticalId,
} from '../types';

export class RealEstateAdapter extends BaseVerticalAdapter {
  readonly verticalId: VerticalId = 'real_estate';
  
  // ─────────────────────────────────────────────────────────────────────────
  // Konfiguration
  // ─────────────────────────────────────────────────────────────────────────
  
  private readonly AVG_DEAL_VALUE = 350_000;
  private readonly AVG_COMMISSION_RATE = 0.03;
  private readonly AVG_COMMISSION_PER_DEAL = 10_500;
  private readonly VIEWING_TO_DEAL = 0.15;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Interface Implementation
  // ─────────────────────────────────────────────────────────────────────────
  
  getLabel(): string {
    return 'Immobilien';
  }
  
  getDefaultConversionConfig(): DailyFlowConfig {
    return {
      workingDaysPerWeek: 6,
      contactToPrimaryUnit: 0.04,
      contactToSecondaryUnit: 0.25,
      followupsPerPrimary: 8,
      followupsPerSecondary: 3,
      reactivationShare: 0.15,
    };
  }
  
  getKpiDefinitions(): KpiDefinition[] {
    return [
      {
        id: 'closings',
        label: 'Abschlüsse',
        description: 'Verkaufte/Vermittelte Objekte',
        unit: 'per_month',
        icon: 'Key',
        color: 'emerald',
      },
      {
        id: 'viewings',
        label: 'Besichtigungen',
        description: 'Durchgeführte Besichtigungen',
        unit: 'per_week',
        icon: 'Eye',
        color: 'blue',
      },
      {
        id: 'listings',
        label: 'Objekte',
        description: 'Aktive Listings',
        unit: 'per_month',
        icon: 'Home',
        color: 'amber',
      },
      {
        id: 'commission',
        label: 'Provision',
        description: 'Verdiente Provision',
        unit: 'per_month',
        icon: 'Euro',
        color: 'green',
      },
    ];
  }
  
  computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown {
    switch (goalInput.goalKind) {
      case 'income':
        return this.breakdownFromIncome(goalInput);
      case 'deals':
        return this.breakdownFromDeals(goalInput);
      case 'volume':
        return this.breakdownFromVolume(goalInput);
      default:
        return this.breakdownFromIncome(goalInput);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Private: Breakdown-Berechnungen
  // ─────────────────────────────────────────────────────────────────────────
  
  private breakdownFromIncome(goalInput: GoalInput): GoalBreakdown {
    const targetIncome = goalInput.targetValue;
    
    const monthlyDeals = targetIncome / this.AVG_COMMISSION_PER_DEAL;
    const totalDeals = monthlyDeals * goalInput.timeframeMonths;
    const viewingsNeeded = totalDeals / this.VIEWING_TO_DEAL;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    const volume = totalDeals * this.AVG_DEAL_VALUE;
    
    return {
      verticalId: 'real_estate',
      goalKind: 'income',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: totalDeals,
      secondaryUnits: viewingsNeeded,
      requiredVolume: volume,
      perMonthVolume: volume / goalInput.timeframeMonths,
      perWeekVolume: volume / weeks,
      perDayVolume: volume / days,
      verticalDetails: {
        viewings: Math.round(viewingsNeeded),
        avgCommissionPerDeal: this.AVG_COMMISSION_PER_DEAL,
        targetMonthlyIncome: targetIncome,
      },
      notes: `Ziel: ${targetIncome.toLocaleString('de-DE')}€/Monat → ${Math.round(totalDeals)} Deals`,
    };
  }
  
  private breakdownFromDeals(goalInput: GoalInput): GoalBreakdown {
    const targetDeals = goalInput.targetValue;
    const viewingsNeeded = targetDeals / this.VIEWING_TO_DEAL;
    const volume = targetDeals * this.AVG_DEAL_VALUE;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'real_estate',
      goalKind: 'deals',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: targetDeals,
      secondaryUnits: viewingsNeeded,
      requiredVolume: volume,
      perMonthVolume: volume / goalInput.timeframeMonths,
      perWeekVolume: volume / weeks,
      perDayVolume: volume / days,
      verticalDetails: {
        viewings: Math.round(viewingsNeeded),
        estimatedCommission: Math.round(targetDeals * this.AVG_COMMISSION_PER_DEAL),
      },
      notes: `Deal-Ziel: ${targetDeals} Abschlüsse`,
    };
  }
  
  private breakdownFromVolume(goalInput: GoalInput): GoalBreakdown {
    const targetVolume = goalInput.targetValue;
    const totalDeals = targetVolume / this.AVG_DEAL_VALUE;
    const viewingsNeeded = totalDeals / this.VIEWING_TO_DEAL;
    const estimatedCommission = targetVolume * this.AVG_COMMISSION_RATE;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'real_estate',
      goalKind: 'volume',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: totalDeals,
      secondaryUnits: viewingsNeeded,
      requiredVolume: targetVolume,
      perMonthVolume: targetVolume / goalInput.timeframeMonths,
      perWeekVolume: targetVolume / weeks,
      perDayVolume: targetVolume / days,
      verticalDetails: {
        viewings: Math.round(viewingsNeeded),
        estimatedCommission: Math.round(estimatedCommission),
        avgDealValue: this.AVG_DEAL_VALUE,
      },
      notes: `Volumen-Ziel: ${targetVolume.toLocaleString('de-DE')}€`,
    };
  }
}
