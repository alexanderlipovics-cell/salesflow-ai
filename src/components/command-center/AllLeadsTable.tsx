/**
 * All Leads Table Component - Command Center V3
 * 
 * Zeigt alle Leads in einer durchsuchbaren Tabelle.
 * Für manuelle Suche außerhalb der Smart Queue.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Loader2, Filter, ArrowUpDown,
  CheckCircle, XCircle, Clock, User
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Lead {
  id: string;
  name: string;
  company?: string;
  position?: string;
  email?: string;
  phone?: string;
  status: string;
  temperature?: 'cold' | 'warm' | 'hot';
  score?: number;
  last_contact_at?: string;
  created_at: string;
  waiting_for_response?: boolean;
}

interface AllLeadsTableProps {
  onSelectLead: (lead: Lead) => void;
  selectedLeadId?: string | null;
}

type SortField = 'name' | 'status' | 'temperature' | 'score' | 'last_contact_at' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function AllLeadsTable({ onSelectLead, selectedLeadId }: AllLeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [temperatureFilter, setTemperatureFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('last_contact_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/leads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        // Handle different response formats
        const leadsData = Array.isArray(data) ? data : (data.leads || data.data || []);
        setLeads(leadsData);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = [...leads];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(query) ||
        lead.company?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Temperature filter
    if (temperatureFilter !== 'all') {
      filtered = filtered.filter(lead => lead.temperature === temperatureFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle dates
      if (sortField === 'last_contact_at' || sortField === 'created_at') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // Handle strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      // Handle numbers
      if (typeof aValue === 'number') {
        bValue = bValue || 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [leads, searchQuery, statusFilter, temperatureFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      new: { label: 'Neu', color: 'bg-cyan-500/20 text-cyan-400' },
      contacted: { label: 'Kontaktiert', color: 'bg-blue-500/20 text-blue-400' },
      qualified: { label: 'Qualifiziert', color: 'bg-green-500/20 text-green-400' },
      won: { label: 'Gewonnen', color: 'bg-emerald-500/20 text-emerald-400' },
      lost: { label: 'Verloren', color: 'bg-red-500/20 text-red-400' }
    };
    return badges[status] || { label: status, color: 'bg-gray-500/20 text-gray-400' };
  };

  const getTemperatureEmoji = (temp?: string) => {
    switch (temp) {
      case 'hot': return '🔥';
      case 'warm': return '☀️';
      default: return '❄️';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nie';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays}d`;
    return date.toLocaleDateString('de-DE');
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
    >
      {children}
      {sortField === field && (
        <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0d1117] to-[#0a0a0f]">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Alle Leads</h2>
          <span className="text-gray-500 text-sm">
            {filteredAndSortedLeads.length} von {leads.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nach Name, Firma, Email oder Telefon suchen..."
            className="w-full pl-10 pr-4 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none"
            autoFocus
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">Alle Status</option>
            <option value="new">Neu</option>
            <option value="contacted">Kontaktiert</option>
            <option value="qualified">Qualifiziert</option>
            <option value="won">Gewonnen</option>
            <option value="lost">Verloren</option>
          </select>

          <select
            value={temperatureFilter}
            onChange={(e) => setTemperatureFilter(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">Alle Temperaturen</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">☀️ Warm</option>
            <option value="cold">❄️ Cold</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0d1117] border-b border-gray-800">
            <tr>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">
                <SortButton field="name">Name</SortButton>
              </th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">
                Status
              </th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">
                <SortButton field="temperature">Temp.</SortButton>
              </th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">
                <SortButton field="score">Score</SortButton>
              </th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">
                <SortButton field="last_contact_at">Letzter Kontakt</SortButton>
              </th>
              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">
                Info
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  {searchQuery ? 'Keine Leads gefunden' : 'Keine Leads vorhanden'}
                </td>
              </tr>
            ) : (
              filteredAndSortedLeads.map((lead) => {
                const statusBadge = getStatusBadge(lead.status);
                const isSelected = selectedLeadId === lead.id;
                
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`
                      border-b border-gray-800/50 cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-cyan-500/10 hover:bg-cyan-500/15' 
                        : 'hover:bg-gray-900/50'
                      }
                    `}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xs font-semibold">
                          {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{lead.name}</div>
                          {lead.company && (
                            <div className="text-gray-500 text-xs">{lead.company}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">{getTemperatureEmoji(lead.temperature)}</span>
                    </td>
                    <td className="p-3">
                      {lead.score !== undefined ? (
                        <span className="text-cyan-400 font-semibold">{lead.score}</span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-gray-400 text-sm">
                        {formatDate(lead.last_contact_at)}
                      </div>
                      {lead.waiting_for_response && (
                        <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Wartet
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {lead.status === 'won' && (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        )}
                        {lead.status === 'lost' && (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        {lead.waiting_for_response && (
                          <Clock className="w-4 h-4 text-orange-400" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

