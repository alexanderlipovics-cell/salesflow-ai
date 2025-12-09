import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Download,
  Plus,
  DollarSign,
  Activity,
  TrendingUp,
} from 'lucide-react';

// --- MOCK DATA (Fallback wenn API nicht verfügbar) ---
const mockRevenueData = [
  { name: 'Jan', einnahmen: 4000, ausgaben: 2400 },
  { name: 'Feb', einnahmen: 3000, ausgaben: 1398 },
  { name: 'Mär', einnahmen: 5000, ausgaben: 2800 },
  { name: 'Apr', einnahmen: 2780, ausgaben: 1908 },
  { name: 'Mai', einnahmen: 4890, ausgaben: 2800 },
  { name: 'Jun', einnahmen: 6390, ausgaben: 3800 },
  { name: 'Jul', einnahmen: 7490, ausgaben: 4300 },
  { name: 'Aug', einnahmen: 8490, ausgaben: 2100 },
  { name: 'Sep', einnahmen: 9490, ausgaben: 2300 },
  { name: 'Okt', einnahmen: 11490, ausgaben: 2500 },
  { name: 'Nov', einnahmen: 13490, ausgaben: 2100 },
  { name: 'Dez', einnahmen: 15490, ausgaben: 1200 },
];

const mockTransactions = [
  { id: 1, client: 'TechVision GmbH', service: 'Q4 Strategy Consulting', amount: '+ 4.500,00 €', status: 'paid', date: 'Heute', type: 'income', avatar: 'TV' },
  { id: 2, client: 'AWS Europe', service: 'Server Infrastructure', amount: '- 245,00 €', status: 'completed', date: 'Gestern', type: 'expense', avatar: 'AW' },
  { id: 3, client: 'Creative Studio', service: 'UX Design Retainer', amount: '+ 1.200,00 €', status: 'pending', date: '08. Dez', type: 'income', avatar: 'CS' },
  { id: 4, client: 'SalesFlow Pro', service: 'Monthly Subscription', amount: '- 49,00 €', status: 'completed', date: '01. Dez', type: 'expense', avatar: 'SF' },
  { id: 5, client: 'StartUp Inc', service: 'Growth Package', amount: '+ 3.800,00 €', status: 'paid', date: '28. Nov', type: 'income', avatar: 'SI' },
];

const mockKPIs = [
  { title: 'Einnahmen (Gesamt)', value: '45.231 €', change: '+20.1%', trend: 'up', icon: DollarSign },
  { title: 'Ausgaben', value: '12.340 €', change: '-4.5%', trend: 'down', icon: CreditCard },
  { title: 'Offene Provisionen', value: '3.450 €', change: '+12%', trend: 'up', icon: Wallet },
  { title: 'Netto Gewinn', value: '32.891 €', change: '+24.5%', trend: 'up', icon: Activity },
];

