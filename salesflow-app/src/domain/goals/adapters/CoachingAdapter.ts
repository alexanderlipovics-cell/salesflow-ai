/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - COACHING ADAPTER                                         ║
 * ║  Goal Engine für Coaches & Berater                                        ║
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

export class CoachingAdapter extends BaseVerticalAdapter {
  readonly verticalId: VerticalId = 'coaching';
  
  // ─────────────────────────────────────────────────────────────────────────
  // Konfiguration
  // ─────────────────────────────────────────────────────────────────────────
  
  private readonly AVG_CLIENT_VALUE = 3_000;
  private readonly AVG_MRR_PER_CLIENT = 500;
  private readonly LEAD_TO_DISCOVERY = 0.30;
  private readonly DISCOVERY_TO_CLIENT = 0.25;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Interface Implementation
  // ─────────────────────────────────────────────────────────────────────────
  
  getLabel(): string {
    return 'Coaching & Beratung';
  }
  
  getDefaultConversionConfig(): DailyFlowConfig {
    return {
      workingDaysPerWeek: 5,
      contactToPrimaryUnit: 0.10,
      contactToSecondaryUnit: 0.30,
      followupsPerPrimary: 5,
      followupsPerSecondary: 2,
      reactivationShare: 0.20,
    };
  }
  
  getKpiDefinitions(): KpiDefinition[] {
    return [
      {
        id: 'clients',
        label: 'Klienten',
        description: 'Aktive Coaching-Klienten',
        unit: 'per_month',
        icon: 'User',
        color: 'emerald',
      },
      {
        id: 'mrr',
        label: 'MRR',
        description: 'Monthly Recurring Revenue',
        unit: 'per_month',
        icon: 'TrendingUp',
        color: 'green',
      },
      {
        id: 'discovery_calls',
        label: 'Discovery Calls',
        description: 'Kennenlerngespräche',
        unit: 'per_week',
        icon: 'PhoneCall',
        color: 'blue',
      },
      {
        id: 'leads',
        label: 'Leads',
        description: 'Neue Interessenten',
        unit: 'per_week',
        icon: 'Target',
        color: 'purple',
      },
    ];
  }
  
  computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown {
    switch (goalInput.goalKind) {
      case 'income':
        return this.breakdownFromIncome(goalInput);
      case 'clients':
        return this.breakdownFromClients(goalInput);
      case 'deals':
        return this.breakdownFromClients(goalInput);
      default:
        return this.breakdownFromIncome(goalInput);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Private: Breakdown-Berechnungen
  // ─────────────────────────────────────────────────────────────────────────
  
  private breakdownFromIncome(goalInput: GoalInput): GoalBreakdown {
    const targetIncome = goalInput.targetValue;
    
    // Umsatz → Anzahl neue Klienten nötig
    const clientsNeededPerMonth = targetIncome / this.AVG_CLIENT_VALUE;
    const totalClients = clientsNeededPerMonth * goalInput.timeframeMonths;
    
    // Discovery Calls nötig
    const discoveryCalls = totalClients / this.DISCOVERY_TO_CLIENT;
    
    // Leads nötig
    const leadsNeeded = discoveryCalls / this.LEAD_TO_DISCOVERY;
    
    const revenue = totalClients * this.AVG_CLIENT_VALUE;
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'coaching',
      goalKind: 'income',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: totalClients,
      secondaryUnits: discoveryCalls,
      requiredVolume: revenue,
      perMonthVolume: revenue / goalInput.timeframeMonths,
      perWeekVolume: revenue / weeks,
      perDayVolume: revenue / days,
      verticalDetails: {
        discoveryCalls: Math.round(discoveryCalls),
        leads: Math.round(leadsNeeded),
        avgClientValue: this.AVG_CLIENT_VALUE,
        targetMonthlyIncome: targetIncome,
      },
      notes: `Ziel: ${targetIncome.toLocaleString('de-DE')}€/Monat → ${Math.round(totalClients)} Klienten`,
    };
  }
  
  private breakdownFromClients(goalInput: GoalInput): GoalBreakdown {
    const targetClients = goalInput.targetValue;
    const discoveryCalls = targetClients / this.DISCOVERY_TO_CLIENT;
    const revenue = targetClients * this.AVG_CLIENT_VALUE;
    
    const weeks = goalInput.timeframeMonths * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'coaching',
      goalKind: 'clients',
      timeframeMonths: goalInput.timeframeMonths,
      primaryUnits: targetClients,
      secondaryUnits: discoveryCalls,
      requiredVolume: revenue,
      perMonthVolume: revenue / goalInput.timeframeMonths,
      perWeekVolume: revenue / weeks,
      perDayVolume: revenue / days,
      verticalDetails: {
        discoveryCalls: Math.round(discoveryCalls),
        estimatedRevenue: Math.round(revenue),
      },
      notes: `Klienten-Ziel: ${targetClients} neue Klienten`,
    };
  }
}
