/**
 * 🔥 Phoenix API Client
 * Außendienst-Reaktivierungs-System
 */

import { API_CONFIG } from "../services/apiConfig";
import type {
  NearbyLead,
  ImEarlyResponse,
  FieldSession,
  SessionSummary,
  PhoenixAlert,
  Territory,
  ReactivationCandidate,
  AppointmentOpportunity,
  PhoenixStats,
  SessionType,
  VisitType,
  VisitOutcome,
  Location,
} from "./types/phoenix";

const API_BASE = `${API_CONFIG.baseUrl}/phoenix`;

// =============================================================================
// "BIN ZU FRÜH" - HAUPTFEATURE
// =============================================================================

/**
 * 🔥 "Ich bin zu früh beim Termin!"
 * Gibt kontextsensitive Vorschläge
 */
export async function imEarlyForMeeting(params: {
  latitude: number;
  longitude: number;
  minutes_available?: number;
  appointment_id?: string;
}): Promise<ImEarlyResponse> {
  const response = await fetch(`${API_BASE}/im-early`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      latitude: params.latitude,
      longitude: params.longitude,
      minutes_available: params.minutes_available || 30,
      appointment_id: params.appointment_id,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// NEARBY LEADS
// =============================================================================

/**
 * Findet Leads in der Nähe
 */
export async function findNearbyLeads(params: {
  latitude: number;
  longitude: number;
  radius_meters?: number;
  min_days_since_contact?: number;
  limit?: number;
  include_cold?: boolean;
}): Promise<NearbyLead[]> {
  const response = await fetch(`${API_BASE}/nearby`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      latitude: params.latitude,
      longitude: params.longitude,
      radius_meters: params.radius_meters || 5000,
      min_days_since_contact: params.min_days_since_contact || 14,
      limit: params.limit || 20,
      include_cold: params.include_cold || false,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// APPOINTMENTS
// =============================================================================

/**
 * Holt Leads in der Nähe von heutigen Terminen
 */
export async function getAppointmentOpportunities(params?: {
  radius_meters?: number;
  min_days_since_contact?: number;
}): Promise<AppointmentOpportunity[]> {
  const searchParams = new URLSearchParams();
  if (params?.radius_meters) searchParams.set("radius_meters", params.radius_meters.toString());
  if (params?.min_days_since_contact) searchParams.set("min_days_since_contact", params.min_days_since_contact.toString());

  const url = `${API_BASE}/appointments${searchParams.toString() ? `?${searchParams}` : ""}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// SESSIONS
// =============================================================================

/**
 * Startet eine Außendienst-Session
 */
export async function startFieldSession(params: {
  session_type: SessionType;
  latitude: number;
  longitude: number;
  settings?: Record<string, any>;
}): Promise<FieldSession> {
  const response = await fetch(`${API_BASE}/sessions/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Aktualisiert Session-Standort und holt neue Vorschläge
 */
export async function updateSessionLocation(
  sessionId: string,
  location: Location
): Promise<NearbyLead[]> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/update-location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(location),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Beendet eine Session
 */
export async function endFieldSession(sessionId: string): Promise<SessionSummary> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/end`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Holt aktive Session (falls vorhanden)
 */
export async function getActiveSession(): Promise<FieldSession | null> {
  const response = await fetch(`${API_BASE}/sessions/active`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// VISITS
// =============================================================================

/**
 * Protokolliert einen Besuch
 */
export async function logFieldVisit(params: {
  lead_id: string;
  latitude: number;
  longitude: number;
  visit_type: VisitType;
  outcome: VisitOutcome;
  notes?: string;
  next_action_type?: string;
  next_action_date?: string;
  session_id?: string;
}): Promise<{ visit_id: string; xp_earned: number }> {
  const response = await fetch(`${API_BASE}/visits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Holt Besuchs-Historie
 */
export async function getVisitHistory(params?: {
  lead_id?: string;
  limit?: number;
}): Promise<any[]> {
  const searchParams = new URLSearchParams();
  if (params?.lead_id) searchParams.set("lead_id", params.lead_id);
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const url = `${API_BASE}/visits/history${searchParams.toString() ? `?${searchParams}` : ""}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// ALERTS
// =============================================================================

/**
 * Holt offene Alerts
 */
export async function getPendingAlerts(limit?: number): Promise<PhoenixAlert[]> {
  const url = limit ? `${API_BASE}/alerts?limit=${limit}` : `${API_BASE}/alerts`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Reagiert auf einen Alert
 */
export async function respondToAlert(
  alertId: string,
  params: {
    action: "acted" | "dismissed";
    action_taken?: string;
    action_outcome?: string;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

/**
 * Triggert einen Proximity Scan
 */
export async function triggerProximityScan(
  location: Location,
  radiusMeters?: number
): Promise<{ alerts_created: number; alerts: any[] }> {
  const url = radiusMeters
    ? `${API_BASE}/alerts/scan?radius_meters=${radiusMeters}`
    : `${API_BASE}/alerts/scan`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(location),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// TERRITORIES
// =============================================================================

/**
 * Holt User Territories
 */
export async function getTerritories(): Promise<Territory[]> {
  const response = await fetch(`${API_BASE}/territories`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Erstellt ein neues Territory
 */
export async function createTerritory(params: {
  name: string;
  center_latitude: number;
  center_longitude: number;
  radius_km?: number;
  postal_codes?: string[];
}): Promise<{ id: string; name: string }> {
  const response = await fetch(`${API_BASE}/territories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// REACTIVATION
// =============================================================================

/**
 * Holt Reaktivierungs-Kandidaten
 */
export async function getReactivationCandidates(params?: {
  territory_id?: string;
  min_days_inactive?: number;
  limit?: number;
}): Promise<ReactivationCandidate[]> {
  const searchParams = new URLSearchParams();
  if (params?.territory_id) searchParams.set("territory_id", params.territory_id);
  if (params?.min_days_inactive) searchParams.set("min_days_inactive", params.min_days_inactive.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const url = `${API_BASE}/reactivation${searchParams.toString() ? `?${searchParams}` : ""}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Holt Phoenix Statistiken
 */
export async function getPhoenixStats(): Promise<PhoenixStats> {
  const response = await fetch(`${API_BASE}/stats`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// ANALYTICS (PRODUCTION)
// =============================================================================

/**
 * Holt detaillierte Besuchs-Analytik
 */
export async function getVisitAnalytics(days: number = 30): Promise<{
  total_visits: number;
  successful_visits: number;
  conversion_rate: number;
  avg_visits_per_day: number;
  total_time_minutes: number;
}> {
  const response = await fetch(`${API_BASE}/analytics/visits?days=${days}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Analysiert die besten Zeiten für Besuche
 */
export async function getBestTimes(days: number = 90): Promise<{
  time_slot: string;
  visit_count: number;
  success_rate: number;
  avg_duration: number;
}[]> {
  const response = await fetch(`${API_BASE}/analytics/best-times?days=${days}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Generiert personalisierte Insights
 */
export async function getInsights(): Promise<{
  type: string;
  title: string;
  message: string;
  icon: string;
  priority: number;
}[]> {
  const response = await fetch(`${API_BASE}/analytics/insights`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Generiert Heatmap-Daten
 */
export async function getHeatmapData(days: number = 30): Promise<{
  lat: number;
  lon: number;
  weight: number;
}[]> {
  const response = await fetch(`${API_BASE}/analytics/heatmap?days=${days}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// ROUTE OPTIMIZATION (PRODUCTION)
// =============================================================================

/**
 * Optimiert die Route für mehrere Leads
 */
export async function optimizeRoute(params: {
  latitude: number;
  longitude: number;
  leadIds: string[];
}): Promise<{
  optimized_order: { lead_id: string; name: string; priority: number }[];
  total_distance_km: number;
  total_travel_minutes: number;
  savings_percent: number;
  efficiency_score: number;
}> {
  const leadIdsParam = params.leadIds.join(",");
  const url = `${API_BASE}/optimize-route?lead_ids=${encodeURIComponent(leadIdsParam)}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      latitude: params.latitude,
      longitude: params.longitude,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Generiert intelligente Lead-Vorschläge
 */
export async function getSmartSuggestions(params: {
  latitude: number;
  longitude: number;
  minutesAvailable?: number;
}): Promise<{
  lead_id: string;
  lead_name: string;
  type: string;
  score: number;
  reason: string;
  estimated_time: number;
}[]> {
  const url = `${API_BASE}/smart-suggestions?minutes_available=${params.minutesAvailable || 30}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      latitude: params.latitude,
      longitude: params.longitude,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

