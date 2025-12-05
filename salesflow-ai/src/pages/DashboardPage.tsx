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
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardSkeleton } from '../components/common/DashboardSkeleton';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { StatCard } from '../components/dashboard/StatCard';
import { Activity, DollarSign, Users, TrendingUp, RefreshCw } from 'lucide-react';

// 1. Performance: Code Splitting für schwere Komponenten
// Diese werden nur geladen, wenn sie im Viewport benötigt werden
const RevenueChart = lazy(() => import('../components/dashboard/RevenueChart'));
const ActivityFeed = lazy(() => import('../components/dashboard/ActivityFeed'));

const DashboardPage: React.FC = () => {
  const { stats, charts, activities, isLoading, isError, refetchAll } = useDashboardData();
  const [timeRange, setTimeRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500/30">
      {/* 4. Responsive: Container & Padding */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              SalesFlow Übersicht
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Willkommen zurück, Commander. Bereit für heute?
            </p>
          </div>
          
          {/* Mobile-Friendly Actions */}
          <div className="flex gap-3">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm backdrop-blur-md transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="7d">Letzte 7 Tage</option>
              <option value="30d">Letzte 30 Tage</option>
              <option value="90d">Letzte 90 Tage</option>
            </select>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              Aktualisieren
            </button>
          </div>
        </div>

        {/* 1. Performance & 4. Responsive: Grid Layout & Memoized Components */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Gesamtumsatz" 
            value={formattedRevenue}
            trend={12.5} 
            icon={<DollarSign size={20} />} 
          />
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

        {/* Content Section mit Error Boundaries und Suspense */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          
          {/* Main Chart Area */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md lg:col-span-2">
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

          {/* Activity Feed / Side Panel */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
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
        </div>

        {/* Additional Info Section (Optional) */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Activity size={16} className="text-emerald-500" />
            <span>Letzte Aktualisierung: {new Date().toLocaleTimeString('de-DE')}</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
