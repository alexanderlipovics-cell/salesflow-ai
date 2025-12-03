/**
 * Smart Daily Command Page
 * 
 * Der Kern der App - intelligenter Tagesplaner der vom Monatsziel rückwärts rechnet
 */

import React, { useState, useEffect } from "react";
import { Loader2, Flame, AlertTriangle, PartyPopper } from "lucide-react";
import { useGoalEngine } from "@/hooks/useGoalEngine";
import { supabaseClient } from "@/lib/supabaseClient";
import { GoalProgressBar } from "@/components/goals/GoalProgressBar";
import { DailyTargetCard } from "@/components/goals/DailyTargetCard";
import { CalendarBlock, type CalendarEvent } from "@/components/goals/CalendarBlock";
import { FollowUpBlock, type FollowUpTask } from "@/components/goals/FollowUpBlock";
import { HunterBlock } from "@/components/goals/HunterBlock";
import { StrategySetupModal, type ProfileData, type GoalData } from "@/components/goals/StrategySetupModal";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type HotLead = {
  id: string;
  name: string;
  score: number;
  status: string;
};

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export const DailyCommandPage: React.FC = () => {
  const {
    loading,
    error,
    monthlyGoal,
    dailyPlan,
    requirements,
    needsOnboarding,
    refetch,
    updateProgress,
    setupProfile,
    setupMonthlyGoal,
  } = useGoalEngine();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [followups, setFollowups] = useState<FollowUpTask[]>([]);
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // ────────────────────────────────────────────────────────────────
  // Onboarding Check
  // ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (needsOnboarding) {
      setShowOnboarding(true);
    }
  }, [needsOnboarding]);

  // ────────────────────────────────────────────────────────────────
  // Load Today's Data
  // ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loading && !needsOnboarding) {
      loadTodayData();
    }
  }, [loading, needsOnboarding]);

  const loadTodayData = async () => {
    setLoadingData(true);

    const today = new Date().toISOString().split("T")[0];

    try {
      // Parallel laden
      const [eventsRes, followupsRes, hotLeadsRes] = await Promise.all([
        // Kalender Events
        supabaseClient
          .from("calendar_events")
          .select("*")
          .gte("start_time", `${today}T00:00:00`)
          .lte("start_time", `${today}T23:59:59`)
          .order("start_time", { ascending: true }),

        // Follow-ups
        supabaseClient
          .from("lead_follow_up_status")
          .select("id, lead_id, current_step_code, next_follow_up_at, leads(name)")
          .eq("status", "active")
          .lte("next_follow_up_at", today)
          .order("next_follow_up_at", { ascending: true }),

        // Hot Leads
        supabaseClient
          .from("lead_scores")
          .select("lead_id, total_score, leads(name, status)")
          .gte("total_score", 70)
          .order("total_score", { ascending: false })
          .limit(5),
      ]);

      // Calendar Events
      if (eventsRes.data) {
        setCalendarEvents(eventsRes.data as CalendarEvent[]);
      }

      // Follow-ups
      if (followupsRes.data) {
        const mappedFollowups = followupsRes.data.map((f: any) => {
          const dueDate = new Date(f.next_follow_up_at);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          return {
            status_id: f.id,
            lead_id: f.lead_id,
            lead_name: f.leads?.name || null,
            current_step_code: f.current_step_code,
            next_follow_up_at: f.next_follow_up_at,
            days_overdue: Math.max(0, diffDays),
          } as FollowUpTask;
        });
        setFollowups(mappedFollowups);
      }

      // Hot Leads
      if (hotLeadsRes.data) {
        const mappedHotLeads = hotLeadsRes.data
          .filter((l: any) => l.leads)
          .map((l: any) => ({
            id: l.lead_id,
            name: l.leads.name,
            score: l.total_score,
            status: l.leads.status,
          }));
        setHotLeads(mappedHotLeads);
      }
    } catch (err) {
      console.error("Error loading today data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Onboarding Complete
  // ────────────────────────────────────────────────────────────────

  const handleOnboardingComplete = async (profileData: ProfileData, goalData: GoalData) => {
    try {
      console.log('handleOnboardingComplete: profileData =', profileData);
      console.log('handleOnboardingComplete: goalData =', goalData);
      
      await setupProfile(profileData);
      await setupMonthlyGoal(goalData.target_revenue, goalData.target_deals);
      
      console.log('handleOnboardingComplete: Success! Closing modal...');
      setShowOnboarding(false);
      
      // Daily Command neu laden
      await refetch();
    } catch (err: any) {
      console.error("handleOnboardingComplete: Error:", err);
      
      // Zeige echten Fehler im UI
      const errorMessage = err?.message || "Unbekannter Fehler beim Speichern";
      alert(`❌ Fehler beim Speichern\n\n${errorMessage}\n\nBitte versuche es erneut oder kontaktiere den Support.`);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Follow-up Actions
  // ────────────────────────────────────────────────────────────────

  const handleFollowupComplete = async (statusId: string) => {
    // Optimistic update
    setFollowups((prev) => prev.filter((f) => f.status_id !== statusId));

    // Update DB
    await supabaseClient
      .from("lead_follow_up_status")
      .update({ status: "completed" })
      .eq("id", statusId);

    // Update daily progress
    await updateProgress("followups", 1);
  };

  const handleFollowupSkip = async (statusId: string) => {
    // Optimistic update
    setFollowups((prev) => prev.filter((f) => f.status_id !== statusId));

    // Verschiebe auf morgen
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await supabaseClient
      .from("lead_follow_up_status")
      .update({ next_follow_up_at: tomorrow.toISOString().split("T")[0] })
      .eq("id", statusId);
  };

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    // TODO: Toast notification
  };

  // ────────────────────────────────────────────────────────────────
  // Hunter Actions
  // ────────────────────────────────────────────────────────────────

  const handleLoadMoreLeads = () => {
    // Navigate to Hunter page
    window.location.href = "/lead-hunter";
  };

  // ────────────────────────────────────────────────────────────────
  // Calculations
  // ────────────────────────────────────────────────────────────────

  const calculateNeededContacts = () => {
    if (!dailyPlan || !requirements) return 0;

    const totalCompleted =
      dailyPlan.completed_new_contacts + dailyPlan.completed_followups + dailyPlan.completed_meetings;
    const totalTarget =
      dailyPlan.target_new_contacts + dailyPlan.target_followups + dailyPlan.target_meetings;

    const remaining = Math.max(0, totalTarget - totalCompleted);
    
    // Subtrahiere bereits geplante (Termine + Follow-ups)
    const planned = calendarEvents.length + followups.length;
    
    return Math.max(0, remaining - planned);
  };

  const neededContacts = calculateNeededContacts();

  // ────────────────────────────────────────────────────────────────
  // Motivations-Text
  // ────────────────────────────────────────────────────────────────

  const getMotivationText = () => {
    if (!requirements || !monthlyGoal) return "";

    const { progressPercent } = requirements;
    const daysIntoMonth = new Date().getDate();
    const expectedPercent = (daysIntoMonth / 30) * 100;

    if (progressPercent >= expectedPercent + 10) {
      return "Läuft bei dir! Weiter so! 🚀";
    } else if (progressPercent >= expectedPercent - 10) {
      return "Du bist auf Kurs. Bleib dran! 💪";
    } else if (progressPercent >= expectedPercent - 25) {
      return "Noch aufholbar - Gas geben! ⚡";
    } else {
      return "Zeit für einen Sprint. Du schaffst das! 🔥";
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Loading State
  // ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-500" />
          <p className="mt-4 text-sm text-slate-400">Lade deinen Smart Daily Command...</p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Error State
  // ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 font-medium text-red-200">Fehler beim Laden</p>
          <p className="mt-2 text-sm text-red-300/80">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-red-400"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6 pb-24">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* SECTION A - Mission Control Header */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500" />
          </div>

          <div className="relative space-y-4">
            {/* Title & Motivation */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-100">Mission Control</h1>
                <p className="mt-1 text-sm text-emerald-400">{getMotivationText()}</p>
              </div>
              {requirements && requirements.progressPercent >= 80 && (
                <PartyPopper className="h-8 w-8 text-emerald-400" />
              )}
            </div>

            {/* Monthly Goal & Progress */}
            {monthlyGoal && requirements && (
              <>
                <div>
                  <p className="text-sm font-medium text-slate-400">Dein Monatsziel</p>
                  <p className="text-4xl font-bold text-slate-100">
                    {monthlyGoal.target_revenue.toLocaleString("de-DE")} €
                  </p>
                </div>

                <GoalProgressBar
                  current={monthlyGoal.current_revenue}
                  target={monthlyGoal.target_revenue}
                  label="Fortschritt"
                  showTrend
                />

                {/* Stats Grid */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <p className="text-xs text-slate-400">Restliche Tage</p>
                    <p className="text-2xl font-bold text-slate-100">{requirements.daysRemaining}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <p className="text-xs text-slate-400">Fehlender Betrag</p>
                    <p className="text-2xl font-bold text-slate-100">
                      {requirements.missingRevenue.toLocaleString("de-DE")} €
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <p className="text-xs text-slate-400">Benötigte Deals</p>
                    <p className="text-2xl font-bold text-slate-100">{requirements.neededDeals}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION B - Tages-Soll */}
        {dailyPlan && <DailyTargetCard dailyPlan={dailyPlan} />}

        {/* Grid für Blocks */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* SECTION C - Kalender Termine */}
          <CalendarBlock events={calendarEvents} loading={loadingData} />

          {/* SECTION D - Follow-up Berg */}
          <FollowUpBlock
            followups={followups}
            loading={loadingData}
            onComplete={handleFollowupComplete}
            onSkip={handleFollowupSkip}
            onCopyMessage={handleCopyMessage}
          />
        </div>

        {/* SECTION E - Hunter Neue Leads */}
        {neededContacts > 0 && (
          <HunterBlock
            needed={neededContacts}
            onLoadMore={handleLoadMoreLeads}
            loading={false}
          />
        )}

        {/* SECTION F - Hot Leads Bonus */}
        {hotLeads.length > 0 && (
          <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-red-500/10 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                <Flame className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orange-400">Hot Leads - Deine besten Chancen</h3>
                <p className="text-xs text-slate-400">Leads mit hohem Closing-Potenzial</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {hotLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-slate-900/50 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-200">{lead.name}</p>
                    <p className="text-xs text-slate-400">Score: {lead.score}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-1">
                    <Flame className="h-3 w-3 text-orange-400" />
                    <span className="text-xs font-bold text-orange-400">HOT</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Modal */}
      <StrategySetupModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};
