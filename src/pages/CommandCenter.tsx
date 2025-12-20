import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Phone, Calendar, FileText, XCircle, Send, 
  ChevronDown, ChevronUp, Mail, MessageSquare,
  Instagram, Flame, Clock, Sparkles, Target,
  TrendingUp, User, Building, Copy, Check
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://salesflow-ai.onrender.com';

// ============================================================================
// TYPES
// ============================================================================

interface Lead {
  id: string;
  name: string;
  company?: string;
  position?: string;
  email?: string;
  phone?: string;
  instagram_url?: string;
  status: string;
  temperature?: 'cold' | 'warm' | 'hot';
  score?: number;
  last_activity?: string;
  last_contact_at?: string;
  created_at: string;
  notes?: string;
}

interface TimelineItem {
  id: string;
  type: 'email' | 'call' | 'message' | 'status_change' | 'note' | 'chief';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface ChiefInsight {
  strategy: string;
  suggested_response?: string;
  next_action?: string;
}

// ============================================================================
// SMART FEED (Left Column)
// ============================================================================

interface SmartFeedProps {
  leads: Lead[];
  selectedId: string | null;
  onSelect: (lead: Lead) => void;
}

const SmartFeed: React.FC<SmartFeedProps> = ({ leads, selectedId, onSelect }) => {
  
  const getTemperatureIcon = (temp?: string) => {
    switch (temp) {
      case 'hot': return <Flame className="w-3 h-3 text-orange-500" />;
      case 'warm': return <span className="text-yellow-500">☀️</span>;
      default: return <span className="text-blue-400">❄️</span>;
    }
  };

  const getPriorityBadge = (lead: Lead) => {
    if (lead.temperature === 'hot') return '🔥';
    if (lead.status === 'contacted' && !lead.last_contact_at) return '⏰';
    if (lead.status === 'new') return '🆕';
    return null;
  };

  const getLastActivity = (lead: Lead) => {
    if (!lead.last_activity) return 'Neu';
    const date = new Date(lead.last_activity);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Gerade eben';
    if (diffHours < 24) return `vor ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays}d`;
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]/50 border-r border-cyan-500/10">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/10">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          Smart Feed
        </h2>
        <p className="text-gray-500 text-xs mt-1">{leads.length} Leads priorisiert</p>
      </div>

      {/* Lead List */}
      <div className="flex-1 overflow-y-auto">
        {leads.map((lead, index) => (
          <div
            key={lead.id}
            onClick={() => onSelect(lead)}
            className={`
              p-3 cursor-pointer transition-all duration-200 border-l-2
              ${selectedId === lead.id 
                ? 'bg-cyan-500/10 border-l-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
                : 'border-l-transparent hover:bg-white/5'
              }
            `}
          >
            <div className="flex items-center gap-3">
              {/* Avatar with Ring */}
              <div className={`
                relative w-10 h-10 rounded-full flex items-center justify-center
                text-white font-medium text-sm
                ${selectedId === lead.id 
                  ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a0f]' 
                  : 'bg-gradient-to-br from-gray-600 to-gray-700'
                }
              `}>
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                
                {/* Temperature Indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0a0a0f] flex items-center justify-center">
                  {getTemperatureIcon(lead.temperature)}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm truncate">
                    {lead.name}
                  </span>
                  {getPriorityBadge(lead) && (
                    <span className="text-xs">{getPriorityBadge(lead)}</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs truncate">
                  {getLastActivity(lead)}
                </p>
              </div>

              {/* Score */}
              <div className="text-cyan-400 text-sm font-medium">
                {lead.score || 0}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Keyboard Hint */}
      <div className="p-3 border-t border-cyan-500/10 text-center">
        <p className="text-gray-600 text-xs">
          <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">↑</kbd>
          <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 ml-1">↓</kbd>
          <span className="ml-2">Navigation</span>
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// DOSSIER (Center Column)
// ============================================================================

interface DossierProps {
  lead: Lead | null;
  timeline: TimelineItem[];
  onStatusChange: (status: string) => void;
  onTemperatureChange: (temp: string) => void;
}

const Dossier: React.FC<DossierProps> = ({ lead, timeline, onStatusChange, onTemperatureChange }) => {
  if (!lead) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Wähle einen Lead aus dem Feed</p>
        </div>
      </div>
    );
  }

  const statuses = [
    { key: 'new', label: 'Neu' },
    { key: 'contacted', label: 'Kontaktiert' },
    { key: 'qualified', label: 'Qualifiziert' },
    { key: 'won', label: 'Gewonnen' },
  ];

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4 text-cyan-400" />;
      case 'call': return <Phone className="w-4 h-4 text-green-400" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'status_change': return <TrendingUp className="w-4 h-4 text-yellow-400" />;
      case 'chief': return <Sparkles className="w-4 h-4 text-cyan-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Profile Card */}
      <div className="bg-[#14141e]/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white text-2xl font-bold">
              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">{lead.name}</h1>
            {lead.position && (
              <p className="text-gray-400 text-sm">{lead.position}</p>
            )}
            {lead.company && (
              <p className="text-gray-500 text-sm flex items-center gap-1">
                <Building className="w-3 h-3" />
                {lead.company}
              </p>
            )}
            
            {/* Temperature Badges */}
            <div className="flex gap-2 mt-3">
              {['cold', 'warm', 'hot'].map((temp) => (
                <button
                  key={temp}
                  onClick={() => onTemperatureChange(temp)}
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium transition-all
                    ${lead.temperature === temp
                      ? temp === 'hot' 
                        ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500'
                        : temp === 'warm'
                          ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500'
                          : 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                    }
                  `}
                >
                  {temp === 'hot' ? '🔥 Hot' : temp === 'warm' ? '☀️ Warm' : '❄️ Cold'}
                </button>
              ))}
            </div>
          </div>

          {/* Score Ring */}
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="#1f2937"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="#06B6D4"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(lead.score || 0) * 2.2} 220`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-cyan-400 text-2xl font-bold">{lead.score || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex gap-2 mb-6">
        {statuses.map((s, i) => (
          <React.Fragment key={s.key}>
            <button
              onClick={() => onStatusChange(s.key)}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                ${lead.status === s.key
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-[#14141e] text-gray-500 hover:bg-gray-800 border border-gray-800'
                }
              `}
            >
              {s.label}
            </button>
            {i < statuses.length - 1 && (
              <div className="flex items-center text-gray-700">→</div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Living Timeline */}
      <div className="flex-1">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Living Timeline
        </h3>
        
        <div className="space-y-3">
          {timeline.length > 0 ? timeline.map((item) => (
            <div
              key={item.id}
              className="bg-[#14141e]/60 border border-gray-800 rounded-xl p-4 hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  {getTimelineIcon(item.type)}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{item.content}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(item.timestamp).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-600">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Noch keine Aktivitäten</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CHIEF COPILOT (Right Column)
// ============================================================================

interface ChiefCopilotProps {
  lead: Lead | null;
  insight: ChiefInsight | null;
  onSendMessage: (message: string, channel: string) => void;
  onLogCall: () => void;
  onSetAppointment: () => void;
  onAddNote: (note: string) => void;
  onMarkLost: () => void;
}

const ChiefCopilot: React.FC<ChiefCopilotProps> = ({
  lead,
  insight,
  onSendMessage,
  onLogCall,
  onSetAppointment,
  onAddNote,
  onMarkLost,
}) => {
  const [pastedResponse, setPastedResponse] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-analyze when response is pasted
  useEffect(() => {
    if (pastedResponse.length > 10) {
      analyzeResponse();
    }
  }, [pastedResponse]);

  const analyzeResponse = async () => {
    if (!lead || !pastedResponse) return;
    
    setIsAnalyzing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/chief/process-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: lead.id,
          lead_reply: pastedResponse,
          current_state: lead.status
        })
      });
      
      const data = await res.json();
      if (data.generated_response) {
        setDraftMessage(data.generated_response);
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = (channel: string) => {
    if (draftMessage) {
      onSendMessage(draftMessage, channel);
      setDraftMessage('');
      setPastedResponse('');
    }
  };

  if (!lead) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-[#0a0a0f]/50 border-l border-cyan-500/10">
        <div className="text-center p-6">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>CHIEF wartet auf einen Lead...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]/50 border-l border-cyan-500/10">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/10">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Chief Copilot
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Mission Control / AI Insight */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-4">
          <h3 className="text-cyan-400 text-sm font-medium flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" />
            Mission Control
          </h3>
          <p className="text-gray-300 text-sm">
            {insight?.strategy || `Strategie: Warte auf Interaktion mit ${lead.name}. Analysiere die Situation und schlage nächste Schritte vor.`}
          </p>
        </div>

        {/* Response Input */}
        <div className="bg-[#14141e]/80 border border-gray-800 rounded-xl p-4">
          <label className="text-gray-400 text-sm mb-2 block">
            Antwort einfügen (Strg+V)
          </label>
          <textarea
            ref={inputRef}
            value={pastedResponse}
            onChange={(e) => setPastedResponse(e.target.value)}
            placeholder="Lead-Antwort hier reinpasten..."
            className="w-full h-24 bg-[#0a0a0f] border border-gray-700 rounded-lg p-3 text-white text-sm resize-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
          {isAnalyzing && (
            <div className="flex items-center gap-2 mt-2 text-cyan-400 text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
              CHIEF analysiert...
            </div>
          )}
        </div>

        {/* Draft Box */}
        {draftMessage && (
          <div className="bg-[#14141e]/80 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-cyan-400 text-sm font-medium">Draft-Box</h3>
              <button
                onClick={handleCopyDraft}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-white text-sm whitespace-pre-wrap">{draftMessage}</p>
            
            {/* Send Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleSend('whatsapp')}
                className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={() => handleSend('instagram')}
                className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </button>
              <button
                onClick={() => handleSend('email')}
                className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-gray-400 text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onLogCall}
              className="p-4 bg-[#14141e] border border-gray-800 rounded-xl hover:border-green-500/50 hover:bg-green-500/5 transition-all group"
            >
              <Phone className="w-6 h-6 text-green-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-gray-400 text-sm">Anruf</span>
            </button>
            <button
              onClick={onSetAppointment}
              className="p-4 bg-[#14141e] border border-gray-800 rounded-xl hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
            >
              <Calendar className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-gray-400 text-sm">Termin</span>
            </button>
            <button
              onClick={() => {
                const note = prompt('Notiz eingeben:');
                if (note) onAddNote(note);
              }}
              className="p-4 bg-[#14141e] border border-gray-800 rounded-xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group"
            >
              <FileText className="w-6 h-6 text-yellow-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-gray-400 text-sm">Notiz</span>
            </button>
            <button
              onClick={onMarkLost}
              className="p-4 bg-[#14141e] border border-gray-800 rounded-xl hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
            >
              <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-gray-400 text-sm">Verloren</span>
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="p-3 border-t border-cyan-500/10 bg-[#0a0a0f]/80">
        <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-600">
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Strg+Enter</kbd> Senden</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Strg+C</kbd> Call</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Esc</kbd> Skip</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMMAND CENTER
// ============================================================================

export default function CommandCenter() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [insight, setInsight] = useState<ChiefInsight | null>(null);
  const [loading, setLoading] = useState(true);

  // Load leads with smart priority sorting
  useEffect(() => {
    loadLeads();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!leads.length) return;

      const currentIndex = selectedLead 
        ? leads.findIndex(l => l.id === selectedLead.id)
        : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < leads.length - 1 ? currentIndex + 1 : 0;
        setSelectedLead(leads[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : leads.length - 1;
        setSelectedLead(leads[prevIndex]);
      } else if (e.key === 'Escape') {
        // Skip to next lead
        const nextIndex = currentIndex < leads.length - 1 ? currentIndex + 1 : 0;
        setSelectedLead(leads[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leads, selectedLead]);

  // Load timeline when lead changes
  useEffect(() => {
    if (selectedLead) {
      loadTimeline(selectedLead.id);
    }
  }, [selectedLead]);

  const loadLeads = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/leads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Handle both array and object response formats
      const leadsArray = Array.isArray(data) ? data : (data.leads || data.data || []);
      
      // Smart priority sorting
      const sorted = sortLeadsByPriority(leadsArray);
      setLeads(sorted);
      
      if (sorted.length > 0) {
        setSelectedLead(sorted[0]);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortLeadsByPriority = (leads: Lead[]): Lead[] => {
    return [...leads].sort((a, b) => {
      // Priority scoring
      const getScore = (lead: Lead) => {
        let score = 0;
        
        // Hot leads with recent contact = highest
        if (lead.temperature === 'hot' && lead.status === 'contacted') score += 100;
        
        // Due follow-ups (contacted 2-7 days ago)
        if (lead.last_contact_at) {
          const daysSince = Math.floor((Date.now() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince >= 2 && daysSince <= 7) score += 80;
        }
        
        // New leads
        if (lead.status === 'new') score += 60;
        
        // Hot but not contacted
        if (lead.temperature === 'hot' && lead.status === 'new') score += 50;
        
        // Warm leads
        if (lead.temperature === 'warm') score += 30;
        
        // Lead score
        score += (lead.score || 0) / 10;
        
        return score;
      };
      
      return getScore(b) - getScore(a);
    });
  };

  const loadTimeline = async (leadId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/leads/${leadId}/interactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Handle both array and object response formats
      const interactions = Array.isArray(data) ? data : (data.interactions || data.data || []);
      
      setTimeline(interactions.map((item: any) => ({
        id: item.id || item.interaction_id,
        type: item.interaction_type || item.type || 'note',
        content: item.notes || item.content || item.interaction_type,
        timestamp: item.created_at || item.timestamp
      })));
    } catch (error) {
      console.error('Error loading timeline:', error);
      setTimeline([]);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedLead) return;
    
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/leads/${selectedLead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      setSelectedLead({ ...selectedLead, status });
      loadLeads(); // Refresh list
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleTemperatureChange = async (temperature: string) => {
    if (!selectedLead) return;
    
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/leads/${selectedLead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ temperature })
      });
      
      setSelectedLead({ ...selectedLead, temperature: temperature as any });
      loadLeads();
    } catch (error) {
      console.error('Error updating temperature:', error);
    }
  };

  const handleSendMessage = (message: string, channel: string) => {
    if (!selectedLead) return;
    
    // Open deep link
    let url = '';
    switch (channel) {
      case 'whatsapp':
        const phone = selectedLead.phone?.replace(/[^0-9]/g, '');
        url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        break;
      case 'instagram':
        url = selectedLead.instagram_url || '';
        navigator.clipboard.writeText(message);
        break;
      case 'email':
        url = `mailto:${selectedLead.email}?body=${encodeURIComponent(message)}`;
        break;
    }
    
    if (url) window.open(url, '_blank');
    
    // Move to next lead
    const currentIndex = leads.findIndex(l => l.id === selectedLead.id);
    if (currentIndex < leads.length - 1) {
      setSelectedLead(leads[currentIndex + 1]);
    }
  };

  const handleLogCall = () => {
    if (!selectedLead?.phone) return;
    window.open(`tel:${selectedLead.phone}`, '_blank');
  };

  const handleSetAppointment = () => {
    // TODO: Open appointment modal
    alert('Termin Feature kommt bald!');
  };

  const handleAddNote = async (note: string) => {
    if (!selectedLead) return;
    
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/leads/${selectedLead.id}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          interaction_type: 'note',
          notes: note
        })
      });
      
      loadTimeline(selectedLead.id);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleMarkLost = async () => {
    if (!selectedLead) return;
    
    if (confirm(`${selectedLead.name} als verloren markieren?`)) {
      await handleStatusChange('lost');
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0f] flex">
      {/* Smart Feed - Left */}
      <div className="w-[280px] flex-shrink-0">
        <SmartFeed
          leads={leads}
          selectedId={selectedLead?.id || null}
          onSelect={setSelectedLead}
        />
      </div>

      {/* Dossier - Center */}
      <div className="flex-1 min-w-0">
        <Dossier
          lead={selectedLead}
          timeline={timeline}
          onStatusChange={handleStatusChange}
          onTemperatureChange={handleTemperatureChange}
        />
      </div>

      {/* Chief Copilot - Right */}
      <div className="w-[400px] flex-shrink-0">
        <ChiefCopilot
          lead={selectedLead}
          insight={insight}
          onSendMessage={handleSendMessage}
          onLogCall={handleLogCall}
          onSetAppointment={handleSetAppointment}
          onAddNote={handleAddNote}
          onMarkLost={handleMarkLost}
        />
      </div>
    </div>
  );
}

