/**
 * useZinzinoMLM Hook
 * Manages Zinzino MLM rank data and calculations
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ZINZINO_ALL_RANKS, CUSTOMER_CAREER_TITLES, PARTNER_CAREER_TITLES, FAST_START_MILESTONES, CAB_TIERS } from '../data/zinzinoRanks';

export interface ZinzinoRankData {
  customer_points: number;
  pcv: number;
  mcv: number;
  pcp: number;
  left_credits: number;
  right_credits: number;
  premier_customers: number;
  fast_start_days: number;
}

export interface ZinzinoRankProgress {
  current_rank: string;
  next_rank: string | null;
  progress_percent: number;
  requirements_met: boolean;
  missing: {
    customer_points?: number;
    pcv?: number;
    mcv?: number;
    pcp?: number;
  };
}

export function useZinzinoMLM(userId: string) {
  const [rankData, setRankData] = useState<ZinzinoRankData | null>(null);
  const [currentRank, setCurrentRank] = useState<string>('partner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRankData();
  }, [userId]);

  const loadRankData = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('mlm_rank, mlm_rank_data')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setCurrentRank(data.mlm_rank || 'partner');
        setRankData((data.mlm_rank_data as ZinzinoRankData) || {
          customer_points: 0,
          pcv: 0,
          mcv: 0,
          pcp: 0,
          left_credits: 0,
          right_credits: 0,
          premier_customers: 0,
          fast_start_days: 0,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRankData = async (newData: Partial<ZinzinoRankData>) => {
    try {
      const updatedData = { ...rankData, ...newData } as ZinzinoRankData;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          mlm_rank_data: updatedData,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setRankData(updatedData);
      await calculateAndUpdateRank(updatedData);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const calculateAndUpdateRank = async (data: ZinzinoRankData) => {
    // Find current rank based on data
    let newRank = 'partner';

    // Check Customer Career Titles
    for (const title of CUSTOMER_CAREER_TITLES) {
      const req = title.requirements;
      if (
        data.customer_points >= (req?.customer_points || 0) &&
        data.pcv >= (req?.pcv || 0)
      ) {
        newRank = title.id;
      }
    }

    // Check Partner Career Titles
    for (const rank of PARTNER_CAREER_TITLES) {
      const req = rank.requirements;
      if (
        data.mcv >= (req?.mcv || 0) &&
        data.pcp >= (req?.pcp || 0) &&
        data.pcv >= (req?.pcv || 0)
      ) {
        newRank = rank.id;
      }
    }

    if (newRank !== currentRank) {
      await supabase
        .from('users')
        .update({ mlm_rank: newRank })
        .eq('id', userId);
      
      setCurrentRank(newRank);
    }
  };

  const getRankProgress = (): ZinzinoRankProgress | null => {
    if (!rankData) return null;

    const currentRankObj = ZINZINO_ALL_RANKS.find(r => r.id === currentRank);
    if (!currentRankObj) return null;

    // Find next rank
    const nextRank = ZINZINO_ALL_RANKS.find(
      r => r.order > currentRankObj.order
    );

    const req = currentRankObj.requirements || {};
    const progress = {
      current_rank: currentRankObj.nameDE,
      next_rank: nextRank?.nameDE || null,
      progress_percent: 0,
      requirements_met: false,
      missing: {} as any,
    };

    if (nextRank) {
      const nextReq = nextRank.requirements || {};
      
      // Calculate progress
      if (nextReq.customer_points) {
        progress.progress_percent = Math.min(
          100,
          (rankData.customer_points / nextReq.customer_points) * 100
        );
        if (rankData.customer_points < nextReq.customer_points) {
          progress.missing.customer_points = nextReq.customer_points - rankData.customer_points;
        }
      }
      
      if (nextReq.mcv) {
        const mcvProgress = Math.min(
          100,
          (rankData.mcv / nextReq.mcv) * 100
        );
        if (mcvProgress > progress.progress_percent) {
          progress.progress_percent = mcvProgress;
        }
        if (rankData.mcv < nextReq.mcv) {
          progress.missing.mcv = nextReq.mcv - rankData.mcv;
        }
      }

      // Check if all requirements met
      progress.requirements_met = Object.keys(progress.missing).length === 0;
    }

    return progress;
  };

  const calculateBalancedCredits = (): number => {
    if (!rankData) return 0;
    const smaller = Math.min(rankData.left_credits, rankData.right_credits);
    const larger = Math.max(rankData.left_credits, rankData.right_credits);
    return Math.min(larger + smaller, smaller * 3);
  };

  const calculateTeamProvision = (): number => {
    if (!rankData) return 0;
    const balanced = calculateBalancedCredits();
    const currentRankObj = ZINZINO_ALL_RANKS.find(r => r.id === currentRank);
    const provisionPercent = currentRankObj?.benefits?.team_provision 
      ? parseFloat(currentRankObj.benefits.team_provision.replace('%', ''))
      : 10;
    return (balanced * provisionPercent) / 100;
  };

  const getFastStartProgress = () => {
    if (!rankData) return null;
    
    const currentMilestone = FAST_START_MILESTONES.find(
      m => m.premier_customers <= rankData.premier_customers
    );
    const nextMilestone = FAST_START_MILESTONES.find(
      m => m.premier_customers > rankData.premier_customers
    );

    return {
      current: currentMilestone,
      next: nextMilestone,
      days_remaining: nextMilestone ? nextMilestone.days - rankData.fast_start_days : 0,
    };
  };

  return {
    rankData,
    currentRank,
    loading,
    error,
    updateRankData,
    getRankProgress,
    calculateBalancedCredits,
    calculateTeamProvision,
    getFastStartProgress,
    refresh: loadRankData,
  };
}

