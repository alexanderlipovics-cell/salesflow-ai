import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, Calendar, FileText, XCircle, Send, 
  ChevronDown, ChevronUp, Mail, MessageSquare,
  Instagram, Clock, Sparkles, Target,
  Building, Check, Copy, TrendingUp,
  Camera, Mic, Edit3, X, Plus,
  Facebook,
  Home, Users, CalendarDays, Lightbulb,
  Loader2, Zap
} from 'lucide-react';
import SmartQueue from '@/components/command-center/SmartQueue';
import AllLeadsTable from '@/components/command-center/AllLeadsTable';
import AutopilotPreview from '@/components/command-center/AutopilotPreview';
import BulkImportModal from '@/components/command-center/BulkImportModal';

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
  instagram_handle?: string;
  whatsapp_number?: string;
  linkedin_url?: string;
  facebook_url?: string;
  status: string;
  temperature?: 'cold' | 'warm' | 'hot';
  score?: number;
  last_activity?: string;
  last_contact_at?: string;
  created_at: string;
  notes?: string;
  avatar_url?: string;
  source?: string;
  waiting_for_response?: boolean;
  last_inbound_message?: string;
  suggested_action?: {
    type: string;
    reason: string;
    message: string;
    urgency?: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface Message {
  id: string;
  channel: 'whatsapp' | 'instagram' | 'email' | 'facebook' | 'linkedin' | 'sms';
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface TimelineItem {
  id: string;
  type: 'email' | 'call' | 'message' | 'status_change' | 'note' | 'chief' | 'meeting';
  content: string;
  timestamp: string;
  channel?: string;
  metadata?: any;
}

// ============================================================================
// SMART FEED (Left Column) - 20%
// ============================================================================

const SmartFeed: React.FC<{
  leads: Lead[];
  selectedId: string | null;
  onSelect: (lead: Lead) => void;
  onNewLead: () => void;
}> = ({ leads, selectedId, onSelect, onNewLead }) => {
  
  const getTemperatureEmoji = (temp?: string) => {
    switch (temp) {
      case 'hot': return '🔥';
      case 'warm': return '☀️';
      default: return '❄️';
    }
  };

  const getStatusBadge = (lead: Lead) => {
    if (lead.temperature === 'hot' && lead.status === 'contacted') return { text: 'HOT', color: 'bg-orange-500' };
    if (lead.status === 'new') return { text: 'NEU', color: 'bg-cyan-500' };
    if (lead.status === 'qualified') return { text: 'QUAL', color: 'bg-green-500' };
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0d1117] to-[#0a0a0f]">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Smart Feed
          </h2>
          <button
            onClick={onNewLead}
            className="w-8 h-8 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
        <p className="text-gray-500 text-sm">{leads.length} Leads priorisiert</p>
      </div>

      {/* Lead List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
        {leads.map((lead) => {
          const badge = getStatusBadge(lead);
          const isSelected = selectedId === lead.id;
          
          return (
            <div
              key={lead.id}
              onClick={() => onSelect(lead)}
              className={`
                p-3 cursor-pointer transition-all duration-300 border-l-2 mx-2 my-1 rounded-r-xl
                ${isSelected 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-transparent border-l-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                  : 'border-l-transparent hover:bg-white/5'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`
                  relative w-12 h-12 rounded-full flex items-center justify-center
                  text-white font-semibold text-sm overflow-hidden
                  ${isSelected 
                    ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a0f]' 
                    : ''
                  }
                `}>
                  {lead.avatar_url ? (
                    <img src={lead.avatar_url} alt={lead.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                      {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  
                  {/* Temperature Badge */}
                  <span className="absolute -bottom-1 -right-1 text-xs">
                    {getTemperatureEmoji(lead.temperature)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm truncate">
                      {lead.name}
                    </span>
                    {badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${badge.color}`}>
                        {badge.text}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs truncate">
                    {lead.status === 'new' ? 'Neu' : lead.last_activity || 'Keine Aktivität'}
                  </p>
                </div>

                {/* Score */}
                <div className="text-cyan-400 font-bold text-lg">
                  {lead.score || 0}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Keyboard Hint */}
      <div className="p-3 border-t border-cyan-500/10">
        <div className="flex justify-center gap-2 text-xs text-gray-600">
          <kbd className="px-2 py-1 bg-gray-800/50 rounded border border-gray-700">↑</kbd>
          <kbd className="px-2 py-1 bg-gray-800/50 rounded border border-gray-700">↓</kbd>
          <span className="text-gray-500 ml-1">Navigation</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DOSSIER (Center Column) - 45%
// ============================================================================

const Dossier: React.FC<{
  lead: Lead | null;
  timeline: TimelineItem[];
  onStatusChange: (status: string) => void;
  onTemperatureChange: (temp: string) => void;
  onEdit: () => void;
  onScreenshot: () => void;
  onMarkProcessed?: (action: string, nextFollowup?: string) => Promise<void>;
}> = ({ lead, timeline, onStatusChange, onTemperatureChange, onEdit, onScreenshot, onMarkProcessed }) => {
  
  if (!lead) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Wähle einen Lead</p>
          <p className="text-sm mt-1">aus dem Smart Feed</p>
        </div>
      </div>
    );
  }

  const statuses = [
    { key: 'new', label: 'Neu', icon: Plus },
    { key: 'contacted', label: 'Kontaktiert', icon: MessageSquare },
    { key: 'qualified', label: 'Qualifiziert', icon: Target },
    { key: 'won', label: 'Gewonnen', icon: Check },
  ];

  const navItems = [
    { icon: Home, label: 'Übersicht' },
    { icon: Users, label: 'Aktivitäten' },
    { icon: CalendarDays, label: 'Termine' },
    { icon: Lightbulb, label: 'Insights' },
  ];

  const getTimelineIcon = (type: string, channel?: string) => {
    if (channel === 'instagram') return <Instagram className="w-4 h-4 text-pink-400" />;
    if (channel === 'whatsapp') return <MessageSquare className="w-4 h-4 text-green-400" />;
    if (channel === 'email') return <Mail className="w-4 h-4 text-cyan-400" />;
    
    switch (type) {
      case 'call': return <Phone className="w-4 h-4 text-green-400" />;
      case 'meeting': return <Calendar className="w-4 h-4 text-purple-400" />;
      case 'status_change': return <TrendingUp className="w-4 h-4 text-yellow-400" />;
      case 'chief': return <Sparkles className="w-4 h-4 text-cyan-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Gerade';
    if (diffHours < 24) return `Vor ${diffHours}h`;
    if (diffHours < 48) return 'Gestern';
    return date.toLocaleDateString('de-DE');
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-[#14202c]/90 to-[#0d1520]/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 mb-4 shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-start gap-6">
          {/* Avatar with Score Ring */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#0a0a0f]">
              {lead.avatar_url ? (
                <img src={lead.avatar_url} alt={lead.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-3xl font-bold">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Outer Ring - Score Indicator */}
            <svg className="absolute -inset-1 w-[104px] h-[104px] transform -rotate-90">
              <circle cx="52" cy="52" r="48" stroke="#1f2937" strokeWidth="4" fill="none" />
              <circle 
                cx="52" cy="52" r="48" 
                stroke="url(#scoreGradient)" 
                strokeWidth="4" 
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(lead.score || 0) * 3.02} 302`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-white text-2xl font-bold">{lead.name}</h1>
                {lead.position && (
                  <p className="text-gray-400">{lead.position}</p>
                )}
                {lead.company && (
                  <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                    <Building className="w-3 h-3" />
                    {lead.company}
                  </p>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={onEdit}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-gray-400" />
                </button>
                <button 
                  onClick={onScreenshot}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
                >
                  <Camera className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Temperature Badges */}
            <div className="flex gap-2 mt-4">
              {['cold', 'warm', 'hot'].map((temp) => (
                <button
                  key={temp}
                  onClick={() => onTemperatureChange(temp)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                    ${lead.temperature === temp
                      ? temp === 'hot' 
                        ? 'bg-orange-500/30 text-orange-300 ring-2 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                        : temp === 'warm'
                          ? 'bg-yellow-500/30 text-yellow-300 ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                          : 'bg-blue-500/30 text-blue-300 ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                      : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700'
                    }
                  `}
                >
                  {temp === 'hot' ? '🔥 Hot' : temp === 'warm' ? '☀️ Warm' : '❄️ Cold'}
                </button>
              ))}
            </div>
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-cyan-600">
              {lead.score || 0}
            </div>
            <p className="text-gray-500 text-xs mt-1">Score</p>
          </div>
        </div>
      </div>

      {/* Suggested Action - Command Center V3 */}
      {lead.suggested_action && (
        <div className="mb-4 p-4 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 font-semibold text-sm">NÄCHSTE AKTION</span>
            </div>
            {lead.suggested_action.urgency === 'critical' && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">KRITISCH</span>
            )}
          </div>
          <p className="text-white text-sm mb-2">{lead.suggested_action.reason}</p>
          {lead.suggested_action.message && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 mb-3">
              <p className="text-gray-300 text-sm italic">"{lead.suggested_action.message}"</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lead.suggested_action!.message);
                  // TODO: Toast notification
                }}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Kopieren
              </button>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onMarkProcessed?.('message_sent')}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all"
            >
              ✅ Done
            </button>
            <button
              onClick={() => {
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + 1);
                onMarkProcessed?.('later', nextDate.toISOString().split('T')[0]);
              }}
              className="flex-1 py-2 px-3 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-700 transition-all"
            >
              ⏰ Later
            </button>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex gap-2 mb-4">
        {statuses.map((s, i) => (
          <React.Fragment key={s.key}>
            <button
              onClick={() => onStatusChange(s.key)}
              className={`
                flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300
                ${lead.status === s.key
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-[#14202c]/80 text-gray-500 hover:bg-gray-800 border border-gray-800'
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

      {/* Sub Navigation */}
      <div className="flex justify-center gap-8 mb-4 py-2 border-y border-gray-800/50">
        {navItems.map((item, i) => (
          <button 
            key={i}
            className={`p-2 rounded-lg transition-colors ${i === 0 ? 'text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </div>

      {/* Living Timeline */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2 sticky top-0 bg-[#0a0a0f] py-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Living Timeline
        </h3>
        
        <div className="space-y-3">
          {timeline.length > 0 ? timeline.map((item) => (
            <div
              key={item.id}
              className="bg-[#14202c]/60 border border-gray-800/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-800/80 flex items-center justify-center flex-shrink-0">
                  {getTimelineIcon(item.type, item.channel)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{item.content}</p>
                  {item.metadata?.preview && (
                    <p className="text-gray-500 text-xs mt-1 truncate">{item.metadata.preview}</p>
                  )}
                </div>
                <span className="text-gray-600 text-xs flex-shrink-0">
                  {formatTime(item.timestamp)}
                </span>
              </div>
            </div>
          )) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-600">Noch keine Aktivitäten</p>
              <p className="text-gray-700 text-sm mt-1">Starte mit einer Nachricht!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CHIEF COPILOT WITH UNIFIED CHAT (Right Column) - 35%
// ============================================================================

const ChiefCopilot: React.FC<{
  lead: Lead | null;
  messages: Message[];
  chiefInsight: {
    strategy: string;
    next_action: string;
    icebreaker: string;
    probability: number;
    temperature_suggestion?: string;
    status_suggestion?: string;
  } | null;
  onSendMessage: (message: string, channel: string) => void;
  onQuickAction: (action: string) => void;
  onStatusChange?: (status: string) => void;
  onTemperatureChange?: (temp: string) => void;
  onAnalyzeResponse?: () => void;
}> = ({ lead, messages, chiefInsight, onSendMessage, onQuickAction, onStatusChange, onTemperatureChange, onAnalyzeResponse }) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('whatsapp');
  const [inputMessage, setInputMessage] = useState('');
  const [chiefChat, setChiefChat] = useState<{role: string, content: string}[]>([]);
  const [chiefInput, setChiefInput] = useState('');
  const [isLoadingChief, setIsLoadingChief] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'chief' | 'autopilot'>('chief');
  const [missionControlOpen, setMissionControlOpen] = useState(true); // Collapsible Mission Control
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chiefChat.length]);

  const channels = [
    { key: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', color: 'text-green-400' },
    { key: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-pink-400' },
    { key: 'email', icon: Mail, label: 'Email', color: 'text-cyan-400' },
    { key: 'facebook', icon: Facebook, label: 'Facebook', color: 'text-blue-400' },
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageSquare className="w-3 h-3 text-green-400" />;
      case 'instagram': return <Instagram className="w-3 h-3 text-pink-400" />;
      case 'email': return <Mail className="w-3 h-3 text-cyan-400" />;
      case 'facebook': return <Facebook className="w-3 h-3 text-blue-400" />;
      default: return <MessageSquare className="w-3 h-3 text-gray-400" />;
    }
  };

  const handleSend = () => {
    if (!inputMessage.trim() || !lead) return;
    onSendMessage(inputMessage, selectedChannel);
    setInputMessage('');
  };

  const askChief = async () => {
    if (!chiefInput.trim() || !lead) return;
    
    const userMessage = chiefInput;
    setChiefChat(prev => [...prev, { role: 'user', content: userMessage }]);
    setChiefInput('');
    setIsLoadingChief(true);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: lead.id,
          message: userMessage,
          context: {
            lead: lead,
            timeline: [], // Wird vom Backend geladen
            messages: messages,
            followups: []
          }
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setChiefChat(prev => [...prev, { role: 'assistant', content: data.response || 'Keine Antwort erhalten.' }]);
      } else {
        setChiefChat(prev => [...prev, { role: 'assistant', content: 'Fehler bei der Verbindung zu CHIEF.' }]);
      }
    } catch (error) {
      console.error('Chief chat error:', error);
      setChiefChat(prev => [...prev, { role: 'assistant', content: 'Fehler bei der Verbindung zu CHIEF.' }]);
    } finally {
      setIsLoadingChief(false);
    }
  };

  if (!lead) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-[#0d1117] to-[#0a0a0f] border-l border-cyan-500/10">
        <div className="text-center text-gray-500 p-6">
          <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">CHIEF Copilot</p>
          <p className="text-sm mt-1">Wähle einen Lead</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0d1117] to-[#0a0a0f] border-l border-cyan-500/10">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/10">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Chief Copilot
          </h2>
          <span className="text-cyan-400 text-sm">AI Insight</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('chief')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chief' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          🤖 CHIEF
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          💬 Messages
        </button>
      </div>

      {activeTab === 'chief' ? (
        <>
          {/* Mission Control - Collapsible */}
          <div className="p-4 border-b border-gray-800">
            <button
              onClick={() => setMissionControlOpen(!missionControlOpen)}
              className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2 text-cyan-400 text-sm font-semibold">
                <Target className="w-4 h-4" />
                Mission Control
                {chiefInsight?.probability !== undefined && (
                  <span className="text-cyan-400 text-sm font-bold ml-2">
                    {chiefInsight.probability}%
                  </span>
                )}
              </span>
              {missionControlOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            
            {missionControlOpen && (
            <div className="mt-2 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 rounded-xl p-4">
              <div className="mb-3">
              
                {/* Probability Bar */}
                {chiefInsight?.probability !== undefined && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Wahrscheinlichkeit</span>
                      <span>{chiefInsight.probability}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full transition-all duration-1000"
                        style={{ width: `${chiefInsight.probability}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Strategy */}
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  {chiefInsight?.strategy || `Analysiere ${lead?.name || 'den Lead'}...`}
                </p>
                
                {/* Next Action */}
                {chiefInsight?.next_action && (
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2 mb-3">
                    <p className="text-cyan-300 text-xs font-medium">
                      ⚡ {chiefInsight.next_action}
                    </p>
                  </div>
                )}
                
                {/* Icebreaker */}
                {chiefInsight?.icebreaker && (
                  <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                    <p className="text-gray-500 text-xs mb-1">💡 Eisbrecher:</p>
                    <p className="text-gray-300 text-sm italic">"{chiefInsight.icebreaker}"</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(chiefInsight.icebreaker);
                        // Toast notification könnte hier hinzugefügt werden
                      }}
                      className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      Kopieren
                    </button>
                  </div>
                )}
                
                {/* Suggestions */}
                {(chiefInsight?.temperature_suggestion || chiefInsight?.status_suggestion) && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-gray-500 text-xs mb-2">CHIEF empfiehlt:</p>
                    <div className="flex gap-2">
                      {chiefInsight.temperature_suggestion && onTemperatureChange && (
                        <button 
                          onClick={() => onTemperatureChange(chiefInsight.temperature_suggestion!)}
                          className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-lg hover:bg-orange-500/30"
                        >
                          → {chiefInsight.temperature_suggestion}
                        </button>
                      )}
                      {chiefInsight.status_suggestion && onStatusChange && (
                        <button 
                          onClick={() => onStatusChange(chiefInsight.status_suggestion!)}
                          className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg hover:bg-green-500/30"
                        >
                          → {chiefInsight.status_suggestion}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* CHIEF Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chiefChat.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-cyan-500/30" />
                <p className="text-gray-500 text-sm">Frag CHIEF etwas über {lead.name}...</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {['Schreib eine Nachricht', 'Analysiere den Lead', 'Nächste Schritte?'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setChiefInput(suggestion)}
                      className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 text-xs rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chiefChat.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    max-w-[85%] rounded-2xl px-4 py-2 text-sm
                    ${msg.role === 'user' 
                      ? 'bg-cyan-500 text-white' 
                      : 'bg-gray-800 text-gray-200'
                    }
                  `}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoadingChief && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* CHIEF Input */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={chiefInput}
                  onChange={(e) => setChiefInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askChief()}
                  placeholder={`Sag CHIEF was zu tun ist...`}
                  className="w-full bg-[#14202c] border border-gray-700 rounded-xl px-4 py-3 pr-10 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
                <Mic className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 cursor-pointer hover:text-cyan-400 transition-colors" />
              </div>
              <button
                onClick={askChief}
                disabled={!chiefInput.trim() || isLoadingChief}
                className="px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      ) : activeTab === 'chat' ? (
        <>
          {/* Messages View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length > 0 ? messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[85%] rounded-2xl px-4 py-2
                  ${msg.direction === 'outbound' 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-gray-800 text-gray-200'
                  }
                `}>
                  <div className="flex items-center gap-2 mb-1">
                    {getChannelIcon(msg.channel)}
                    <span className="text-xs opacity-70">{msg.channel}</span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-50 mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                <p className="text-gray-600">Noch keine Nachrichten</p>
                <p className="text-gray-700 text-sm mt-1">mit {lead.name}</p>
              </div>
            )}
          </div>

          {/* Channel Selector + Input */}
          <div className="p-4 border-t border-gray-800 space-y-3">
            {/* Channel Buttons */}
            <div className="flex gap-2">
              {channels.map((ch) => (
                <button
                  key={ch.key}
                  onClick={() => setSelectedChannel(ch.key)}
                  className={`
                    flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1
                    ${selectedChannel === ch.key 
                      ? 'bg-gray-700 text-white border border-gray-600' 
                      : 'bg-gray-800/50 text-gray-500 hover:bg-gray-800'
                    }
                  `}
                >
                  <ch.icon className={`w-3 h-3 ${selectedChannel === ch.key ? ch.color : ''}`} />
                  {ch.label}
                </button>
              ))}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Nachricht via ${selectedChannel}...`}
                className="flex-1 bg-[#14202c] border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!inputMessage.trim()}
                className="px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Autopilot Preview */}
          <AutopilotPreview selectedLeadId={lead?.id || null} />
        </>
      )}

      {/* Quick Actions - Nur in Chief und Chat Tabs */}
      {(activeTab === 'chief' || activeTab === 'chat') && (
      <div className="p-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs mb-3">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Phone, label: 'Call', color: 'hover:border-green-500/50 hover:text-green-400' },
            { icon: Calendar, label: 'Termin', color: 'hover:border-cyan-500/50 hover:text-cyan-400' },
            { icon: FileText, label: 'Notiz', color: 'hover:border-yellow-500/50 hover:text-yellow-400' },
            { icon: XCircle, label: 'Verloren', color: 'hover:border-red-500/50 hover:text-red-400' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => onQuickAction(action.label.toLowerCase())}
              className={`
                p-3 rounded-xl bg-[#14202c] border border-gray-800 
                transition-all duration-300 group ${action.color}
              `}
            >
              <action.icon className="w-5 h-5 mx-auto mb-1 text-gray-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-500">{action.label}</span>
            </button>
          ))}
        </div>
        {/* Antwort analysieren Button */}
        {onAnalyzeResponse && (
          <button
            onClick={onAnalyzeResponse}
            className="mt-3 w-full p-3 rounded-xl bg-[#14202c] border border-gray-800 hover:border-purple-500/50 hover:text-purple-400 transition-all group"
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-500 group-hover:text-purple-400">Antwort analysieren</span>
            </div>
          </button>
        )}
      </div>
      )}
    </div>
  );
};

// ============================================================================
// MODALS
// ============================================================================

// Edit Lead Modal
const EditLeadModal: React.FC<{
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Lead>) => void;
}> = ({ lead, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    position: lead.position || '',
    instagram_url: lead.instagram_url || '',
    linkedin_url: lead.linkedin_url || '',
    notes: lead.notes || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        position: lead.position || '',
        instagram_url: lead.instagram_url || '',
        linkedin_url: lead.linkedin_url || '',
        notes: lead.notes || '',
      });
    }
  }, [lead.id, lead.name, lead.email, lead.phone, lead.company, lead.position, lead.instagram_url, lead.linkedin_url, lead.notes, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#14202c] border border-cyan-500/20 rounded-2xl w-full max-w-lg mx-4 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-white text-lg font-bold">Lead bearbeiten</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {[
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Telefon', type: 'tel' },
            { key: 'company', label: 'Firma', type: 'text' },
            { key: 'position', label: 'Position', type: 'text' },
            { key: 'instagram_url', label: 'Instagram', type: 'url' },
            { key: 'linkedin_url', label: 'LinkedIn', type: 'url' },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-gray-400 text-sm mb-1 block">{field.label}</label>
              <input
                type={field.type}
                value={formData[field.key as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 transition-colors"
              />
            </div>
          ))}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => { onSave(formData); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium hover:from-cyan-400 hover:to-cyan-500 transition-all"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

// New Lead Modal (with Screenshot Upload)
const NewLeadModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [mode, setMode] = useState<'manual' | 'screenshot' | 'voice'>('manual');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    instagram_url: '',
  });

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setScreenshot(base64);
      setIsAnalyzing(true);

      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/api/command-center/extract-lead`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image: base64 })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.extracted) {
            setFormData({
              name: data.extracted.name || '',
              email: data.extracted.email || '',
              phone: data.extracted.phone || '',
              company: data.extracted.company || '',
              instagram_url: data.extracted.instagram || '',
            });
          }
        }
      } catch (error) {
        console.error('Extraction error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const fakeEvent = { target: { files: [file] } } as any;
          handleScreenshotUpload(fakeEvent);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div 
        className="bg-[#14202c] border border-cyan-500/20 rounded-2xl w-full max-w-lg mx-4 shadow-[0_0_50px_rgba(6,182,212,0.2)]"
        onPaste={handlePaste}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-white text-lg font-bold">Neuer Lead</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex p-4 gap-2 border-b border-gray-800">
          {[
            { key: 'manual', icon: Edit3, label: 'Manuell' },
            { key: 'screenshot', icon: Camera, label: 'Screenshot' },
            { key: 'voice', icon: Mic, label: 'Voice' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key as any)}
              className={`
                flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all
                ${mode === m.key 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                  : 'bg-gray-800/50 text-gray-500 hover:bg-gray-800'
                }
              `}
            >
              <m.icon className="w-4 h-4" />
              {m.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {mode === 'screenshot' && (
            <div className="mb-6">
              {screenshot ? (
                <div className="relative">
                  <img src={screenshot} alt="Screenshot" className="w-full rounded-lg border border-gray-700" />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse mx-auto mb-2" />
                        <p className="text-cyan-400">CHIEF analysiert...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <label className="block">
                  <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500/50 transition-colors">
                    <Camera className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-400">Screenshot hochladen</p>
                    <p className="text-gray-600 text-sm mt-1">oder Strg+V zum Einfügen</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleScreenshotUpload} className="hidden" />
                </label>
              )}
            </div>
          )}

          {mode === 'voice' && (
            <div className="mb-6 text-center py-8">
              <button className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto hover:scale-105 transition-transform">
                <Mic className="w-8 h-8 text-white" />
              </button>
              <p className="text-gray-400 mt-4">Klicke und sprich...</p>
              <p className="text-gray-600 text-sm mt-1">"Neuer Lead Max Müller von Tech GmbH..."</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {[
              { key: 'name', label: 'Name *', placeholder: 'Max Müller' },
              { key: 'email', label: 'Email', placeholder: 'max@beispiel.de' },
              { key: 'phone', label: 'Telefon', placeholder: '+43 699 123 456' },
              { key: 'company', label: 'Firma', placeholder: 'Tech GmbH' },
              { key: 'instagram_url', label: 'Instagram', placeholder: '@maxmueller' },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-gray-400 text-sm mb-1 block">{field.label}</label>
                <input
                  type="text"
                  value={formData[field.key as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:border-cyan-500 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => { onCreate(formData); onClose(); }}
            disabled={!formData.name}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50 transition-all"
          >
            Lead erstellen
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CHIEF CHAT PANEL (Center)
// ============================================================================

interface ChiefChatPanelProps {
  lead: Lead | null;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onQuickAction: (action: string) => void;
}

const ChiefChatPanel: React.FC<ChiefChatPanelProps> = ({ 
  lead, 
  messages, 
  onSendMessage, 
  isLoading,
  onQuickAction 
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim() || !lead) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0f]">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-cyan-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">CHIEF Copilot</h2>
          {lead && (
            <p className="text-sm text-gray-400">
              Arbeite mit {lead.name}
            </p>
          )}
        </div>
      </div>

      {/* Messages Area - SCROLLABLE */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!lead ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Users className="w-12 h-12 mb-4" />
            <p>Wähle einen Lead aus der Liste</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Sparkles className="w-12 h-12 mb-4 text-cyan-400" />
            <p className="text-lg mb-2">Bereit für {lead.name}</p>
            <p className="text-sm">Frag CHIEF was zu tun ist...</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div 
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-cyan-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-medium">CHIEF</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-sm">
              <div className="flex items-center gap-2 text-cyan-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">CHIEF denkt nach...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - FIXED AT BOTTOM */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={lead ? `Sag CHIEF was zu tun ist mit ${lead.name}...` : "Wähle zuerst einen Lead..."}
            disabled={!lead}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!lead || !input.trim() || isLoading}
            className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-medium hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        {lead && (
          <div className="flex gap-2 mt-3">
            <QuickActionButton icon={Phone} label="Call" onClick={() => onQuickAction('call')} />
            <QuickActionButton icon={Calendar} label="Termin" onClick={() => onQuickAction('termin')} />
            <QuickActionButton icon={FileText} label="Notiz" onClick={() => onQuickAction('notiz')} />
            <QuickActionButton icon={XCircle} label="Verloren" onClick={() => onQuickAction('verloren')} variant="danger" />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// LEAD PROFILE PANEL (Right)
// ============================================================================

interface LeadProfilePanelProps {
  lead: Lead | null;
  timeline: TimelineItem[];
  chiefInsight: any;
  missionControlOpen: boolean;
  onToggleMissionControl: () => void;
  activeTab: 'info' | 'timeline' | 'network' | 'calendar' | 'insights';
  onTabChange: (tab: 'info' | 'timeline' | 'network' | 'calendar' | 'insights') => void;
  onStatusChange: (status: string) => void;
  onTemperatureChange: (temp: string) => void;
  onEdit: () => void;
}

const LeadProfilePanel: React.FC<LeadProfilePanelProps> = ({
  lead,
  timeline,
  chiefInsight,
  missionControlOpen,
  onToggleMissionControl,
  activeTab,
  onTabChange,
  onStatusChange,
  onTemperatureChange,
  onEdit
}) => {
  if (!lead) {
    return (
      <div className="w-[380px] flex-shrink-0 border-l border-gray-700 flex items-center justify-center text-gray-500 bg-[#0a0a0f]">
        <p>Kein Lead ausgewählt</p>
      </div>
    );
  }

  return (
    <div className="w-[380px] flex-shrink-0 border-l border-gray-700 flex flex-col bg-[#0a0a0f]">
      {/* Lead Card - Kompakt */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
            {lead.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{lead.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusPill status={lead.status} />
              <TemperatureBadge temperature={lead.temperature} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-cyan-400">{lead.score || 0}</div>
            <div className="text-xs text-gray-500">Score</div>
          </div>
        </div>

        {/* Deep Links */}
        {(lead.instagram_handle || lead.whatsapp_number || lead.email) && (
          <div className="flex gap-2 mt-4">
            {lead.instagram_handle && (
              <DeepLinkButton 
                icon={Instagram} 
                label="DM"
                href={`https://ig.me/m/${lead.instagram_handle}`}
              />
            )}
            {lead.whatsapp_number && (
              <DeepLinkButton 
                icon={MessageSquare} 
                label="WhatsApp"
                href={`https://wa.me/${lead.whatsapp_number}?text=Hey ${lead.name}!`}
              />
            )}
            {lead.email && (
              <DeepLinkButton 
                icon={Mail} 
                label="Email"
                href={`mailto:${lead.email}?subject=Hey ${lead.name}`}
              />
            )}
          </div>
        )}
      </div>

      {/* Mission Control - Collapsible */}
      <div className="border-b border-gray-700">
        <button 
          onClick={onToggleMissionControl}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="font-medium text-white">Mission Control</span>
            {chiefInsight?.probability !== undefined && (
              <span className="text-cyan-400 text-sm">{chiefInsight.probability}%</span>
            )}
          </div>
          {missionControlOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        
        {missionControlOpen && chiefInsight && (
          <div className="p-4 pt-0">
            <div className="bg-gray-800/50 rounded-lg p-3">
              {chiefInsight.probability !== undefined && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Wahrscheinlichkeit</span>
                    <span className="text-sm text-cyan-400">{chiefInsight.probability}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-green-500 h-2 rounded-full transition-all" 
                      style={{ width: `${chiefInsight.probability}%` }} 
                    />
                  </div>
                </>
              )}
              <p className="text-sm text-gray-300 mb-3">
                {chiefInsight.strategy || `Analysiere ${lead.name}...`}
              </p>
              
              {chiefInsight.next_action && (
                <div className="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs mb-1">
                    <Zap className="w-3 h-3" />
                    <span>Vorgeschlagene Aktion</span>
                  </div>
                  <p className="text-sm text-white">{chiefInsight.next_action}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <TabButton icon={Home} active={activeTab === 'info'} onClick={() => onTabChange('info')} tooltip="Info" />
        <TabButton icon={Clock} active={activeTab === 'timeline'} onClick={() => onTabChange('timeline')} tooltip="Timeline" />
        <TabButton icon={Users} active={activeTab === 'network'} onClick={() => onTabChange('network')} tooltip="Netzwerk" />
        <TabButton icon={Calendar} active={activeTab === 'calendar'} onClick={() => onTabChange('calendar')} tooltip="Kalender" />
        <TabButton icon={Lightbulb} active={activeTab === 'insights'} onClick={() => onTabChange('insights')} tooltip="Insights" />
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'info' && <LeadInfoTab lead={lead} onEdit={onEdit} onStatusChange={onStatusChange} onTemperatureChange={onTemperatureChange} />}
        {activeTab === 'timeline' && <TimelineTab timeline={timeline} />}
        {activeTab === 'network' && <NetworkTab lead={lead} />}
        {activeTab === 'calendar' && <CalendarTab lead={lead} />}
        {activeTab === 'insights' && <InsightsTab lead={lead} chiefInsight={chiefInsight} />}
      </div>
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon: Icon, label, onClick, variant = 'default' }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        variant === 'danger'
          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

interface DeepLinkButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

const DeepLinkButton: React.FC<DeepLinkButtonProps> = ({ icon: Icon, label, href }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </a>
  );
};

interface TabButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}

const TabButton: React.FC<TabButtonProps> = ({ icon: Icon, active, onClick, tooltip }) => {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`flex-1 p-3 flex items-center justify-center transition-colors ${
        active 
          ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
      }`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    new: 'bg-cyan-500/20 text-cyan-400',
    contacted: 'bg-blue-500/20 text-blue-400',
    qualified: 'bg-green-500/20 text-green-400',
    won: 'bg-emerald-500/20 text-emerald-400',
    lost: 'bg-red-500/20 text-red-400'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status}
    </span>
  );
};

const TemperatureBadge: React.FC<{ temperature?: string }> = ({ temperature }) => {
  const colors: Record<string, string> = {
    hot: 'bg-orange-500/20 text-orange-400',
    warm: 'bg-yellow-500/20 text-yellow-400',
    cold: 'bg-blue-500/20 text-blue-400'
  };
  const emoji: Record<string, string> = {
    hot: '🔥',
    warm: '☀️',
    cold: '❄️'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[temperature || 'cold'] || colors.cold}`}>
      {emoji[temperature || 'cold'] || emoji.cold} {temperature || 'cold'}
    </span>
  );
};

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

const LeadInfoTab: React.FC<{ 
  lead: Lead; 
  onEdit: () => void;
  onStatusChange: (status: string) => void;
  onTemperatureChange: (temp: string) => void;
}> = ({ lead, onEdit, onStatusChange, onTemperatureChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Lead Informationen</h3>
        <button onClick={onEdit} className="text-cyan-400 hover:text-cyan-300 text-sm">
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
      
      {lead.company && <div><span className="text-gray-400">Firma:</span> <span className="text-white">{lead.company}</span></div>}
      {lead.position && <div><span className="text-gray-400">Position:</span> <span className="text-white">{lead.position}</span></div>}
      {lead.email && <div><span className="text-gray-400">Email:</span> <span className="text-white">{lead.email}</span></div>}
      {lead.phone && <div><span className="text-gray-400">Telefon:</span> <span className="text-white">{lead.phone}</span></div>}
      
      <div className="pt-4 border-t border-gray-700">
        <p className="text-gray-400 text-sm mb-2">Status ändern:</p>
        <div className="flex gap-2 flex-wrap">
          {['new', 'contacted', 'qualified', 'won', 'lost'].map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`px-3 py-1 rounded text-sm ${lead.status === s ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      
      <div className="pt-4 border-t border-gray-700">
        <p className="text-gray-400 text-sm mb-2">Temperatur ändern:</p>
        <div className="flex gap-2">
          {['cold', 'warm', 'hot'].map(temp => (
            <button
              key={temp}
              onClick={() => onTemperatureChange(temp)}
              className={`px-3 py-1 rounded text-sm ${lead.temperature === temp ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              {temp === 'hot' ? '🔥' : temp === 'warm' ? '☀️' : '❄️'} {temp}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TimelineTab: React.FC<{ timeline: TimelineItem[] }> = ({ timeline }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold mb-4">Timeline</h3>
      {timeline.length > 0 ? timeline.map((item) => (
        <div key={item.id} className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString('de-DE')}</span>
          </div>
          <p className="text-white text-sm">{item.content}</p>
        </div>
      )) : (
        <p className="text-gray-500 text-center py-8">Noch keine Aktivitäten</p>
      )}
    </div>
  );
};

const NetworkTab: React.FC<{ lead: Lead }> = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">Netzwerk</h3>
      <p className="text-gray-500 text-sm">Netzwerk-Feature kommt bald...</p>
    </div>
  );
};

const CalendarTab: React.FC<{ lead: Lead }> = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">Kalender</h3>
      <p className="text-gray-500 text-sm">Kalender-Feature kommt bald...</p>
    </div>
  );
};

const InsightsTab: React.FC<{ lead: Lead; chiefInsight: any }> = ({ lead, chiefInsight }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">Insights</h3>
      {chiefInsight?.icebreaker && (
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">💡 Eisbrecher:</p>
          <p className="text-white text-sm">"{chiefInsight.icebreaker}"</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMMAND CENTER V2
// ============================================================================

export default function CommandCenterV2() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New aggregated data states
  const [followups, setFollowups] = useState<any[]>([]);
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [chiefInsight, setChiefInsight] = useState<{
    strategy: string;
    next_action: string;
    icebreaker: string;
    probability: number;
    temperature_suggestion?: string;
    status_suggestion?: string;
  } | null>(null);
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [pastedResponse, setPastedResponse] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Queue View Toggle
  const [queueView, setQueueView] = useState<'queue' | 'all'>('queue');
  
  // CHIEF Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChief, setIsLoadingChief] = useState(false);
  
  // Right Panel State
  const [missionControlOpen, setMissionControlOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'network' | 'calendar' | 'insights'>('info');

  // Load functions with useCallback to prevent infinite loops
  const loadTimeline = useCallback(async (leadId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/leads/${leadId}/interactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        setTimeline([]);
        return;
      }
      const data = await res.json();
      setTimeline((Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.id,
        type: item.interaction_type || item.type,
        content: item.notes || item.content || item.interaction_type,
        timestamp: item.created_at || item.timestamp,
        channel: item.channel
      })));
    } catch (error) {
      setTimeline([]);
    }
  }, []);

  const loadMessages = useCallback(async (leadId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/${leadId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        setMessages([]);
        return;
      }
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  }, []);

  // Aggregierter Data Load - EIN Request für ALLES
  const loadLeadData = useCallback(async (leadId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/${leadId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        // Fallback zu einzelnen Requests
        await Promise.all([
          loadTimeline(leadId),
          loadMessages(leadId)
        ]);
        return;
      }
      
      const data = await res.json();
      
      // Update alle States
      if (data.lead) {
        setSelectedLead(prev => ({ ...prev, ...data.lead, score: data.lead.score || prev?.score }));
      }
      if (data.timeline) {
        setTimeline(data.timeline);
      }
      if (data.messages) {
        setMessages(data.messages);
      }
      if (data.followups) {
        setFollowups(data.followups);
      }
      if (data.inbox_items) {
        setInboxItems(data.inbox_items);
      }
      if (data.chief_insight) {
        setChiefInsight(data.chief_insight);
      }
      
    } catch (error) {
      console.error('Error loading lead data:', error);
      // Fallback
      await loadTimeline(leadId);
      await loadMessages(leadId);
    }
  }, [loadTimeline, loadMessages]);

  const sortLeadsByPriority = useCallback((leads: Lead[]): Lead[] => {
    return [...leads].sort((a, b) => {
      const getScore = (lead: Lead) => {
        let score = 0;
        if (lead.temperature === 'hot' && lead.status === 'contacted') score += 100;
        if (lead.status === 'new') score += 60;
        if (lead.temperature === 'hot') score += 50;
        if (lead.temperature === 'warm') score += 30;
        score += (lead.score || 0) / 10;
        return score;
      };
      return getScore(b) - getScore(a);
    });
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/leads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let data = await res.json();
      if (!Array.isArray(data)) data = data.leads || data.data || [];
      
      const sorted = sortLeadsByPriority(data);
      setLeads(sorted);
      setSelectedLead(prev => {
        if (sorted.length > 0 && !prev) {
          return sorted[0];
        }
        return prev;
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [sortLeadsByPriority]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    if (selectedLead?.id) {
      loadLeadData(selectedLead.id);
    }
  }, [selectedLead?.id, loadLeadData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!leads.length || showEditModal || showNewLeadModal) return;
      
      const currentIndex = selectedLead ? leads.findIndex(l => l.id === selectedLead.id) : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < leads.length - 1 ? currentIndex + 1 : 0;
        setSelectedLead(leads[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : leads.length - 1;
        setSelectedLead(leads[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leads.length, selectedLead?.id, showEditModal, showNewLeadModal]);

  const handleStatusChange = async (status: string) => {
    if (!selectedLead) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/${selectedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.lead) {
        setSelectedLead({ ...selectedLead, status });
      }
      loadLeads();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleTemperatureChange = async (temperature: string) => {
    if (!selectedLead) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/${selectedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ temperature })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.lead) {
        setSelectedLead({ ...selectedLead, temperature: temperature as any });
      }
      loadLeads();
    } catch (error) {
      console.error('Error updating temperature:', error);
    }
  };

  const handleMarkProcessed = async (action: string, nextFollowup?: string) => {
    if (!selectedLead) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/${selectedLead.id}/mark-processed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          next_followup: nextFollowup
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Lead aus Queue entfernen (wird durch reload der Queue gemacht)
        // Update selectedLead - remove suggested_action
        setSelectedLead(prev => prev ? {
          ...prev,
          waiting_for_response: false,
          suggested_action: undefined
        } : null);
        
        // Queue neu laden (wird von SmartQueue gemacht, aber wir können es triggern)
        // TODO: Event oder State update um Queue zu refreshen
      }
    } catch (error) {
      console.error('Error marking lead as processed:', error);
    }
  };

  const handleSendMessage = (message: string, channel: string) => {
    if (!selectedLead) return;
    
    // Build deep link
    let url = '';
    const phone = selectedLead.phone?.replace(/[^0-9+]/g, '');
    
    switch (channel) {
      case 'whatsapp':
        url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        break;
      case 'instagram':
        url = selectedLead.instagram_url || `https://instagram.com`;
        navigator.clipboard.writeText(message);
        break;
      case 'email':
        url = `mailto:${selectedLead.email}?body=${encodeURIComponent(message)}`;
        break;
      case 'facebook':
        url = selectedLead.facebook_url || `https://facebook.com`;
        navigator.clipboard.writeText(message);
        break;
    }
    
    if (url) window.open(url, '_blank');
  };

  const handleQuickAction = (action: string) => {
    if (!selectedLead) return;
    
    switch (action) {
      case 'call':
        if (selectedLead.phone) {
          window.open(`tel:${selectedLead.phone}`, '_blank');
        }
        break;
      case 'termin':
        alert('Termin Feature kommt bald!');
        break;
      case 'notiz':
        const note = prompt('Notiz eingeben:');
        if (note) {
          // Save note
          console.log('Note:', note);
        }
        break;
      case 'verloren':
        if (confirm(`${selectedLead.name} als verloren markieren?`)) {
          handleStatusChange('lost');
        }
        break;
    }
  };

  const handleSaveLead = async (data: Partial<Lead>) => {
    if (!selectedLead) return;
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/leads/${selectedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      setSelectedLead({ ...selectedLead, ...data });
      loadLeads();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateLead = async (data: any) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...data, status: 'new', temperature: 'cold' })
      });
      if (res.ok) {
        const newLead = await res.json();
        await loadLeads();
        if (newLead.lead) {
          setSelectedLead(newLead.lead);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAnalyzeResponse = async () => {
    if (!pastedResponse.trim() || !selectedLead) return;
    
    setIsAnalyzing(true);
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/process-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          lead_reply: pastedResponse,
          current_state: selectedLead.status
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data.analysis);
        
        // Auto-update Lead in UI
        if (data.lead_updated && data.updates_applied) {
          setSelectedLead(prev => prev ? { ...prev, ...data.updates_applied } : null);
        }
        
        // Add suggested response to draft
        if (data.analysis?.suggested_response) {
          // Set in ChiefCopilot input - wird über State gemacht
          console.log('Suggested response:', data.analysis.suggested_response);
        }
        
        // Refresh all data
        if (selectedLead.id) {
          loadLeadData(selectedLead.id);
        }
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Command Center lädt...</p>
        </div>
      </div>
    );
  }

  // CHIEF Chat Handler
  const handleChiefChat = async (message: string) => {
    if (!message.trim() || !selectedLead) return;
    
    const userMessage: ChatMessage = { role: 'user', content: message, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMessage]);
    setIsLoadingChief(true);
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          message: message,
          context: {
            lead: selectedLead,
            timeline: timeline,
            messages: messages,
            followups: followups
          }
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: data.response || 'Keine Antwort erhalten.',
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = { 
          role: 'assistant', 
          content: 'Fehler bei der Verbindung zu CHIEF.',
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chief chat error:', error);
      const errorMessage: ChatMessage = { 
        role: 'assistant', 
        content: 'Fehler bei der Verbindung zu CHIEF.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingChief(false);
    }
  };

  // Reset chat when lead changes
  useEffect(() => {
    setChatMessages([]);
  }, [selectedLead?.id]);

  return (
    <div className="h-screen bg-[#0a0a0f] flex overflow-hidden">
      {/* LEFT PANEL - Lead Liste (280px) */}
      <div className="w-[280px] flex-shrink-0 border-r border-gray-700 flex flex-col bg-gradient-to-b from-[#0d1117] to-[#0a0a0f]">
        {/* View Toggle */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setQueueView('queue')}
            className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
              queueView === 'queue'
                ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            Queue
          </button>
          <button
            onClick={() => setQueueView('all')}
            className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
              queueView === 'all'
                ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            Alle Leads
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {queueView === 'queue' ? (
            <SmartQueue
              onSelectLead={(lead) => setSelectedLead(lead as any)}
              selectedLeadId={selectedLead?.id || null}
            />
          ) : (
            <AllLeadsTable
              onSelectLead={(lead) => setSelectedLead(lead as any)}
              selectedLeadId={selectedLead?.id || null}
            />
          )}
        </div>

        {/* New Lead Buttons */}
        <div className="p-3 border-t border-gray-700 space-y-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setShowNewLeadModal(true)}
            className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neuer Lead
          </button>
        </div>
      </div>

      {/* CENTER PANEL - CHIEF Chat (flex-1) */}
      <ChiefChatPanel 
        lead={selectedLead}
        messages={chatMessages}
        onSendMessage={handleChiefChat}
        isLoading={isLoadingChief}
        onQuickAction={handleQuickAction}
      />

      {/* RIGHT PANEL - Lead Profil (380px) */}
      <LeadProfilePanel
        lead={selectedLead}
        timeline={timeline}
        chiefInsight={chiefInsight}
        missionControlOpen={missionControlOpen}
        onToggleMissionControl={() => setMissionControlOpen(!missionControlOpen)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onStatusChange={handleStatusChange}
        onTemperatureChange={handleTemperatureChange}
        onEdit={() => setShowEditModal(true)}
      />

      {/* Modals */}
      {selectedLead && (
        <EditLeadModal
          lead={selectedLead}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveLead}
        />
      )}

      <NewLeadModal
        isOpen={showNewLeadModal}
        onClose={() => setShowNewLeadModal(false)}
        onCreate={handleCreateLead}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImportComplete={() => {
          setShowBulkImport(false);
          loadLeads(); // Refresh die Lead-Liste
          // Refresh Queue if using SmartQueue
          if (queueView === 'queue') {
            // Trigger queue refresh
            window.dispatchEvent(new Event('refresh-queue'));
          }
        }}
      />

      {/* Response Analysis Modal */}
      {showResponseModal && selectedLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#14202c] border border-cyan-500/20 rounded-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-white text-lg font-bold">
                Antwort von {selectedLead.name} analysieren
              </h2>
              <button onClick={() => { setShowResponseModal(false); setPastedResponse(''); setAnalysisResult(null); }} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <textarea
                value={pastedResponse}
                onChange={(e) => setPastedResponse(e.target.value)}
                placeholder="Lead-Antwort hier einfügen (Strg+V)..."
                className="w-full h-32 bg-[#0a0a0f] border border-gray-700 rounded-xl p-4 text-white text-sm resize-none focus:border-cyan-500"
                autoFocus
              />
              
              {analysisResult && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      analysisResult.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                      analysisResult.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {analysisResult.sentiment}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400">
                      {analysisResult.intent}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">
                      Urgency: {analysisResult.urgency_score}
                    </span>
                  </div>
                  
                  {analysisResult.suggested_response && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Vorgeschlagene Antwort:</p>
                      <p className="text-white text-sm">{analysisResult.suggested_response}</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(analysisResult.suggested_response);
                        }}
                        className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Kopieren
                      </button>
                    </div>
                  )}
                  
                  {analysisResult.key_points && analysisResult.key_points.length > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-2">Wichtige Punkte:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {analysisResult.key_points.map((point: string, i: number) => (
                          <li key={i} className="text-white text-sm">{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-800">
              <button
                onClick={() => { setShowResponseModal(false); setPastedResponse(''); setAnalysisResult(null); }}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAnalyzeResponse}
                disabled={!pastedResponse.trim() || isAnalyzing}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Analysiert...
                  </>
                ) : (
                  'Analysieren'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

