import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Phone, Mail, MessageCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday, parseISO, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import { api } from '@/lib/api';

interface FollowUp {
  id: string;
  title?: string;
  due_at: string;
  suggested_message?: string;
  channel?: string;
  status?: string;
  leads?: {
    id: string;
    name: string;
    company?: string;
    phone?: string;
    email?: string;
  };
}

export default function CalendarPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowups();
  }, [currentWeek]);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      // Lade alle pending Follow-ups
      const response = await api.get('/api/followups/pending');
      setFollowups(response.data || []);
    } catch (error) {
      console.error('Failed to load followups:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 })
  });

  const getFollowupsForDay = (day: Date) => {
    return followups.filter(fu => {
      if (!fu.due_at) return false;
      const fuDate = parseISO(fu.due_at);
      return isSameDay(fuDate, day);
    });
  };

  const getChannelIcon = (channel?: string) => {
    switch (channel?.toLowerCase()) {
      case 'whatsapp': return <MessageCircle className="h-3 w-3 text-green-600" />;
      case 'email': return <Mail className="h-3 w-3 text-blue-600" />;
      case 'phone': return <Phone className="h-3 w-3 text-purple-600" />;
      default: return <MessageCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  const overdueCount = followups.filter(fu => fu.due_at && isBefore(parseISO(fu.due_at), new Date()) && fu.status === 'pending').length;
  const todayCount = followups.filter(fu => fu.due_at && isSameDay(parseISO(fu.due_at), new Date())).length;
  const weekCount = followups.filter(fu => {
    if (!fu.due_at) return false;
    const fuDate = parseISO(fu.due_at);
    return fuDate >= startOfWeek(currentWeek, { weekStartsOn: 1 }) &&
           fuDate <= endOfWeek(currentWeek, { weekStartsOn: 1 });
  }).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-blue-600" />
          Kalender
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium px-4 min-w-[200px] text-center">
            {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'd. MMM', { locale: de })} -
            {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), ' d. MMM yyyy', { locale: de })}
          </span>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg ml-2 hover:bg-blue-200 transition-colors"
          >
            Heute
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-2xl font-bold text-blue-600">{todayCount}</p>
          <p className="text-sm text-blue-700">Heute fällig</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <p className="text-2xl font-bold text-green-600">{weekCount}</p>
          <p className="text-sm text-green-700">Diese Woche</p>
        </div>
        <div className={`p-4 rounded-lg border ${overdueCount > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueCount}</p>
          <p className={`text-sm ${overdueCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>Überfällig</p>
        </div>
      </div>

      {/* Week View */}
      {loading ? (
        <div className="text-center py-12">Laden...</div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayFollowups = getFollowupsForDay(day);
            const isCurrentDay = isToday(day);
            const isPast = isBefore(day, new Date()) && !isCurrentDay;

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[250px] border rounded-lg p-2 transition-colors ${
                  isCurrentDay
                    ? 'bg-blue-50 border-blue-300 shadow-sm'
                    : isPast
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white hover:border-gray-300'
                }`}
              >
                {/* Day Header */}
                <div className={`text-center mb-2 pb-2 border-b ${isCurrentDay ? 'border-blue-200' : 'border-gray-100'}`}>
                  <p className="text-xs text-gray-500 uppercase font-medium">
                    {format(day, 'EEE', { locale: de })}
                  </p>
                  <p className={`text-lg font-bold ${
                    isCurrentDay ? 'text-blue-600' : isPast ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </p>
                </div>

                {/* Follow-ups */}
                <div className="space-y-1.5 overflow-y-auto max-h-[180px]">
                  {dayFollowups.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">-</p>
                  ) : (
                    dayFollowups.map((fu) => (
                      <div
                        key={fu.id}
                        className="p-2 bg-white rounded border border-gray-200 text-xs hover:shadow-sm hover:border-blue-300 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-1.5">
                          {getChannelIcon(fu.channel)}
                          <span className="font-medium text-gray-900 truncate">
                            {fu.leads?.name || 'Unbekannt'}
                          </span>
                        </div>
                        {fu.leads?.company && (
                          <p className="text-gray-500 truncate mt-0.5">{fu.leads.company}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
