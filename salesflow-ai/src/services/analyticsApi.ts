/**
 * Analytics API Client
 * Kommuniziert mit FastAPI Backend auf localhost:8000
 */
import type {
  TemplatePartnerStat,
  CompanyFunnelSpeed,
  SegmentPartnerPerformance,
  RepLeaderboardEntry,
  TodayCockpitItem,
} from "@/types/analytics";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function fetchTopTemplates(): Promise<TemplatePartnerStat[]> {
  const response = await fetch(`${API_BASE}/analytics/templates/top-partner`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch top templates");
  return response.json();
}

export async function fetchFunnelSpeed(): Promise<CompanyFunnelSpeed[]> {
  const response = await fetch(`${API_BASE}/analytics/companies/funnel-speed`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch funnel speed");
  return response.json();
}

export async function fetchSegmentPerformance(): Promise<SegmentPartnerPerformance[]> {
  const response = await fetch(`${API_BASE}/analytics/segments/partner-performance`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch segment performance");
  return response.json();
}

export async function fetchRepLeaderboard(): Promise<RepLeaderboardEntry[]> {
  const response = await fetch(`${API_BASE}/analytics/reps/leaderboard`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch rep leaderboard");
  return response.json();
}

export async function fetchTodayCockpit(): Promise<TodayCockpitItem[]> {
  const response = await fetch(`${API_BASE}/analytics/today-cockpit`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch today cockpit");
  return response.json();
}

