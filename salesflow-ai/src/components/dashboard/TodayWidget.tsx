import React, { useState, useEffect } from 'react';
import { Clock, Flame, AlertTriangle, CheckCircle, RefreshCw, Phone, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import TodayLeadItem from './TodayLeadItem';

interface TodayLead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  status: string;
  score?: number;
  last_contact?: string;
  next_follow_up?: string;
  reason: string;
  reason_text: string;
  priority: number;
}

interface TodayStats {
  overdue: number;
  today: number;
  hot: number;
  total: number;
}

interface TodayWidgetProps {
  onLeadClick?: (leadId: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const TodayWidget: React.FC<TodayWidgetProps> = ({ onLeadClick }) => {
  const [leads, setLeads] = useState<TodayLead[]>([]);
  const [stats, setStats] = useState<TodayStats>({ overdue: 0, today: 0, hot: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchTodayBriefing = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/dashboard/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Tagesübersicht');
      }

      const data = await response.json();
      setLeads(data.leads || []);
      setStats(data.stats || { overdue: 0, today: 0, hot: 0, total: 0 });
      setLastUpdated(data.last_updated);
    } catch (err) {
      console.error('Error fetching today briefing:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayBriefing();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchTodayBriefing, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkContacted = async (leadId: string, notes?: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/dashboard/leads/${leadId}/mark-contacted`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Markieren als kontaktiert');
      }

      // Refresh the briefing to update the list
      await fetchTodayBriefing();
    } catch (err) {
      console.error('Error marking lead contacted:', err);
      alert('Fehler beim Markieren als kontaktiert');
    }
  };

  const getStatsText = () => {
    const parts = [];
    if (stats.overdue > 0) parts.push(`${stats.overdue} überfällig`);
    if (stats.today > 0) parts.push(`${stats.today} heute`);
    if (stats.hot > 0) parts.push(`${stats.hot} heiß`);
    return parts.join(' | ') || 'Keine Aufgaben für heute';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Heute dran
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deine wichtigsten Aufgaben für heute
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTodayBriefing}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getStatsText()}
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Zuletzt aktualisiert: {new Date(lastUpdated).toLocaleTimeString('de-DE')}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Lade Tagesübersicht...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={fetchTodayBriefing} variant="outline">
              Erneut versuchen
            </Button>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Alles erledigt! 🎉
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Keine dringenden Aufgaben für heute. Genieße deinen Tag oder schaue in deine Lead-Liste.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <TodayLeadItem
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick?.(lead.id)}
                onMarkContacted={handleMarkContacted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayWidget;
