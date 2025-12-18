import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Phone, Mail, MessageCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, isToday, parseISO, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface FollowUp {
  id: string;
  title?: string;
  due_at: string;
  suggested_message?: string;
  channel?: string;
  status?: string;
  lead_id?: string;
  leads?: {
    id: string;
    name: string;
    company?: string;
  };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadFollowups();
  }, []);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      // 1. Follow-ups laden (OHNE doppeltes /api)
      let followupsData: FollowUp[] = [];
      try {
        const response = await api.get('/followups/all');
        // API gibt { suggestions: [...], count: ... } zurück
        followupsData = (response as any).suggestions || response.data || [];
      } catch (e) {
        try {
          const fallback = await api.get('/followups/pending');
          // API gibt { suggestions: [...], count: ... } zurück
          followupsData = (fallback as any).suggestions || fallback.data || [];
        } catch (e2) {
          console.error('Failed to load followups:', e2);
        }
      }

      // 2. Calendar Events laden (Meetings von CHIEF)
      let eventsData: FollowUp[] = [];
      try {
        const eventsResponse = await api.get('/calendar/events');
        const events = eventsResponse.data || [];
        // Events in Follow-up Format konvertieren
        eventsData = events.map((event: any) => ({
          id: event.id,
          title: event.title,
          due_at: event.start_time || event.scheduled_at,
          channel: 'meeting',
          status: event.status || 'pending',
          lead_id: event.lead_id,
          leads: event.leads || { name: event.title?.replace('Meeting mit ', '') || 'Meeting' }
        }));
      } catch (e) {
        console.error('Failed to load calendar events:', e);
      }

      // 3. Beide zusammenführen
      setFollowups([...followupsData, ...eventsData]);
    } finally {
      setLoading(false);
    }
  };

  const getDays = () => {
    if (viewMode === 'week') {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      });
    }
    // Für Monatsansicht: Immer komplette Wochen zeigen
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  const getFollowupsForDay = (day: Date) => {
    return followups.filter(fu => fu.due_at && isSameDay(parseISO(fu.due_at), day));
  };

  const getChannelColor = (channel?: string) => {
    switch (channel?.toLowerCase()) {
      case 'whatsapp': return 'bg-green-500';
      case 'email': return 'bg-blue-500';
      case 'phone': return 'bg-purple-500';
      case 'instagram': return 'bg-pink-500';
      case 'meeting': return 'bg-yellow-500';
      default: return 'bg-teal-500';
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowCreateModal(true);
  };

  const overdueCount = followups.filter(fu => fu.due_at && isBefore(parseISO(fu.due_at), new Date()) && !isToday(parseISO(fu.due_at))).length;
  const todayCount = followups.filter(fu => fu.due_at && isToday(parseISO(fu.due_at))).length;
  const days = getDays();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Calendar className="h-6 w-6 text-teal-400" />
            Kalender
          </h1>

          {/* View Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Woche
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monat
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg">
            <button
              onClick={() => navigate('prev')}
              className="p-2 hover:bg-slate-700 rounded-l-lg text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 font-medium min-w-[200px] text-center text-white">
              {viewMode === 'week'
                ? `${format(days[0], 'd. MMM', { locale: de })} - ${format(days[days.length-1], 'd. MMM yyyy', { locale: de })}`
                : format(currentDate, 'MMMM yyyy', { locale: de })
              }
            </span>
            <button
              onClick={() => navigate('next')}
              className="p-2 hover:bg-slate-700 rounded-r-lg text-slate-400 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium text-white"
          >
            Heute
          </button>

          {/* Create Button */}
          <button
            onClick={() => { setSelectedDate(new Date()); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Termin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
          <p className="text-3xl font-bold text-teal-400">{todayCount}</p>
          <p className="text-slate-400 text-sm">Heute</p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full" style={{ width: '40%' }}></div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
          <p className="text-3xl font-bold text-green-400">{followups.length}</p>
          <p className="text-slate-400 text-sm">Gesamt offen</p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
          <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>{overdueCount}</p>
          <p className="text-slate-400 text-sm">Überfällig</p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${overdueCount > 0 ? 'bg-red-500' : 'bg-slate-600'}`} style={{ width: overdueCount > 0 ? '30%' : '0%' }}></div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Laden...</div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-slate-800 border-b border-slate-700">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-slate-400">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayFollowups = getFollowupsForDay(day);
              const isCurrentDay = isToday(day);
              const isPast = isBefore(day, new Date()) && !isCurrentDay;
              const isCurrentMonth = viewMode === 'month' ? isSameMonth(day, currentDate) : true;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[100px] p-2 border-b border-r border-slate-700 cursor-pointer transition-colors ${
                    isCurrentDay
                      ? 'bg-teal-500/10'
                      : isPast
                        ? 'bg-slate-800/30'
                        : 'bg-slate-800/50 hover:bg-slate-700/50'
                  } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  {/* Day Number */}
                  <div className="text-right mb-1">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                      isCurrentDay
                        ? 'bg-teal-500 text-white font-bold'
                        : isPast
                          ? 'text-slate-500'
                          : 'text-slate-300'
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Follow-ups */}
                  <div className="space-y-1">
                    {dayFollowups.slice(0, 2).map((fu) => (
                      <div
                        key={fu.id}
                        className={`text-xs p-1 rounded truncate text-white ${getChannelColor(fu.channel)}`}
                        title={fu.leads?.name}
                      >
                        {fu.leads?.name || 'Follow-up'}
                      </div>
                    ))}
                    {dayFollowups.length > 2 && (
                      <div className="text-xs text-slate-500 text-center">
                        +{dayFollowups.length - 2} mehr
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTerminModal
          date={selectedDate}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadFollowups();
          }}
        />
      )}
    </div>
  );
}

function CreateTerminModal({ date, onClose, onCreated }: { date: Date | null, onClose: () => void, onCreated: () => void }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [dueDate, setDueDate] = useState(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await api.get('/leads');
      console.log('Leads response:', response);  // Debug
      
      // Prüfe verschiedene Response-Strukturen
      const leadsData = (response as any).data?.leads || (response as any).data || response || [];
      console.log('Leads data:', leadsData);  // Debug
      
      setLeads(Array.isArray(leadsData) ? leadsData : []);
    } catch (e) {
      console.error('Failed to load leads:', e);
      setLeads([]);
    }
  };

  const handleCreate = async () => {
    if (!selectedLead) {
      toast.error('Bitte wähle einen Lead aus');
      return;
    }

    setSaving(true);
    try {
      await api.post('/followups', {
        lead_id: selectedLead,
        due_at: new Date(dueDate).toISOString(),
        suggested_message: message,
        channel: channel,
        status: 'pending'
      });
      toast.success('Termin erstellt!');
      onCreated();
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <Plus className="h-5 w-5 text-teal-400" />
          Neuer Termin
        </h2>

        <div className="space-y-4">
          {/* Lead Selection */}
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">Lead</label>
            <select
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="">-- Lead auswählen --</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} {lead.company ? `(${lead.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">Datum</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">Kanal</label>
            <div className="flex gap-2">
              {[
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
                { id: 'email', label: 'Email', icon: Mail, color: 'bg-blue-500' },
                { id: 'phone', label: 'Anruf', icon: Phone, color: 'bg-purple-500' }
              ].map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setChannel(ch.id)}
                  className={`flex-1 p-2.5 rounded-lg border flex items-center justify-center gap-1.5 text-sm transition-colors ${
                    channel === ch.id
                      ? `${ch.color} text-white border-transparent`
                      : 'bg-slate-900 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <ch.icon className="h-4 w-4" />
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">Nachricht (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nachricht für Follow-up..."
              className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !selectedLead}
            className="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Speichern...' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}
