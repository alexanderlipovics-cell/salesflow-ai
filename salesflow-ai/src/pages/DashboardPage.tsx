/**
 * Dashboard Page - Optimized Version
 * 
 * Performance Optimizations:
 * - Code Splitting (lazy loading heavy components)
 * - React Query for caching & parallel fetching
 * - Memoization (React.memo, useMemo, useCallback)
 * - Skeleton screens for better UX
 * 
 * Design:
 * - Aura OS Glassmorphism
 * - Mobile-First Responsive
 * - Dark Mode Native
 * 
 * @author Gemini 3 Ultra - Frontend Optimization
 */

import React, { Suspense, lazy, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardSkeleton } from '../components/common/DashboardSkeleton';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { StatCard } from '../components/dashboard/StatCard';
import {
  Activity,
  DollarSign,
  Users,
  TrendingUp,
  RefreshCw,
  Crosshair,
  Phone,
  Trophy,
  Sparkles,
} from 'lucide-react';
import DealHealthCard from '../components/DealHealthCard';
import IncomePredictorCard from '../components/IncomePredictorCard';
import LeadContextSidebar from '../components/LeadContextSidebar';
import TurboWidget from '../components/TurboWidget';
import TurboMode from '../components/TurboMode';
import TodayWidget from '../components/dashboard/TodayWidget';

// 1. Performance: Code Splitting für schwere Komponenten
// Diese werden nur geladen, wenn sie im Viewport benötigt werden
const RevenueChart = lazy(() => import('../components/dashboard/RevenueChart'));
const ActivityFeed = lazy(() => import('../components/dashboard/ActivityFeed'));

type HunterLead = {
  id: string;
  name: string;
};

type LostLead = {
  id: string;
  name: string;
  days_ago: number;
};

type TickerActivity = {
  type: string;
  lead_name: string;
  action: string;
  time_ago: string;
};

