import { useEffect, useState, useCallback } from 'react';
import {
  Send,
  Edit,
  SkipForward,
  Loader2,
  PartyPopper,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { authService } from '@/services/authService';

const buildAuthHeaders = () => {
  const token = authService.getAccessToken?.() || localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

interface Message {
  id: string;
  lead_id: string;
  message: string;
  channel: string;
  priority: number;
  leads: {
    name: string;
    company: string;
    phone: string;
    email: string;
    temperature: string;
  } | null;
}

interface Stats {
  pending: number;
  sent_today: number;
}

export default function ApprovalInboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState<Stats>({ pending: 0, sent_today: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [allDone, setAllDone] = useState(false);

  const currentMessage = messages[currentIndex];

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inbox/pending?limit=50', {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      setMessages(data.messages || []);
      setStats(data.stats || { pending: 0, sent_today: 0 });

      if (!data.messages?.length) {
        setAllDone(true);
      } else {
        setAllDone(false);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDrafts = async () => {
    try {
      await fetch('/api/inbox/generate-drafts', {
        method: 'POST',
        headers: buildAuthHeaders(),
      });
      await fetchMessages();
    } catch (err) {
      console.error('Failed to generate drafts:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editMode) return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          handleApprove();
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          handleEdit();
          break;
        case 'Escape':
          e.preventDefault();
          handleSkip();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) setCurrentIndex((i) => i - 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, editMode, currentMessage]);

  const handleApprove = async () => {
    if (!currentMessage || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/inbox/${currentMessage.id}/approve`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          edited_message: editMode ? editedMessage : null,
        }),
      });

      const result = await response.json();

      if (result.deep_link) {
        window.open(result.deep_link, '_blank');
      }

      const newMessages = messages.filter((_, i) => i !== currentIndex);
      setMessages(newMessages);
      setStats((s) => ({
        ...s,
        pending: Math.max(0, s.pending - 1),
        sent_today: s.sent_today + 1,
      }));
      setEditMode(false);

      if (newMessages.length === 0) {
        triggerConfetti();
        setAllDone(true);
      } else if (currentIndex >= newMessages.length) {
        setCurrentIndex(newMessages.length - 1);
      }
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSkip = async () => {
    if (!currentMessage || sending) return;

    try {
      await fetch(`/api/inbox/${currentMessage.id}/skip`, {
        method: 'POST',
        headers: buildAuthHeaders(),
      });

      const newMessages = messages.filter((_, i) => i !== currentIndex);
      setMessages(newMessages);
      setStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1) }));

      if (newMessages.length === 0) {
        setAllDone(true);
      } else if (currentIndex >= newMessages.length) {
        setCurrentIndex(newMessages.length - 1);
      }
    } catch (err) {
      console.error('Failed to skip:', err);
    }
  };

  const handleEdit = () => {
    if (!currentMessage) return;
    setEditedMessage(currentMessage.message);
    setEditMode(true);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const progressPercent =
    messages.length > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((messages.length - stats.pending) / messages.length) * 100,
          ),
        )
      : 0;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <PartyPopper className="h-16 w-16 text-emerald-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Alles erledigt! 🎉</h1>
        <p className="text-slate-400 mb-6">
          Du hast heute {stats.sent_today} Nachrichten gesendet
        </p>
        <Button onClick={generateDrafts}>Neue Drafts generieren</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-emerald-500" />
              Approval Inbox
            </h1>
            <p className="text-slate-400 text-sm">
              {stats.pending} ausstehend · {stats.sent_today} heute gesendet
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={generateDrafts}>
            Drafts generieren
          </Button>
        </div>

        <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {currentMessage && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {currentMessage.leads?.name || 'Unbekannt'}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {currentMessage.leads?.company || 'Keine Firma'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      currentMessage.channel === 'whatsapp'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {currentMessage.channel}
                  </span>
                  <span className="text-slate-500 text-sm">
                    {currentIndex + 1} / {messages.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {editMode ? (
                <textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  className="w-full h-40 p-4 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              ) : (
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {currentMessage.message}
                </p>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => currentIndex > 0 && setCurrentIndex((i) => i - 1)}
                    disabled={currentIndex === 0}
                    className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() =>
                      currentIndex < messages.length - 1 && setCurrentIndex((i) => i + 1)
                    }
                    disabled={currentIndex === messages.length - 1}
                    className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {editMode ? (
                    <>
                      <Button variant="ghost" onClick={() => setEditMode(false)}>
                        Abbrechen
                      </Button>
                      <Button
                        className="bg-emerald-500 hover:bg-emerald-600"
                        onClick={handleApprove}
                        disabled={sending}
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Senden
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" className="text-slate-400" onClick={handleSkip}>
                        <SkipForward className="h-4 w-4 mr-2" />
                        Skip
                      </Button>
                      <Button variant="outline" onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        className="bg-emerald-500 hover:bg-emerald-600"
                        onClick={handleApprove}
                        disabled={sending}
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Senden
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Enter</kbd>
              <span>Senden</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">E</kbd>
              <span>Bearbeiten</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Esc</kbd>
              <span>Skip</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

