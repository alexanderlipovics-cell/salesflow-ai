import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Phone, Calendar, FileText, XCircle, Send, 
  ChevronDown, ChevronUp, Mail, MessageSquare,
  Instagram, Flame, Clock, Sparkles, Target,
  TrendingUp, User, Building, Copy, Check,
  Camera, Mic, Edit3, X, Plus, Image,
  Linkedin, Facebook, MoreHorizontal, Paperclip,
  Home, Users, CalendarDays, Lightbulb, List
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
  chiefInsight?: {
    probability?: number;
    buttons?: string[];
    workflow_case?: string;
    urgency?: string;
    channel?: string;
  } | null;
  onStatusChange: (status: string) => void;
  onTemperatureChange: (temp: string) => void;
  onEdit: () => void;
  onScreenshot: () => void;
  onMarkProcessed?: (action: string, nextFollowup?: string) => Promise<void>;
  onActionClick?: (action: string) => void;
}> = ({ lead, timeline, chiefInsight, onStatusChange, onTemperatureChange, onEdit, onScreenshot, onMarkProcessed, onActionClick }) => {
  
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
                strokeDasharray={`${(chiefInsight?.probability || lead.score || 0) * 3.02} 302`}
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
              {chiefInsight?.probability || lead.score || 0}
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
          
          {/* ACTION BUTTONS - Was hast du gemacht? */}
          <div className="space-y-3 mt-3">
            <p className="text-sm text-gray-400">Was hast du gemacht?</p>
            
            {/* Primary Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onActionClick?.('message')}
                className="flex flex-col items-center p-3 bg-[#1a2a3a] hover:bg-[#243447] rounded-lg transition-all border border-gray-700 hover:border-cyan-500 hover:scale-105"
              >
                <span className="text-2xl mb-1">📱</span>
                <span className="text-xs text-gray-300">Nachricht</span>
              </button>
              
              <button
                onClick={() => onActionClick?.('call')}
                className="flex flex-col items-center p-3 bg-[#1a2a3a] hover:bg-[#243447] rounded-lg transition-all border border-gray-700 hover:border-cyan-500 hover:scale-105"
              >
                <span className="text-2xl mb-1">📞</span>
                <span className="text-xs text-gray-300">Anruf</span>
              </button>
              
              <button
                onClick={() => onActionClick?.('meeting')}
                className="flex flex-col items-center p-3 bg-[#1a2a3a] hover:bg-[#243447] rounded-lg transition-all border border-gray-700 hover:border-cyan-500 hover:scale-105"
              >
                <span className="text-2xl mb-1">📅</span>
                <span className="text-xs text-gray-300">Termin</span>
              </button>
            </div>
            
            {/* Secondary Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onActionClick?.('live')}
                className="flex flex-col items-center p-3 bg-[#1a2a3a] hover:bg-[#243447] rounded-lg transition-all border border-gray-700 hover:border-green-500 hover:scale-105"
              >
                <span className="text-2xl mb-1">🤝</span>
                <span className="text-xs text-gray-300">Live</span>
              </button>
              
              <button
                onClick={() => onActionClick?.('lost')}
                className="flex flex-col items-center p-3 bg-[#1a2a3a] hover:bg-[#243447] rounded-lg transition-all border border-gray-700 hover:border-red-500 hover:scale-105"
              >
                <span className="text-2xl mb-1">❌</span>
                <span className="text-xs text-gray-300">Lost</span>
              </button>
              
              <button
                onClick={() => onActionClick?.('later')}
                className="flex flex-col items-center p-3 bg-[#1a2a3a] hover:bg-[#243447] rounded-lg transition-all border border-gray-700 hover:border-yellow-500 hover:scale-105"
              >
                <span className="text-2xl mb-1">🕐</span>
                <span className="text-xs text-gray-300">Später</span>
              </button>
            </div>
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
    buttons?: string[];
    workflow_case?: string;
    urgency?: string;
    channel?: string;
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
  }, [chiefChat]);

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

      {/* Quick Actions - Dynamisch basierend auf Workflow */}
      {(activeTab === 'chief' || activeTab === 'chat') && (
      <div className="p-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {(() => {
            const buttons = chiefInsight?.buttons || ['call', 'email'];
            
            return (
              <>
                {buttons.includes('instagram') && lead?.instagram_handle && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(chiefInsight?.icebreaker || '');
                      window.open(`https://ig.me/m/${lead.instagram_handle}`, '_blank');
                    }}
                    className="p-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 hover:border-pink-400 transition-all group"
                  >
                    <Instagram className="w-5 h-5 mx-auto mb-1 text-pink-400" />
                    <span className="text-xs text-pink-400">Instagram</span>
                  </button>
                )}
                
                {buttons.includes('whatsapp') && (lead?.whatsapp_number || lead?.phone) && (
                  <button
                    onClick={() => {
                      const phone = (lead.whatsapp_number || lead.phone)?.replace(/[^0-9]/g, '');
                      const msg = encodeURIComponent(chiefInsight?.icebreaker || '');
                      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                    }}
                    className="p-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-400 transition-all group"
                  >
                    <MessageSquare className="w-5 h-5 mx-auto mb-1 text-green-400" />
                    <span className="text-xs text-green-400">WhatsApp</span>
                  </button>
                )}
                
                {buttons.includes('email') && lead?.email && (
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(`Hey ${lead.name?.split(' ')[0]}!`);
                      const body = encodeURIComponent(chiefInsight?.icebreaker || '');
                      window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_blank');
                    }}
                    className="p-3 rounded-xl bg-[#14202c] border border-cyan-500/30 hover:border-cyan-400 transition-all group"
                  >
                    <Mail className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                    <span className="text-xs text-cyan-400">Email</span>
                  </button>
                )}
                
                {buttons.includes('call') && lead?.phone && (
                  <button
                    onClick={() => window.open(`tel:${lead.phone}`, '_blank')}
                    className="p-3 rounded-xl bg-[#14202c] border border-green-500/30 hover:border-green-400 transition-all group"
                  >
                    <Phone className="w-5 h-5 mx-auto mb-1 text-green-400" />
                    <span className="text-xs text-green-400">Call</span>
                  </button>
                )}
                
                {buttons.includes('call_now') && lead?.phone && (
                  <button
                    onClick={() => window.open(`tel:${lead.phone}`, '_blank')}
                    className="col-span-2 p-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all"
                  >
                    <Phone className="w-5 h-5 mx-auto mb-1 text-white" />
                    <span className="text-xs text-white font-bold">JETZT ANRUFEN</span>
                  </button>
                )}
                
                {buttons.includes('book_meeting') && (
                  <button
                    onClick={() => alert('Kalender Feature kommt bald!')}
                    className="p-3 rounded-xl bg-[#14202c] border border-purple-500/30 hover:border-purple-400 transition-all group"
                  >
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                    <span className="text-xs text-purple-400">Termin</span>
                  </button>
                )}
                
                {buttons.includes('send_followup') && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(chiefInsight?.icebreaker || '');
                      // Open preferred channel
                      if (lead?.instagram_handle) {
                        window.open(`https://ig.me/m/${lead.instagram_handle}`, '_blank');
                      } else if (lead?.phone) {
                        const phone = lead.phone.replace(/[^0-9]/g, '');
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(chiefInsight?.icebreaker || '')}`, '_blank');
                      }
                    }}
                    className="col-span-2 p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transition-all"
                  >
                    <Send className="w-5 h-5 mx-auto mb-1 text-white" />
                    <span className="text-xs text-white font-bold">Follow-up senden</span>
                  </button>
                )}
              </>
            );
          })()}
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
  }, [lead, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#14202c] border border-cyan-500/20 rounded-2xl w-full max-w-lg mx-4 shadow-[0_0_50px_rgba(6,182,212,0.2)] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-white text-lg font-bold">Lead bearbeiten</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
        className="bg-[#14202c] border border-cyan-500/20 rounded-2xl w-full max-w-lg mx-4 shadow-[0_0_50px_rgba(6,182,212,0.2)] max-h-[90vh] flex flex-col"
        onPaste={handlePaste}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-white text-lg font-bold">Neuer Lead</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex p-4 gap-2 border-b border-gray-800 flex-shrink-0">
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

        <div className="flex-1 overflow-y-auto p-6">
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

  // Lead Cascade States
  const [showCascadeModal, setShowCascadeModal] = useState(false);
  const [cascadeLead, setCascadeLead] = useState<any>(null);
  const [cascadeReason, setCascadeReason] = useState('');
  const [downlinePartners, setDownlinePartners] = useState<any[]>([]);
  const [loadingDownline, setLoadingDownline] = useState(false);
  const [chiefInsight, setChiefInsight] = useState<{
    strategy: string;
    next_action: string;
    icebreaker: string;
    probability: number;
    temperature_suggestion?: string;
    status_suggestion?: string;
    buttons?: string[];
    workflow_case?: string;
    urgency?: string;
    channel?: string;
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
  const [queueRefreshTrigger, setQueueRefreshTrigger] = useState(0);
  
  // Action Flow States
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [followupDate, setFollowupDate] = useState<string>('');
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    loadLeads();
  }, []);

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
  }, [leads, selectedLead, showEditModal, showNewLeadModal]);

  // Aggregierter Data Load - EIN Request für ALLES
  const loadLeadData = async (leadId: string) => {
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
  };

  useEffect(() => {
    if (selectedLead?.id) {
      loadLeadData(selectedLead.id);
    }
  }, [selectedLead?.id]); // Nur bei ID-Änderung

  const loadLeads = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/leads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let data = await res.json();
      if (!Array.isArray(data)) data = data.leads || data.data || [];
      
      const sorted = sortLeadsByPriority(data);
      setLeads(sorted);
      if (sorted.length > 0 && !selectedLead) {
        setSelectedLead(sorted[0]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortLeadsByPriority = (leads: Lead[]): Lead[] => {
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
  };

  const loadTimeline = async (leadId: string) => {
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
  };

  const loadMessages = async (leadId: string) => {
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
  };

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

  const loadDownlinePartners = async () => {
    setLoadingDownline(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/team/downline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDownlinePartners(data.downline || []);
      }
    } catch (error) {
      console.error('Error loading downline:', error);
    } finally {
      setLoadingDownline(false);
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
        
        // Trigger Queue Refresh
        setQueueRefreshTrigger(prev => prev + 1);
        
        // Optional: Zum nächsten Lead in der Queue wechseln
        // (wird durch Queue Refresh automatisch aktualisiert)
      }
    } catch (error) {
      console.error('Error marking lead as processed:', error);
    }
  };

  const handleActionClick = (action: string) => {
    setCurrentAction(action);
    setSelectedOutcome(null);
    setFollowupDate('');
    setActionNotes('');
    
    // "Später" braucht kein Modal
    if (action === 'later') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      handleSaveAction('later', null, tomorrow.toISOString().split('T')[0], '');
      return;
    }
    
    // Alle anderen Actions öffnen das Modal
    setShowOutcomeModal(true);
  };

  /**
   * Valid values for lead_interactions table (from DB constraints)
   */
  const VALID_INTERACTION_TYPES = ['call', 'email', 'meeting', 'note', 'status_change', 'message_sent', 'message_received', 'follow_up_created', 'chief_chat', 'ai_suggestion'] as const;
  const VALID_CHANNELS = ['whatsapp', 'instagram', 'linkedin', 'email', 'phone', 'zoom', 'in_person', 'call', 'meeting', 'video_call', 'sms'] as const;
  const VALID_OUTCOMES = ['positive', 'neutral', 'negative', 'no_answer', 'callback', 'not_interested'] as const;

  /**
   * Maps UI action to valid interaction_type for database.
   */
  const getValidInteractionType = (action: string): string => {
    const ACTION_TO_TYPE: Record<string, string> = {
      // UI Actions → DB interaction_type
      'message': 'message_sent',
      'call': 'call',
      'meeting': 'meeting',
      'live': 'meeting',           // Live-Treffen = Meeting
      'lost': 'status_change',     // Lost = Status-Änderung
      'later': 'note',             // Später = Notiz
      'note': 'note',
      'email': 'email',
    };
    
    return ACTION_TO_TYPE[action.toLowerCase()] || 'note';
  };

  /**
   * Maps lead source to valid channel for database.
   */
  const getValidChannel = (source: string | undefined | null): string => {
    if (!source) return 'whatsapp';
    
    const normalized = source.toLowerCase().trim();
    
    // Direct match
    if (VALID_CHANNELS.includes(normalized as any)) {
      return normalized;
    }
    
    // Map variations
    const CHANNEL_MAPPINGS: Record<string, string> = {
      'ai_chat': 'whatsapp',
      'chat': 'whatsapp',
      'system': 'whatsapp',
      'import': 'whatsapp',
      'manual': 'whatsapp',
      'bulk_import': 'whatsapp',
      'facebook': 'instagram',
      'fb': 'instagram',
      'ig': 'instagram',
      'meta': 'instagram',
      'wa': 'whatsapp',
      'whats_app': 'whatsapp',
      'tel': 'phone',
      'telephone': 'phone',
      'mobile': 'phone',
      'mail': 'email',
      'e-mail': 'email',
      'e_mail': 'email',
      'event': 'in_person',
      'conference': 'in_person',
      'referral': 'in_person',
      'network': 'in_person',
      'li': 'linkedin',
      'linked_in': 'linkedin',
      'video': 'video_call',
      'teams': 'video_call',
      'google_meet': 'video_call',
    };
    
    return CHANNEL_MAPPINGS[normalized] || 'whatsapp';
  };

  /**
   * Maps UI outcome to valid outcome for database.
   */
  const getValidOutcome = (outcome: string | null): string | null => {
    if (!outcome) return null;
    
    const normalized = outcome.toLowerCase().trim();
    
    // Direct match
    if (VALID_OUTCOMES.includes(normalized as any)) {
      return normalized;
    }
    
    // Map variations
    const OUTCOME_MAPPINGS: Record<string, string> = {
      // Positive variations
      'positive': 'positive',
      'interested': 'positive',
      'hot': 'positive',
      'scheduled': 'positive',
      'done_positive': 'positive',
      
      // Neutral variations
      'neutral': 'neutral',
      'maybe': 'neutral',
      'thinking': 'neutral',
      'done_neutral': 'neutral',
      
      // Negative variations
      'negative': 'negative',
      'done_negative': 'negative',
      'rejected': 'negative',
      
      // No answer variations
      'no_answer': 'no_answer',
      'not_reached': 'no_answer',
      'voicemail': 'no_answer',
      
      // Not interested variations
      'not_interested': 'not_interested',
      'no_interest': 'not_interested',
      'lost': 'not_interested',
      
      // Callback variations
      'callback': 'callback',
      'call_back': 'callback',
      'reschedule': 'callback',
      
      // Lost reasons → not_interested
      'too_expensive': 'not_interested',
      'bad_timing': 'not_interested',
      'wrong_target': 'not_interested',
      'competitor': 'not_interested',
      'other': 'not_interested',
    };
    
    return OUTCOME_MAPPINGS[normalized] || null;
  };

  const handleSaveAction = async (
    action: string,
    outcome: string | null,
    nextFollowup: string | null,
    notes: string = ''
  ) => {
    if (!selectedLead) return;
    
    try {
      const token = localStorage.getItem('access_token');
      
      // 1. Interaction speichern (außer bei "later")
      if (action !== 'later') {
        try {
          await fetch(`${API_URL}/api/command-center/${selectedLead.id}/interactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              interaction_type: getValidInteractionType(action),
              outcome: getValidOutcome(outcome),
              notes: notes,
              channel: getValidChannel(selectedLead?.source),
            })
          });
        } catch (e) {
          console.error('Error saving interaction:', e);
        }
      }
      
      // 2. Lead Status updaten + Follow-up erstellen
      const res = await fetch(`${API_URL}/api/command-center/${selectedLead.id}/mark-processed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: action,
          outcome: outcome,
          next_followup: nextFollowup,
          notes: notes
        })
      });
      
      if (res.ok) {
        // Queue Refresh triggern
        setQueueRefreshTrigger(prev => prev + 1);

        // Bei "Lost" → Lead Cascade Dialog zeigen
        if (action === 'lost') {
          setCascadeLead(selectedLead);
          setCascadeReason(outcome || '');
          loadDownlinePartners();
          setShowCascadeModal(true);
        }

        // Lead Update
        setSelectedLead(prev => prev ? {
          ...prev,
          waiting_for_response: false,
          suggested_action: undefined
        } : null);

        // Modal schließen
        setShowOutcomeModal(false);
        setCurrentAction(null);
        setSelectedOutcome(null);
        setFollowupDate('');
        setActionNotes('');
      }
    } catch (error) {
      console.error('Error saving action:', error);
    }
  };

  const handleCascadeLead = async (targetUserId: string) => {
    if (!cascadeLead) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/command-center/${cascadeLead.id}/cascade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          reason: cascadeReason,
          notes: `Weitergeleitet wegen: ${cascadeReason}`
        })
      });

      if (res.ok) {
        // Erfolg - Modal schließen und Queue refreshen
        setShowCascadeModal(false);
        setCascadeLead(null);
        setQueueRefreshTrigger(prev => prev + 1);

        // Optional: Success Toast/Notification
        console.log('Lead erfolgreich weitergeleitet!');
      }
    } catch (error) {
      console.error('Error cascading lead:', error);
    }
  };

  const handleArchiveLead = () => {
    // Lead nicht weiterleiten, nur archivieren
    setShowCascadeModal(false);
    setCascadeLead(null);
    // Lead ist bereits als "lost" markiert
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
      console.log("🔍 DEBUG handleSaveLead - Original data:", data);

      // Transform instagram_url to instagram for backend compatibility
      const transformedData = {
        ...data,
        ...(data.instagram_url && { instagram: data.instagram_url })
      };

      console.log("🔍 DEBUG handleSaveLead - Transformed data:", transformedData);

      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/leads/${selectedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(transformedData)
      });
      setSelectedLead({ ...selectedLead, ...data });
      loadLeads();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateLead = async (data: any) => {
    try {
      console.log("🔍 DEBUG handleCreateLead - Original data:", data);

      // Transform instagram_url to instagram for backend compatibility
      const transformedData = {
        ...data,
        instagram: data.instagram_url, // Backend expects 'instagram'
        status: 'new',
        temperature: 'cold'
      };

      console.log("🔍 DEBUG handleCreateLead - Transformed data:", transformedData);

      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(transformedData)
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

  // Cascade Modal für Lead-Weiterleitung
  const CascadeModal = () => {
    if (!showCascadeModal || !cascadeLead) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#0d1520] border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
          {/* Header */}
          <div className="text-center">
            <span className="text-4xl mb-2 block">🔄</span>
            <h3 className="text-xl font-semibold text-white">Lead an Team weiterleiten?</h3>
            <p className="text-gray-400 text-sm mt-2">
              Vielleicht passt <span className="text-cyan-400 font-medium">{cascadeLead.name}</span> besser zu einem deiner Partner?
            </p>
          </div>

          {/* Lead Info */}
          <div className="bg-[#1a2a3a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {cascadeLead.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-white font-medium">{cascadeLead.name}</p>
                <p className="text-gray-400 text-sm">{cascadeLead.company || cascadeLead.email || 'Kein Unternehmen'}</p>
              </div>
            </div>
            {cascadeReason && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  Grund: <span className="text-yellow-400">{cascadeReason}</span>
                </p>
              </div>
            )}
          </div>

          {/* Downline Liste */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400 font-medium">Deine Partner:</p>

            {loadingDownline ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 text-sm mt-2">Lade Team...</p>
              </div>
            ) : downlinePartners.length === 0 ? (
              <div className="text-center py-6 bg-[#1a2a3a] rounded-xl">
                <p className="text-gray-400">Keine Team-Partner gefunden</p>
                <p className="text-gray-500 text-sm mt-1">Füge zuerst Partner zu deinem Team hinzu</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {downlinePartners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => handleCascadeLead(partner.id)}
                    className="w-full flex items-center justify-between p-3 bg-[#1a2a3a] hover:bg-[#243447] rounded-xl border border-gray-700 hover:border-cyan-500 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                        {(partner.name || partner.first_name || partner.email)?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">
                          {partner.name || partner.full_name || partner.first_name || partner.email?.split('@')[0]}
                        </p>
                        <p className="text-gray-400 text-sm">{partner.email}</p>
                      </div>
                    </div>
                    <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Weiterleiten →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleArchiveLead}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
            >
              Nein, archivieren
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowCascadeModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  // Outcome Modal für Action-Details
  const OutcomeModal = () => {
    if (!showOutcomeModal || !currentAction) return null;
    
    const actionConfig: Record<string, {
      title: string;
      emoji: string;
      outcomes?: { value: string; label: string; emoji: string }[];
      showNotes: boolean;
      showFollowup: boolean;
      defaultFollowupDays: number;
    }> = {
      message: {
        title: 'Nachricht gesendet',
        emoji: '📱',
        showNotes: true,
        showFollowup: true,
        defaultFollowupDays: 3,
      },
      call: {
        title: 'Anruf gemacht',
        emoji: '📞',
        outcomes: [
          { value: 'positive', label: 'Positiv - Interesse!', emoji: '✅' },
          { value: 'neutral', label: 'Neutral - braucht Zeit', emoji: '😐' },
          { value: 'negative', label: 'Negativ - kein Interesse', emoji: '❌' },
          { value: 'no_answer', label: 'Nicht erreicht', emoji: '📵' },
        ],
        showNotes: true,
        showFollowup: true,
        defaultFollowupDays: 3,
      },
      meeting: {
        title: 'Termin',
        emoji: '📅',
        outcomes: [
          { value: 'scheduled', label: 'Termin vereinbart', emoji: '📅' },
          { value: 'done_positive', label: 'Termin war positiv', emoji: '✅' },
          { value: 'done_neutral', label: 'Termin war neutral', emoji: '😐' },
          { value: 'done_negative', label: 'Termin war negativ', emoji: '❌' },
        ],
        showNotes: true,
        showFollowup: true,
        defaultFollowupDays: 1,
      },
      live: {
        title: 'Live getroffen',
        emoji: '🤝',
        outcomes: [
          { value: 'positive', label: 'Positiv - Interesse!', emoji: '✅' },
          { value: 'neutral', label: 'Neutral', emoji: '😐' },
          { value: 'negative', label: 'Kein Interesse', emoji: '❌' },
        ],
        showNotes: true,
        showFollowup: true,
        defaultFollowupDays: 1,
      },
      lost: {
        title: 'Lead verloren',
        emoji: '❌',
        outcomes: [
          { value: 'no_interest', label: 'Kein Interesse', emoji: '🚫' },
          { value: 'too_expensive', label: 'Zu teuer', emoji: '💰' },
          { value: 'bad_timing', label: 'Schlechtes Timing', emoji: '⏰' },
          { value: 'wrong_target', label: 'Falsche Zielgruppe', emoji: '🎯' },
          { value: 'competitor', label: 'Geht zur Konkurrenz', emoji: '🏃' },
          { value: 'other', label: 'Sonstiges', emoji: '❓' },
        ],
        showNotes: true,
        showFollowup: false,
        defaultFollowupDays: 0,
      },
    };
    
    const config = actionConfig[currentAction];
    if (!config) return null;
    
    const getDefaultDate = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    };
    
    const getSmartDefaultDays = () => {
      let days = config.defaultFollowupDays;
      if (selectedOutcome === 'positive') days = 1;
      if (selectedOutcome === 'neutral') days = 5;
      if (selectedOutcome === 'no_answer') days = 1;
      return days;
    };
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#0d1520] border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">{config.emoji}</span>
            <h3 className="text-xl font-semibold text-white">{config.title}</h3>
          </div>
          
          {/* Lead Info */}
          <div className="bg-[#1a2a3a] rounded-lg p-3">
            <p className="text-cyan-400 font-medium">{selectedLead?.name}</p>
            <p className="text-sm text-gray-400">{selectedLead?.company || 'Kein Unternehmen'}</p>
          </div>
          
          {/* Outcomes */}
          {config.outcomes && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 font-medium">Wie lief's?</p>
              <div className="grid grid-cols-1 gap-2">
                {config.outcomes.map((outcome) => (
                  <button
                    key={outcome.value}
                    onClick={() => setSelectedOutcome(outcome.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      selectedOutcome === outcome.value
                        ? 'bg-cyan-500/20 border-cyan-500 text-white scale-[1.02]'
                        : 'bg-[#1a2a3a] border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <span className="text-xl">{outcome.emoji}</span>
                    <span className="font-medium">{outcome.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Notizen */}
          {config.showNotes && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 font-medium">Notizen (optional)</p>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Was wurde besprochen? Wichtige Infos..."
                className="w-full p-3 bg-[#1a2a3a] border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none focus:border-cyan-500 focus:outline-none transition-colors"
                rows={2}
              />
            </div>
          )}
          
          {/* Follow-up Datum */}
          {config.showFollowup && currentAction !== 'lost' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 font-medium">Wann nachfassen?</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Morgen', days: 1 },
                  { label: '3 Tage', days: 3 },
                  { label: '1 Woche', days: 7 },
                ].map((option) => {
                  const dateStr = getDefaultDate(option.days);
                  return (
                    <button
                      key={option.days}
                      onClick={() => setFollowupDate(dateStr)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        followupDate === dateStr
                          ? 'bg-cyan-500/20 border-cyan-500 text-white'
                          : 'bg-[#1a2a3a] border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="date"
                value={followupDate || getDefaultDate(getSmartDefaultDays())}
                onChange={(e) => setFollowupDate(e.target.value)}
                className="w-full mt-2 px-4 py-2 bg-[#1a2a3a] border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-xs text-cyan-400 flex items-center gap-1">
                <span>💡</span>
                <span>CHIEF empfiehlt: {getSmartDefaultDays()} Tag(e)</span>
              </p>
            </div>
          )}
          
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowOutcomeModal(false);
                setCurrentAction(null);
                setSelectedOutcome(null);
                setFollowupDate('');
                setActionNotes('');
              }}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={() => {
                const finalDate = followupDate || getDefaultDate(getSmartDefaultDays());
                handleSaveAction(currentAction!, selectedOutcome, finalDate, actionNotes);
              }}
              disabled={config.outcomes && config.outcomes.length > 0 && !selectedOutcome}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
            >
              ✓ Speichern
            </button>
          </div>
        </div>
      </div>
    );
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

  return (
    <div className="h-screen bg-[#0a0a0f] flex overflow-hidden">
      {/* Smart Queue / All Leads */}
      <div className="w-[320px] flex-shrink-0 border-r border-cyan-500/10 flex flex-col">
        {/* View Toggle */}
        <div className="flex border-b border-cyan-500/10">
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
              refreshTrigger={queueRefreshTrigger}
            />
          ) : (
            <AllLeadsTable
              onSelectLead={(lead) => setSelectedLead(lead as any)}
              selectedLeadId={selectedLead?.id || null}
            />
          )}
        </div>

        {/* New Lead Buttons */}
        <div className="p-3 border-t border-cyan-500/10 space-y-2">
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

      {/* Dossier */}
      <div className="flex-1 min-w-0 border-r border-cyan-500/10">
        <Dossier
          lead={selectedLead}
          timeline={timeline}
          chiefInsight={chiefInsight}
          onStatusChange={handleStatusChange}
          onTemperatureChange={handleTemperatureChange}
          onEdit={() => setShowEditModal(true)}
          onScreenshot={() => setShowNewLeadModal(true)}
          onMarkProcessed={handleMarkProcessed}
          onActionClick={handleActionClick}
        />
      </div>

      {/* Chief Copilot */}
      <div className="w-[400px] flex-shrink-0">
        <ChiefCopilot
          lead={selectedLead}
          messages={messages}
          chiefInsight={chiefInsight}
          onSendMessage={handleSendMessage}
          onQuickAction={handleQuickAction}
          onStatusChange={handleStatusChange}
          onTemperatureChange={handleTemperatureChange}
          onAnalyzeResponse={() => setShowResponseModal(true)}
        />
      </div>

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

      {/* Cascade Modal */}
      <CascadeModal />

      {/* Outcome Modal */}
      <OutcomeModal />
    </div>
  );
}

