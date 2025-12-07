import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Activity, 
  DollarSign, 
  Phone,
  Lightbulb,
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useApi, useMutation } from '@/hooks/useApi';
import { format } from 'date-fns';

// --- Types ---

interface Issue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  metric: string;
  value?: number;
  benchmark?: number;
  impact?: string;
  recommendation: string;
  priority?: number;
}

interface Recommendation {
  title: string;
  description: string;
  action_items: string[];
  expected_impact: string;
  priority?: number;
  effort?: string;
}

interface PerformanceInsight {
  id: string;
  period_start: string;
  period_end: string;
  period_type: string;
  calls_made: number;
  calls_completed: number;
  meetings_booked: number;
  meetings_completed: number;
  deals_created: number;
  deals_won: number;
  deals_lost: number;
  revenue: number;
  conversion_rate: number;
  average_deal_size: number;
  detected_issues: Issue[];
  recommendations: Recommendation[];
}

// --- Components ---

const KPICard = ({ title, value, prevValue, icon: Icon, format = 'number' }: any) => {
  const isPositive = value >= prevValue;
  const diff = prevValue ? ((value - prevValue) / prevValue) * 100 : 0;
  
  const formattedValue = format === 'currency' 
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
    : format === 'percent' ? `${value.toFixed(1)}%` : value;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{formattedValue}</h3>
        </div>
        <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {prevValue !== undefined && (
        <div className="mt-4 flex items-center text-sm">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={isPositive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {Math.abs(diff).toFixed(1)}%
          </span>
          <span className="text-slate-400 ml-1">vs. Vorperiode</span>
        </div>
      )}
    </div>
  );
};

