/**
 * 🔥 Phoenix Types
 * Außendienst-Reaktivierungs-System
 */

// =============================================================================
// ENUMS
// =============================================================================

export type VisitType =
  | "planned_meeting"
  | "spontaneous_visit"
  | "drive_by"
  | "phone_from_location"
  | "reactivation_attempt";

export type VisitOutcome =
  | "successful"
  | "not_home"
  | "rescheduled"
  | "rejected"
  | "no_contact";

export type SessionType =
  | "field_day"
  | "territory_sweep"
  | "appointment_buffer"
  | "reactivation_blitz";

export type AlertType =
  | "nearby_cold_lead"
  | "nearby_old_customer"
  | "reactivation_opportunity"
  | "territory_untouched";

export type AlertPriority = "low" | "medium" | "high" | "urgent";

export type SuggestedAction =
  | "visit"
  | "call"
  | "drive_by"
  | "reactivation_visit"
  | "leave_material";

// =============================================================================
// LOCATION
// =============================================================================

export interface Location {
  latitude: number;
  longitude: number;
}

// =============================================================================
// NEARBY LEAD
// =============================================================================

export interface NearbyLead {
  lead_id: string;
  name: string;
  status: string;
  phone?: string;
  address?: string;
  city?: string;
  distance_meters: number;
  distance_km: number;
  travel_time_minutes: number;
  days_since_contact: number;
  last_contact_at?: string;
  priority_score: number;
  suggested_action: SuggestedAction;
  suggested_message?: string;
}

// =============================================================================
// IM EARLY RESPONSE
// =============================================================================

export interface ImEarlySuggestion {
  type: "visit" | "call";
  lead_id: string;
  lead_name: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggested_message?: string;
  phone?: string;
}

export interface ImEarlyResponse {
  minutes_available: number;
  location: Location;
  search_radius_km: number;
  total_leads_found: number;
  visit_candidates: number;
  call_candidates: number;
  suggestions: ImEarlySuggestion[];
  message: string;
}

// =============================================================================
// SESSION
// =============================================================================

export interface FieldSession {
  id: string;
  session_type: SessionType;
  started_at: string;
  current_latitude?: number;
  current_longitude?: number;
  leads_suggested: number;
  leads_visited: number;
  leads_contacted: number;
  leads_reactivated: number;
  settings: Record<string, any>;
}

export interface SessionSummary {
  session_id: string;
  session_type: string;
  duration_minutes: number;
  leads_suggested: number;
  leads_visited: number;
  leads_contacted: number;
  leads_reactivated: number;
  distance_km: number;
  xp_earned: number;
}

// =============================================================================
// ALERTS
// =============================================================================

export interface PhoenixAlert {
  id: string;
  lead_id: string;
  lead_name: string;
  alert_type: AlertType;
  title: string;
  message: string;
  distance_meters: number;
  priority: AlertPriority;
  appointment_id?: string;
  appointment_title?: string;
}

// =============================================================================
// TERRITORY
// =============================================================================

export interface Territory {
  id: string;
  name: string;
  lead_count: number;
  active_leads: number;
  cold_leads: number;
  reactivation_candidates: number;
  last_sweep_at?: string;
}

// =============================================================================
// REACTIVATION
// =============================================================================

export interface ReactivationCandidate {
  lead_id: string;
  lead_name: string;
  lead_status: string;
  deal_state?: string;
  lead_phone?: string;
  lead_address?: string;
  city?: string;
  days_inactive: number;
  last_contact_at?: string;
  field_visit_count: number;
  reactivation_priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
}

// =============================================================================
// APPOINTMENT OPPORTUNITY
// =============================================================================

export interface AppointmentOpportunity {
  appointment_id: string;
  appointment_title: string;
  appointment_time: string;
  appointment_address?: string;
  buffer_minutes: number;
  nearby_leads: {
    lead_id: string;
    lead_name: string;
    lead_status: string;
    lead_phone?: string;
    distance_meters: number;
    days_since_contact: number;
  }[];
}

// =============================================================================
// STATS
// =============================================================================

export interface PhoenixStats {
  visits_this_week: number;
  pending_alerts: number;
  reactivation_candidates: number;
  active_session?: FieldSession;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getPriorityColor(priority: AlertPriority | string): string {
  const colors: Record<string, string> = {
    urgent: "#FF3B30",
    high: "#FF9500",
    medium: "#FFCC00",
    low: "#34C759",
    URGENT: "#FF3B30",
    HIGH: "#FF9500",
    MEDIUM: "#FFCC00",
    LOW: "#34C759",
  };
  return colors[priority] || "#6B7280";
}

export function getPriorityEmoji(priority: string): string {
  const emojis: Record<string, string> = {
    urgent: "🔴",
    high: "🟡",
    medium: "🟢",
    low: "⚪",
    URGENT: "🔴",
    HIGH: "🟡",
    MEDIUM: "🟢",
    LOW: "⚪",
  };
  return emojis[priority] || "⚪";
}

export function getActionEmoji(action: SuggestedAction): string {
  const emojis: Record<SuggestedAction, string> = {
    visit: "🚶",
    call: "📞",
    drive_by: "🚗",
    reactivation_visit: "🔥",
    leave_material: "📄",
  };
  return emojis[action] || "👆";
}

export function getSessionTypeLabel(type: SessionType): string {
  const labels: Record<SessionType, string> = {
    field_day: "Außendienst-Tag",
    territory_sweep: "Gebietssweep",
    appointment_buffer: "Termin-Puffer",
    reactivation_blitz: "Reaktivierungs-Blitz",
  };
  return labels[type] || type;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatTravelTime(minutes: number): string {
  if (minutes < 1) return "< 1 Min";
  if (minutes === 1) return "1 Min";
  return `${minutes} Min`;
}

