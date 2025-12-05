import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type LeadScore = {
  id: string;
  lead_id: string;
  score: number;
  temperature: 'hot' | 'warm' | 'cold';
  calculated_at: string;
  factors: ScoreFactor[];
};

export type ScoreFactor = {
  rule_id: string;
  rule_name: string;
  points: number;
  reason: string;
};

export type LeadWithScore = {
  id: string;
  name: string;
  company: string;
  phone: string | null;
  instagram: string | null;
  vertical: string | null;
  status: string;
  score: number | null;
  temperature: 'hot' | 'warm' | 'cold' | null;
};

// ─────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────

async function fetchLeadScore(leadId: string): Promise<LeadScore | null> {
  const { data, error } = await supabase
    .from('lead_scores')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No score found
      return null;
    }
    logger.error('Fehler beim Laden des Lead Scores', error);
    throw error;
  }

  return data as LeadScore;
}

async function fetchAllLeadScores(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('lead_scores')
    .select('lead_id, score');

  if (error) {
    logger.error('Fehler beim Laden der Lead Scores', error);
    throw error;
  }

  const scoreMap = new Map<string, number>();
  data?.forEach((item) => {
    scoreMap.set(item.lead_id, item.score);
  });

  return scoreMap;
}

async function fetchLeadsWithScores(filters?: {
  temperatureFilter?: 'hot' | 'warm' | 'cold';
  sortBy?: 'score' | 'name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}): Promise<LeadWithScore[]> {
  // Verwende die View leads_with_scores
  let query = supabase.from('leads_with_scores').select('*');

  // Temperature Filter
  if (filters?.temperatureFilter) {
    query = query.eq('temperature', filters.temperatureFilter);
  }

  // Sorting
  const sortBy = filters?.sortBy || 'score';
  const sortOrder = filters?.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc', nullsFirst: false });

  const { data, error } = await query;

  if (error) {
    logger.error('Fehler beim Laden der Leads mit Scores', error);
    throw error;
  }

  return (data as LeadWithScore[]) || [];
}

async function calculateLeadScore(leadId: string): Promise<number> {
  // Ruft die Supabase Function calculate_lead_score auf
  const { data, error } = await supabase.rpc('calculate_lead_score', {
    p_lead_id: leadId,
  });

  if (error) {
    logger.error('Fehler beim Berechnen des Lead Scores', error);
    throw error;
  }

  return data as number;
}

async function recalculateAllScores(): Promise<{ updated: number }> {
  // Ruft eine Batch-Function auf (falls vorhanden)
  const { data, error } = await supabase.rpc('recalculate_all_lead_scores');

  if (error) {
    logger.error('Fehler beim Neuberechnen aller Scores', error);
    throw error;
  }

  return { updated: data || 0 };
}

// ─────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────

/**
 * Hook zum Abrufen eines einzelnen Lead Scores
 */
export function useLeadScore(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-score', leadId],
    queryFn: () => fetchLeadScore(leadId!),
    enabled: !!leadId,
    staleTime: 5 * 60 * 1000, // 5 Minuten Cache
  });
}

/**
 * Hook zum Abrufen aller Lead Scores als Map
 */
export function useAllLeadScores() {
  return useQuery({
    queryKey: ['lead-scores-all'],
    queryFn: fetchAllLeadScores,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook für Leads mit Scores (aus View)
 */
export function useLeadsWithScores(filters?: {
  temperatureFilter?: 'hot' | 'warm' | 'cold';
  sortBy?: 'score' | 'name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: ['leads-with-scores', filters],
    queryFn: () => fetchLeadsWithScores(filters),
    staleTime: 2 * 60 * 1000, // 2 Minuten Cache
  });
}

/**
 * Mutation zum Berechnen eines Lead Scores
 */
export function useCalculateScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calculateLeadScore,
    onSuccess: (newScore, leadId) => {
      // Cache invalidieren
      queryClient.invalidateQueries({ queryKey: ['lead-score', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-scores-all'] });
      queryClient.invalidateQueries({ queryKey: ['leads-with-scores'] });
    },
  });
}

/**
 * Mutation zum Neuberechnen aller Scores
 */
export function useRecalculateAllScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recalculateAllScores,
    onSuccess: () => {
      // Alle Score-Caches invalidieren
      queryClient.invalidateQueries({ queryKey: ['lead-score'] });
      queryClient.invalidateQueries({ queryKey: ['lead-scores-all'] });
      queryClient.invalidateQueries({ queryKey: ['leads-with-scores'] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
    },
  });
}

/**
 * Utility Hook: Score für einen Lead aus dem Cache oder als Fallback berechnen
 */
export function useLeadScoreWithFallback(leadId: string | undefined) {
  const { data: cachedScore, isLoading: isLoadingCache } = useLeadScore(leadId);
  const calculateMutation = useCalculateScore();

  const score = cachedScore?.score ?? null;
  const isLoading = isLoadingCache;

  const recalculate = async () => {
    if (!leadId) return;
    await calculateMutation.mutateAsync(leadId);
  };

  return {
    score,
    temperature: cachedScore?.temperature ?? null,
    factors: cachedScore?.factors ?? [],
    isLoading,
    isRecalculating: calculateMutation.isPending,
    recalculate,
  };
}

