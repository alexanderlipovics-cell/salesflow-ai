import React, { useEffect, useState } from "react";
import {
  Users,
  TrendingUp,
  Award,
  Target,
  Activity,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  GitBranch,
  DollarSign,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

import { ZINZINO_RANKS, ZINZINO_KPIS } from "../config/zinzinoRanks";
import { useAuth } from "../context/AuthContext";
import MLMOnboarding from "../components/network/MLMOnboarding";
import SyncReminderBanner from "../components/network/SyncReminderBanner";
import QuickUpdateModal from "../components/network/QuickUpdateModal";
import LeadToPartnerModal from "../components/network/LeadToPartnerModal";

// Mock data für MVP - später durch API ersetzen
const MOCK_DATA = {
  user: {
    current_rank: 4, // Silver
    pcp: 8,
    personal_credits: 45,
    balanced_credits: 620,
    left_leg_credits: 380,
    right_leg_credits: 240,
    z4f_customers: 2,
    active_since: "2024-03-15",
  },
  team: {
    total_partners: 12,
    active_partners: 8,
    inactive_partners: 4,
    new_this_month: 2,
    total_customers: 47,
  },
  pipeline: {
    contacts: 15,
    presentations: 5,
    follow_ups: 8,
    close_ready: 2,
  },
  recent_activity: [
    { type: "new_partner", name: "Maria S.", time: "2h ago" },
    { type: "rank_up", name: "Thomas K.", rank: "Bronze", time: "1d ago" },
    { type: "order", name: "Lisa M.", amount: "€89", time: "2d ago" },
    { type: "inactive_alert", name: "Peter H.", days: 14, time: "3d ago" },
  ],
  monthly_projection: {
    team_commission: 185,
    cash_bonus: 67,
    total: 252,
  },
};

export default function NetworkDashboard() {
  const { user: authUser } = useAuth();
  const [data, setData] = useState(MOCK_DATA);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [showSyncReminder, setShowSyncReminder] = useState(false);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const [showLeadToPartner, setShowLeadToPartner] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  useEffect(() => {
    checkSetup();
    const shouldShowReminder = checkSyncReminder();
    setShowSyncReminder(shouldShowReminder);
  }, []);

  const checkSetup = async () => {
    try {
      const response = await fetch("/api/network/has-setup");
      const { has_setup } = await response.json();
      setShowOnboarding(!has_setup);
    } catch (error) {
      console.error("Setup check failed:", error);
    } finally {
      setCheckingSetup(false);
    }
  };

  const checkSyncReminder = () => {
    const today = new Date();
    const lastDismiss = localStorage.getItem("lastMLMSyncDismiss");
    const lastSync = localStorage.getItem("lastMLMSync");

    if (lastDismiss) {
      const dismissDate = new Date(lastDismiss);
      if (
        dismissDate.getMonth() === today.getMonth() &&
        dismissDate.getFullYear() === today.getFullYear()
      ) {
        return false;
      }
    }

    if (today.getDate() <= 5) return true;

    if (lastSync) {
      const syncDate = new Date(lastSync);
      const daysSinceSync = Math.floor(
        (today.getTime() - syncDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceSync > 30;
    }

    return true;
  };

  const fetchDashboardData = () => {
    // Placeholder: In echter Implementierung Daten neu laden
    setData((prev) => ({ ...prev }));
  };

  const currentRank = ZINZINO_RANKS[data.user.current_rank];
  const nextRank = ZINZINO_RANKS[data.user.current_rank + 1];

  const calculateRankProgress = () => {
    if (!nextRank) return 100;
    const currentReq =
      nextRank.requirements.balanced_credits ||
      nextRank.requirements.pcp ||
      0;
    const userValue = data.user.balanced_credits || data.user.pcp || 0;
    return Math.min(100, Math.round((userValue / currentReq) * 100));
  };

  const balanceRatio = () => {
    const left = data.user.left_leg_credits;
    const right = data.user.right_leg_credits;
    if (left === 0 || right === 0) {
      return { ratio: "∞", isHealthy: false };
    }
    const ratio = left > right ? left / right : right / left;
    const isHealthy = ratio <= 2;
    return { ratio: ratio.toFixed(1), isHealthy };
  };

  const firstName =
    authUser?.first_name ||
    authUser?.firstName ||
    authUser?.email?.split("@")[0] ||
    "Partner";

  if (checkingSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (showOnboarding) {
    return <MLMOnboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Netzwerk Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Willkommen zurück, {firstName}. Dein Zinzino Business auf einen Blick.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowQuickUpdate(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Quick Update
            </button>
          </div>
        </div>

        {showSyncReminder && (
          <SyncReminderBanner
            onDismiss={() => setShowSyncReminder(false)}
            onQuickUpdate={() => {
              setShowSyncReminder(false);
              setShowQuickUpdate(true);
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              Aktueller Rank
            </span>
            <Award className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentRank.icon}</span>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {currentRank.name}
              </p>
              <p className="text-sm text-gray-500">
                → {nextRank?.name || "Max Rank"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Fortschritt</span>
              <span className="font-medium">{calculateRankProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${calculateRankProgress()}%`,
                  backgroundColor: nextRank?.color || currentRank.color,
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              Team Größe
            </span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.team.total_partners}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {data.team.active_partners} aktiv
            </span>
            <span className="flex items-center text-sm text-orange-500">
              <AlertCircle className="w-4 h-4 mr-1" />
              {data.team.inactive_partners} inaktiv
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            +{data.team.new_this_month} diesen Monat
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              Team Balance
            </span>
            <GitBranch className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {balanceRatio().ratio}:1
            </p>
            {balanceRatio().isHealthy ? (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                Gesund
              </span>
            ) : (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                Ausgleichen
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Links</p>
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 text-center">
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {data.user.left_leg_credits}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Rechts</p>
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded p-2 text-center">
                <span className="font-semibold text-purple-700 dark:text-purple-300">
                  {data.user.right_leg_credits}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 shadow-sm text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-green-100 text-sm">Erwartete Provision</span>
            <DollarSign className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-3xl font-bold">€{data.monthly_projection.total}</p>
          <p className="text-sm text-green-100 mt-1">diesen Monat</p>
          <div className="flex gap-4 mt-4 text-sm">
            <span>Team: €{data.monthly_projection.team_commission}</span>
            <span>Cash: €{data.monthly_projection.cash_bonus}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Team Aktivität
            </h2>
            <Link
              to="/network/team"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
            >
              Alle anzeigen <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {data.recent_activity.map((activity, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === "new_partner"
                      ? "bg-green-100 text-green-600"
                      : activity.type === "rank_up"
                      ? "bg-yellow-100 text-yellow-600"
                      : activity.type === "order"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-orange-100 text-orange-600"
                  }`}
                >
                  {activity.type === "new_partner" && (
                    <Users className="w-5 h-5" />
                  )}
                  {activity.type === "rank_up" && (
                    <Award className="w-5 h-5" />
                  )}
                  {activity.type === "order" && (
                    <DollarSign className="w-5 h-5" />
                  )}
                  {activity.type === "inactive_alert" && (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {activity.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity.type === "new_partner" && "Neuer Partner im Team"}
                    {activity.type === "rank_up" &&
                      `Aufstieg zu ${activity.rank}`}
                    {activity.type === "order" &&
                      `Bestellung: ${activity.amount}`}
                    {activity.type === "inactive_alert" &&
                      `${activity.days} Tage inaktiv`}
                  </p>
                </div>
                <span className="text-sm text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Recruitment Pipeline
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Kontakte</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.pipeline.contacts}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-gray-400 h-2 rounded-full" style={{ width: "100%" }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Präsentationen
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.pipeline.presentations}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{
                  width: `${(data.pipeline.presentations / data.pipeline.contacts) * 100}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Follow-ups
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.pipeline.follow_ups}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{
                  width: `${(data.pipeline.follow_ups / data.pipeline.contacts) * 100}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Abschlussbereit
              </span>
              <span className="font-semibold text-green-600">
                {data.pipeline.close_ready}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${(data.pipeline.close_ready / data.pipeline.contacts) * 100}%`,
                }}
              />
            </div>
          </div>

          <Link
            to="/leads"
            className="mt-6 w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" />
            Leads verwalten
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Z4F Status
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Zinzino For Free - 4 Kunden = Gratis Abo
          </p>

          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex-1 h-3 rounded-full ${
                  i <= data.user.z4f_customers
                    ? "bg-green-500"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>

          <p className="text-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.user.z4f_customers}
            </span>
            <span className="text-gray-500"> / 4 Kunden</span>
          </p>

          {data.user.z4f_customers >= 4 ? (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
              <span className="text-green-700 dark:text-green-300 font-medium">
                ✅ Z4F Qualifiziert!
              </span>
            </div>
          ) : (
            <p className="mt-4 text-center text-sm text-gray-500">
              Noch {4 - data.user.z4f_customers} Kunde(n) bis Z4F
            </p>
          )}
        </div>

        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 shadow-sm text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Coach Empfehlung</h2>
              <p className="text-indigo-200 text-sm">Basierend auf deinen Daten</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-white/90">
              🎯 <strong>Fokus diese Woche:</strong> Du bist nur 130 Credits von Silver
              entfernt! Konzentriere dich auf dein rechtes Bein - dort fehlt Balance.
              Kontaktiere Peter H., er ist seit 14 Tagen inaktiv und könnte Support
              brauchen.
            </p>
          </div>

          <div className="flex gap-3 mt-4">
            <Link
              to="/copilot"
              className="flex-1 py-2 px-4 bg-white/20 hover:bg-white/30 rounded-lg text-center transition-colors"
            >
              Mit CHIEF besprechen
            </Link>
            <Link
              to="/network/team"
              className="flex-1 py-2 px-4 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg text-center transition-colors font-medium"
            >
              Team ansehen
            </Link>
          </div>
        </div>
      </div>

      {showQuickUpdate && (
        <QuickUpdateModal
          onClose={() => setShowQuickUpdate(false)}
          onSave={() => fetchDashboardData()}
        />
      )}

      {showLeadToPartner && selectedLead && (
        <LeadToPartnerModal
          lead={selectedLead}
          onClose={() => {
            setShowLeadToPartner(false);
            setSelectedLead(null);
          }}
          onConvert={() => fetchDashboardData()}
        />
      )}
    </div>
  );
}

