/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - FINANCE ADAPTER                                          ║
 * ║  Goal Engine für Finanzvertrieb & Versicherung                            ║
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

export class FinanceAdapter extends BaseVerticalAdapter {
  readonly verticalId: VerticalId = 'finance';
  
  // ─────────────────────────────────────────────────────────────────────────
  // Konfiguration
  // ─────────────────────────────────────────────────────────────────────────
  
  private readonly AVG_CONTRACT_VALUE = 150;
  private readonly AVG_COMMISSION_PER_CONTRACT = 1_800;
  private readonly CONSULTATION_TO_CONTRACT = 0.40;
  private readonly CONTACT_TO_CONSULTATION = 0.20;
  private readonly REFERRAL_RATE = 0.3;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Interface Implementation
  // ─────────────────────────────────────────────────────────────────────────
  
  getLabel(): string {
    return 'Finanzvertrieb';
  }
  
  getDefaultConversionConfig(): DailyFlowConfig {
    return {
      workingDaysPerWeek: 5,
      contactToPrimaryUnit: 0.15,
      contactToSecondaryUnit: 0.40,
      followupsPerPrimary: 4,
      followupsPerSecondary: 2,
      reactivationShare: 0.25,
    };
  }
  
  getKpiDefinitions(): KpiDefinition[] {
    return [
      {
        id: 'contracts',
        label: 'Abschlüsse',
        description: 'Neue Vertragsabschlüsse',
        unit: 'per_month',
        icon: 'FileCheck',
        color: 'emerald',
      },
      {
        id: 'consultations',
        label: 'Beratungen',
        description: 'Beratungstermine',
        unit: 'per_week',
        icon: 'Users',
        color: 'blue',
      },
      {
        id: 'commission',
        label: 'Provision',
        description: 'Verdiente Provision',
        unit: 'per_month',
        icon: 'Euro',
        color: 'green',
      },
      {
        id: 'referrals',
        label: 'Empfehlungen',
        description: 'Erhaltene Empfehlungen',
        unit: 'per_month',
        icon: 'Share2',
        color: 'purple',
      },
    ];
  }
  
  computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown {
    switch (goalInput.goalKind) {
      case 'income':
        return this.breakdownFromIncome(goalInput);
      case 'deals':
        return this.breakdownFromContracts(goalInput);
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
    
    const monthlyContracts = targetIncome / this.AVG_COMMISSION_PER_CONTRACT;
    const totalContracts = monthlyContracts * goalInput.timeframeMonths;
    const consultationsNeeded = totalContracts / this.CONSULTATION_TO_CONTRACT;
    
    const volume = totalContracts * this.AVG_CONTRACT_VALUE * 12;
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'finance',
      goalKind: 'income',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: totalContracts,
      secondaryUnits: consultationsNeeded,
      requiredVolume: volume,
      perMonthVolume: volume / goalInput.timeframeMonths,
      perWeekVolume: volume / weeks,
      perDayVolume: volume / days,
      verticalDetails: {
        consultations: Math.round(consultationsNeeded),
        avgCommissionPerContract: this.AVG_COMMISSION_PER_CONTRACT,
        targetMonthlyIncome: targetIncome,
        expectedReferrals: Math.round(totalContracts * this.REFERRAL_RATE * 1.5),
      },
      notes: `Ziel: ${targetIncome.toLocaleString('de-DE')}€/Monat → ${Math.round(totalContracts)} Verträge`,
    };
  }
  
  private breakdownFromContracts(goalInput: GoalInput): GoalBreakdown {
    const targetContracts = goalInput.targetValue;
    const consultationsNeeded = targetContracts / this.CONSULTATION_TO_CONTRACT;
    const volume = targetContracts * this.AVG_CONTRACT_VALUE * 12;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'finance',
      goalKind: 'deals',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: targetContracts,
      secondaryUnits: consultationsNeeded,
      requiredVolume: volume,
      perMonthVolume: volume / goalInput.timeframeMonths,
      perWeekVolume: volume / weeks,
      perDayVolume: volume / days,
      verticalDetails: {
        consultations: Math.round(consultationsNeeded),
        estimatedCommission: Math.round(targetContracts * this.AVG_COMMISSION_PER_CONTRACT),
      },
      notes: `Vertrags-Ziel: ${targetContracts} Abschlüsse`,
    };
  }
  
  private breakdownFromVolume(goalInput: GoalInput): GoalBreakdown {
    const targetVolume = goalInput.targetValue;
    const avgAnnualPremium = this.AVG_CONTRACT_VALUE * 12;
    const totalContracts = targetVolume / avgAnnualPremium;
    const consultationsNeeded = totalContracts / this.CONSULTATION_TO_CONTRACT;
    const estimatedCommission = totalContracts * this.AVG_COMMISSION_PER_CONTRACT;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'finance',
      goalKind: 'volume',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: totalContracts,
      secondaryUnits: consultationsNeeded,
      requiredVolume: targetVolume,
      perMonthVolume: targetVolume / goalInput.timeframeMonths,
      perWeekVolume: targetVolume / weeks,
      perDayVolume: targetVolume / days,
      verticalDetails: {
        consultations: Math.round(consultationsNeeded),
        estimatedCommission: Math.round(estimatedCommission),
        avgAnnualPremium,
      },
      notes: `Volumen-Ziel: ${targetVolume.toLocaleString('de-DE')}€`,
    };
  }
}
