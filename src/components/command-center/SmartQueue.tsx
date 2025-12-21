/**
 * Smart Queue Component - Command Center V3
 * 
 * Zeigt NUR actionable Leads, gruppiert nach Priorität.
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Clock, Sparkles, Flame, 
  UserPlus, ChevronDown, ChevronUp,
  CheckCircle, Calendar, Target
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Lead {
  id: string;
  name: string;
  company?: string;
  status: string;
  temperature?: 'cold' | 'warm' | 'hot';
  score?: number;
  waiting_for_response?: boolean;
  last_inbound_message?: string;
  last_inbound_at?: string;
  suggested_action?: {
    type: string;
    reason: string;
    message: string;
    urgency?: string;
  };
  followup?: any;
  priority?: string;
}

interface QueueData {
  action_required: Lead[];
  followups_today: Lead[];
  hot_leads: Lead[];
  new_leads: Lead[];
  nurture: Lead[];
  appointments_today: Lead[];
}

interface SmartQueueProps {
  onSelectLead: (lead: Lead) => void;
  selectedLeadId?: string | null;
}

export default function SmartQueue({ onSelectLead, selectedLeadId }: SmartQueueProps) {
  const [queue, setQueue] = useState<QueueData>({
    action_required: [],
    followups_today: [],
    hot_leads: [],
    new_leads: [],
    nurture: [],
    appointments_today: []
  });
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/queue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || data);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getTemperatureEmoji = (temp?: string) => {
    switch (temp) {
      case 'hot': return '🔥';
      case 'warm': return '☀️';
      default: return '❄️';
    }
  };

  const getTemperatureLabel = (temp?: string) => {
    switch (temp) {
      case 'hot': return 'Hot';
      case 'warm': return 'Warm';
      default: return 'Cold';
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'vor wenigen Min';
    if (diffHours < 24) return `vor ${diffHours}h`;
    return `vor ${diffDays}d`;
  };

  const QueueSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    leads: Lead[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    sectionKey: string;
  }> = ({ title, icon, leads, priority, sectionKey }) => {
    if (leads.length === 0 && !showAll) return null;
    
    const isCollapsed = collapsed[sectionKey];
    const priorityColors = {
      critical: 'border-red-500/50 bg-red-500/5',
      high: 'border-orange-500/50 bg-orange-500/5',
      medium: 'border-blue-500/50 bg-blue-500/5',
      low: 'border-gray-500/50 bg-gray-500/5'
    };

    return (
      <div className="mb-6">
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full flex items-center justify-between p-3 rounded-lg border mb-2 transition-all ${priorityColors[priority]}`}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-white font-semibold">{title}</span>
            <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300">
              {leads.length}
            </span>
          </div>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {!isCollapsed && (
          <div className="space-y-2">
            {leads.slice(0, showAll ? 100 : 5).map((lead) => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all
                  ${selectedLeadId === lead.id 
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-lg' 
                    : 'border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                    <span className="text-white font-semibold">{lead.name}</span>
                    {lead.company && (
                      <span className="text-gray-500 text-sm">{lead.company}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{getTemperatureEmoji(lead.temperature)}</span>
                    <span className="text-xs text-gray-400">{getTemperatureLabel(lead.temperature)}</span>
                    {lead.score && (
                      <span className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                        {lead.score}
                      </span>
                    )}
                  </div>
                </div>

                {lead.waiting_for_response && lead.last_inbound_message && (
                  <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                    <div className="flex items-center gap-1 text-red-400 mb-1">
                      <AlertCircle className="w-3 h-3" />
                      <span className="font-medium">WARTET AUF ANTWORT</span>
                      <span className="text-gray-500">
                        ({formatTimeAgo(lead.last_inbound_at)})
                      </span>
                    </div>
                    <p className="text-gray-300 italic text-xs">
                      "{lead.last_inbound_message.substring(0, 80)}..."
                    </p>
                  </div>
                )}

                {lead.suggested_action && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Nächste Aktion: {lead.suggested_action.reason}</span>
                    </div>
                  </div>
                )}

                {lead.followup && (
                  <div className="flex items-center gap-1 text-xs text-orange-400">
                    <Clock className="w-3 h-3" />
                    <span>Follow-up geplant: {new Date(lead.followup.due_date).toLocaleDateString('de-DE')}</span>
                  </div>
                )}
              </div>
            ))}
            
            {leads.length > 5 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-2 text-center text-sm text-cyan-400 hover:text-cyan-300"
              >
                + {leads.length - 5} weitere anzeigen
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Lade Queue...
      </div>
    );
  }

  const totalActionable = Object.values(queue).reduce((sum, leads) => sum + leads.length, 0);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0d1117] to-[#0a0a0f]">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Smart Queue
          </h2>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
          >
            {showAll ? 'Weniger' : 'Alle'} anzeigen
          </button>
        </div>
        <p className="text-gray-500 text-sm">
          {totalActionable} actionable {totalActionable === 1 ? 'Lead' : 'Leads'}
        </p>
      </div>

      {/* Queue Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <QueueSection
          title="JETZT HANDELN"
          icon={<AlertCircle className="w-4 h-4 text-red-400" />}
          leads={queue.action_required}
          priority="critical"
          sectionKey="action_required"
        />

        <QueueSection
          title="FOLLOW-UP HEUTE"
          icon={<Clock className="w-4 h-4 text-orange-400" />}
          leads={queue.followups_today}
          priority="high"
          sectionKey="followups_today"
        />

        <QueueSection
          title="HOT LEADS"
          icon={<Flame className="w-4 h-4 text-orange-400" />}
          leads={queue.hot_leads}
          priority="high"
          sectionKey="hot_leads"
        />

        <QueueSection
          title="NEUE LEADS"
          icon={<UserPlus className="w-4 h-4 text-blue-400" />}
          leads={queue.new_leads}
          priority="medium"
          sectionKey="new_leads"
        />

        <QueueSection
          title="NURTURE"
          icon={<Calendar className="w-4 h-4 text-gray-400" />}
          leads={queue.nurture}
          priority="low"
          sectionKey="nurture"
        />

        {totalActionable === 0 && (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Keine actionable Leads</p>
            <p className="text-sm mt-1">Alles erledigt! 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
}

