/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CHIEF V3.1 HOOK                                                          ║
 * ║  React Hook für alle v3.1 Features                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import chiefV31Service, {
  ObjectionAnalysis,
  CloserResult,
  PersonalityProfile,
  DealHealth,
  DailyTargets,
  ClosingSituation,
  DISGType,
} from '../services/chiefV31Service';

// ═══════════════════════════════════════════════════════════════════════════
// useObjectionAnalyzer - Signal Detector
// ═══════════════════════════════════════════════════════════════════════════

export function useObjectionAnalyzer() {
  const [analysis, setAnalysis] = useState<ObjectionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (objection: string, leadId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await chiefV31Service.analyzeObjection(objection, leadId);
      setAnalysis(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return { analysis, loading, error, analyze, reset };
}

// ═══════════════════════════════════════════════════════════════════════════
// useCloserLibrary - Killer Phrases
// ═══════════════════════════════════════════════════════════════════════════

export function useCloserLibrary() {
  const [closer, setCloser] = useState<CloserResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCloser = useCallback(async (situation: ClosingSituation) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await chiefV31Service.getCloser(situation);
      setCloser(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { closer, loading, error, getCloser };
}

// ═══════════════════════════════════════════════════════════════════════════
// usePersonalityMatching - DISG
// ═══════════════════════════════════════════════════════════════════════════

export function usePersonalityMatching() {
  const [profile, setProfile] = useState<PersonalityProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (messages: string[], leadId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await chiefV31Service.analyzePersonality(messages, leadId);
      setProfile(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Quick local detection (no API)
  const quickDetect = useCallback((messages: string[]) => {
    return chiefV31Service.quickDetectDISG(messages);
  }, []);

  return { profile, loading, error, analyze, quickDetect };
}

// ═══════════════════════════════════════════════════════════════════════════
// useDealHealth - Deal Medic
// ═══════════════════════════════════════════════════════════════════════════

export function useDealHealth(leadId?: string) {
  const [health, setHealth] = useState<DealHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (id?: string) => {
    const checkId = id || leadId;
    if (!checkId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await chiefV31Service.checkDealHealth(checkId);
      setHealth(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // Auto-check on mount if leadId provided
  useEffect(() => {
    if (leadId) {
      check(leadId);
    }
  }, [leadId]);

  return { health, loading, error, check };
}

// ═══════════════════════════════════════════════════════════════════════════
// useRevenueEngineer - Daily Targets
// ═══════════════════════════════════════════════════════════════════════════

interface RevenueEngineerParams {
  monthlyTarget: number;
  currentRevenue?: number;
  avgDealSize?: number;
}

export function useRevenueEngineer(params?: RevenueEngineerParams) {
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (p?: RevenueEngineerParams) => {
    const calcParams = p || params;
    if (!calcParams) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await chiefV31Service.calculateDailyTargets(calcParams);
      setTargets(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [params]);

  // Auto-calculate on mount if params provided
  useEffect(() => {
    if (params?.monthlyTarget) {
      calculate(params);
    }
  }, [params?.monthlyTarget, params?.currentRevenue]);

  return { targets, loading, error, calculate };
}

// ═══════════════════════════════════════════════════════════════════════════
// useV31Context - Combined Hook
// ═══════════════════════════════════════════════════════════════════════════

interface V31ContextOptions {
  leadId?: string;
  monthlyTarget?: number;
  currentRevenue?: number;
  enableDealHealth?: boolean;
  enableTargets?: boolean;
}

export function useV31Context(options: V31ContextOptions = {}) {
  const objectionAnalyzer = useObjectionAnalyzer();
  const closerLibrary = useCloserLibrary();
  const personalityMatching = usePersonalityMatching();
  const dealHealth = useDealHealth(options.enableDealHealth ? options.leadId : undefined);
  const revenueEngineer = useRevenueEngineer(
    options.enableTargets && options.monthlyTarget
      ? { monthlyTarget: options.monthlyTarget, currentRevenue: options.currentRevenue }
      : undefined
  );

  return {
    objection: objectionAnalyzer,
    closer: closerLibrary,
    personality: personalityMatching,
    dealHealth,
    revenue: revenueEngineer,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  useObjectionAnalyzer,
  useCloserLibrary,
  usePersonalityMatching,
  useDealHealth,
  useRevenueEngineer,
  useV31Context,
};

