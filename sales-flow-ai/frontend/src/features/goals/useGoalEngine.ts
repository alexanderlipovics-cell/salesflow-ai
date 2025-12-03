/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  USE GOAL ENGINE HOOK                                                      ║
 * ║  React Hook für Goal Wizard mit Backend-Integration                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { goalApi, compensationApi } from '../../api';
import {
  GoalType,
  GoalCalculateResponse,
  CompanyInfo,
  RankInfo,
  DailyFlowConfig,
  DEFAULT_DAILY_FLOW_CONFIG,
} from '../../api/types/goals';

// ============================================
// TYPES
// ============================================

type WizardStep = 1 | 2 | 3;

interface UseGoalEngineResult {
  // Companies
  companies: CompanyInfo[];
  loadingCompanies: boolean;
  
  // Selected
  companyId: string | null;
  selectedRanks: RankInfo[];
  
  // Wizard state
  step: WizardStep;
  setStep: (s: WizardStep) => void;
  canProceed: boolean;
  
  // Step 1: Company
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
  result: GoalCalculateResponse | null;
  calculate: () => Promise<void>;
  
  // Actions
  saveGoal: () => Promise<boolean>;
  reset: () => void;
  
  // Status
  isCalculating: boolean;
  isSaving: boolean;
  error: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TARGET_INCOME = 2000;
const DEFAULT_TIMEFRAME_MONTHS = 6;

// ============================================
// HOOK
// ============================================

export function useGoalEngine(): UseGoalEngineResult {
  // Companies
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  
  // Selected company & ranks
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedRanks, setSelectedRanks] = useState<RankInfo[]>([]);
  
  // Wizard
  const [step, setStep] = useState<WizardStep>(1);
  
  // Goal settings
  const [goalType, setGoalType] = useState<GoalType>('income');
  const [targetIncome, setTargetIncome] = useState(DEFAULT_TARGET_INCOME);
  const [targetRankId, setTargetRankId] = useState<string | null>(null);
  const [timeframeMonths, setTimeframeMonths] = useState(DEFAULT_TIMEFRAME_MONTHS);
  
  // Result
  const [result, setResult] = useState<GoalCalculateResponse | null>(null);
  
  // Status
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ============================================
  // LOAD COMPANIES
  // ============================================
  
  useEffect(() => {
    async function loadCompanies() {
      try {
        setLoadingCompanies(true);
        const response = await compensationApi.getCompanies('DE');
        setCompanies(response.companies);
      } catch (e: any) {
        console.error('Failed to load companies:', e);
        setError('Firmen konnten nicht geladen werden');
      } finally {
        setLoadingCompanies(false);
      }
    }
    
    loadCompanies();
  }, []);
  
  // ============================================
  // LOAD RANKS WHEN COMPANY CHANGES
  // ============================================
  
  useEffect(() => {
    if (!companyId) {
      setSelectedRanks([]);
      return;
    }
    
    async function loadRanks() {
      try {
        const response = await compensationApi.getRanks(companyId!, 'DE');
        setSelectedRanks(response.ranks);
      } catch (e: any) {
        console.error('Failed to load ranks:', e);
      }
    }
    
    loadRanks();
  }, [companyId]);
  
  // ============================================
  // CAN PROCEED
  // ============================================
  
  const canProceed = useMemo(() => {
    if (step === 1) return !!companyId;
    if (step === 2) {
      if (goalType === 'income') return targetIncome >= 500;
      return !!targetRankId;
    }
    return !!result;
  }, [step, companyId, goalType, targetIncome, targetRankId, result]);
  
  // ============================================
  // SELECT COMPANY
  // ============================================
  
  const selectCompany = useCallback((id: string) => {
    setCompanyId(id);
    setTargetRankId(null);
    setResult(null);
    setError(null);
  }, []);
  
  // ============================================
  // CALCULATE
  // ============================================
  
  const calculate = useCallback(async () => {
    if (!companyId) {
      setError('Bitte wähle zuerst eine Firma aus');
      return;
    }
    
    setIsCalculating(true);
    setError(null);
    
    try {
      const response = await goalApi.calculate({
        company_id: companyId,
        region: 'DE',
        goal_type: goalType,
        target_monthly_income: goalType === 'income' ? targetIncome : undefined,
        target_rank_id: goalType === 'rank' ? targetRankId ?? undefined : undefined,
        timeframe_months: timeframeMonths,
        current_group_volume: 0,
      });
      
      setResult(response);
    } catch (e: any) {
      setError(e.message || 'Berechnung fehlgeschlagen');
      console.error('Calculation error:', e);
    } finally {
      setIsCalculating(false);
    }
  }, [companyId, goalType, targetIncome, targetRankId, timeframeMonths]);
  
  // ============================================
  // SAVE
  // ============================================
  
  const saveGoal = useCallback(async (): Promise<boolean> => {
    if (!companyId || !result) {
      setError('Fehlende Daten zum Speichern');
      return false;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await goalApi.save({
        company_id: companyId,
        goal_type: goalType,
        target_monthly_income: goalType === 'income' ? targetIncome : undefined,
        target_rank_id: result.target_rank_id,
        target_rank_name: result.target_rank_name,
        timeframe_months: timeframeMonths,
        calculated_group_volume: result.missing_group_volume,
        calculated_customers: result.estimated_customers,
        calculated_partners: result.estimated_partners,
      });
      
      return response.success;
    } catch (e: any) {
      setError(e.message || 'Speichern fehlgeschlagen');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [companyId, goalType, targetIncome, timeframeMonths, result]);
  
  // ============================================
  // RESET
  // ============================================
  
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
  // AUTO-CALCULATE ON STEP 3
  // ============================================
  
  useEffect(() => {
    if (step === 3 && !result && !isCalculating) {
      calculate();
    }
  }, [step, result, isCalculating, calculate]);
  
  // ============================================
  // RETURN
  // ============================================
  
  return {
    companies,
    loadingCompanies,
    companyId,
    selectedRanks,
    step,
    setStep,
    canProceed,
    selectCompany,
    goalType,
    setGoalType,
    targetIncome,
    setTargetIncome,
    targetRankId,
    setTargetRankId,
    timeframeMonths,
    setTimeframeMonths,
    result,
    calculate,
    saveGoal,
    reset,
    isCalculating,
    isSaving,
    error,
  };
}

// ============================================
// USE DAILY TARGETS HOOK
// ============================================

export function useDailyTargets() {
  const [targets, setTargets] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function load() {
      try {
        const response = await goalApi.getDailyTargets();
        setTargets(response);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    load();
  }, []);
  
  return { targets, isLoading, error };
}

export default useGoalEngine;

