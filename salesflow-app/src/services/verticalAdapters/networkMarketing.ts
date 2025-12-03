/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  NETWORK MARKETING / MLM VERTICAL ADAPTER                                 ║
 * ║  Branchen-Adapter für Network Marketing                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Unterstützt verschiedene MLM-Firmen (Zinzino, Ringana, PM, etc.)
 * über konfigurierbare Compensation Plans.
 * 
 * Sync mit Python:
 *   → backend/app/verticals/network_marketing/adapter.py
 */

import { BaseVerticalAdapter } from './baseAdapter';
import type {
  GoalInput,
  GoalBreakdown,
  DailyFlowConfig,
  KpiDefinition,
  VerticalId,
} from '../../domain/goals/types';
import type {
  CompensationPlan,
  RankDefinition,
} from '../../types/compensation';
import { getCompensationPlan } from '../../config/compensation';

/**
 * Adapter für Network Marketing / MLM.
 */
export class NetworkMarketingAdapter extends BaseVerticalAdapter {
  
  readonly verticalId: VerticalId = 'network_marketing';
  
  getLabel(): string {
    return 'Network Marketing / MLM';
  }
  
  /**
   * Berechnet Goal Breakdown basierend auf MLM-spezifischer Logik.
   * 
   * Unterstützt:
   * - Income Goals → berechnet benötigtes Volumen & Struktur
   * - Rank Goals → mapped auf Rang-Requirements
   * - Volume Goals → direktes Volumen-Target
   */
  computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown {
    const compPlanId = goalInput.verticalMeta?.compPlanId as string | undefined;
    const plan = compPlanId ? getCompensationPlan(compPlanId) : undefined;
    
    if (plan) {
      return this.computeWithPlan(goalInput, plan);
    }
    return this.computeHeuristic(goalInput);
  }
  
  /**
   * Berechnung mit konkretem Compensation Plan.
   */
  private computeWithPlan(goalInput: GoalInput, plan: CompensationPlan): GoalBreakdown {
    const { targetValue: target, timeframeMonths: months, goalKind } = goalInput;
    
    switch (goalKind) {
      case 'income':
        return this.incomeToBreakdown(target, months, plan);
      case 'rank':
        return this.rankToBreakdown(Math.floor(target), months, plan);
      case 'volume':
        return this.volumeToBreakdown(target, months, plan);
      default:
        return this.computeHeuristic(goalInput);
    }
  }
  
