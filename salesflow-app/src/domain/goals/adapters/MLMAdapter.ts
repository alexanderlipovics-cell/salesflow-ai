/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - MLM / NETWORK MARKETING ADAPTER                          ║
 * ║  Goal Engine für Direktvertrieb & Teamaufbau                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { BaseVerticalAdapter } from '../VerticalPlanAdapter';
import type {
  GoalInput,
  GoalBreakdown,
  DailyFlowConfig,
  DailyFlowTargets,
  KpiDefinition,
  VerticalId,
  GoalKind,
} from '../types';

export class MLMAdapter extends BaseVerticalAdapter {
  readonly verticalId: VerticalId = 'network_marketing';
  
  // ─────────────────────────────────────────────────────────────────────────
  // Konfiguration
  // ─────────────────────────────────────────────────────────────────────────
  
  private readonly AVG_CUSTOMER_VOLUME = 60;
  private readonly AVG_PARTNER_VOLUME = 100;
  private readonly COMMISSION_RATE = 0.08;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Interface Implementation
  // ─────────────────────────────────────────────────────────────────────────
  
  getLabel(): string {
    return 'Network Marketing';
  }
  
  getDefaultConversionConfig(): DailyFlowConfig {
    return {
      workingDaysPerWeek: 5,
      contactToPrimaryUnit: 0.20,
      contactToSecondaryUnit: 0.05,
      followupsPerPrimary: 3,
      followupsPerSecondary: 5,
      reactivationShare: 0.20,
    };
  }
  
  getKpiDefinitions(): KpiDefinition[] {
    return [
      {
        id: 'team_volume',
        label: 'Team-Volumen',
        description: 'Gesamtes Gruppenvolumen',
        unit: 'per_month',
        icon: 'TrendingUp',
        color: 'indigo',
      },
      {
        id: 'personal_volume',
        label: 'Persönliches Volumen',
        description: 'Eigenes Volumen',
        unit: 'per_month',
        icon: 'Activity',
        color: 'emerald',
      },
      {
        id: 'customers',
        label: 'Kunden',
        description: 'Anzahl aktiver Kunden',
        unit: 'per_month',
        icon: 'Users',
        color: 'blue',
      },
      {
        id: 'partners',
        label: 'Partner',
        description: 'Teampartner',
        unit: 'per_month',
        icon: 'Network',
        color: 'purple',
      },
    ];
  }
  
  computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown {
    switch (goalInput.goalKind) {
      case 'income':
        return this.breakdownFromIncome(goalInput);
      case 'rank':
        return this.breakdownFromRank(goalInput);
      case 'clients':
        return this.breakdownFromCustomers(goalInput);
      case 'volume':
        return this.breakdownFromVolume(goalInput);
      case 'deals':
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
    
    // Schätzung: Einkommen ≈ Volumen * 0.08
    const requiredVolume = targetIncome / this.COMMISSION_RATE;
    
    // Volumen aufteilen: 70% Kunden, 30% Partner
    const customerVolume = requiredVolume * 0.7;
    const partnerVolume = requiredVolume * 0.3;
    
    const estimatedCustomers = customerVolume / this.AVG_CUSTOMER_VOLUME;
    const estimatedPartners = partnerVolume / this.AVG_PARTNER_VOLUME;
    const totalPrimary = estimatedCustomers + estimatedPartners;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'network_marketing',
      goalKind: 'income',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: totalPrimary,
      secondaryUnits: estimatedPartners,
      requiredVolume: requiredVolume,
      perMonthVolume: requiredVolume / goalInput.timeframeMonths,
      perWeekVolume: requiredVolume / weeks,
      perDayVolume: requiredVolume / days,
      verticalDetails: {
        customers: Math.round(estimatedCustomers),
        partners: Math.round(estimatedPartners),
        avgCustomerVolume: this.AVG_CUSTOMER_VOLUME,
        avgPartnerVolume: this.AVG_PARTNER_VOLUME,
        targetMonthlyIncome: targetIncome,
      },
      notes: `Ziel: ${targetIncome.toLocaleString('de-DE')}€/Monat → ${Math.round(requiredVolume).toLocaleString('de-DE')} Credits`,
    };
  }
  
  private breakdownFromRank(goalInput: GoalInput): GoalBreakdown {
    const rankId = goalInput.verticalMeta?.rankId as string | undefined;
    
    const rankRequirements: Record<string, { volume: number; partners: number }> = {
      distributor: { volume: 100, partners: 0 },
      team_leader: { volume: 1000, partners: 2 },
      manager: { volume: 5000, partners: 5 },
      director: { volume: 15000, partners: 10 },
      executive: { volume: 50000, partners: 20 },
    };
    
    const req = rankRequirements[rankId ?? 'team_leader'] ?? { volume: 1000, partners: 2 };
    const requiredVolume = req.volume;
    const requiredPartners = req.partners;
    
    const partnerVolume = requiredPartners * this.AVG_PARTNER_VOLUME;
    const customerVolume = requiredVolume - partnerVolume;
    const estimatedCustomers = Math.max(0, customerVolume / this.AVG_CUSTOMER_VOLUME);
    const totalPrimary = estimatedCustomers + requiredPartners;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'network_marketing',
      goalKind: 'rank',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: totalPrimary,
      secondaryUnits: requiredPartners,
      requiredVolume: requiredVolume,
      perMonthVolume: requiredVolume / goalInput.timeframeMonths,
      perWeekVolume: requiredVolume / weeks,
      perDayVolume: requiredVolume / days,
      verticalDetails: {
        rankId,
        customers: Math.round(estimatedCustomers),
        partners: requiredPartners,
        rankRequirements: req,
      },
      notes: `Rang-Ziel: ${rankId ?? 'Team Leader'}`,
    };
  }
  
  private breakdownFromCustomers(goalInput: GoalInput): GoalBreakdown {
    const targetCustomers = goalInput.targetValue;
    const requiredVolume = targetCustomers * this.AVG_CUSTOMER_VOLUME;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'network_marketing',
      goalKind: 'clients',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: targetCustomers,
      secondaryUnits: 0,
      requiredVolume: requiredVolume,
      perMonthVolume: requiredVolume / goalInput.timeframeMonths,
      perWeekVolume: requiredVolume / weeks,
      perDayVolume: requiredVolume / days,
      verticalDetails: {
        avgCustomerVolume: this.AVG_CUSTOMER_VOLUME,
      },
      notes: `Kunden-Ziel: ${targetCustomers} Kunden`,
    };
  }
  
  private breakdownFromVolume(goalInput: GoalInput): GoalBreakdown {
    const targetVolume = goalInput.targetValue;
    
    const customerVolume = targetVolume * 0.7;
    const partnerVolume = targetVolume * 0.3;
    const estimatedCustomers = customerVolume / this.AVG_CUSTOMER_VOLUME;
    const estimatedPartners = partnerVolume / this.AVG_PARTNER_VOLUME;
    const totalPrimary = estimatedCustomers + estimatedPartners;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'network_marketing',
      goalKind: 'volume',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: totalPrimary,
      secondaryUnits: estimatedPartners,
      requiredVolume: targetVolume,
      perMonthVolume: targetVolume / goalInput.timeframeMonths,
      perWeekVolume: targetVolume / weeks,
      perDayVolume: targetVolume / days,
      verticalDetails: {
        customers: Math.round(estimatedCustomers),
        partners: Math.round(estimatedPartners),
      },
      notes: `Volumen-Ziel: ${targetVolume.toLocaleString('de-DE')} Credits`,
    };
  }
}
