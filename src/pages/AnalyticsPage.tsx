import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, Target, Zap, Wallet,
  ArrowUpRight, ArrowDownRight, Sparkles, Calendar,
  CheckCircle, XCircle, Clock, MessageSquare
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  AreaChart, Area, CartesianGrid, PieChart, Pie
} from 'recharts';
import { getCommissionMultiplier, calculateExpectedRevenue } from '../lib/plans';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://salesflow-ai.onrender.com';

const COLORS = ['#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const STATUS_COLORS = {
  new: '#3B82F6',
  contacted: '#8B5CF6',
  engaged: '#F59E0B',
  qualified: '#10B981',
  won: '#22C55E',
  lost: '#EF4444'
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/leads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
      calculateStats(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Analytics load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (leadsData) => {
    const now = new Date();
    const thisMonth = now.getMonth();

    const won = leadsData.filter(l => l.status === 'won');
    const lost = leadsData.filter(l => l.status === 'lost');
    const active = leadsData.filter(l => !['won', 'lost'].includes(l.status));

    // Commission calculation (Zinzino average: 250€ per close)
    const baseCommission = 250;
    const multiplier = getCommissionMultiplier();
    const totalRevenue = won.length * baseCommission * multiplier;

    // AI-assisted (leads with followup_suggestions)
    const aiAssisted = won.filter(l => l.ai_assisted || l.followup_count > 0).length;
    const aiRevenue = aiAssisted * baseCommission * multiplier;

    // Pipeline value
    const pipelineValue = active.length * calculateExpectedRevenue(baseCommission, 0.2);

    // Conversion rate
    const totalClosed = won.length + lost.length;
    const conversionRate = totalClosed > 0 ? Math.round((won.length / totalClosed) * 100) : 0;

    setStats({
      totalLeads: leadsData.length,
      activeLeads: active.length,
      wonDeals: won.length,
      lostDeals: lost.length,
      conversionRate,
      totalRevenue,
      aiRevenue,
      aiContribution: totalRevenue > 0 ? Math.round((aiRevenue / totalRevenue) * 100) : 0,
      pipelineValue,
      multiplier,
      isDoubleMonth: multiplier === 2
    });
  };

  // Leads by Status Chart Data
  const statusChartData = useMemo(() => {
    const counts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: STATUS_COLORS[status] || '#6B7280'
    }));
  }, [leads]);

  // Stat Card Component
  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'cyan', trend }) => (
    <div className="bg-[#1A202C] border border-gray-700/50 rounded-2xl p-6 hover:border-cyan-500/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${color}-500/10`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-white text-3xl font-bold">{value}</p>
      {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1419] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1419] p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-cyan-500" />
            Analytics
          </h1>
          <p className="text-gray-400 mt-1">Deine Performance auf einen Blick</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 bg-[#1A202C] p-1 rounded-xl border border-gray-700">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p === '7d' ? '7 Tage' : p === '30d' ? '30 Tage' : '90 Tage'}
            </button>
          ))}
        </div>
      </div>

      {/* Double Commission Banner */}
      {stats?.isDoubleMonth && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4 mb-8 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/20 rounded-xl">
            <Zap className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-yellow-400 font-bold">🔥 Double Commission Month!</h3>
            <p className="text-yellow-200/70 text-sm">Alle Provisionen werden diesen Monat verdoppelt!</p>
          </div>
        </div>
      )}

      {/* Revenue Predictor Card */}
      <div className="bg-gradient-to-br from-[#1A202C] to-[#1E293B] border border-cyan-500/20 rounded-2xl p-6 mb-8 shadow-lg shadow-cyan-500/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <Wallet className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Revenue Predictor</h2>
              <p className="text-gray-400 text-sm">Basierend auf AI-Performance & Pipeline</p>
            </div>
          </div>
          <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            CHIEF AI INSIGHTS
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Revenue */}
          <div className="space-y-1">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Erzielter Umsatz</p>
            <p className="text-4xl font-black text-white">€{stats?.totalRevenue?.toLocaleString() || 0}</p>
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <TrendingUp className="w-3 h-3" />
              {stats?.wonDeals || 0} Abschlüsse
            </div>
          </div>

          {/* AI Value Added */}
          <div className="space-y-1 p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/20 relative overflow-hidden">
            <Sparkles className="absolute -right-2 -top-2 w-16 h-16 text-cyan-500/10" />
            <p className="text-cyan-400 text-xs uppercase tracking-wider font-bold">AI Value Added</p>
            <p className="text-4xl font-black text-white">€{stats?.aiRevenue?.toLocaleString() || 0}</p>
            <p className="text-gray-500 text-xs">{stats?.aiContribution || 0}% durch CHIEF generiert</p>
          </div>

          {/* Pipeline Forecast */}
          <div className="space-y-1">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Pipeline Prognose</p>
            <p className="text-4xl font-black text-gray-400">€{stats?.pipelineValue?.toLocaleString() || 0}</p>
            <div className="flex items-center gap-1 text-cyan-400/50 text-xs">
              <Target className="w-3 h-3" />
              {stats?.activeLeads || 0} aktive Leads
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Gesamt Leads"
          value={stats?.totalLeads || 0}
          icon={Users}
          color="cyan"
        />
        <StatCard
          title="Aktive Leads"
          value={stats?.activeLeads || 0}
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Gewonnen"
          value={stats?.wonDeals || 0}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats?.conversionRate || 0}%`}
          icon={Target}
          color="yellow"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        <div className="bg-[#1A202C] border border-gray-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            Leads nach Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData}>
                <XAxis
                  dataKey="name"
                  stroke="#4B5563"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#4B5563" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                  contentStyle={{
                    backgroundColor: '#1A202C',
                    border: '1px solid #374151',
                    borderRadius: '12px'
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-[#1A202C] border border-gray-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Performance Übersicht
          </h3>
          <div className="space-y-4">
            {/* Won vs Lost */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400 text-sm">Gewonnen</span>
                  <span className="text-green-400 font-bold">{stats?.wonDeals || 0}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats?.totalLeads ? (stats.wonDeals / stats.totalLeads) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400 text-sm">Verloren</span>
                  <span className="text-red-400 font-bold">{stats?.lostDeals || 0}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats?.totalLeads ? (stats.lostDeals / stats.totalLeads) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400 text-sm">In Bearbeitung</span>
                  <span className="text-cyan-400 font-bold">{stats?.activeLeads || 0}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats?.totalLeads ? (stats.activeLeads / stats.totalLeads) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* AI Contribution */}
            <div className="mt-6 p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-bold">CHIEF AI Beitrag</span>
              </div>
              <p className="text-gray-400 text-sm">
                {stats?.aiContribution || 0}% deiner Abschlüsse wurden durch AI-gestützte Follow-ups generiert.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