  /**
   * Einkommen → benötigter Rang → Volumen → Kunden/Partner.
   */
  private incomeToBreakdown(
    targetIncomePerMonth: number,
    months: number,
    plan: CompensationPlan
  ): GoalBreakdown {
    // Finde Rang der das Einkommen erreicht
    let targetRank: RankDefinition | undefined;
    for (const rank of plan.ranks) {
      if (rank.earning_estimate && rank.earning_estimate.avg_monthly_income >= targetIncomePerMonth) {
        targetRank = rank;
        break;
      }
    }
    
    if (!targetRank) {
      targetRank = plan.ranks[plan.ranks.length - 1]; // Höchster Rang
    }
    
    const requiredVolume = targetRank.requirements?.min_group_volume ?? 0;
    
    // Kunden/Partner Schätzung
    const volumePerCustomer = plan.avg_personal_volume_per_customer ?? 60;
    const estCustomers = requiredVolume / volumePerCustomer;
    const estPartners = estCustomers / 5; // Typisches Verhältnis
    
    const perMonth = requiredVolume / months;
    const weeks = months * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'network_marketing',
      goalKind: 'income',
      timeframeMonths: months,
      primaryUnits: estCustomers,
      secondaryUnits: estPartners,
      requiredVolume,
      perMonthVolume: perMonth,
      perWeekVolume: requiredVolume / weeks,
      perDayVolume: requiredVolume / days,
      verticalDetails: {
        planId: plan.company_id,
        targetRankId: targetRank.id,
        targetRankName: targetRank.name,
        targetIncome: targetIncomePerMonth,
        avgIncomeAtRank: targetRank.earning_estimate?.avg_monthly_income ?? 0,
      },
      notes: `Ziel-Rang: ${targetRank.name}`,
    };
  }
  
  /**
   * Rang-Ziel → Volumen → Kunden/Partner.
   */
  private rankToBreakdown(
    targetRankIndex: number,
    months: number,
    plan: CompensationPlan
  ): GoalBreakdown {
    const safeIndex = Math.min(targetRankIndex, plan.ranks.length - 1);
    const targetRank = plan.ranks[safeIndex];
    const requiredVolume = targetRank.requirements?.min_group_volume ?? 0;
    
    const volumePerCustomer = plan.avg_personal_volume_per_customer ?? 60;
    const estCustomers = requiredVolume / volumePerCustomer;
    const estPartners = estCustomers / 5;
    
    const perMonth = requiredVolume / months;
    const weeks = months * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'network_marketing',
      goalKind: 'rank',
      timeframeMonths: months,
      primaryUnits: estCustomers,
      secondaryUnits: estPartners,
      requiredVolume,
      perMonthVolume: perMonth,
      perWeekVolume: requiredVolume / weeks,
      perDayVolume: requiredVolume / days,
      verticalDetails: {
        planId: plan.company_id,
        targetRankId: targetRank.id,
        targetRankName: targetRank.name,
      },
      notes: `Rang-Ziel: ${targetRank.name}`,
    };
  }
  
  /**
   * Direktes Volumen-Ziel.
   */
  private volumeToBreakdown(
    targetVolume: number,
    months: number,
    plan: CompensationPlan
  ): GoalBreakdown {
    const volumePerCustomer = plan.avg_personal_volume_per_customer ?? 60;
    const estCustomers = targetVolume / volumePerCustomer;
    const estPartners = estCustomers / 5;
    
    const perMonth = targetVolume / months;
    const weeks = months * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'network_marketing',
      goalKind: 'volume',
      timeframeMonths: months,
      primaryUnits: estCustomers,
      secondaryUnits: estPartners,
      requiredVolume: targetVolume,
      perMonthVolume: perMonth,
      perWeekVolume: targetVolume / weeks,
      perDayVolume: targetVolume / days,
      verticalDetails: { planId: plan.company_id },
      notes: `Volumen-Ziel: ${targetVolume.toLocaleString('de-DE')}`,
    };
  }
  
  /**
   * Fallback-Heuristik ohne konkreten Plan.
   */
  private computeHeuristic(goalInput: GoalInput): GoalBreakdown {
    const { targetValue: target, timeframeMonths: months, goalKind } = goalInput;
    
    let requiredVolume: number;
    if (goalKind === 'income') {
      requiredVolume = target * 3 * months; // 3x Einkommen als Volumen
    } else if (goalKind === 'volume') {
      requiredVolume = target;
    } else {
      requiredVolume = target * 100; // Deals/Clients → Credits
    }
    
    const estCustomers = requiredVolume / 100; // 100 Credits pro Kunde
    const estPartners = estCustomers / 5;
    
    const perMonth = requiredVolume / months;
    const weeks = months * 4.33;
    const days = weeks * 5;
    
    return {
      verticalId: 'network_marketing',
      goalKind,
      timeframeMonths: months,
      primaryUnits: estCustomers,
      secondaryUnits: estPartners,
      requiredVolume,
      perMonthVolume: perMonth,
      perWeekVolume: requiredVolume / weeks,
      perDayVolume: requiredVolume / days,
      verticalDetails: { heuristic: true },
      notes: 'Heuristik ohne konkreten MLM-Plan',
    };
  }
  
  /**
   * Standard-Konversionsannahmen für MLM.
   */
  getDefaultConversionConfig(): DailyFlowConfig {
    return {
      workingDaysPerWeek: 5,
      contactToPrimaryUnit: 0.20,      // 20% → Kunde
      contactToSecondaryUnit: 0.05,    // 5% → Partner
      followupsPerPrimary: 3,
      followupsPerSecondary: 5,
      reactivationShare: 0.20,
    };
  }
  
  /**
   * KPIs für Network Marketing Dashboard.
   */
  getKpiDefinitions(): KpiDefinition[] {
    return [
      {
        id: 'new_contacts',
        label: 'Neue Kontakte',
        description: 'Erstkontakte mit neuen Interessenten',
        unit: 'per_day',
        icon: 'UserPlus',
        color: 'blue',
      },
      {
        id: 'followups',
        label: 'Follow-ups',
        description: 'Nachfassen bei bestehenden Kontakten',
        unit: 'per_day',
        icon: 'MessageSquare',
        color: 'green',
      },
      {
        id: 'reactivations',
        label: 'Reaktivierungen',
        description: 'Wiedereinstieg alter Kontakte',
        unit: 'per_day',
        icon: 'RefreshCw',
        color: 'orange',
      },
      {
        id: 'customers',
        label: 'Kunden',
        description: 'Aktive Produktkunden',
        unit: 'per_month',
        icon: 'Users',
        color: 'purple',
      },
      {
        id: 'partners',
        label: 'Partner',
        description: 'Aktive Geschäftspartner',
        unit: 'per_month',
        icon: 'Handshake',
        color: 'indigo',
      },
      {
        id: 'team_volume',
        label: 'Team-Volumen',
        description: 'Gesamtvolumen der Struktur',
        unit: 'per_month',
        icon: 'TrendingUp',
        color: 'emerald',
      },
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const networkMarketingAdapter = new NetworkMarketingAdapter();
