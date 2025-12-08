import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Target,
  Sparkles,
  UserCheck,
  Crosshair,
  Upload,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Lead = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company?: string | null;
  status?: string | null;
  score?: number | null;
  qualified?: boolean;
  last_contact?: string | null;
};

const LeadsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeView, setActiveView] = useState(searchParams.get('view') || 'all');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);

  const views = [
    { id: 'all', label: 'Alle Leads', icon: Users, count: leads.length },
    { id: 'prospects', label: 'Prospects', icon: Target, count: leads.filter((l) => l.status === 'prospect').length },
    { id: 'customers', label: 'Kunden', icon: UserCheck, count: leads.filter((l) => l.status === 'customer').length },
    { id: 'hunter', label: 'Lead Hunter', icon: Crosshair, count: null, special: true },
    { id: 'discovery', label: 'AI Discovery', icon: Sparkles, count: null, special: true },
    { id: 'qualifier', label: 'Qualifier', icon: Target, count: leads.filter((l) => !l.qualified).length },
  ];

  useEffect(() => {
    fetchLeads();
  }, [activeView]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/leads';
      if (activeView === 'prospects') {
        endpoint = '/api/leads?status=prospect';
      } else if (activeView === 'customers') {
        endpoint = '/api/leads?status=customer';
      } else if (activeView === 'qualifier') {
        endpoint = '/api/leads?qualified=false';
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (viewId: string) => {
    setActiveView(viewId);
    setSearchParams({ view: viewId });
  };

  const handleQualify = (leadId: string, status: string) => {
    console.log('Qualify lead', leadId, status);
  };

  const handleAddLead = (lead: any) => {
    console.log('Add lead from hunter/discovery', lead);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const name = `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim();
      const matchesSearch =
        searchQuery === '' ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-gray-500">Verwalte und qualifiziere deine Leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowAddLead(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Neuer Lead
          </Button>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => handleViewChange(view.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
              activeView === view.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            } ${view.special ? 'border-2 border-dashed border-purple-300' : ''}`}
          >
            <view.icon className="w-4 h-4" />
            {view.label}
            {view.count !== null && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeView === view.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {view.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Suche nach Name, Email, Firma..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="all">Alle Status</option>
          <option value="new">Neu</option>
          <option value="contacted">Kontaktiert</option>
          <option value="qualified">Qualifiziert</option>
          <option value="proposal">Angebot</option>
          <option value="won">Gewonnen</option>
          <option value="lost">Verloren</option>
          <option value="prospect">Prospect</option>
          <option value="customer">Kunde</option>
        </select>
      </div>

      {/* Content based on view */}
      {activeView === 'hunter' ? (
        <LeadHunterView onAddLead={handleAddLead} />
      ) : activeView === 'discovery' ? (
        <LeadDiscoveryView />
      ) : activeView === 'qualifier' ? (
        <LeadQualifierView leads={filteredLeads} onQualify={handleQualify} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Firma</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Score</th>
                <th className="text-left p-4 font-medium">Letzter Kontakt</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    Lädt Leads …
                  </td>
                </tr>
              )}
              {!loading &&
                filteredLeads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} onClick={() => navigate(`/leads/${lead.id}`)} />
                ))}
              {!loading && filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    Keine Leads gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals (Platzhalter) */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-semibold mb-3">Lead-Import</h3>
            <p className="text-sm text-gray-600 mb-4">Import-Dialog (Platzhalter).</p>
            <Button onClick={() => setShowImport(false)}>Schließen</Button>
          </div>
        </div>
      )}

      {showAddLead && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-semibold mb-3">Neuer Lead</h3>
            <p className="text-sm text-gray-600 mb-4">Lead-Form (Platzhalter).</p>
            <Button onClick={() => setShowAddLead(false)}>Schließen</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;

// === Sub-Views ===
const LeadHunterView = ({ onAddLead }: { onAddLead: (lead: any) => void }) => {
  const [huntSource, setHuntSource] = useState('instagram');
  const [hashtag, setHashtag] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isHunting, setIsHunting] = useState(false);

  const handleHunt = async () => {
    setIsHunting(true);
    try {
      const res = await fetch('/api/leads/hunt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ source: huntSource, query: hashtag }),
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } finally {
      setIsHunting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-purple-500" />
          Lead Hunter
        </h3>
        <div className="flex gap-4">
          <select value={huntSource} onChange={(e) => setHuntSource(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="facebook">Facebook Groups</option>
          </select>
          <input
            type="text"
            placeholder={huntSource === 'instagram' ? '#hashtag eingeben' : 'Suchbegriff'}
            value={hashtag}
            onChange={(e) => setHashtag(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <Button onClick={handleHunt} disabled={isHunting}>
            {isHunting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suche...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" /> Jagen
              </>
            )}
          </Button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result) => (
            <HuntResultCard key={result.id} result={result} onAdd={() => onAddLead(result)} />
          ))}
        </div>
      )}
    </div>
  );
};

