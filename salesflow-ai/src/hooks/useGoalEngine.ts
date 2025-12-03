/**
 * Goal Engine Hook - Smart Daily Command System
 * 
 * Intelligenter Tagesplaner der vom Monatsziel rückwärts rechnet.
 * Berechnet tägliche Soll-Werte basierend auf:
 * - Monatsziel
 * - Restliche Tage
 * - Conversion Rates
 * - Aktueller Fortschritt
 */

import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type IndustryType = "network" | "real_estate" | "finance" | "coaching";

export type UserBusinessProfile = {
  id: string;
  user_id: string;
  industry: IndustryType;
  product_name: string;
  commission_per_deal: number;
  sales_cycle_days: number;
  conversion_rate_lead_to_meeting?: number;
  conversion_rate_meeting_to_deal?: number;
  created_at: string;
  updated_at: string;
};

export type MonthlyGoal = {
  id: string;
  user_id: string;
  month: string; // YYYY-MM
  target_revenue: number;
  target_deals: number;
  current_revenue: number;
  current_deals: number;
  created_at: string;
  updated_at: string;
};

export type DailyPlan = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  target_new_contacts: number;
  target_followups: number;
  target_meetings: number;
  completed_new_contacts: number;
  completed_followups: number;
  completed_meetings: number;
  created_at: string;
  updated_at: string;
};

export type DailyRequirements = {
  missingRevenue: number;
  neededDeals: number;
  neededContacts: number;
  dailyTarget: number;
  daysRemaining: number;
  progressPercent: number;
};

export type UseGoalEngineResult = {
  loading: boolean;
  error: string | null;
  profile: UserBusinessProfile | null;
  monthlyGoal: MonthlyGoal | null;
  dailyPlan: DailyPlan | null;
  requirements: DailyRequirements | null;
  needsOnboarding: boolean;
  refetch: () => Promise<void>;
  updateProgress: (type: "new_contacts" | "followups" | "meetings", count: number) => Promise<void>;
  setupProfile: (data: Partial<UserBusinessProfile>) => Promise<void>;
  setupMonthlyGoal: (targetRevenue: number, targetDeals: number) => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDaysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  return lastDay - today + 1; // +1 um heute einzuschliessen
}