export default function FinancePage() {
  const [revenueData, setRevenueData] = useState(mockRevenueData);
  const [transactions, setTransactions] = useState(mockTransactions);
  const [kpis, setKpis] = useState(mockKPIs);
  const [isLoading, setIsLoading] = useState(true);
  const [goalProgress, setGoalProgress] = useState(75);
  const [goalCurrent, setGoalCurrent] = useState('45.2k €');
  const [goalTarget, setGoalTarget] = useState('60k €');

  useEffect(() => {
    async function loadData() {
      try {
        // Versuche echte Daten zu laden, nutze Mock als Fallback
        const [statsRes, chartRes, txRes] = await Promise.allSettled([
          fetch('/api/finance/stats'),
          fetch('/api/finance/chart-data?range=year'),
          fetch('/api/finance/transactions'),
        ]);

        // Stats/KPIs
        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const data = await statsRes.value.json();
          if (data && data.length) setKpis(mapKPIs(data));
        }

        // Chart Data
        if (chartRes.status === 'fulfilled' && chartRes.value.ok) {
          const data = await chartRes.value.json();
          if (data && data.length) setRevenueData(mapChartData(data));
        }

        // Transactions
        if (txRes.status === 'fulfilled' && txRes.value.ok) {
          const data = await txRes.value.json();
          if (data && data.length) setTransactions(mapTransactions(data));
        }
      } catch (error) {
        console.log('Using mock data (API not available)');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Data Mappers (Backend → Frontend Format)
  const mapChartData = (data: any[]) =>
    data.map((item) => ({
      name: item.month || item.name,
      einnahmen: item.revenue || item.einnahmen || 0,
      ausgaben: item.expenses || item.ausgaben || 0,
    }));

  const mapTransactions = (data: any[]) =>
    data.map((tx) => {
      const numericVal = Number(tx.amount ?? tx.value ?? 0);
      const type = tx.type === 'income' || numericVal > 0 ? 'income' : 'expense';

      return {
        id: tx.id,
        client: tx.client || tx.partner || 'Unbekannt',
        service: tx.service || tx.description || 'Transaktion',
        amount: formatAmount(numericVal, type),
        status: tx.status || 'pending',
        type,
        date: formatDate(tx.date || tx.created_at),
        avatar: getInitials(tx.client || tx.partner || 'XX'),
      };
    });

  const mapKPIs = (data: any) => mockKPIs; // Platzhalter bis Backend-Format bekannt

  const formatAmount = (val: number, type: string) => {
    const prefix = type === 'income' || val > 0 ? '+ ' : '- ';
    return `${prefix}${Math.abs(val).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Heute';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-[#0a0f1a] min-h-screen text-white flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Finanzdaten werden geladen ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-[#0a0f1a] min-h-screen text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finanzen</h1>
          <p className="text-gray-400">Einnahmen, Ausgaben & Provisionen</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Neue Transaktion
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{kpi.title}</span>
              <kpi.icon className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div
              className={`text-xs flex items-center mt-1 ${
                (kpi.trend === 'up' && kpi.title !== 'Ausgaben') || (kpi.trend === 'down' && kpi.title === 'Ausgaben')
                  ? 'text-green-500'
                  : 'text-red-500'
              }`}
            >
              {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {kpi.change} zum Vormonat
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* CHART (4/7) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Umsatzentwicklung</h2>
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button className="px-3 py-1 text-sm rounded-md text-gray-400 hover:bg-slate-700">Monat</button>
              <button className="px-3 py-1 text-sm rounded-md bg-slate-700 text-white">Jahr</button>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-4">Einnahmen vs. Ausgaben 2025</p>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorEinnahmen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAusgaben" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Area type="monotone" dataKey="einnahmen" stroke="#3b82f6" fill="url(#colorEinnahmen)" />
                <Area type="monotone" dataKey="ausgaben" stroke="#ef4444" fill="url(#colorAusgaben)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT COLUMN (3/7) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Transactions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-1">Letzte Transaktionen</h2>
            <p className="text-sm text-gray-400 mb-4">Die letzten 5 Buchungen</p>

            <div className="space-y-4">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-gray-300">
                      {tx.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.client}</p>
                      <p className="text-xs text-gray-500">{tx.service}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-green-500' : 'text-white'}`}>{tx.amount}</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        tx.status === 'paid'
                          ? 'bg-green-500/20 text-green-400'
                          : tx.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-slate-700 text-gray-400'
                      }`}
                    >
                      {tx.status === 'paid' ? 'Bezahlt' : tx.status === 'pending' ? 'Offen' : 'Fertig'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Progress */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-2">Monatsziel (Umsatz)</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{goalCurrent}</span>
              <span className="text-sm text-gray-400">Ziel: {goalTarget}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${goalProgress}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Du hast {goalProgress}% deines Ziels erreicht. Weiter so! 🎯</p>
          </div>
        </div>
      </div>
    </div>
  );
}

