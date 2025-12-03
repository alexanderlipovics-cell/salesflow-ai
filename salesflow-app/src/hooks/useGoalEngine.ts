/**
 * USE GOAL ENGINE HOOK
 * 
 * React Hook für den Goal Wizard.
 * Verwaltet den Wizard-State und die Berechnung.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import {
  CompensationPlan,
  GoalCalculationInput,
  GoalCalculationResult,
  DailyFlowConfig,
  GoalType,
  WizardStep,
  DEFAULT_DAILY_FLOW_CONFIG,
  DEFAULT_TARGET_INCOME,
  DEFAULT_TIMEFRAME_MONTHS,
  MIN_TARGET_INCOME,
  MAX_TARGET_INCOME,
  MIN_TIMEFRAME_MONTHS,
  MAX_TIMEFRAME_MONTHS,
} from '../types/compensation';
import { calculateGoal, validateGoalInput } from '../services/goalEngineService';
import { getPlanById, getAvailableCompanies } from '../config/compensation';

// ============================================
// TYPES
// ============================================

interface UseGoalEngineResult {
  // Available options
  companies: Array<{ id: string; name: string; logo: string }>;
  selectedPlan: CompensationPlan | null;
  
  // Wizard state
  step: WizardStep;
  setStep: (s: WizardStep) => void;
  canProceed: boolean;
  
  // Step 1: Company
  companyId: string | null;
  selectCompany: (id: string) => void;
  
  // Step 2: Goal
  goalType: GoalType;
  setGoalType: (t: GoalType) => void;
  targetIncome: number;
  setTargetIncome: (v: number) => void;
  targetRankId: string | null;
  setTargetRankId: (id: string) => void;
  timeframeMonths: number;
  setTimeframeMonths: (v: number) => void;
  
  // Step 3: Result
  result: GoalCalculationResult | null;
  calculate: () => void;
  
  // Actions
  saveGoal: () => Promise<boolean>;
  reset: () => void;
  
  // Status
  isCalculating: boolean;
  isSaving: boolean;
  error: string | null;
  validationErrors: string[];
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useGoalEngine(): UseGoalEngineResult {
  const { user, workspace } = useAuth();
  
  // ============================================
  // STATE
  // ============================================
  
  // Wizard Step
  const [step, setStep] = useState<WizardStep>(1);
  
  // Step 1: Company
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Step 2: Goal
  const [goalType, setGoalType] = useState<GoalType>('income');
  const [targetIncome, setTargetIncome] = useState(DEFAULT_TARGET_INCOME);
  const [targetRankId, setTargetRankId] = useState<string | null>(null);
  const [timeframeMonths, setTimeframeMonths] = useState(DEFAULT_TIMEFRAME_MONTHS);
  
  // Config
  const [config] = useState<DailyFlowConfig>(DEFAULT_DAILY_FLOW_CONFIG);
  
  // Result
  const [result, setResult] = useState<GoalCalculationResult | null>(null);
  
  // Status
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  const companies = useMemo(() => getAvailableCompanies(), []);
  
  const selectedPlan = useMemo(
    () => companyId ? getPlanById(companyId) ?? null : null,
    [companyId]
  );
  
  const validationErrors = useMemo(() => {
    const input: Partial<GoalCalculationInput> = {
      plan: selectedPlan ?? undefined,
      goal_type: goalType,
      target_monthly_income: goalType === 'income' ? targetIncome : undefined,
      target_rank_id: goalType === 'rank' ? targetRankId ?? undefined : undefined,
      timeframe_months: timeframeMonths,
      config,
    };
    return validateGoalInput(input).errors;
  }, [selectedPlan, goalType, targetIncome, targetRankId, timeframeMonths, config]);
  
  const canProceed = useMemo(() => {
    if (step === 1) return !!companyId;
    if (step === 2) {
      if (goalType === 'income') {
        return targetIncome >= MIN_TARGET_INCOME && targetIncome <= MAX_TARGET_INCOME;
      }
      return !!targetRankId;
    }
    return !!result;
  }, [step, companyId, goalType, targetIncome, targetRankId, result]);
  
  // ============================================
  // ACTIONS
  // ============================================
  
  const selectCompany = useCallback((id: string) => {
    setCompanyId(id);
    setTargetRankId(null);
    setResult(null);
    setError(null);
  }, []);
  
  const calculate = useCallback(() => {
    if (!selectedPlan) {
      setError('Bitte wähle zuerst eine Firma aus');
      return;
    }
    
    setIsCalculating(true);
    setError(null);
    
    try {
      const input: GoalCalculationInput = {
        plan: selectedPlan,
        goal_type: goalType,
        target_monthly_income: goalType === 'income' ? targetIncome : undefined,
        target_rank_id: goalType === 'rank' ? targetRankId ?? undefined : undefined,
        timeframe_months: timeframeMonths,
        config,
      };
      
      const { isValid, errors } = validateGoalInput(input);
      if (!isValid) {
        setError(errors.join(', '));
        setIsCalculating(false);
        return;
      }
      
      const calculationResult = calculateGoal(input);
      setResult(calculationResult);
    } catch (e: any) {
      setError(e.message || 'Berechnung fehlgeschlagen');
      console.error('Calculation error:', e);
    } finally {
      setIsCalculating(false);
    }
  }, [selectedPlan, goalType, targetIncome, targetRankId, timeframeMonths, config]);
  
  const saveGoal = useCallback(async (): Promise<boolean> => {
    if (!user || !workspace || !companyId || !result) {
      setError('Fehlende Daten zum Speichern');
      return false;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // 1. Save goal
      const { data: goalId, error: goalError } = await supabase.rpc('upsert_user_goal', {
        p_user_id: user.id,
        p_workspace_id: workspace.id,
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
      
      if (goalError) throw goalError;
      
      // 2. Save daily flow targets
      const { error: targetsError } = await supabase.rpc('upsert_daily_flow_targets', {
        p_user_id: user.id,
        p_workspace_id: workspace.id,
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
      
      if (targetsError) throw targetsError;
      
      return true;
    } catch (e: any) {
      setError(e.message || 'Speichern fehlgeschlagen');
      console.error('Save error:', e);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, workspace, companyId, goalType, targetIncome, targetRankId, timeframeMonths, result, config]);
  
  const reset = useCallback(() => {
    setStep(1);
    setCompanyId(null);
    setGoalType('income');
    setTargetIncome(DEFAULT_TARGET_INCOME);
    setTargetRankId(null);
    setTimeframeMonths(DEFAULT_TIMEFRAME_MONTHS);
    setResult(null);
    setError(null);
  }, []);
  
  // ============================================
  // EFFECTS
  // ============================================
  
  // Auto-calculate when entering step 3
  useEffect(() => {
    if (step === 3 && !result && !isCalculating) {
      calculate();
    }
  }, [step, result, isCalculating, calculate]);
  
  // ============================================
  // RETURN
  // ============================================
  
  return {
    // Available options
    companies,
    selectedPlan,
    
    // Wizard state
    step,
    setStep,
    canProceed,
    
    // Step 1: Company
    companyId,
    selectCompany,
    
    // Step 2: Goal
    goalType,
    setGoalType,
    targetIncome,
    setTargetIncome,
    targetRankId,
    setTargetRankId,
    timeframeMonths,
    setTimeframeMonths,
    
    // Step 3: Result
    result,
    calculate,
    
    // Actions
    saveGoal,
    reset,
    
    // Status
    isCalculating,
    isSaving,
    error,
    validationErrors,
  };
}

// ============================================
// ADDITIONAL HOOKS
// ============================================

/**
 * Hook zum Laden des aktiven Ziels
 */
export function useActiveGoal() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    async function loadGoal() {
      try {
        // Load goal summary via RPC
        const { data, error: rpcError } = await supabase.rpc('get_active_goal_summary', {
          p_user_id: user.id,
          p_company_id: null,
        });
        
        if (rpcError) throw rpcError;
        
        if (data && data.length > 0) {
          setGoal(data[0]);
          setTargets({
            daily_new_contacts: data[0].daily_new_contacts,
            daily_followups: data[0].daily_followups,
            daily_reactivations: data[0].daily_reactivations,
          });
        }
      } catch (e: any) {
        setError(e.message);
        console.error('Error loading active goal:', e);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadGoal();
  }, [user]);
  
  return { goal, targets, isLoading, error };
}

/**
 * Hook zum Laden der Compensation Plan Liste
 */
export function useCompensationPlans() {
  const companies = useMemo(() => getAvailableCompanies(), []);
  
  const getPlan = useCallback((companyId: string) => {
    return getPlanById(companyId);
  }, []);
  
  return { companies, getPlan };
}

// ============================================
// EXPORTS
// ============================================

export default useGoalEngine;

