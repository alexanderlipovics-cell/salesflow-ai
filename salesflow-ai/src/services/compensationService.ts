/**
 * COMPENSATION SERVICE
 * 
 * Lädt und verwaltet Compensation Plans.
 * Bietet API-Zugriff auf Plan-Daten aus der Datenbank und lokalen Configs.
 */

import { supabase } from './supabase';
import {
  CompensationPlan,
  UserGoal,
  UserGoalDB,
  UserDailyFlowTargetsDB,
  GoalCalculationResult,
  DailyFlowConfig,
  DEFAULT_DAILY_FLOW_CONFIG,
} from '../types/compensation';
import {
  getPlanById,
  getAllPlans,
  getAvailableCompanies,
} from '../config/compensation';

// ============================================
// PLAN LOADING
// ============================================

/**
 * Lädt einen Compensation Plan
 * Primär aus lokaler Config, Fallback auf DB-Cache
 */
export async function loadCompensationPlan(
  companyId: string,
  region: string = 'DE'
): Promise<CompensationPlan | null> {
  // Primär: Lokale Config
  const localPlan = getPlanById(companyId, region);
  if (localPlan) {
    return localPlan;
  }
  
  // Fallback: DB-Cache
  try {
    const { data, error } = await supabase
      .from('compensation_plan_cache')
      .select('*')
      .eq('company_id', companyId)
      .eq('region', region)
      .single();
    
    if (error || !data) {
      console.warn(`Plan not found: ${companyId} (${region})`);
      return null;
    }
    
    // DB-Format in CompensationPlan konvertieren
    return {
      company_id: data.company_id,
      company_name: data.company_name,
      region: data.region,
      plan_type: data.plan_type,
      unit_label: data.unit_label,
      unit_code: data.unit_code,
      currency: data.currency,
      ranks: data.ranks,
      avg_personal_volume_per_customer: data.avg_volume_per_customer,
      avg_personal_volume_per_partner: data.avg_volume_per_partner,
      version: data.version,
    } as CompensationPlan;
  } catch (err) {
    console.error('Error loading plan from DB:', err);
    return null;
  }
}

/**
 * Lädt alle verfügbaren Plans
 */
export function loadAllPlans(): CompensationPlan[] {
  return getAllPlans();
}

/**
 * Lädt die Liste aller Firmen
 */
export function loadAvailableCompanies() {
  return getAvailableCompanies();
}

// ============================================
// USER COMPANY SELECTION
// ============================================

/**
 * Speichert die Firma-Auswahl eines Users
 */
export async function saveUserCompanySelection(
  userId: string,
  workspaceId: string,
  companyId: string,
  companyName: string,
  region: string = 'DE'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Deaktiviere andere Firmen
    await supabase
      .from('user_company_selections')
      .update({ is_active: false })
      .eq('user_id', userId);
    
    // Upsert neue Auswahl
    const { error } = await supabase
      .from('user_company_selections')
      .upsert({
        user_id: userId,
        workspace_id: workspaceId,
        company_id: companyId,
        company_name: companyName,
        region,
        is_active: true,
      }, {
        onConflict: 'user_id,company_id',
      });
    
    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    console.error('Error saving company selection:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Lädt die aktive Firma-Auswahl eines Users
 */
export async function loadUserCompanySelection(
  userId: string
): Promise<{ companyId: string; companyName: string; region: string } | null> {
  try {
    const { data, error } = await supabase
      .from('user_company_selections')
      .select('company_id, company_name, region')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) return null;
    
    return {
      companyId: data.company_id,
      companyName: data.company_name,
      region: data.region,
    };
  } catch (err) {
    console.error('Error loading company selection:', err);
    return null;
  }
}

// ============================================
// USER GOALS
// ============================================

/**
 * Speichert ein neues Ziel
 */
export async function saveUserGoal(
  userId: string,
  workspaceId: string,
  companyId: string,
  goalType: 'income' | 'rank',
  result: GoalCalculationResult,
  targetIncome?: number,
  timeframeMonths: number = 6
): Promise<{ goalId: string | null; error?: string }> {
  try {
    const { data: goalId, error } = await supabase.rpc('upsert_user_goal', {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_company_id: companyId,
      p_goal_type: goalType,
      p_target_monthly_income: goalType === 'income' ? targetIncome : null,
      p_target_rank_id: result.target_rank.id,
      p_target_rank_name: result.target_rank.name,
      p_timeframe_months: timeframeMonths,
      p_calculated_group_volume: result.missing_group_volume,
      p_calculated_customers: result.estimated_customers,
      p_calculated_partners: result.estimated_partners,
    });
    
    if (error) throw error;
    
    return { goalId };
  } catch (err: any) {
    console.error('Error saving goal:', err);
    return { goalId: null, error: err.message };
  }
}

/**
 * Lädt das aktive Ziel eines Users
 */
export async function loadActiveGoal(
  userId: string,
  companyId?: string
): Promise<UserGoalDB | null> {
  try {
    let query = supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) return null;
    
    return data as UserGoalDB;
  } catch (err) {
    console.error('Error loading active goal:', err);
    return null;
  }
}