export default function PerformanceInsightsPage() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const date = new Date();
    date.setDate(1);
    return format(date, 'yyyy-MM-dd');
  });
  const [periodEnd, setPeriodEnd] = useState<string>(() => {
    const date = new Date();
    return format(date, 'yyyy-MM-dd');
  });

  // API Hook - Nutze bestehende Infrastruktur
  const analyzeMutation = useMutation<PerformanceInsight>(
    'post',
    () => `/api/performance-insights/analyze?period_start=${periodStart}&period_end=${periodEnd}&period_type=${period}`,
    {
      onSuccess: (data) => {
        // Data wird automatisch gesetzt
      }
    }
  );

  const insightsQuery = useApi<PerformanceInsight[]>(
    '/api/performance-insights/my-insights',
    { immediate: true }
  );

  // Trigger Analysis on period change
  useEffect(() => {
    const calculatePeriod = () => {
      const end = new Date();
      let start = new Date();
      
      if (period === 'month') {
        start.setDate(1);
      } else if (period === 'quarter') {
        const quarter = Math.floor(end.getMonth() / 3);
        start.setMonth(quarter * 3);
        start.setDate(1);
      } else {
        start.setMonth(0);
        start.setDate(1);
      }
      
      setPeriodStart(format(start, 'yyyy-MM-dd'));
      setPeriodEnd(format(end, 'yyyy-MM-dd'));
    };
    
    calculatePeriod();
  }, [period]);

  useEffect(() => {
    if (periodStart && periodEnd) {
      analyzeMutation.mutate();
    }
  }, [periodStart, periodEnd, period]);

  const data = analyzeMutation.data;
  const loading = analyzeMutation.isLoading || insightsQuery.isLoading;
  const error = analyzeMutation.error || insightsQuery.error;

  // Chart Data (vereinfacht - könnte aus API kommen)
  const CHART_DATA = data ? [
    { name: 'Woche 1', calls: Math.floor(data.calls_made / 4), deals: Math.floor(data.deals_won / 4) },
    { name: 'Woche 2', calls: Math.floor(data.calls_made / 4), deals: Math.floor(data.deals_won / 4) },
    { name: 'Woche 3', calls: Math.floor(data.calls_made / 4), deals: Math.floor(data.deals_won / 4) },
    { name: 'Woche 4', calls: Math.floor(data.calls_made / 4), deals: Math.floor(data.deals_won / 4) },
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500">Analysiere Performance Daten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <h3 className="font-bold text-lg text-red-800">Fehler beim Laden</h3>
          <p className="text-red-600">{error.message || "Konnte Performance-Daten nicht laden."}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="text-center text-slate-500">
          Keine Daten verfügbar. Starte eine Analyse für den gewählten Zeitraum.
        </div>
      </div>
    );
  }

  // Vergleichswerte (vereinfacht - sollten aus API kommen)
  const prevRevenue = data.revenue * 0.9; // Mock
  const prevCalls = Math.floor(data.calls_made * 0.9);
  const prevDeals = Math.floor(data.deals_won * 0.9);
  const prevConversion = data.conversion_rate * 1.1;

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">📈 Performance Insights</h1>
          <p className="text-slate-500">
            Deine Vertriebsanalyse für {format(new Date(data.period_start), 'dd.MM.yyyy')} bis {format(new Date(data.period_end), 'dd.MM.yyyy')}
          </p>
        </div>
        
        <div className="flex bg-white rounded-lg border border-slate-200 p-1">
          {(['month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize",
                period === p ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {p === 'month' ? 'Monat' : p === 'quarter' ? 'Quartal' : 'Jahr'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Revenue" 
          value={data.revenue} 
          prevValue={prevRevenue} 
          icon={DollarSign} 
          format="currency" 
        />
        <KPICard 
          title="Calls Made" 
          value={data.calls_made} 
          prevValue={prevCalls} 
          icon={Phone} 
        />
        <KPICard 
          title="Deals Won" 
          value={data.deals_won} 
          prevValue={prevDeals} 
          icon={CheckCircle} 
        />
        <KPICard 
          title="Conversion Rate" 
          value={data.conversion_rate} 
          prevValue={prevConversion} 
          icon={Activity} 
          format="percent" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Charts Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Aktivität & Ergebnisse</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis yAxisId="left" stroke="#64748b" />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} name="Calls" activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={2} name="Deals" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issues & Recommendations */}
        <div className="space-y-6">
          
          {/* Detected Issues */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Erkannte Probleme
            </h3>
            <div className="space-y-3">
              {data.detected_issues && data.detected_issues.length > 0 ? (
                data.detected_issues.map((issue, idx) => (
                  <div key={idx} className={clsx(
                    "p-3 rounded-lg border-l-4 text-sm",
                    issue.severity === 'high' ? "bg-red-50 border-red-500" : 
                    issue.severity === 'medium' ? "bg-amber-50 border-amber-500" : "bg-blue-50 border-blue-500"
                  )}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-800">{issue.type}</span>
                      <span className="text-xs uppercase tracking-wider font-bold opacity-70">{issue.severity}</span>
                    </div>
                    <p className="text-slate-600 mb-2">{issue.recommendation}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Keine Probleme erkannt. Weiter so! 🎉</p>
              )}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-300" />
              <h3 className="text-lg font-bold">AI Coach Empfehlung</h3>
            </div>
            {data.recommendations && data.recommendations.length > 0 ? (
              data.recommendations.map((rec, idx) => (
                <div key={idx}>
                  <h4 className="font-semibold text-lg mb-2">{rec.title}</h4>
                  <p className="text-indigo-100 text-sm mb-4">{rec.description}</p>
                  
                  <div className="bg-white/10 rounded-lg p-3 mb-3">
                    <p className="text-xs font-bold text-indigo-200 uppercase mb-2">Action Items:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {rec.action_items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm font-medium text-green-300">
                    <TrendingUp className="w-4 h-4" />
                    Impact: {rec.expected_impact}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-indigo-100 text-sm">Keine spezifischen Empfehlungen. Du bist auf dem richtigen Weg! 💪</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