function calculateRequirements(
  profile: UserBusinessProfile,
  monthlyGoal: MonthlyGoal
): DailyRequirements {
  const missingRevenue = Math.max(0, monthlyGoal.target_revenue - monthlyGoal.current_revenue);
  const neededDeals = Math.ceil(missingRevenue / profile.commission_per_deal);
  
  // Conversion Rates (Fallback auf 20% wenn nicht gesetzt)
  const conversionRate = (profile.conversion_rate_lead_to_meeting ?? 0.2) * 
                         (profile.conversion_rate_meeting_to_deal ?? 0.2);
  
  const neededContacts = Math.ceil(neededDeals / Math.max(0.01, conversionRate));
  const daysRemaining = getDaysRemainingInMonth();
  const dailyTarget = Math.ceil(neededContacts / Math.max(1, daysRemaining));
  
  const progressPercent = monthlyGoal.target_revenue > 0
    ? Math.round((monthlyGoal.current_revenue / monthlyGoal.target_revenue) * 100)
    : 0;

  return {
    missingRevenue,
    neededDeals,
    neededContacts,
    dailyTarget,
    daysRemaining,
    progressPercent,
  };
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useGoalEngine(): UseGoalEngineResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserBusinessProfile | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [requirements, setRequirements] = useState<DailyRequirements | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // ────────────────────────────────────────────────────────────────
  // Fetch User Profile
  // ────────────────────────────────────────────────────────────────

  const fetchUserProfile = useCallback(async (): Promise<UserBusinessProfile | null> => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const { data, error: queryError } = await supabaseClient
      .from("user_business_profile")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (queryError) {
      if (queryError.code === "PGRST116") {
        // Kein Profil vorhanden
        return null;
      }
      throw new Error(queryError.message);
    }

    return data as UserBusinessProfile;
  }, []);

  // ────────────────────────────────────────────────────────────────
  // Fetch Monthly Goal
  // ────────────────────────────────────────────────────────────────

  const fetchMonthlyGoal = useCallback(async (): Promise<MonthlyGoal | null> => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const currentMonth = getCurrentMonth();

    const { data, error: queryError } = await supabaseClient
      .from("monthly_goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .single();

    if (queryError) {
      if (queryError.code === "PGRST116") {
        // Kein Ziel vorhanden
        return null;
      }
      throw new Error(queryError.message);
    }

    return data as MonthlyGoal;
  }, []);

  // ────────────────────────────────────────────────────────────────
  // Fetch Daily Plan
  // ────────────────────────────────────────────────────────────────

  const fetchDailyPlan = useCallback(async (): Promise<DailyPlan | null> => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const today = getToday();

    const { data, error: queryError } = await supabaseClient
      .from("daily_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (queryError) {
      if (queryError.code === "PGRST116") {
        // Kein Plan vorhanden → erstelle einen
        return null;
      }
      throw new Error(queryError.message);
    }

    return data as DailyPlan;
  }, []);

  // ────────────────────────────────────────────────────────────────
  // Calculate Daily Targets (Supabase Function) - Currently unused
  // ────────────────────────────────────────────────────────────────

  // const calculateDailyTargets = useCallback(async () => {
  //   const { data: { user } } = await supabaseClient.auth.getUser();
  //   if (!user) return;
  //   const currentMonth = getCurrentMonth();
  //   const { error: funcError } = await supabaseClient.rpc("calculate_daily_targets", {
  //     p_user_id: user.id,
  //     p_month: currentMonth,
  //   });
  //   if (funcError) {
  //     console.warn("calculate_daily_targets function not available:", funcError);
  //   }
  // }, []);

  // ────────────────────────────────────────────────────────────────
  // Create Daily Plan if missing
  // ────────────────────────────────────────────────────────────────

  const createDailyPlan = useCallback(async (reqs: DailyRequirements): Promise<DailyPlan | null> => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const today = getToday();

    const { data, error: insertError } = await supabaseClient
      .from("daily_plans")
      .insert({
        user_id: user.id,
        date: today,
        target_new_contacts: Math.ceil(reqs.dailyTarget * 0.3), // 30% neue Kontakte
        target_followups: Math.ceil(reqs.dailyTarget * 0.5),    // 50% Follow-ups
        target_meetings: Math.ceil(reqs.dailyTarget * 0.2),     // 20% Meetings
        completed_new_contacts: 0,
        completed_followups: 0,
        completed_meetings: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating daily plan:", insertError);
      return null;
    }

    return data as DailyPlan;
  }, []);

  // ────────────────────────────────────────────────────────────────
  // Main Fetch
  // ────────────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Lade Profil
      const userProfile = await fetchUserProfile();
      setProfile(userProfile);

      if (!userProfile) {
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      // 2. Lade Monatsziel
      const goal = await fetchMonthlyGoal();
      setMonthlyGoal(goal);

      if (!goal) {
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      // 3. Berechne Requirements
      const reqs = calculateRequirements(userProfile, goal);
      setRequirements(reqs);

      // 4. Lade oder erstelle Daily Plan
      let plan = await fetchDailyPlan();
      if (!plan) {
        plan = await createDailyPlan(reqs);
      }
      setDailyPlan(plan);

      setNeedsOnboarding(false);
    } catch (err: any) {
      console.error("Error in useGoalEngine:", err);
      setError(err?.message || "Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, fetchMonthlyGoal, fetchDailyPlan, createDailyPlan]);

  // ────────────────────────────────────────────────────────────────
  // Update Progress
  // ────────────────────────────────────────────────────────────────

  const updateProgress = useCallback(
    async (type: "new_contacts" | "followups" | "meetings", count: number) => {
      if (!dailyPlan) return;

      const fieldMap = {
        new_contacts: "completed_new_contacts",
        followups: "completed_followups",
        meetings: "completed_meetings",
      };

      const field = fieldMap[type];

      // Optimistic update
      setDailyPlan((prev) =>
        prev ? { ...prev, [field]: (prev[field as keyof DailyPlan] as number) + count } : prev
      );

      // Update in DB
      const { error: updateError } = await supabaseClient
        .from("daily_plans")
        .update({ [field]: (dailyPlan[field as keyof DailyPlan] as number) + count })
        .eq("id", dailyPlan.id);

      if (updateError) {
        console.error("Error updating daily plan:", updateError);
        // Rollback optimistic update
        setDailyPlan((prev) =>
          prev ? { ...prev, [field]: (prev[field as keyof DailyPlan] as number) - count } : prev
        );
      }
    },
    [dailyPlan]
  );

  // ────────────────────────────────────────────────────────────────
  // Setup Profile
  // ────────────────────────────────────────────────────────────────

  const setupProfile = useCallback(async (data: Partial<UserBusinessProfile>) => {
    // TODO: RLS Policies für user_business_profile aktivieren
    
    // User ID holen oder Demo-UUID verwenden
    const { data: authData } = await supabaseClient.auth.getUser();
    const userId = authData?.user?.id || '00000000-0000-0000-0000-000000000001'; // Demo-UUID
    
    console.log('setupProfile: userId =', userId);
    console.log('setupProfile: data =', data);
    
    // Pflichtfelder prüfen
    if (!data.industry) {
      throw new Error("Industry (Branche) ist ein Pflichtfeld");
    }
    if (!data.product_name) {
      throw new Error("Product Name ist ein Pflichtfeld");
    }
    if (!data.commission_per_deal || data.commission_per_deal <= 0) {
      throw new Error("Commission per Deal muss größer als 0 sein");
    }
    if (!data.sales_cycle_days || data.sales_cycle_days <= 0) {
      throw new Error("Sales Cycle Days muss größer als 0 sein");
    }

    const payload = {
      user_id: userId,
      industry: data.industry,
      product_name: data.product_name,
      commission_per_deal: data.commission_per_deal,
      sales_cycle_days: data.sales_cycle_days,
      conversion_rate_lead_to_meeting: data.conversion_rate_lead_to_meeting ?? 0.2,
      conversion_rate_meeting_to_deal: data.conversion_rate_meeting_to_deal ?? 0.5,
      updated_at: new Date().toISOString(),
    };

    console.log('setupProfile: payload =', payload);

    const { data: result, error: upsertError } = await supabaseClient
      .from("user_business_profile")
      .upsert(payload)
      .select();

    if (upsertError) {
      console.error('setupProfile: Supabase Error:', upsertError);
      console.error('setupProfile: Error code:', upsertError.code);
      console.error('setupProfile: Error details:', upsertError.details);
      console.error('setupProfile: Error hint:', upsertError.hint);
      throw new Error(`Profil konnte nicht gespeichert werden: ${upsertError.message}`);
    }

    console.log('setupProfile: Success!', result);
    await refetch();
  }, [refetch]);

  // ────────────────────────────────────────────────────────────────
  // Setup Monthly Goal
  // ────────────────────────────────────────────────────────────────

  const setupMonthlyGoal = useCallback(
    async (targetRevenue: number, targetDeals: number) => {
      // TODO: RLS Policies für monthly_goals aktivieren
      
      // User ID holen oder Demo-UUID verwenden
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id || '00000000-0000-0000-0000-000000000001'; // Demo-UUID
      
      console.log('setupMonthlyGoal: userId =', userId);
      console.log('setupMonthlyGoal: targetRevenue =', targetRevenue);
      console.log('setupMonthlyGoal: targetDeals =', targetDeals);
      
      // Pflichtfelder prüfen
      if (!targetRevenue || targetRevenue <= 0) {
        throw new Error("Target Revenue muss größer als 0 sein");
      }
      if (!targetDeals || targetDeals <= 0) {
        throw new Error("Target Deals muss größer als 0 sein");
      }

      const currentMonth = getCurrentMonth();
      console.log('setupMonthlyGoal: month =', currentMonth);

      const payload = {
        user_id: userId,
        month: currentMonth,
        target_revenue: targetRevenue,
        target_deals: targetDeals,
        current_revenue: 0,
        current_deals: 0,
        updated_at: new Date().toISOString(),
      };

      console.log('setupMonthlyGoal: payload =', payload);

      const { data: result, error: upsertError } = await supabaseClient
        .from("monthly_goals")
        .upsert(payload)
        .select();

      if (upsertError) {
        console.error('setupMonthlyGoal: Supabase Error:', upsertError);
        console.error('setupMonthlyGoal: Error code:', upsertError.code);
        console.error('setupMonthlyGoal: Error details:', upsertError.details);
        console.error('setupMonthlyGoal: Error hint:', upsertError.hint);
        throw new Error(`Monatsziel konnte nicht gespeichert werden: ${upsertError.message}`);
      }

      console.log('setupMonthlyGoal: Success!', result);
      await refetch();
    },
    [refetch]
  );

  // ────────────────────────────────────────────────────────────────
  // Initial Load
  // ────────────────────────────────────────────────────────────────

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    loading,
    error,
    profile,
    monthlyGoal,
    dailyPlan,
    requirements,
    needsOnboarding,
    refetch,
    updateProgress,
    setupProfile,
    setupMonthlyGoal,
  };
}

