import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  Calculator,
  Download,
  Plus,
} from 'lucide-react';

const defaultStats = {
  monthlyIncome: 0,
  monthlyExpenses: 0,
  pendingCommissions: 0,
  netIncome: 0,
  incomeTrend: '+0%',
  expenseTrend: '-0%',
  monthlyData: [],
  paidCommissions: 0,
  pendingCommissionsCount: 0,
  currentIncome: 0,
  monthlyGoal: 5000,
};

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [transactions, setTransactions] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [commissionFilter, setCommissionFilter] = useState('all');
  const [commissionPeriod, setCommissionPeriod] = useState('month');
  const [txType, setTxType] = useState('all');
  const [txMonth, setTxMonth] = useState('');
  const [calcSaleValue, setCalcSaleValue] = useState('');
  const [calcLevel, setCalcLevel] = useState('starter');

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [transRes, commRes, statsRes] = await Promise.all([
        fetch('/api/finance/transactions', { headers }),
        fetch('/api/finance/commissions', { headers }),
        fetch('/api/finance/stats', { headers }),
      ]);
      const t = await transRes.json();
      const c = await commRes.json();
      const s = await statsRes.json();
      setTransactions(Array.isArray(t) ? t : t?.transactions || []);
      setCommissions(Array.isArray(c) ? c : c?.commissions || []);
      setStats({ ...defaultStats, ...(s || {}) });
    } catch (error) {
      console.error('Failed to fetch finance data:', error);
      setTransactions([]);
      setCommissions([]);
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Placeholder export
    alert('Export gestartet (Platzhalter).');
  };

  const handleEditTransaction = (tx) => {
    console.log('Edit transaction', tx);
  };

  const handleDeleteTransaction = (id) => {
    console.log('Delete transaction', id);
  };

  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      const statusOk = commissionFilter === 'all' || c.status === commissionFilter;
      return statusOk;
    });
  }, [commissions, commissionFilter]);

  const commissionStats = useMemo(() => {
    const paid = filteredCommissions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + (c.amount || 0), 0);
    const pending = filteredCommissions.filter((c) => c.status === 'pending').reduce((sum, c) => sum + (c.amount || 0), 0);
    return { paid, pending, total: paid + pending };
  }, [filteredCommissions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const typeOk = txType === 'all' || tx.type === txType || tx.tx_type === txType;
      const monthOk = !txMonth || (tx.date || tx.tx_date || '').startsWith(txMonth);
      return typeOk && monthOk;
    });
  }, [transactions, txType, txMonth]);

  const calculatedCommission = useMemo(() => {
    const level = calcLevel;
    const rateMap = {
      starter: 0.05,
      bronze: 0.08,
      silver: 0.12,
      gold: 0.15,
      platinum: 0.2,
    };
    const rate = rateMap[level] || 0.05;
    const base = parseFloat(calcSaleValue) || 0;
    return Math.round(base * rate);
  }, [calcSaleValue, calcLevel]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Finanzen
          </h1>
          <p className="text-gray-500">Einnahmen, Ausgaben & Provisionen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddTransaction(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Transaktion
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Einnahmen (Monat)" value={`€${(stats.monthlyIncome || 0).toLocaleString('de-DE')}`} icon={TrendingUp} trend={stats.incomeTrend} trendUp />
        <StatCard label="Ausgaben (Monat)" value={`€${(stats.monthlyExpenses || 0).toLocaleString('de-DE')}`} icon={TrendingDown} trend={stats.expenseTrend} />
        <StatCard label="Provisionen (offen)" value={`€${(stats.pendingCommissions || 0).toLocaleString('de-DE')}`} icon={Receipt} />
        <StatCard label="Netto (Monat)" value={`€${(stats.netIncome || 0).toLocaleString('de-DE')}`} icon={PiggyBank} highlight />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Provisionen
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Transaktionen
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Rechner
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Einnahmen vs Ausgaben</h3>
              <IncomeExpenseChart data={stats.monthlyData} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Letzte Aktivitäten</h3>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} compact />
                ))}
                {!transactions.length && <p className="text-sm text-gray-500">Keine Transaktionen</p>}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Provisionen diesen Monat</h3>
              <div className="space-y-3">
                <Row label="Ausgezahlt" value={`€${(stats.paidCommissions || 0).toLocaleString('de-DE')}`} color="text-green-600" />
                <Row label="Ausstehend" value={`€${(stats.pendingCommissions || 0).toLocaleString('de-DE')}`} color="text-yellow-600" />
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Gesamt</span>
                  <span className="font-bold">
                    €
                    {(
                      (stats.paidCommissions || 0) +
                      (stats.pendingCommissions || 0)
                    ).toLocaleString('de-DE')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Monatsziel</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>€{(stats.currentIncome || 0).toLocaleString('de-DE')}</span>
                  <span>€{(stats.monthlyGoal || 5000).toLocaleString('de-DE')}</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                    style={{
                      width: `${Math.min(100, ((stats.currentIncome || 0) / (stats.monthlyGoal || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  {Math.round(((stats.currentIncome || 0) / (stats.monthlyGoal || 1)) * 100)}% erreicht
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Commissions */}
        <TabsContent value="commissions">
          <div className="space-y-6">
            <div className="flex gap-4">
              <select value={commissionFilter} onChange={(e) => setCommissionFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="all">Alle Status</option>
                <option value="pending">Ausstehend</option>
                <option value="paid">Ausgezahlt</option>
                <option value="cancelled">Storniert</option>
              </select>
              <select value={commissionPeriod} onChange={(e) => setCommissionPeriod(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="month">Dieser Monat</option>
                <option value="quarter">Dieses Quartal</option>
                <option value="year">Dieses Jahr</option>
                <option value="all">Alle Zeit</option>
              </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-left p-4 font-medium">Deal / Lead</th>
                    <th className="text-left p-4 font-medium">Datum</th>
                    <th className="text-left p-4 font-medium">Stufe</th>
                    <th className="text-right p-4 font-medium">Betrag</th>
                    <th className="text-left p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommissions.map((commission) => (
                    <tr key={commission.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{commission.dealName || commission.deal_name}</p>
                          <p className="text-sm text-gray-500">{commission.leadName || commission.lead_name}</p>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{new Date(commission.date || commission.commission_month).toLocaleDateString('de-DE')}</td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">{commission.level || commission.commission_level}</span>
                      </td>
                      <td className="p-4 text-right font-medium">€{(commission.amount || commission.commission_amount || 0).toLocaleString('de-DE')}</td>
                      <td className="p-4">
                        <StatusBadge status={commission.status || 'pending'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCommissions.length === 0 && <div className="p-8 text-center text-gray-500">Keine Provisionen gefunden</div>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <SummaryPill label="Ausgezahlt" value={commissionStats.paid} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
              <SummaryPill label="Ausstehend" value={commissionStats.pending} color="text-yellow-600" bg="bg-yellow-50 dark:bg-yellow-900/20" />
              <SummaryPill label="Gesamt" value={commissionStats.total} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            </div>
          </div>
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions">
          <div className="space-y-4">
            <div className="flex gap-4">
              <select value={txType} onChange={(e) => setTxType(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="all">Alle Typen</option>
                <option value="income">Einnahmen</option>
                <option value="expense">Ausgaben</option>
              </select>
              <input type="month" value={txMonth} onChange={(e) => setTxMonth(e.target.value)} className="px-4 py-2 border rounded-lg" />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              {filteredTransactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} onEdit={() => handleEditTransaction(tx)} onDelete={() => handleDeleteTransaction(tx.id)} />
              ))}
              {filteredTransactions.length === 0 && <div className="p-8 text-center text-gray-500">Keine Transaktionen gefunden</div>}
            </div>
          </div>
        </TabsContent>

        {/* Calculator */}
        <TabsContent value="calculator">
          <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Provisions-Rechner
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Verkaufswert (€)</label>
                  <input
                    type="number"
                    value={calcSaleValue}
                    onChange={(e) => setCalcSaleValue(e.target.value)}
                    className="w-full p-3 border rounded-lg text-lg"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Provisionsstufe</label>
                  <select value={calcLevel} onChange={(e) => setCalcLevel(e.target.value)} className="w-full p-3 border rounded-lg">
                    <option value="starter">Starter (5%)</option>
                    <option value="bronze">Bronze (8%)</option>
                    <option value="silver">Silber (12%)</option>
                    <option value="gold">Gold (15%)</option>
                    <option value="platinum">Platin (20%)</option>
                  </select>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Deine Provision</p>
                    <p className="text-4xl font-bold text-green-600">€{calculatedCommission.toLocaleString('de-DE')}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              Für detaillierte Berechnungen nutze den{' '}
              <Link to="/compensation-simulator" className="text-blue-500 hover:underline">
                Vergütungsrechner
              </Link>
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {showAddTransaction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-semibold mb-3">Neue Transaktion</h3>
            <p className="text-sm text-gray-600 mb-4">Formular (Platzhalter).</p>
            <Button onClick={() => setShowAddTransaction(false)}>Schließen</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ label, value, icon: Icon, trend, trendUp, highlight }) => (
  <div
    className={`rounded-xl p-4 shadow-sm ${
      highlight ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-white dark:bg-gray-800'
    }`}
  >
    <div className="flex items-center justify-between mb-2">
      <Icon className={`w-5 h-5 ${highlight ? 'text-white/80' : 'text-gray-400'}`} />
      {trend && <span className={`text-xs ${trendUp ? 'text-green-500' : 'text-red-500'} ${highlight ? '!text-white/80' : ''}`}>{trend}</span>}
    </div>
    <div className={`text-2xl font-bold ${highlight ? '' : ''}`}>{value}</div>
    <div className={`text-sm ${highlight ? 'text-white/80' : 'text-gray-500'}`}>{label}</div>
  </div>
);

const Row = ({ label, value, color }) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}</span>
    <span className={`font-medium ${color}`}>{value}</span>
  </div>
);

const SummaryPill = ({ label, value, color, bg }) => (
  <div className={`${bg} rounded-xl p-4 text-center`}>
    <p className={`text-sm ${color.replace('text-', 'text-')}`}>{label}</p>
    <p className={`text-xl font-bold ${color}`}>€{(value || 0).toLocaleString('de-DE')}</p>
  </div>
);

const TransactionRow = ({ transaction, compact, onEdit, onDelete }) => (
  <div className={`flex items-center justify-between ${compact ? 'py-2' : 'p-4 border-b border-gray-100 dark:border-gray-700'}`}>
    <div className="flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          (transaction.type || transaction.tx_type) === 'income'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
            : 'bg-red-100 dark:bg-red-900/30 text-red-600'
        }`}
      >
        {(transaction.type || transaction.tx_type) === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      </div>
      <div>
        <p className="font-medium">{transaction.description || transaction.title}</p>
        <p className="text-xs text-gray-500">
          {transaction.date ? new Date(transaction.date).toLocaleDateString('de-DE') : transaction.tx_date ? new Date(transaction.tx_date).toLocaleDateString('de-DE') : ''}
          {transaction.category && ` • ${transaction.category}`}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span
        className={`font-semibold ${
          (transaction.type || transaction.tx_type) === 'income' ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {(transaction.type || transaction.tx_type) === 'income' ? '+' : '-'}€{(transaction.amount || 0).toLocaleString('de-DE')}
      </span>
      {!compact && (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            {/* Pencil icon could be added if available */}
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            {/* Trash icon could be added if available */}
            Löschen
          </Button>
        </div>
      )}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const labels = {
    paid: 'Ausgezahlt',
    pending: 'Ausstehend',
    cancelled: 'Storniert',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || styles.pending}`}>
      {labels[status] || labels.pending}
    </span>
  );
};

const IncomeExpenseChart = ({ data }) => (
  <div className="h-48 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center text-sm text-gray-500">
    {data?.length ? 'Chart Placeholder' : 'Keine Daten'}
  </div>
);

