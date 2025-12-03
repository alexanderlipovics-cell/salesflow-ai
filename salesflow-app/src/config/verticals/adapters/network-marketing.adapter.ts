/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  NETWORK MARKETING ADAPTER                                                ║
 * ║  Vertical-spezifische Logik für MLM / Direktvertrieb                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Unterstützt verschiedene MLM-Firmen (Zinzino, Ringana, PM, etc.)
 * über konfigurierbare Compensation Plans.
 */

import { VerticalId } from '../types';
import { CompensationPlan, RankDefinition } from '../../../types/compensation';
import { getPlanById } from '../../compensation';
import { BaseVerticalAdapter } from './base.adapter';
import {
  GoalInput,
  GoalBreakdown,
  GoalKind,
  VerticalDailyFlowConfig,
  AdapterKpiDefinition,
  CompPlanReference,
  RankInfo,
  toCompPlanReference,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// NETWORK MARKETING ADAPTER
// ═══════════════════════════════════════════════════════════════════════════

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
    const compPlanId = goalInput.vertical_meta?.comp_plan_id as string | undefined;
    const region = (goalInput.vertical_meta?.region as string) ?? 'DE';
    
    // Versuche Plan zu laden
    const plan = compPlanId ? getPlanById(compPlanId, region) : undefined;
    
    if (plan) {
      return this.computeWithPlan(goalInput, plan);
    }
    
    return this.computeHeuristic(goalInput);
  }
  
  /**
   * Standard-Konversionsannahmen für MLM.
   */
  getDefaultConversionConfig(): VerticalDailyFlowConfig {
    return {
      working_days_per_week: 5,
      contact_to_primary_unit: 0.20,    // 20% → Kunde
      contact_to_secondary_unit: 0.05,  // 5% → Partner
      followups_per_primary: 3,
      followups_per_secondary: 5,
      reactivation_share: 0.20,
    };
  }
  
  /**
   * KPIs für Network Marketing Dashboard.
   */
  getKpiDefinitions(): AdapterKpiDefinition[] {
    return [
      {
        id: 'new_contacts',
        label: 'Neue Kontakte',
        description: 'Erstkontakte mit neuen Interessenten',
        unit: 'per_day',
        icon: 'UserPlus',
        color: '#3B82F6', // blue
      },
      {
        id: 'followups',
        label: 'Follow-ups',
        description: 'Nachfassen bei bestehenden Kontakten',
        unit: 'per_day',
        icon: 'MessageSquare',
        color: '#10B981', // green
      },
      {
        id: 'reactivations',
        label: 'Reaktivierungen',
        description: 'Wiedereinstieg alter Kontakte',
        unit: 'per_day',
        icon: 'RefreshCw',
        color: '#F59E0B', // orange
      },
      {
        id: 'team_volume',
        label: 'Team-Volumen',
        description: 'Gesamtvolumen der Struktur',
        unit: 'per_month',
        icon: 'TrendingUp',
        color: '#8B5CF6', // purple
      },
    ];
  }
  
  /**
   * MLM benötigt Compensation Plan für genaue Berechnungen.
   */
  protected requiresCompensationPlan(): boolean {
    return true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS: Plan-basierte Berechnung
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Berechnung mit konkretem Compensation Plan.
   */
  private computeWithPlan(goalInput: GoalInput, plan: CompensationPlan): GoalBreakdown {
    const target = goalInput.target_value;
    const months = goalInput.timeframe_months;
    const planRef = toCompPlanReference(plan);
    
    switch (goalInput.goal_kind) {
      case 'income':
        return this.incomeToBreakdown(target, months, planRef, plan);
      
      case 'rank':
        return this.rankToBreakdown(Math.floor(target), months, planRef, plan);
      
      case 'volume':
        return this.volumeToBreakdown(target, months, planRef, plan);
      
      default:
        return this.computeHeuristic(goalInput);
    }
  }
  
  /**
   * Einkommen → benötigter Rang → Volumen → Kunden/Partner
   */
  private incomeToBreakdown(
    targetIncomePerMonth: number,
    months: number,
    planRef: CompPlanReference,
    plan: CompensationPlan
  ): GoalBreakdown {
    // Finde Rang der das Einkommen erreicht
    let targetRank: RankInfo | undefined;
    
    for (const rank of planRef.ranks) {
      if (rank.avg_income >= targetIncomePerMonth) {
        targetRank = rank;
        break;
      }
    }
    
    // Falls kein passender Rang → höchsten nehmen
    if (!targetRank && planRef.ranks.length > 0) {
      targetRank = planRef.ranks[planRef.ranks.length - 1];
    }
    
    if (!targetRank) {
      return this.computeHeuristic({ 
        goal_kind: 'income', 
        target_value: targetIncomePerMonth, 
        timeframe_months: months,
        vertical_meta: {}
      });
    }
    
    const requiredVolume = targetRank.required_volume;
    
    // Kunden/Partner Schätzung
    const volumePerCustomer = planRef.avg_volume_per_customer;
    const estCustomers = requiredVolume / volumePerCustomer;
    const estPartners = estCustomers / planRef.customer_to_partner_ratio;
    
    const timeBreakdown = this.calculateTimeBreakdown(requiredVolume, months);
    
    return {
      vertical_id: this.verticalId,
      goal_kind: 'income',
      timeframe_months: months,
      primary_units: this.round(estCustomers, 0),
      secondary_units: this.round(estPartners, 0),
      required_volume: requiredVolume,
      per_month_volume: timeBreakdown.perMonth,
      per_week_volume: timeBreakdown.perWeek,
      per_day_volume: timeBreakdown.perDay,
      vertical_details: {
        plan_id: planRef.id,
        target_rank_id: targetRank.id,
        target_rank_name: targetRank.name,
        target_income: targetIncomePerMonth,
        avg_income_at_rank: targetRank.avg_income,
      },
      notes: `Basierend auf ${planRef.display_name}, Ziel-Rang: ${targetRank.name}`,
    };
  }
  
  /**
   * Rang-Ziel → Volumen → Kunden/Partner
   */
  private rankToBreakdown(
    targetRankIndex: number,
    months: number,
    planRef: CompPlanReference,
    plan: CompensationPlan
  ): GoalBreakdown {
    // Rang-Index validieren
    let validIndex = targetRankIndex;
    if (validIndex >= planRef.ranks.length) {
      validIndex = planRef.ranks.length - 1;
    }
    if (validIndex < 0) {
      validIndex = 0;
    }
    
    const targetRank = planRef.ranks[validIndex];
    const requiredVolume = targetRank.required_volume;
    
    const volumePerCustomer = planRef.avg_volume_per_customer;
    const estCustomers = requiredVolume / volumePerCustomer;
    const estPartners = estCustomers / planRef.customer_to_partner_ratio;
    
    const timeBreakdown = this.calculateTimeBreakdown(requiredVolume, months);
    
    return {
      vertical_id: this.verticalId,
      goal_kind: 'rank',
      timeframe_months: months,
      primary_units: this.round(estCustomers, 0),
      secondary_units: this.round(estPartners, 0),
      required_volume: requiredVolume,
      per_month_volume: timeBreakdown.perMonth,
      per_week_volume: timeBreakdown.perWeek,
      per_day_volume: timeBreakdown.perDay,
      vertical_details: {
        plan_id: planRef.id,
        target_rank_id: targetRank.id,
        target_rank_name: targetRank.name,
      },
      notes: `Rang-Ziel: ${targetRank.name} mit ${planRef.display_name}`,
    };
  }
  
  /**
   * Direktes Volumen-Ziel.
   */
  private volumeToBreakdown(
    targetVolume: number,
    months: number,
    planRef: CompPlanReference,
    plan: CompensationPlan
  ): GoalBreakdown {
    const volumePerCustomer = planRef.avg_volume_per_customer;
    const estCustomers = targetVolume / volumePerCustomer;
    const estPartners = estCustomers / planRef.customer_to_partner_ratio;
    
    const timeBreakdown = this.calculateTimeBreakdown(targetVolume, months);
    
    return {
      vertical_id: this.verticalId,
      goal_kind: 'volume',
      timeframe_months: months,
      primary_units: this.round(estCustomers, 0),
      secondary_units: this.round(estPartners, 0),
      required_volume: targetVolume,
      per_month_volume: timeBreakdown.perMonth,
      per_week_volume: timeBreakdown.perWeek,
      per_day_volume: timeBreakdown.perDay,
      vertical_details: { plan_id: planRef.id },
      notes: `Volumen-Ziel: ${targetVolume.toLocaleString('de-DE')} ${plan.unit_label}`,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS: Heuristic (Fallback ohne Plan)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Fallback-Heuristik ohne konkreten Plan.
   * Verwendet branchenübliche Annahmen.
   */
  private computeHeuristic(goalInput: GoalInput): GoalBreakdown {
    const target = goalInput.target_value;
    const months = goalInput.timeframe_months;
    
    let requiredVolume: number;
    
    // Grobe Annahmen basierend auf Zielart
    switch (goalInput.goal_kind) {
      case 'income':
        // Annahme: ~3x Einkommen als Volumen über gesamten Zeitraum
        requiredVolume = target * 3 * months;
        break;
      
      case 'volume':
        requiredVolume = target;
        break;
      
      case 'clients':
      case 'deals':
        // Annahme: 100 Credits/PV pro Kunde/Deal
        requiredVolume = target * 100;
        break;
      
      default:
        requiredVolume = target * 100;
    }
    
    // Standard-Annahmen: 100 Credits pro Kunde, 5 Kunden pro Partner
    const estCustomers = requiredVolume / 100;
    const estPartners = estCustomers / 5;
    
    const timeBreakdown = this.calculateTimeBreakdown(requiredVolume, months);
    
    return {
      vertical_id: this.verticalId,
      goal_kind: goalInput.goal_kind,
      timeframe_months: months,
      primary_units: this.round(estCustomers, 0),
      secondary_units: this.round(estPartners, 0),
      required_volume: requiredVolume,
      per_month_volume: timeBreakdown.perMonth,
      per_week_volume: timeBreakdown.perWeek,
      per_day_volume: timeBreakdown.perDay,
      vertical_details: { heuristic: true },
      notes: 'Heuristik ohne konkreten MLM-Plan – Wähle deine Firma für genauere Werte.',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const networkMarketingAdapter = new NetworkMarketingAdapter();

