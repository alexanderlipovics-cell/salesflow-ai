import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Download, 
  Send, 
  Plus, 
  Filter, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  X,
  Loader2
} from 'lucide-react';
import { useApi, useMutation } from '@/hooks/useApi';
import { supabaseClient } from '@/lib/supabaseClient';

// --- Types & Interfaces ---

type CommissionStatus = 'pending' | 'paid' | 'overdue';

interface Commission {
  id: string;
  deal_id: string;
  deal_name?: string; // Optional, falls vom Backend geliefert
  deal_value: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  tax_amount: number;
  status: CommissionStatus;
  commission_month: string; // ISO Date String
}

interface CommissionSummary {
  total_commission: number;
  total_net: number;
  total_gross: number;
  total_tax: number;
  pending_count: number;
}

interface CreateCommissionFormData {
  deal_id: string;
  deal_value: number;
  commission_rate: number;
  commission_month: string;
}

// --- Helper Functions ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const getStatusColor = (status: CommissionStatus) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800 border-green-200';
    case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const getStatusIcon = (status: CommissionStatus) => {
  switch (status) {
    case 'paid': return <CheckCircle className="w-4 h-4 mr-1" />;
    case 'overdue': return <AlertCircle className="w-4 h-4 mr-1" />;
    default: return <Clock className="w-4 h-4 mr-1" />;
  }
};

// --- Component ---

