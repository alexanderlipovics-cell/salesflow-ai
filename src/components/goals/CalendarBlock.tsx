/**
 * Calendar Block - Termine heute
 * 
 * Zeigt alle Termine für heute in Timeline-Form
 */

import React from "react";
import { Calendar, Clock, Video, Phone, Users, MapPin } from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type CalendarEvent = {
  id: string;
  title: string;
  start_time: string;
  event_type: "meeting" | "call" | "video" | "field" | "other";
  lead_name?: string;
  location?: string;
  notes?: string;
};

interface CalendarBlockProps {
  events: CalendarEvent[];
  loading?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export const CalendarBlock: React.FC<CalendarBlockProps> = ({ events, loading }) => {
  const getEventIcon = (type: CalendarEvent["event_type"]) => {
    switch (type) {
      case "video":
        return Video;
      case "call":
        return Phone;
      case "meeting":
        return Users;
      case "field":
        return MapPin;
      default:
        return Calendar;
    }
  };

  const getEventTypeLabel = (type: CalendarEvent["event_type"]) => {
    switch (type) {
      case "video":
        return "Video-Call";
      case "call":
        return "Telefonat";
      case "meeting":
        return "Meeting";
      case "field":
        return "Vor-Ort Termin";
      default:
        return "Termin";
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-100">Deine Termine heute</h3>
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-700/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <Calendar className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Deine Termine heute</h3>
          <p className="text-xs text-slate-400">{events.length} Termin{events.length !== 1 ? "e" : ""}</p>
        </div>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-600 bg-slate-900/50 p-6 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-2 text-sm text-slate-400">Keine Termine heute</p>
          <p className="text-xs text-slate-500">Zeit für neue Kontakte!</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {events.map((event) => {
            const Icon = getEventIcon(event.event_type);
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition hover:bg-slate-900"
              >
                {/* Time */}
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1 text-sm font-semibold text-blue-400">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(event.start_time)}
                  </div>
                </div>

                {/* Icon */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Icon className="h-5 w-5 text-blue-400" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{event.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-700 px-2 py-0.5">
                      {getEventTypeLabel(event.event_type)}
                    </span>
                    {event.lead_name && <span>• {event.lead_name}</span>}
                    {event.location && <span>• {event.location}</span>}
                  </div>
                  {event.notes && (
                    <p className="mt-2 text-xs text-slate-500">{event.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