/**
 * Lädt alle Ziele eines Users
 */
export async function loadAllGoals(
  userId: string,
  status?: 'active' | 'achieved' | 'paused' | 'cancelled'
): Promise<UserGoalDB[]> {
  try {
    let query = supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []) as UserGoalDB[];
  } catch (err) {
    console.error('Error loading goals:', err);
    return [];
  }
}

/**
 * Markiert ein Ziel als erreicht
 */
export async function markGoalAsAchieved(
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_goals')
      .update({
        status: 'achieved',
        achieved_at: new Date().toISOString(),
      })
      .eq('id', goalId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    console.error('Error marking goal as achieved:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// DAILY FLOW TARGETS
// ============================================

/**
 * Speichert die Daily Flow Targets
 */
export async function saveDailyFlowTargets(
  userId: string,
  workspaceId: string,
  goalId: string,
  companyId: string,
  result: GoalCalculationResult,
  config: DailyFlowConfig = DEFAULT_DAILY_FLOW_CONFIG
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('upsert_daily_flow_targets', {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_goal_id: goalId,
      p_company_id: companyId,
      p_weekly_new_customers: result.daily_targets.weekly.new_customers,
      p_weekly_new_partners: result.daily_targets.weekly.new_partners,
      p_weekly_new_contacts: result.daily_targets.weekly.new_contacts,
      p_weekly_followups: result.daily_targets.weekly.followups,
      p_weekly_reactivations: result.daily_targets.weekly.reactivations,
      p_daily_new_contacts: result.daily_targets.daily.new_contacts,
      p_daily_followups: result.daily_targets.daily.followups,
      p_daily_reactivations: result.daily_targets.daily.reactivations,
      p_config: config,
    });
    
    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    console.error('Error saving daily flow targets:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Lädt die Daily Flow Targets eines Users
 */
export async function loadDailyFlowTargets(
  userId: string
): Promise<UserDailyFlowTargetsDB | null> {
  try {
    const { data, error } = await supabase
      .from('user_daily_flow_targets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) return null;
    
    return data as UserDailyFlowTargetsDB;
  } catch (err) {
    console.error('Error loading daily flow targets:', err);
    return null;
  }
}

/**
 * Lädt die Ziel-Übersicht via RPC
 */
export async function loadGoalSummary(
  userId: string,
  companyId?: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_active_goal_summary', {
      p_user_id: userId,
      p_company_id: companyId || null,
    });
    
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error('Error loading goal summary:', err);
    return [];
  }
}

// ============================================
// COMBINED SAVE (Goal + Targets)
// ============================================

/**
 * Speichert Ziel und Daily Flow Targets in einem Aufruf
 */
export async function saveGoalWithTargets(
  userId: string,
  workspaceId: string,
  companyId: string,
  goalType: 'income' | 'rank',
  result: GoalCalculationResult,
  targetIncome?: number,
  timeframeMonths: number = 6,
  config: DailyFlowConfig = DEFAULT_DAILY_FLOW_CONFIG
): Promise<{ success: boolean; goalId?: string; error?: string }> {
  // 1. Ziel speichern
  const { goalId, error: goalError } = await saveUserGoal(
    userId,
    workspaceId,
    companyId,
    goalType,
    result,
    targetIncome,
    timeframeMonths
  );
  
  if (goalError || !goalId) {
    return { success: false, error: goalError || 'Failed to save goal' };
  }
  
  // 2. Daily Flow Targets speichern
  const { error: targetsError } = await saveDailyFlowTargets(
    userId,
    workspaceId,
    goalId,
    companyId,
    result,
    config
  );
  
  if (targetsError) {
    return { success: false, goalId, error: targetsError };
  }
  
  return { success: true, goalId };
}

// ============================================
// EXPORTS
// ============================================

export default {
  loadCompensationPlan,
  loadAllPlans,
  loadAvailableCompanies,
  saveUserCompanySelection,
  loadUserCompanySelection,
  saveUserGoal,
  loadActiveGoal,
  loadAllGoals,
  markGoalAsAchieved,
  saveDailyFlowTargets,
  loadDailyFlowTargets,
  loadGoalSummary,
  saveGoalWithTargets,
};