export default function CommissionTrackerPage() {
  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Hooks
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<CreateCommissionFormData>({
    defaultValues: {
      commission_rate: 10, // Default 10%
      commission_month: new Date().toISOString().slice(0, 10)
    }
  });

  // Derived values for preview in modal
  const watchedValue = watch('deal_value');
  const watchedRate = watch('commission_rate');
  const calculatedPreview = useMemo(() => {
    if (watchedValue && watchedRate) {
      return (watchedValue * (watchedRate / 100));
    }
    return 0;
  }, [watchedValue, watchedRate]);

  // API Hooks - Nutze bestehende useApi Infrastruktur
  const monthParam = `${selectedMonth}-01`;
  const commissionsQuery = useApi<Commission[]>(
    () => {
      let url = `/api/commissions?month=${monthParam}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      return url;
    },
    { immediate: true }
  );

  const summaryQuery = useApi<CommissionSummary>(
    `/api/commissions/summary?month=${monthParam}`,
    { immediate: true }
  );

  // Refetch when filters change
  useEffect(() => {
    commissionsQuery.refetch();
    summaryQuery.refetch();
  }, [selectedMonth, statusFilter]);

  // Create Commission Mutation
  const createCommission = useMutation<Commission>(
    'post',
    '/api/commissions',
    {
      onSuccess: () => {
        commissionsQuery.refetch();
        summaryQuery.refetch();
        setIsModalOpen(false);
        reset();
      },
      onError: (error) => {
        alert(`Fehler beim Speichern: ${error.message}`);
      }
    }
  );

  const handleCreateCommission = async (data: CreateCommissionFormData) => {
    await createCommission.mutate({
      ...data,
      status: 'pending' // Default status
    });
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(`/api/commissions/${id}/invoice`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) throw new Error("Download fehlgeschlagen");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF konnte nicht heruntergeladen werden.");
    }
  };

  const handleSendToAccounting = async (id: string) => {
    if (!confirm("Rechnung wirklich an die Buchhaltung senden?")) return;
    
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(`/api/commissions/${id}/send-to-accounting`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) throw new Error("Senden fehlgeschlagen");
      alert("Erfolgreich an Buchhaltung gesendet!");
      
      // Refresh data
      commissionsQuery.refetch();
      summaryQuery.refetch();
    } catch (err) {
      alert("Fehler beim Senden.");
    }
  };

  // --- Render Helpers ---

  const loading = commissionsQuery.isLoading || summaryQuery.isLoading;
  const error = commissionsQuery.error || summaryQuery.error;
  const commissions = commissionsQuery.data || [];
  const summary = summaryQuery.data;

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg m-4 border border-red-200">
        <AlertCircle className="w-12 h-12 mx-auto mb-2" />
        <h3 className="font-bold text-lg">Fehler aufgetreten</h3>
        <p>{error.message || "Konnte Provisionsdaten nicht laden."}</p>
        <button 
          onClick={() => {
            commissionsQuery.refetch();
            summaryQuery.refetch();
          }} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">💰 Commission Tracker</h1>
            <p className="text-slate-500">Verwalten und Verfolgen Ihrer Vertriebsprovisionen</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Neue Provision
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Monat:</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">Alle Status</option>
              <option value="pending">Ausstehend</option>
              <option value="paid">Bezahlt</option>
              <option value="overdue">Überfällig</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard 
            title="Gesamt Brutto" 
            value={summary?.total_gross || 0} 
            icon={<DollarSign className="text-blue-600" />} 
            loading={loading}
          />
          <SummaryCard 
            title="Gesamt Netto" 
            value={summary?.total_net || 0} 
            icon={<CheckCircle className="text-green-600" />} 
            loading={loading}
          />
           <SummaryCard 
            title="Steuer (Tax)" 
            value={summary?.total_tax || 0} 
            icon={<Filter className="text-gray-400" />}
            subtext="MwSt / Tax"
            loading={loading}
          />
          <SummaryCard 
            title="Offene Provisionen" 
            value={summary?.pending_count || 0} 
            isCurrency={false}
            icon={<Clock className="text-orange-500" />} 
            loading={loading}
          />
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
             <div className="p-12 flex justify-center items-center">
               <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deal / ID</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Deal Wert</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Prov. %</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Betrag (Netto)</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Keine Provisionen für diesen Zeitraum gefunden.
                      </td>
                    </tr>
                  ) : commissions.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{item.deal_name || "Unbekannter Deal"}</div>
                        <div className="text-xs text-gray-400 font-mono mt-1">{item.deal_id}</div>
                      </td>
                      <td className="p-4 text-right font-medium text-gray-600">
                        {formatCurrency(item.deal_value)}
                      </td>
                      <td className="p-4 text-right text-gray-600">
                        {item.commission_rate}%
                      </td>
                      <td className="p-4 text-right font-bold text-gray-900">
                        {formatCurrency(item.net_amount)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleDownloadPDF(item.id)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="PDF Export"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleSendToAccounting(item.id)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="An Buchhaltung senden"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Neue Provision erfassen</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handleCreateCommission)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deal ID / Referenz</label>
                <input 
                  {...register('deal_id', { required: "Deal ID ist erforderlich" })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="z.B. DEAL-2023-001"
                />
                {errors.deal_id && <span className="text-xs text-red-500">{errors.deal_id.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deal Wert (€)</label>
                  <input 
                    type="number"
                    step="0.01"
                    {...register('deal_value', { required: true, min: 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provision (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    {...register('commission_rate', { required: true, min: 0, max: 100 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buchungsmonat</label>
                <input 
                  type="date"
                  {...register('commission_month', { required: true })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Live Preview Calculation */}
              <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
                <span className="text-sm text-blue-800 font-medium">Voraussichtliche Provision:</span>
                <span className="text-lg font-bold text-blue-900">{formatCurrency(calculatedPreview)}</span>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  disabled={createCommission.isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {createCommission.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Subcomponents ---

const SummaryCard = ({ 
  title, 
  value, 
  icon, 
  subtext, 
  isCurrency = true,
  loading 
}: { 
  title: string, 
  value: number, 
  icon: React.ReactNode, 
  subtext?: string,
  isCurrency?: boolean,
  loading: boolean
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
      ) : (
        <h3 className="text-2xl font-bold text-gray-900">
          {isCurrency ? formatCurrency(value) : value}
        </h3>
      )}
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
    <div className="p-3 bg-gray-50 rounded-lg">
      {icon}
    </div>
  </div>
);

