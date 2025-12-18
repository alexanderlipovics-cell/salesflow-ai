// ============================================================================
// FILE: src/types/reactivation.ts
// DESCRIPTION: Types for Reactivation Engine (warm leads that went cold)
// ============================================================================

export interface ReactivationCandidate {
  contact_id: string;
  full_name: string;
  status: string;
  contact_type: string;
  last_contact_at: string;
  last_action_type: string | null;
  days_since_last_contact: number;
  total_events: number;
  reply_count: number;
  reactivation_score: number;
  reactivation_priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ReactivationFilters {
  minDaysSinceContact: number;
  maxDaysSinceContact: number;
  limit: number;
}

export const DEFAULT_REACTIVATION_FILTERS: ReactivationFilters = {
  minDaysSinceContact: 14,
  maxDaysSinceContact: 180,
  limit: 10,
};

export const REACTIVATION_PRIORITY_COLORS = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
} as const;

export const REACTIVATION_PRIORITY_LABELS = {
  critical: 'Kritisch',
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig',
} as const;

