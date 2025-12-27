/**
 * Al Sales Solutions - Main Dashboard
 * Clean, actionable, performance-focused
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "../hooks/useDashboardData";
import { DashboardSkeleton } from "../components/common/DashboardSkeleton";
import { GreetingHeader } from "../components/dashboard/GreetingHeader";
import { KPICard } from "../components/dashboard/KPICard";
import { QuickActions } from "../components/dashboard/QuickActions";
import { TodaysTasks } from "../components/dashboard/TodaysTasks";
import { PipelineOverview } from "../components/dashboard/PipelineOverview";
import { AIInsights } from "../components/dashboard/AIInsights";
import FollowupWidget from "../components/dashboard/FollowupWidget";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, Tooltip, Legend } from "recharts";
import { useAuth } from "../context/AuthContext";
import { Activity, ArrowDownRight, ArrowUpRight, Euro, Target, Users, Clock3 } from "lucide-react";
import { supabaseClient } from "../lib/supabaseClient";
import api from "../lib/api";

const formatCurrency = (value: number) =>
  Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value || 0);

const DashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { kpis, todaysTasks, pipeline, activities, chartData, insights, isLoading } = useDashboardData();
  const hasTasksToday = (todaysTasks ?? []).length > 0;
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        if (!user) {
          return;
        }
        const { data: userData } = await supabaseClient.auth.getUser();
        const authUser = userData?.user;
        if (!authUser) {
          return;
        }

        const { data: profile } = await supabaseClient
          .from("users")
          .select("onboarding_complete, name, vertical, email")
          .eq("id", authUser.id)
          .single();

        let resolvedName =
          profile?.name ||
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          (authUser.email ? authUser.email.split("@")[0] : undefined);

        // Zusätzlicher Lookup: user_knowledge (company_description kann Name enthalten, z.B. "Alex Lipovics - Gründer ...")
        try {
          const { data: knowledge } = await supabaseClient
            .from("user_knowledge")
            .select("company_description")
            .eq("user_id", authUser.id)
            .maybeSingle();
          if (knowledge?.company_description) {
            const parsed = knowledge.company_description.split(" - ")[0]?.trim();
            if (parsed) {
              resolvedName = parsed;
            }
          }
        } catch (knowledgeErr) {
          console.warn("Dashboard: could not load user_knowledge", knowledgeErr);
        }

        setUserName(resolvedName || "User");

        // REMOVED: Old onboarding check - CHIEF handles onboarding now
        // if (!profile || profile.onboarding_complete === false) {
        //   console.warn("Dashboard: onboarding incomplete -> redirect /onboarding", { profile });
        //   navigate("/onboarding", { replace: true });
        //   return;
        // }
      } catch {
        const fallback =
          user?.first_name ||
          user?.firstName ||
          (user?.name ? user.name.split(" ")[0] : undefined) ||
          (user?.email ? user.email.split("@")[0] : undefined) ||
          "User";
        setUserName(fallback);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [navigate, user]);

  useEffect(() => {
    const loadUserName = async () => {
      if (!user?.id) return;
      try {
        // Erst user_knowledge lesen (company_description enthält evtl. "Alex Lipovics - ...")
        const { data: knowledge } = await supabaseClient
          .from("user_knowledge")
          .select("company_description")
          .eq("user_id", user.id)
          .maybeSingle();

        if (knowledge?.company_description) {
          const name = knowledge.company_description.split(" - ")[0]?.trim();
          if (name) {
            setUserName(name.split(" ")[0] || name);
            return;
          }
        }

        // Fallback: users Tabelle
        const { data: userData } = await supabaseClient
          .from("users")
          .select("name, full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (userData?.name || userData?.full_name) {
          const fullName = (userData.name || userData.full_name || "").trim();
          if (fullName) {
            setUserName(fullName.split(" ")[0] || fullName);
            return;
          }
        }

        // Letzter Fallback: Email-Prefix
        if (user.email) {
          setUserName(user.email.split("@")[0]);
        }
      } catch (err) {
        console.warn("Dashboard: loadUserName failed", err);
      }
    };

    loadUserName();
  }, [user]);

  // Load user name from /api/auth/me (primary source for first_name)
  useEffect(() => {
    const fetchAuthMe = async () => {
      try {
        const userData = await api.get("/auth/me");
        console.log("[Dashboard] auth/me response:", userData);
        
        // Priority: first_name > name > full_name
        if (userData?.first_name) {
          setUserName(userData.first_name);
        } else if (userData?.name) {
          const nameParts = userData.name.split(" ");
          setUserName(nameParts[0] || userData.name);
        } else if (userData?.full_name) {
          const nameParts = userData.full_name.split(" ");
          setUserName(nameParts[0] || userData.full_name);
        }
      } catch (err) {
        console.warn("Dashboard: /api/auth/me failed", err);
      }
    };
    fetchAuthMe();
  }, []);

  const firstName =
    userName ||
    user?.first_name ||
    user?.firstName ||
    (user?.name ? user.name.split(" ")[0] : undefined) ||
    (user?.email ? user.email.split("@")[0] : undefined) ||
    "User";

  useEffect(() => {
    console.log("[Dashboard] Greeting name debug", {
      userName,
      userFirstName: user?.first_name || user?.firstName,
      userNameFull: user?.name,
      userEmail: user?.email,
      firstName,
    });
  }, [userName, user, firstName]);

  const kpiCards = useMemo(
    () => [
      {
        title: "Leads gesamt",
        value: kpis.leadsTotal,
        icon: <Users className="h-5 w-5" />,
        color: "cyan" as const,
        trend: { value: 12, isPositive: true },
      },
      {
        title: "Follow-ups heute",
        value: kpis.followUpsToday,
        icon: <Clock3 className="h-5 w-5" />,
        color: "red" as const,
        trend: { value: -3, isPositive: false },
      },
      {
        title: "Abschlüsse (Monat)",
        value: kpis.dealsThisMonth,
        icon: <Target className="h-5 w-5" />,
        color: "green" as const,
        trend: { value: 5, isPositive: true },
      },
      {
        title: "Pipeline Wert",
        value: formatCurrency(kpis.pipelineValue),
        icon: <Euro className="h-5 w-5" />,
        color: "yellow" as const,
        trend: { value: 2, isPositive: true },
      },
    ],
    [kpis]
  );

  const chartContent =
    chartData && chartData.length > 0 ? (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString("de-DE", { month: "short", day: "numeric" })}
          />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb" }}
            labelFormatter={(value) => new Date(value).toLocaleDateString("de-DE")}
          />
          <Legend />
          <Line type="monotone" dataKey="leads" stroke="#22d3ee" strokeWidth={2} dot={false} name="Leads" />
          <Line type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={2} dot={false} name="Abschlüsse" />
          <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={false} name="Umsatz" />
        </LineChart>
      </ResponsiveContainer>
    ) : (
      <div className="flex h-60 items-center justify-center text-sm text-gray-400">
        Noch keine Verlaufsdaten verfügbar.
      </div>
    );

  if (authLoading || isLoading || checkingOnboarding) {
    return <DashboardSkeleton />;
  }

  console.log("[Dashboard] received from hook:", {
    kpis,
    todaysTasks,
    pipelineCount: pipeline?.length,
    activitiesCount: activities?.length,
    chartDataCount: chartData?.length,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* SECTION 1: HEADER */}
        <GreetingHeader firstName={firstName} followUpsToday={kpis.followUpsToday} />

        {/* SECTION 2: KPI CARDS */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <KPICard key={card.title} {...card} />
          ))}
        </div>

        {/* SECTION 3: QUICK ACTIONS */}
        <div className="mt-6">
          <QuickActions />
        </div>

        {/* SECTION 4: TWO COLUMN LAYOUT */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-semibold text-white">
                  {hasTasksToday ? "Heute zu erledigen" : "Hot Leads"}
                </div>
                <button
                  onClick={() => navigate("/follow-ups")}
                  className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Alle anzeigen →
                </button>
              </div>
              {hasTasksToday ? (
                <TodaysTasks tasks={todaysTasks} isLoading={isLoading} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-300">Keine heutigen Tasks. Schau dir stattdessen deine heißesten Leads an:</p>
                  <ActivityFeed activities={activities?.slice(0, 3) || []} />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-semibold text-white">Deine Pipeline</div>
              </div>
              <PipelineOverview stages={pipeline} isLoading={isLoading} />
            </div>
          </div>

          <div className="space-y-6">
            <FollowupWidget />
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-5 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
              <div className="mb-3 text-lg font-semibold text-white">AI Insights</div>
              <AIInsights
                insights={insights}
                isLoading={isLoading}
                onInsightClick={(insight) => navigate("/follow-ups", { state: { insight } })}
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <ActivityFeed activities={activities} />
            </div>
          </div>
        </div>

        {/* SECTION 5: PERFORMANCE CHART */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="h-4 w-4 text-cyan-300" />
              Performance (7 Tage)
            </div>
          </div>
          {chartContent}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