const LeadDiscoveryView = () => {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/leads/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          AI Lead Discovery
        </h3>
        <p className="text-sm text-gray-600 mb-4">AI analysiert deine besten Kunden und findet ähnliche Leads</p>
        <Button onClick={handleDiscover} disabled={isDiscovering}>
          {isDiscovering ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysiere...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" /> Leads entdecken
            </>
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">AI Vorschläge</h4>
          {suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      )}
    </div>
  );
};

const LeadQualifierView = ({ leads, onQualify }: { leads: Lead[]; onQualify: (id: string, status: string) => void }) => (
  <div className="space-y-4">
    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6">
      <p className="text-sm">
        <strong>{leads.length} Leads</strong> warten auf Qualifizierung
      </p>
    </div>

    {leads.map((lead) => (
      <div key={lead.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-medium">
              {lead.first_name} {lead.last_name}
            </h4>
            <p className="text-sm text-gray-500">{lead.company}</p>
          </div>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded">Score: {lead.score ?? '?'}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onQualify(lead.id, 'hot')}>
            🔥 Hot
          </Button>
          <Button size="sm" variant="outline" onClick={() => onQualify(lead.id, 'warm')}>
            🌡️ Warm
          </Button>
          <Button size="sm" variant="outline" onClick={() => onQualify(lead.id, 'cold')}>
            ❄️ Cold
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onQualify(lead.id, 'disqualified')}>
            ❌ Nicht relevant
          </Button>
        </div>
      </div>
    ))}
  </div>
);

// Helper Components
const LeadRow = ({ lead, onClick }: { lead: Lead; onClick: () => void }) => (
  <tr
    onClick={onClick}
    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
  >
    <td className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          {(lead.first_name?.[0] || '')}
          {(lead.last_name?.[0] || '')}
        </div>
        <div>
          <div className="font-medium">
            {lead.first_name} {lead.last_name}
          </div>
          <div className="text-sm text-gray-500">{lead.email}</div>
        </div>
      </div>
    </td>
    <td className="p-4 text-gray-600">{lead.company || '-'}</td>
    <td className="p-4">
      <StatusBadge status={lead.status} />
    </td>
    <td className="p-4">
      <ScoreBadge score={lead.score} />
    </td>
    <td className="p-4 text-sm text-gray-500">
      {lead.last_contact ? new Date(lead.last_contact).toLocaleDateString('de-DE') : '-'}
    </td>
    <td className="p-4">
      <Button size="sm" variant="ghost">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </td>
  </tr>
);

const StatusBadge = ({ status }: { status?: string | null }) => {
  if (!status) return <span className="text-xs text-gray-400">-</span>;
  const color =
    status === 'customer'
      ? 'bg-green-100 text-green-700'
      : status === 'prospect'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{status}</span>;
};

const ScoreBadge = ({ score }: { score?: number | null }) => {
  if (score === null || score === undefined) return <span className="text-xs text-gray-400">-</span>;
  const color = score > 80 ? 'text-green-600' : score > 50 ? 'text-yellow-600' : 'text-gray-600';
  return <span className={`text-sm font-semibold ${color}`}>{score}</span>;
};

const HuntResultCard = ({ result, onAdd }: { result: any; onAdd: () => void }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
    <div className="font-medium">{result.name || result.title}</div>
    <p className="text-sm text-gray-500">{result.description || result.source}</p>
    <Button size="sm" variant="outline" className="mt-3" onClick={onAdd}>
      Hinzufügen
    </Button>
  </div>
);

const SuggestionCard = ({ suggestion }: { suggestion: any }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
    <div className="font-medium">{suggestion.name || suggestion.company}</div>
    <p className="text-sm text-gray-500">{suggestion.reason || suggestion.title}</p>
  </div>
);

