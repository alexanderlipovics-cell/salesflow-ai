import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Plus, Phone, Mail, MessageCircle } from 'lucide-react';
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
    phone?: string;
    email?: string;
  };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadFollowups();
  }, [currentDate, viewMode]);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/followups/all');
      setFollowups(response.data || []);
    } catch (error) {
      console.error('Failed to load followups:', error);
      // Fallback auf pending
      try {
        const fallback = await api.get('/api/followups/pending');
        setFollowups(fallback.data || []);
      } catch (e) {
        console.error('Fallback failed:', e);
      }
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
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
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
      default: return 'bg-gray-500';
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Kalender
          </h1>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'week' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              Woche
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              Monat
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center bg-white border rounded-lg">
            <button onClick={() => navigate('prev')} className="p-2 hover:bg-gray-50">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 font-medium min-w-[180px] text-center">
              {viewMode === 'week'
                ? `${format(days[0], 'd. MMM', { locale: de })} - ${format(days[days.length-1], 'd. MMM yyyy', { locale: de })}`
                : format(currentDate, 'MMMM yyyy', { locale: de })
              }
            </span>
            <button onClick={() => navigate('next')} className="p-2 hover:bg-gray-50">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            Heute
          </button>

          {/* Create Button */}
          <button
            onClick={() => { setSelectedDate(new Date()); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Termin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
          <p className="text-3xl font-bold">{todayCount}</p>
          <p className="text-blue-100">Heute</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
          <p className="text-3xl font-bold">{followups.length}</p>
          <p className="text-green-100">Gesamt offen</p>
        </div>
        <div className={`p-4 rounded-xl text-white ${overdueCount > 0 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
          <p className="text-3xl font-bold">{overdueCount}</p>
          <p className={overdueCount > 0 ? 'text-red-100' : 'text-gray-200'}>Überfällig</p>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="text-center py-12">Laden...</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Day Headers */}
          <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'} bg-gray-50 border-b`}>
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
            {days.map((day, idx) => {
              const dayFollowups = getFollowupsForDay(day);
              const isCurrentDay = isToday(day);
              const isPast = isBefore(day, new Date()) && !isCurrentDay;
              const isCurrentMonth = viewMode === 'month' ? isSameMonth(day, currentDate) : true;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[120px] p-2 border-b border-r cursor-pointer transition-colors ${
                    isCurrentDay
                      ? 'bg-blue-50'
                      : isPast
                        ? 'bg-gray-50'
                        : 'bg-white hover:bg-gray-50'
                  } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  {/* Day Number */}
                  <div className={`text-right mb-1 ${
                    isCurrentDay
                      ? 'text-blue-600 font-bold'
                      : isPast
                        ? 'text-gray-400'
                        : 'text-gray-700'
                  }`}>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                      isCurrentDay ? 'bg-blue-600 text-white' : ''
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Follow-ups */}
                  <div className="space-y-1">
                    {dayFollowups.slice(0, 3).map((fu) => (
                      <div
                        key={fu.id}
                        className={`text-xs p-1.5 rounded truncate text-white ${getChannelColor(fu.channel)}`}
                        title={fu.leads?.name}
                      >
                        {fu.leads?.name || 'Follow-up'}
                      </div>
                    ))}
                    {dayFollowups.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayFollowups.length - 3} mehr
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

// Modal für Termin erstellen
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
      const response = await api.get('/api/leads');
      setLeads(response.data || []);
    } catch (e) {
      console.error('Failed to load leads:', e);
    }
  };

  const handleCreate = async () => {
    if (!selectedLead) {
      toast.error('Bitte wähle einen Lead aus');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/followups', {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Neuer Termin
        </h2>

        <div className="space-y-4">
          {/* Lead Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Lead</label>
            <select
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
              className="w-full p-2 border rounded-lg"
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
            <label className="block text-sm font-medium mb-1">Datum</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium mb-1">Kanal</label>
            <div className="flex gap-2">
              {[
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
                { id: 'email', label: 'Email', icon: Mail, color: 'bg-blue-500' },
                { id: 'phone', label: 'Anruf', icon: Phone, color: 'bg-purple-500' }
              ].map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setChannel(ch.id)}
                  className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-1 text-sm ${
                    channel === ch.id ? `${ch.color} text-white` : 'bg-gray-50'
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
            <label className="block text-sm font-medium mb-1">Nachricht (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nachricht für Follow-up..."
              className="w-full p-2 border rounded-lg"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Abbrechen
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !selectedLead}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}
