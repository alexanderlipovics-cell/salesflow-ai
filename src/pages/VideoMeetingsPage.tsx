import React, { useState, useEffect } from 'react';
import { Calendar, Video, Clock, ExternalLink, TrendingUp, MessageSquare, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';

interface VideoMeeting {
  meeting_id: string;
  platform: 'zoom' | 'teams' | 'google_meet';
  title: string;
  join_url: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  has_recording: boolean;
  recording_url?: string;
  has_transcript: boolean;
  ai_summary?: string;
  key_topics?: string[];
  action_items?: string[];
  sentiment_analysis?: { overall: 'positive' | 'neutral' | 'negative' };
}

export default function VideoMeetingsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, [activeTab]);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/video-meetings/meetings', {
        params: { upcoming: activeTab === 'upcoming' }
      });
      setMeetings(response.data.meetings);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'zoom': return '📹';
      case 'teams': return '👥';
      case 'google_meet': return '🎥';
      default: return '📞';
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'zoom': return 'Zoom';
      case 'teams': return 'Microsoft Teams';
      case 'google_meet': return 'Google Meet';
      default: return platform;
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('de-DE', { 
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      }),
      time: date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Video Meetings 🎥
                </h1>
                <p className="mt-2 text-gray-600">
                  Plane Meetings, erhalte Aufzeichnungen und KI-Analysen
                </p>
              </div>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                + Meeting planen
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'upcoming'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Anstehend
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'past'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vergangene
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Meetings werden geladen...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Video className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Keine Meetings
            </h3>
            <p className="mt-2 text-gray-600">
              {activeTab === 'upcoming' 
                ? 'Du hast keine anstehenden Meetings. Plane jetzt dein erstes Meeting!'
                : 'Keine vergangenen Meetings gefunden.'}
            </p>
            {activeTab === 'upcoming' && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Erstes Meeting planen
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {meetings.map(meeting => {
              const { date, time } = formatDateTime(meeting.scheduled_start);
              
              return (
                <div
                  key={meeting.meeting_id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{getPlatformIcon(meeting.platform)}</span>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {meeting.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getPlatformName(meeting.platform)}
                          </p>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center gap-6 mb-4 text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          <span className="font-medium">{date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          <span className="font-medium">{time}</span>
                        </div>
                      </div>

                      {/* AI Summary for past meetings */}
                      {activeTab === 'past' && meeting.ai_summary && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="bg-blue-50 rounded-lg p-4 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold text-blue-900">KI-Zusammenfassung</span>
                              {meeting.sentiment_analysis && (
                                <span className="ml-auto text-2xl">
                                  {getSentimentIcon(meeting.sentiment_analysis.overall)}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {meeting.ai_summary}
                            </p>
                          </div>

                          {/* Key Topics */}
                          {meeting.key_topics && meeting.key_topics.length > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-gray-600" />
                                <span className="font-medium text-sm text-gray-900">Key Topics:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {meeting.key_topics.map((topic, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Items */}
                          {meeting.action_items && meeting.action_items.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-4 h-4 text-gray-600" />
                                <span className="font-medium text-sm text-gray-900">Action Items:</span>
                              </div>
                              <ul className="space-y-1">
                                {meeting.action_items.map((item, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="text-green-600 mt-0.5">✓</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <a
                        href={meeting.join_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                      >
                        {activeTab === 'upcoming' ? 'Beitreten' : 'Details'}
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {meeting.has_recording && meeting.recording_url && (
                        <a
                          href={meeting.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          🎬 Aufzeichnung
                        </a>
                      )}

                      {meeting.has_transcript && (
                        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm">
                          📝 Transkript
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleMeetingModal
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
            loadMeetings();
          }}
        />
      )}
    </div>
  );
}

// Schedule Meeting Modal Component
interface ScheduleMeetingModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ScheduleMeetingModal({ onClose, onSuccess }: ScheduleMeetingModalProps) {
  const [platform, setPlatform] = useState<'zoom' | 'teams' | 'google_meet'>('zoom');
  const [title, setTitle] = useState('Sales Call');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      
      await apiClient.post('/api/video-meetings/create', {
        platform,
        title,
        start_time: startDateTime.toISOString(),
        duration_minutes: duration
      });

      alert('Meeting erfolgreich geplant! 🎉');
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Fehler beim Planen des Meetings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Meeting planen</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Platform
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['zoom', 'teams', 'google_meet'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                    platform === p
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {p === 'zoom' ? 'Zoom' : p === 'teams' ? 'Teams' : 'Google Meet'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Datum
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Uhrzeit
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Dauer (Minuten)
            </label>
            <div className="grid grid-cols-4 gap-3 mb-2">
              {[30, 60, 90, 120].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`p-2 rounded-lg border-2 font-medium transition-colors ${
                    duration === d
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="15"
              max="480"
              required
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
            <p className="text-sm text-blue-900">
              ℹ️ Das Meeting wird automatisch aufgezeichnet und transkribiert. 
              Nach dem Meeting erhältst du eine KI-Analyse mit Key Topics, Action Items und Sentiment.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Wird geplant...' : 'Meeting planen 🎥'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

