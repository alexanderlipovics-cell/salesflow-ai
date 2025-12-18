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
  Wallet,
  CreditCard,
  Download,
  Plus,
  DollarSign,
  Activity,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Transaction {
  id: string;
  client: string;
  service: string;
  amount: string;
  status: string;
  type: 'income' | 'expense';
  date: string;
  avatar: string;
}

interface ChartData {
  name: string;
  einnahmen: number;
  ausgaben: number;
}

// Kategorien für Transaktionen
const INCOME_CATEGORIES = [
  { value: 'commission', label: 'Provision' },
  { value: 'product_sale', label: 'Produktverkauf' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'other_income', label: 'Sonstige Einnahmen' },
];

const EXPENSE_CATEGORIES = [
  { value: 'travel', label: 'Reisekosten' },
  { value: 'office', label: 'Bürokosten' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'training', label: 'Schulungen' },
  { value: 'products', label: 'Produkte' },
  { value: 'other_expense', label: 'Sonstige Ausgaben' },
];

export default function FinancePage() {
  const [summary, setSummary] = useState({ income: 0, expenses: 0, pending_commissions: 0, net_profit: 0 });
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]); // Für Export
  const [isLoading, setIsLoading] = useState(true);
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalCurrent, setGoalCurrent] = useState('0 €');
  const [goalTarget, setGoalTarget] = useState('0 €');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      console.log('[Finance] Starting data load...');
      const [summaryRes, transactionsRes, chartRes, allTransactionsRes] = await Promise.all([
        api.get<any>('/finance/summary?period=month').catch(() => ({ income: 0, expenses: 0, pending_commissions: 0, net_profit: 0 })),
        api.get<any>('/finance/transactions?limit=5').catch(() => []),
        api.get<any>('/finance/chart-data?period=year').catch(() => []),
        api.get<any>('/finance/transactions?limit=1000').catch(() => []), // Für Export
      ]);
      
      // WICHTIG: JSON nur EINMAL auslesen und in Variable speichern
      // api.get() gibt bereits die geparsten Daten zurück, NICHT ein Response-Objekt mit .data
      const rawSummaryData = (summaryRes as any)?.data || summaryRes || {};
      const txData = Array.isArray(transactionsRes) ? transactionsRes : ((transactionsRes as any)?.data || []);
      const chartData = Array.isArray(chartRes) ? chartRes : ((chartRes as any)?.data || []);
      const allTxData = Array.isArray(allTransactionsRes) ? allTransactionsRes : ((allTransactionsRes as any)?.data || []);
      
      console.log('[Finance] API Responses:', {
        summary: rawSummaryData,
        transactions: txData,
        chart: chartData,
        allTransactions: allTxData,
      });
      
      // Alle Transaktionen zuerst holen für Fallback-Berechnung
      console.log('[Finance] All transactions raw:', allTxData);
      console.log('[Finance] All transactions count:', allTxData.length);
      setAllTransactions(allTxData);
      
      // Normalize summary data - API might return total_income/total_expenses or income/expenses
      console.log('[Finance] Raw summary from API:', rawSummaryData);
      let summaryData = {
        income: Number(rawSummaryData.income || rawSummaryData.total_income || 0),
        expenses: Number(rawSummaryData.expenses || rawSummaryData.total_expenses || 0),
        pending_commissions: Number(rawSummaryData.pending_commissions || 0),
        net_profit: Number(rawSummaryData.net_profit || rawSummaryData.profit || 0),
      };
      console.log('[Finance] Normalized summary:', summaryData);
      
      // Fallback: Calculate from transactions if summary is empty but transactions exist
      if (summaryData.income === 0 && summaryData.expenses === 0 && allTxData.length > 0) {
        console.log('[Finance] Summary is 0 but transactions exist, calculating from transactions...');
        const incomeTxs = allTxData.filter((tx: any) => tx.tx_type === 'income');
        const expenseTxs = allTxData.filter((tx: any) => tx.tx_type === 'expense');
        console.log('[Finance] Income transactions:', incomeTxs);
        console.log('[Finance] Expense transactions:', expenseTxs);
        
        const calculatedIncome = incomeTxs.reduce((sum: number, tx: any) => {
          const amount = Number(tx.amount || 0);
          console.log(`[Finance] Adding income: ${amount} (from tx:`, tx, ')');
          return sum + amount;
        }, 0);
        const calculatedExpenses = expenseTxs.reduce((sum: number, tx: any) => {
          const amount = Number(tx.amount || 0);
          console.log(`[Finance] Adding expense: ${amount} (from tx:`, tx, ')');
          return sum + amount;
        }, 0);
        
        console.log('[Finance] Calculated income:', calculatedIncome);
        console.log('[Finance] Calculated expenses:', calculatedExpenses);
        
        if (calculatedIncome > 0 || calculatedExpenses > 0) {
          summaryData.income = calculatedIncome;
          summaryData.expenses = calculatedExpenses;
          summaryData.net_profit = calculatedIncome - calculatedExpenses;
          console.log('[Finance] ✅ Calculated summary from transactions:', summaryData);
        }
      }
      
      console.log('[Finance] Final summary to set:', summaryData);
      setSummary(summaryData);
      
      // Chart Data
      if (chartData.length > 0) {
        setRevenueData(mapChartData(chartData));
      } else {
        setRevenueData([]);
      }
      
      // Transactions (für Anzeige)
      console.log('[Finance] Transactions raw from API:', txData);
      console.log('[Finance] Transactions count:', txData.length);
      if (txData.length > 0) {
        const mapped = mapTransactions(txData);
        console.log('[Finance] Mapped transactions:', mapped);
        setTransactions(mapped);
        console.log('[Finance] ✅ Transactions state set to:', mapped);
      } else {
        console.log('[Finance] ⚠️ No transactions to display');
        setTransactions([]);
      }
      
      // Goal (placeholder - kann später aus API kommen)
      const target = 60000; // Beispiel-Ziel
      const current = summaryData.income || 0;
      const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      setGoalProgress(progress);
      setGoalCurrent(formatCurrency(current));
      setGoalTarget(formatCurrency(target));
    } catch (error) {
      console.error('Finance data fetch failed:', error);
      // Bei Fehler: Leere Daten anzeigen
      setSummary({ income: 0, expenses: 0, pending_commissions: 0, net_profit: 0 });
      setRevenueData([]);
      setTransactions([]);
      setAllTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Data Mappers (Backend → Frontend Format)
  const mapChartData = (data: any[]) =>
    data.map((item) => ({
      name: item.month || item.name || '',
      einnahmen: item.income || item.einnahmen || 0,
      ausgaben: item.expenses || item.ausgaben || 0,
    }));

  const mapTransactions = (data: any[]): Transaction[] =>
    data.map((tx) => {
      const numericVal = Number(tx.amount ?? 0);
      const type: 'income' | 'expense' = tx.tx_type === 'income' || tx.type === 'income' ? 'income' : 'expense';

      return {
        id: tx.id || String(Math.random()),
        client: tx.client || tx.partner || 'Unbekannt',
        service: tx.description || tx.service || 'Transaktion',
        amount: formatAmount(numericVal, type),
        status: tx.status || 'completed',
        type,
        date: formatDate(tx.date || tx.created_at),
        avatar: getInitials(tx.description || tx.client || 'XX'),
      };
    });

  const formatAmount = (val: number, type: string) => {
    const prefix = type === 'income' || val > 0 ? '+ ' : '- ';
    return `${prefix}${Math.abs(val).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  };
  
  const formatCurrency = (val: number) => {
    return `${val.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Heute';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  };

  const getInitials = (name: string) => {
    if (!name) return 'XX';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Export-Funktion
  const handleExport = () => {
    if (allTransactions.length === 0) {
      alert('Keine Transaktionen zum Exportieren vorhanden');
      return;
    }

    // CSV Header
    const csv = [
      ['Datum', 'Beschreibung', 'Kategorie', 'Typ', 'Betrag (€)', 'Status'],
      ...allTransactions.map((tx: any) => [
        tx.date || tx.created_at?.split('T')[0] || '',
        tx.description || tx.service || 'Transaktion',
        tx.category || '',
        tx.tx_type === 'income' || tx.type === 'income' ? 'Einnahme' : 'Ausgabe',
        (tx.amount || 0).toString().replace('.', ','),
        tx.status || 'completed',
      ]),
    ].map(row => row.join(';')).join('\n');

    // BOM für Excel-Kompatibilität
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzen-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Neue Transaktion speichern
  const handleSaveTransaction = async (formData: any) => {
    setIsSubmitting(true);
    try {
      await api.post('/finance/transactions', {
        amount: parseFloat(formData.amount),
        tx_type: formData.type,
        category: formData.category,
        description: formData.description,
        date: formData.date || new Date().toISOString().split('T')[0],
      });
      
      // Daten neu laden
      await loadData();
      setShowTransactionModal(false);
      alert('✅ Transaktion erfolgreich gespeichert');
    } catch (error: any) {
      console.error('Failed to save transaction:', error);
      alert('Fehler beim Speichern: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button 
            onClick={() => setShowTransactionModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Neue Transaktion
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Einnahmen (Gesamt)</span>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary.income)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Ausgaben</span>
            <CreditCard className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary.expenses)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Offene Provisionen</span>
            <Wallet className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary.pending_commissions)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Netto Gewinn</span>
            <Activity className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary.net_profit)}</div>
        </div>
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

          {revenueData.length > 0 ? (
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
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>Keine Daten verfügbar</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (3/7) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Transactions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-1">Letzte Transaktionen</h2>
            <p className="text-sm text-gray-400 mb-4">Die letzten 5 Buchungen</p>
            {/* Debug Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-2 text-xs text-gray-500">
                Debug: {transactions.length} Transaktionen geladen
              </div>
            )}

            <div className="space-y-4">
              {transactions.length > 0 ? (
                <>
                  {transactions.slice(0, 5).map((tx) => {
                    console.log('[Finance] Rendering transaction:', tx);
                    return (
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
                    );
                  })}
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Keine Transaktionen vorhanden</p>
              )}
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

      {/* Transaction Modal */}
      {showTransactionModal && (
        <TransactionModal
          onClose={() => setShowTransactionModal(false)}
          onSave={handleSaveTransaction}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

// Transaction Modal Component
function TransactionModal({ onClose, onSave, isSubmitting }: { onClose: () => void; onSave: (data: any) => void; isSubmitting: boolean }) {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category) {
      alert('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    onSave({ type, amount, description, category, date });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Neue Transaktion</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Typ Toggle */}
          <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                type === 'income'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Einnahme
            </button>
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory('');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                type === 'expense'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Ausgabe
            </button>
          </div>

          {/* Betrag */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Betrag (€) *
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Beschreibung *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Provision von Kunde XY"
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Kategorie */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Kategorie *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Bitte wählen...</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Datum */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Datum
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

