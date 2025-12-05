/**
 * MessageEventsTable - Anzeige von Message Events mit Filter
 * 
 * Features:
 * - Tabellen-Ansicht der Events
 * - Filter nach Status (Tabs)
 * - Relative Zeitangaben
 * - Status-Badges
 */

import { useState } from 'react';
import { MessageEvent, AutopilotStatus } from '@/services/autopilotService';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface Props {
  events: MessageEvent[];
  loading: boolean;
  onEventClick?: (event: MessageEvent) => void;
}

const STATUS_TABS: { value: AutopilotStatus | 'all'; label: string; emoji: string }[] = [
  { value: 'all', label: 'Alle', emoji: '📋' },
  { value: 'pending', label: 'Wartend', emoji: '⏳' },
  { value: 'suggested', label: 'Vorgeschlagen', emoji: '💡' },
  { value: 'approved', label: 'Genehmigt', emoji: '✅' },
  { value: 'sent', label: 'Gesendet', emoji: '📤' },
  { value: 'skipped', label: 'Übersprungen', emoji: '⏭️' },
];

const STATUS_COLORS: Record<AutopilotStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  suggested: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  approved: { bg: 'bg-green-500/10', text: 'text-green-400' },
  sent: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  skipped: { bg: 'bg-gray-500/10', text: 'text-gray-400' },
};

export default function MessageEventsTable({ events, loading, onEventClick }: Props) {
  const [activeTab, setActiveTab] = useState<AutopilotStatus | 'all'>('all');

  const filteredEvents = activeTab === 'all' 
    ? events 
    : events.filter((e) => e.autopilot_status === activeTab);

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: de,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Message Events</h2>
        <p className="text-sm text-gray-400">Letzte Nachrichten und Autopilot-Status</p>
      </div>

      {/* Status Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === 'all' 
            ? events.length 
            : events.filter((e) => e.autopilot_status === tab.value).length;
          
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'rounded-xl border px-4 py-2 text-sm font-medium transition-all',
                activeTab === tab.value
                  ? 'border-salesflow-accent bg-salesflow-accent/10 text-salesflow-accent'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30 hover:text-white'
              )}
            >
              {tab.emoji} {tab.label} <span className="ml-1 text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Events werden geladen...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          {activeTab === 'all' ? 'Noch keine Events vorhanden' : `Keine Events mit Status "${activeTab}"`}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const statusColor = STATUS_COLORS[event.autopilot_status];
            
            return (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={cn(
                  'rounded-2xl border border-white/5 bg-white/5 p-4 transition-all',
                  onEventClick && 'cursor-pointer hover:border-white/20'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Direction Icon */}
                  <div className="mt-1">
                    {event.direction === 'inbound' ? (
                      <ArrowDownCircle className="h-5 w-5 text-blue-400" />
                    ) : (
                      <ArrowUpCircle className="h-5 w-5 text-green-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Text */}
                        <p className="text-sm text-white line-clamp-2">
                          {event.normalized_text || event.text}
                        </p>
                        
                        {/* Meta */}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(event.created_at)}
                          </span>
                          <span className="capitalize">{event.channel}</span>
                          {event.suggested_reply?.detected_action && (
                            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-purple-400">
                              {event.suggested_reply.detected_action}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                          statusColor.bg,
                          statusColor.text
                        )}
                      >
                        {STATUS_TABS.find((t) => t.value === event.autopilot_status)?.emoji}{' '}
                        {event.autopilot_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