const formatTimeAgo = (timestamp?: string) => {
  if (!timestamp) return 'gerade eben';
  const createdAt = new Date(timestamp).getTime();
  if (Number.isNaN(createdAt)) return 'gerade eben';

  const diffSeconds = Math.floor((Date.now() - createdAt) / 1000);
  if (diffSeconds < 60) return `${Math.max(diffSeconds, 1)}s`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

const EmptyCalendarCard: React.FC<{ hotLeads: HunterLead[] }> = ({ hotLeads }) => (
  <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-500/20 rounded-lg">
        <Crosshair className="w-6 h-6 text-blue-400" />
      </div>
      <div>
        <h3 className="font-bold text-white">Hunter Time 🎯</h3>
        <p className="text-sm text-gray-400">Dein Kalender ist frei. Zeit zum Jagen!</p>
      </div>
    </div>

    <p className="text-sm text-gray-300 mb-4">Diese Leads waren heute aktiv:</p>

    <div className="space-y-2">
      {hotLeads.slice(0, 3).map((lead) => (
        <div
          key={lead.id}
          className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold">
              {lead.name.charAt(0)}
            </div>
            <span className="text-white text-sm">{lead.name}</span>
          </div>
          <Phone className="w-4 h-4 text-green-400" />
        </div>
      ))}
    </div>

    <button className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors btn-glow">
      Alle Hot Leads anzeigen
    </button>
  </div>
);

const AllDoneCard: React.FC<{ lostLeads: LostLead[] }> = ({ lostLeads }) => (
  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-green-500/20 rounded-lg">
        <Trophy className="w-6 h-6 text-green-400" />
      </div>
      <div>
        <h3 className="font-bold text-white">Inbox Zero! 🎉</h3>
        <p className="text-sm text-gray-400">Alle Follow-ups erledigt. Stark!</p>
      </div>
    </div>

    <p className="text-sm text-gray-300 mb-4">💰 Money on the Table - Reaktiviere diese Leads:</p>

    <div className="space-y-2">
      {lostLeads.slice(0, 3).map((lead) => (
        <div key={lead.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
          <span className="text-gray-300 text-sm">{lead.name}</span>
          <span className="text-xs text-gray-500">Lost vor {lead.days_ago}d</span>
        </div>
      ))}
    </div>

    <button className="w-full mt-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg font-medium text-green-400 transition-colors btn-glow">
      Lost Deals reaktivieren
    </button>
  </div>
);

const ActivityTicker: React.FC<{ activities: TickerActivity[] }> = ({ activities }) => (
  <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-xs text-gray-400 uppercase tracking-wider">Live Aktivität</span>
    </div>

    <div className="space-y-2">
      {activities.slice(0, 3).map((activity, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              activity.type === 'email_opened'
                ? 'bg-green-500'
                : activity.type === 'link_clicked'
                ? 'bg-blue-500'
                : activity.type === 'website_visit'
                ? 'bg-purple-500'
                : 'bg-gray-500'
            }`}
          />
          <span className="text-gray-300">{activity.lead_name}</span>
          <span className="text-gray-500">{activity.action}</span>
          <span className="text-gray-600 ml-auto">{activity.time_ago}</span>
        </div>
      ))}
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { stats, charts, activities, isLoading, isError, refetchAll } = useDashboardData();
  const [timeRange, setTimeRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTurbo, setShowTurbo] = useState(false);
  const navigate = useNavigate();

  const hotLeads = useMemo<HunterLead[]>(
    () => [
      { id: 'hl-1', name: 'Lena Storm' },
      { id: 'hl-2', name: 'Noah Braun' },
      { id: 'hl-3', name: 'Sofia Reich' },
      { id: 'hl-4', name: 'Timo Hartmann' },
      { id: 'hl-5', name: 'Mara Keller' },
    ],
    []
  );

  const lostLeads = useMemo<LostLead[]>(
    () => [
      { id: 'll-1', name: 'Voltify - CFO', days_ago: 6 },
      { id: 'll-2', name: 'Nordbyte - Ops', days_ago: 11 },
      { id: 'll-3', name: 'Flowmatic - RevOps', days_ago: 19 },
    ],
    []
  );

  const tickerItems = useMemo<TickerActivity[]>(() => {
    if (!activities?.length) {
      return [
        {
          type: 'email_opened',
          lead_name: 'Thomas Müller',
          action: 'hat deine E-Mail geöffnet',
          time_ago: '2m',
        },
        {
          type: 'website_visit',
          lead_name: 'Anna Schmidt',
          action: 'hat Pricing-Seite besucht',
          time_ago: '15m',
        },
        {
          type: 'link_clicked',
          lead_name: 'Jonas Weber',
          action: 'klickte auf Case Study',
          time_ago: '22m',
        },
      ];
    }

    return activities.slice(0, 5).map((activity) => ({
      type: activity.type,
      lead_name: activity.user || 'Lead',
      action: activity.message || 'hat reagiert',
      time_ago: formatTimeAgo(activity.timestamp),
    }));
  }, [activities]);

  const priorityLead = useMemo(
    () => ({
      id: hotLeads[0]?.id ?? 'priority-lead',
      name: hotLeads[0]?.name ?? 'Prime Lead',
      position: 'Head of Revenue',
      company: 'Aurora Labs',
      sentiment: 'positive',
      phone: '+49 30 1234567',
      email: 'sales@auroralabs.ai',
      linkedin: 'https://www.linkedin.com/in/revenue-lead',
      status: 'Kontaktiert',
      deal_value: 48000,
      temperature: 'warm',
      last_contact_days: 2,
      ai_insight:
        'Reagiert gut auf ROI-Vergleiche mit Wettbewerbern. Pitch auf 90 Tage Payback zuspitzen.',
      personality_type: 'Driver / Visionary',
      deal_progress: 68,
    }),
    [hotLeads]
  );

  const handleCallLead = useCallback((lead: typeof priorityLead) => {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`);
    }
  }, []);

  const handleEmailLead = useCallback((lead: typeof priorityLead) => {
    if (lead.email) {
      window.open(`mailto:${lead.email}`);
    }
  }, []);

  // 1. Performance: useCallback verhindert, dass diese Funktion bei jedem Render neu erstellt wird
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchAll();
    setTimeout(() => setIsRefreshing(false), 500); // Minimum animation time
  }, [refetchAll]);

  // 1. Performance: useMemo für teure Berechnungen
  const totalRevenue = useMemo(() => {
    if (!stats) return 0;
    return stats.revenue;
  }, [stats]);

  const formattedRevenue = useMemo(() => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(totalRevenue);
  }, [totalRevenue]);

  // 3. UX: Loading State Handling
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // 3. UX: Error State Handling
  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-400">Fehler beim Laden des Dashboards</h2>
          <button 
            onClick={handleRefresh} 
            className="mt-4 rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Mission Control</p>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
              Hunter Mode aktiviert
            </h1>
            <p className="text-sm text-gray-400">Keine Leerlaufzeit. Immer einen nächsten Move parat.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/lead-hunter')}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2 transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 border border-gray-700 hover:border-blue-500/50 btn-glow"
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              Lead analysieren
            </button>
            <button
              onClick={() => navigate('/follow-ups')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg font-medium transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/30"
            >
              Follow-ups öffnen
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-all hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              Aktualisieren
            </button>
          </div>
        </div>

        <div className="mb-6">
          <TurboWidget onOpenTurbo={() => setShowTurbo(true)} />
        </div>

        {/* Heute dran Widget */}
        <div className="mb-6">
          <TodayWidget onLeadClick={(leadId) => navigate(`/leads/${leadId}`)} />
        </div>

        <ActivityTicker activities={tickerItems} />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Gesamtumsatz" value={formattedRevenue} trend={12.5} icon={<DollarSign size={20} />} />
          <StatCard
            title="Aktive Leads"
            value={stats?.activeLeads?.toString() || '0'}
            trend={-2.4}
            icon={<Users size={20} />}
          />
          <StatCard
            title="Conversion Rate"
            value={`${stats?.conversionRate || 0}%`}
            trend={5.1}
            icon={<TrendingUp size={20} />}
          />
          <StatCard
            title="AI Interaktionen"
            value={stats?.aiInteractions?.toString() || '0'}
            trend={24.8}
            icon={<Activity size={20} />}
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-gray-800/60 bg-gray-900/70 p-6 backdrop-blur-md">
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div className="flex h-80 items-center justify-center text-gray-500">
                      <div className="text-center">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
                        <p className="mt-4 text-sm">Lade Chart...</p>
                      </div>
                    </div>
                  }
                >
                  <RevenueChart data={charts} range={timeRange} />
                </Suspense>
              </ErrorBoundary>
            </div>

            {!activities?.length && (
              <div className="grid gap-6 lg:grid-cols-2">
                <EmptyCalendarCard hotLeads={hotLeads} />
                <AllDoneCard lostLeads={lostLeads} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-gray-800/60 bg-gray-900/70 p-6 backdrop-blur-md">
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-white/5" />
                      ))}
                    </div>
                  }
                >
                  <ActivityFeed activities={activities} />
                </Suspense>
              </ErrorBoundary>
            </div>

            <IncomePredictorCard />

            <DealHealthCard onLeadClick={(id) => navigate(`/leads/${id}`)} />

            <div className="flex justify-end">
              <LeadContextSidebar
                lead={priorityLead}
                onCall={handleCallLead}
                onEmail={handleEmailLead}
                onEdit={() => navigate('/leads/prospects')}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-800/60 bg-gray-900/70 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Activity size={16} className="text-emerald-500" />
            <span>Letzte Aktualisierung: {new Date().toLocaleTimeString('de-DE')}</span>
          </div>
        </div>
      </main>
      {showTurbo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <TurboMode onClose={() => setShowTurbo(false)} />
            <button
              onClick={() => setShowTurbo(false)}
              className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
