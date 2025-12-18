import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Flame, AlertTriangle, Loader2, Upload } from 'lucide-react';
import LeadFilters from '../components/leads/LeadFilters';
import LeadCard from '../components/leads/LeadCard';
import { Button } from '../components/ui/button';
import LeadToPartnerModal from '../components/network/LeadToPartnerModal';
import { useAuth } from '../context/AuthContext';

interface Lead {
  id: string;
  name: string;
  company?: string;
  status: string;
  score?: number;
  last_contact?: string;
  next_follow_up?: string;
  email?: string;
  phone?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const LeadList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'today' | 'hot' | 'overdue' | 'all'>('today');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeadToPartner, setShowLeadToPartner] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const isNetworker =
    user?.vertical === 'network' ||
    user?.vertical === 'network_marketing' ||
    user?.profile?.vertical === 'network' ||
    user?.profile?.vertical === 'network_marketing' ||
    user?.role === 'mlm';

  useEffect(() => {
    fetchLeads();
  }, [activeFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/leads?filter=${activeFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setError('Fehler beim Laden der Leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadClick = (leadId: string) => {
    navigate(`/leads/${leadId}`);
  };

  const handleConvert = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadToPartner(true);
  };

  const handleConverted = () => {
    if (selectedLead) {
      setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
    }
    setSelectedLead(null);
    setShowLeadToPartner(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Meine Leads
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Verwalte deine Verkaufschancen einfach und effektiv
              </p>
            </div>
            <Button
              onClick={() => navigate('/lead-list/import')}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Kontakte importieren
            </Button>
          </div>
        </div>

        {/* Filters */}
        <LeadFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          leadCounts={{
            today: leads.filter(lead => {
              if (!lead.next_follow_up) return false;
              const followUpDate = new Date(lead.next_follow_up);
              const today = new Date();
              return followUpDate.toDateString() === today.toDateString();
            }).length,
            hot: leads.filter(lead => lead.score && lead.score >= 80).length,
            overdue: leads.filter(lead => {
              if (!lead.next_follow_up) return false;
              const followUpDate = new Date(lead.next_follow_up);
              const today = new Date();
              return followUpDate < today;
            }).length,
            all: leads.length
          }}
        />

        {/* Content */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Lade Leads...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                <span className="text-red-700 dark:text-red-400">{error}</span>
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Keine Leads gefunden
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {activeFilter === 'today' && 'Keine Follow-ups für heute geplant.'}
                {activeFilter === 'hot' && 'Keine heißen Leads gefunden.'}
                {activeFilter === 'overdue' && 'Keine überfälligen Follow-ups.'}
                {activeFilter === 'all' && 'Noch keine Leads vorhanden.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => handleLeadClick(lead.id)}
                  showConvert={isNetworker && lead.status !== 'converted'}
                  onConvertClick={handleConvert}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showLeadToPartner && selectedLead && (
        <LeadToPartnerModal
          lead={selectedLead}
          onClose={() => {
            setSelectedLead(null);
            setShowLeadToPartner(false);
          }}
          onConvert={handleConverted}
        />
      )}
    </div>
  );
};

export default LeadList;
