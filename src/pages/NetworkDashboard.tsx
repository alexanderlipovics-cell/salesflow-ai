import React, { useEffect, useState } from "react";
import {
  Trophy,
  Users,
  Scale,
  DollarSign,
  MessageCircle,
  ChevronRight,
  TrendingUp,
  Sparkles,
  UserPlus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import QuickUpdateModal from "../components/network/QuickUpdateModal";
import SyncReminderBanner from "../components/network/SyncReminderBanner";

interface DashboardData {
  has_setup: boolean;
  stats: {
    total_partners: number;
    active_partners: number;
    inactive_partners: number;
    new_this_month: number;
    left_leg_credits: number;
    right_leg_credits: number;
    balanced_credits: number;
  } | null;
  rank_progress: {
    current_rank_id: number;
    current_rank_name: string;
    current_rank_icon: string;
    next_rank_name: string | null;
    progress_percent: number;
    credits_needed: number;
    credits_current: number;
  } | null;
  user_stats: {
    pcp: number;
    personal_credits: number;
    z4f_customers: number;
  } | null;
  recent_activity: Array<{
    id: string;
    type: string;
    name: string;
    time: string;
    rank?: string;
    amount?: string;
    days?: number;
  }>;
  monthly_projection: {
    team_commission: number;
    cash_bonus: number;
    total: number;
  };
  z4f_status: {
    current: number;
    target: number;
    qualified: boolean;
  };
}

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "https://salesflow-ai.onrender.com" : "http://localhost:8000");

const authHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function NetworkDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const [showSyncReminder, setShowSyncReminder] = useState(false);

  useEffect(() => {
    fetchDashboard();
    checkSyncReminder();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/network/dashboard`, {
        headers: { ...authHeaders() },
      });
      const result = await response.json();
      setData(result);
      if (!result.has_setup) setShowOnboarding(true);
    } catch (error) {
      console.error("Dashboard fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkSyncReminder = () => {
    const today = new Date();
    const lastDismiss = localStorage.getItem("lastMLMSyncDismiss");
    if (lastDismiss) {
      const dismissDate = new Date(lastDismiss);
      if (dismissDate.getMonth() === today.getMonth()) return;
    }
    if (today.getDate() <= 5) setShowSyncReminder(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (showOnboarding) {
    // MLMOnboarding entfernt - wird durch CHIEF Onboarding ersetzt
    // TODO: CHIEF Onboarding Flow implementieren
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <p className="text-slate-400">Onboarding wird geladen...</p>
      </div>
    );
  }

  if (!data || !data.stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
        <p className="text-slate-400">Keine Daten vorhanden</p>
        <button
          onClick={() => setShowOnboarding(true)}
          className="mt-4 px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700"
        >
          Setup starten
        </button>
      </div>
    );
  }

  const { stats, rank_progress, monthly_projection, recent_activity, z4f_status } = data;
  const totalCredits = stats.left_leg_credits + stats.right_leg_credits;
  const leftPercent = totalCredits > 0 ? Math.round((stats.left_leg_credits / totalCredits) * 100) : 50;
  const rightPercent = 100 - leftPercent;
  const balanceRatio =
    stats.right_leg_credits > 0
      ? (stats.left_leg_credits / stats.right_leg_credits).toFixed(1)
      : "0";

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 bg-slate-950 min-h-screen text-slate-100">
      {showSyncReminder && (
        <SyncReminderBanner
          onDismiss={() => {
            localStorage.setItem("lastMLMSyncDismiss", new Date().toISOString());
            setShowSyncReminder(false);
          }}
          onQuickUpdate={() => {
            setShowSyncReminder(false);
            setShowQuickUpdate(true);
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Netzwerk Dashboard
          </h1>
          <p className="text-slate-400">Dein Team-Wachstum und Performance auf einen Blick.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowQuickUpdate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Quick Update
          </button>
          <Link
            to="/network/settings"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Partner einladen
          </Link>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Aktueller Rank</span>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{rank_progress?.current_rank_icon || "👤"}</span>
            <div>
              <p className="text-xl font-bold text-white">{rank_progress?.current_rank_name || "Partner"}</p>
              <p className="text-sm text-slate-500">→ {rank_progress?.next_rank_name || "Max"}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Fortschritt</span>
              <span>{rank_progress?.progress_percent || 0}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${rank_progress?.progress_percent || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Team Größe</span>
            <Users className="w-5 h-5 text-cyan-500" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">{stats.total_partners} Partner</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center text-green-400">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {stats.active_partners} aktiv
            </span>
            <span className="flex items-center text-orange-400">
              <AlertCircle className="w-4 h-4 mr-1" />
              {stats.inactive_partners} inaktiv
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
            +{stats.new_this_month} diesen Monat
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Team Balance</span>
            <Scale className="w-5 h-5 text-violet-500" />
          </div>
          <div className="flex justify-between items-end mb-3">
            <div className="text-left">
              <span className="text-xs text-slate-500">Links</span>
              <p className="text-lg font-bold text-white">{stats.left_leg_credits}</p>
            </div>
            <div className="text-xs font-mono text-cyan-400 mb-1">Ratio {balanceRatio}:1</div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Rechts</span>
              <p className="text-lg font-bold text-white">{stats.right_leg_credits}</p>
            </div>
          </div>
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-800">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${leftPercent}%` }} />
            <div className="bg-violet-500 h-full transition-all duration-500" style={{ width: `${rightPercent}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">Balanced: {stats.balanced_credits} Credits</p>
        </div>

        <div className="bg-gradient-to-br from-green-900/50 to-slate-900 border border-green-900/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-green-400">Erwartete Provision</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-white">€{data.monthly_projection.total}</p>
          <p className="text-sm text-slate-400 mt-1">diesen Monat</p>
          <p className="text-xs text-slate-500 mt-2">
            Team: €{data.monthly_projection.team_commission} • Cash: €{data.monthly_projection.cash_bonus}
          </p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Team Aktivität</h2>
              <p className="text-sm text-slate-500">Was passiert in deiner Downline?</p>
            </div>
            <Link to="/network/team" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center">
              Alle anzeigen <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {data.recent_activity.length > 0 ? (
              data.recent_activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between group p-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        item.type === "new_partner"
                          ? "bg-blue-500/20 text-blue-400"
                          : item.type === "rank_up"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : item.type === "order"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-orange-500/20 text-orange-400"
                      }`}
                    >
                      {item.type === "new_partner" && <UserPlus className="w-5 h-5" />}
                      {item.type === "rank_up" && <Trophy className="w-5 h-5" />}
                      {item.type === "order" && <DollarSign className="w-5 h-5" />}
                      {item.type === "inactive_alert" && <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-sm text-slate-400">
                        {item.type === "new_partner" && "Neuer Partner im Team"}
                        {item.type === "rank_up" && `Aufstieg zu ${item.rank}`}
                        {item.type === "order" && `Bestellung: ${item.amount}`}
                        {item.type === "inactive_alert" && `${item.days} Tage inaktiv`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{item.time}</span>
                    <button
                      onClick={() => console.log(`Send message to ${item.name}`)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded-lg transition-all"
                    >
                      <MessageCircle className="w-4 h-4 text-slate-300" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">Noch keine Team-Aktivität</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Recruitment Pipeline</h2>
            <p className="text-sm text-slate-500">Dein persönlicher Trichter</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Kontakte</span>
                <span className="font-bold text-white">15</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="bg-slate-600 h-full w-full" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Präsentationen</span>
                <span className="font-bold text-white">5</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: "33%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Follow-ups</span>
                <span className="font-bold text-white">8</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="bg-yellow-500 h-full" style={{ width: "53%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Abschlussbereit</span>
                <span className="font-bold text-green-400">2</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: "13%" }} />
              </div>
            </div>

            <Link
              to="/leads"
              className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-slate-700 bg-transparent hover:bg-slate-800 text-white rounded-lg transition-colors"
            >
              Pipeline verwalten <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Z4F Status</h2>
            <p className="text-sm text-slate-500">Zinzino For Free - 4 Kunden = Gratis Abo</p>
          </div>
          {data.z4f_status.qualified && (
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">✓ Qualifiziert</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex-1 h-4 rounded-full transition-colors ${
                i <= data.z4f_status.current ? "bg-green-500" : "bg-slate-800"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-slate-400 mt-3">
          <span className="text-2xl font-bold text-white">{data.z4f_status.current}</span> / 4 Kunden
        </p>
      </div>

      <div className="bg-gradient-to-r from-violet-900/40 to-slate-900 border border-violet-900/40 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-violet-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">AI Coach Empfehlung</h3>
            <p className="text-sm text-slate-300">
              Du bist nur noch{" "}
              <span className="text-white font-bold">
                {data.rank_progress?.credits_needed
                  ? data.rank_progress.credits_needed - (data.rank_progress?.credits_current || 0)
                  : 0}{" "}
                Credits
              </span>{" "}
              von {data.rank_progress?.next_rank_name || "dem nächsten Rank"} entfernt! Konzentriere dich diese Woche auf
              deine abschlussbereiten Leads.
            </p>
          </div>
          <button
            onClick={() => {
              const creditsNeeded = data.rank_progress?.credits_needed
                ? data.rank_progress.credits_needed - (data.rank_progress?.credits_current || 0)
                : 0;
              const nextRank = data.rank_progress?.next_rank_name || "dem nächsten Rank";
              navigate('/chat', {
                state: {
                  initialMessage: `Hilf mir eine Strategie zu entwickeln um meinen nächsten Rang zu erreichen. Ich bin nur noch ${creditsNeeded} Credits von ${nextRank} entfernt. Konzentriere dich auf meine abschlussbereiten Leads.`
                }
              });
            }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            Strategie besprechen
          </button>
        </div>
      </div>

      {showQuickUpdate && (
        <QuickUpdateModal
          onClose={() => setShowQuickUpdate(false)}
          onSave={() => fetchDashboard()}
        />
      )}
    </div>
  );
}

