/**
 * Autopilot Preview Component - Command Center V3
 * 
 * Zeigt vorbereitete Nachrichten (Drafts/Pending) und gesendete Nachrichten (letzte 24h).
 * Freigeben/Bearbeiten/Abbrechen Funktionen.
 */

import { useState, useEffect } from 'react';
import { 
  Zap, Loader2, Check, X, Edit2, Send,
  MessageSquare, Mail, Instagram, Clock,
  CheckCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface DraftMessage {
  id: string;
  lead_id?: string;
  lead_name?: string;
  channel: 'whatsapp' | 'instagram' | 'email' | 'facebook' | 'linkedin' | 'sms';
  message: string;
  status: 'pending' | 'suggested' | 'approved';
  scheduled_at?: string;
  created_at: string;
  contact_id?: string;
}

interface SentMessage {
  id: string;
  lead_id?: string;
  lead_name?: string;
  channel: 'whatsapp' | 'instagram' | 'email' | 'facebook' | 'linkedin' | 'sms';
  message: string;
  sent_at: string;
  status: 'sent' | 'delivered' | 'read';
}

interface AutopilotPreviewProps {
  selectedLeadId?: string | null;
}

export default function AutopilotPreview({ selectedLeadId }: AutopilotPreviewProps) {
  const [drafts, setDrafts] = useState<DraftMessage[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');

  useEffect(() => {
    loadAutopilotData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAutopilotData, 30000);
    return () => clearInterval(interval);
  }, [selectedLeadId]);

  const loadAutopilotData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Load pending/suggested messages (drafts)
      const draftsRes = await fetch(
        `${API_URL}/api/autopilot/message-events?status=suggested&direction=outbound&limit=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (draftsRes.ok) {
        const draftsData = await draftsRes.json();
        const events = draftsData.events || draftsData.data || [];
        setDrafts(events.map((e: any) => ({
          id: e.id,
          lead_id: e.contact_id, // Falls contact_id = lead_id
          channel: e.channel,
          message: e.suggested_reply?.message || e.normalized_text || '',
          status: e.autopilot_status || 'suggested',
          created_at: e.created_at
        })));
      }
      
      // Load sent messages (last 24h)
      const sentRes = await fetch(
        `${API_URL}/api/autopilot/message-events?status=sent&direction=outbound&limit=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (sentRes.ok) {
        const sentData = await sentRes.json();
        const events = sentData.events || sentData.data || [];
        // Filter: nur letzte 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = events.filter((e: any) => new Date(e.created_at) > oneDayAgo);
        setSentMessages(recent.map((e: any) => ({
          id: e.id,
          lead_id: e.contact_id,
          channel: e.channel,
          message: e.normalized_text || e.text || '',
          sent_at: e.created_at,
          status: 'sent'
        })));
      }
    } catch (error) {
      console.error('Error loading autopilot data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (draftId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/autopilot/message-event/${draftId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ autopilot_status: 'approved' })
      });
      loadAutopilotData();
    } catch (error) {
      console.error('Error approving draft:', error);
    }
  };

  const handleSkip = async (draftId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/autopilot/message-event/${draftId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ autopilot_status: 'skipped' })
      });
      loadAutopilotData();
    } catch (error) {
      console.error('Error skipping draft:', error);
    }
  };

  const handleEdit = (draft: DraftMessage) => {
    setEditingDraft(draft.id);
    setEditMessage(draft.message);
  };

  const handleSaveEdit = async () => {
    // TODO: Update message via API if endpoint exists
    // For now, just cancel edit
    setEditingDraft(null);
    setEditMessage('');
    loadAutopilotData();
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-green-400" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-cyan-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    const labels: Record<string, string> = {
      whatsapp: 'WhatsApp',
      instagram: 'Instagram',
      email: 'Email',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      sms: 'SMS'
    };
    return labels[channel] || channel;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'vor wenigen Min';
    if (diffHours < 24) return `vor ${diffHours}h`;
    return date.toLocaleDateString('de-DE');
  };

  if (loading && drafts.length === 0 && sentMessages.length === 0) {
    return (
      <div className="p-4 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0d1117] to-[#0a0a0f]">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Autopilot Aktivitäten
          </h2>
          <button
            onClick={loadAutopilotData}
            className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Vorbereitete Nachrichten */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-orange-400" />
            <h3 className="text-white font-semibold text-sm">VORBEREITET (wartet auf Freigabe)</h3>
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
              {drafts.length}
            </span>
          </div>

          {drafts.length === 0 ? (
            <div className="text-center py-6 text-gray-600 text-sm">
              Keine vorbereiteten Nachrichten
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(draft.channel)}
                      <span className="text-white text-sm font-medium">
                        {draft.lead_name || 'Lead'}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {getChannelLabel(draft.channel)}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {formatTime(draft.created_at)}
                    </span>
                  </div>

                  {/* Message */}
                  {editingDraft === draft.id ? (
                    <div className="mb-3">
                      <textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg p-2 text-white text-sm resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 bg-cyan-500 text-white rounded text-xs hover:bg-cyan-600"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={() => {
                            setEditingDraft(null);
                            setEditMessage('');
                          }}
                          className="px-3 py-1 bg-gray-800 text-gray-400 rounded text-xs hover:bg-gray-700"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-300 text-sm mb-3 whitespace-pre-wrap">
                      {draft.message}
                    </p>
                  )}

                  {/* Actions */}
                  {editingDraft !== draft.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(draft.id)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Freigeben
                      </button>
                      <button
                        onClick={() => handleEdit(draft)}
                        className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSkip(draft.id)}
                        className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gesendete Nachrichten (letzte 24h) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <h3 className="text-white font-semibold text-sm">GESENDET (letzte 24h)</h3>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
              {sentMessages.length}
            </span>
          </div>

          {sentMessages.length === 0 ? (
            <div className="text-center py-6 text-gray-600 text-sm">
              Keine gesendeten Nachrichten in den letzten 24h
            </div>
          ) : (
            <div className="space-y-2">
              {sentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(msg.channel)}
                      <span className="text-white text-xs font-medium">
                        {msg.lead_name || 'Lead'}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {getChannelLabel(msg.channel)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Send className="w-3 h-3 text-green-400" />
                      <span className="text-gray-600 text-xs">
                        {formatTime(msg.sent_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs line-clamp-2">
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

