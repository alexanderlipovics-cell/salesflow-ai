/**
 * Complete Dashboard Shared Types
 * Covers RPC responses, UI load states and error contracts.
 */

export type LoadState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface TodayOverview {
  tasks_due_today: number;
  tasks_done_today: number;
  leads_created_today: number;
  first_messages_today: number;
  signups_today: number;
  revenue_today: number;
}

export interface TodayTask {
  task_id: string;
  contact_id: string;
  contact_name: string | null;
  contact_status: string | null;
  contact_lead_score: number;
  task_type: string;
  task_due_at: string;
  task_status: string;
  assigned_user_id: string | null;
  priority: string;
}

export interface TopTemplate {
  template_id: string;
  title: string;
  purpose: string;
  channel: string;
  contacts_contacted: number;
  contacts_signed: number;
  conversion_rate_percent: number;
}

export interface FunnelStats {
  avg_days_to_signup: number | null;
  median_days_to_signup: number | null;
  min_days_to_signup: number | null;
  max_days_to_signup: number | null;
  contacts_with_signup: number;
}

export interface TopNetworker {
  user_id: string;
  email: string;
  name: string;
  contacts_contacted: number;
  contacts_signed: number;
  conversion_rate_percent: number;
  active_days: number;
  current_streak: number;
}

export interface NeedHelpRep {
  user_id: string;
  email: string;
  full_name: string;
  contacts_contacted: number;
  contacts_signed: number;
  active_days_last_30: number;
  conversion_rate_percent: number;
  avg_response_time_hours: number;
}

export interface WeekOverview {
  leads_this_week: number;
  first_messages_this_week: number;
  signups_this_week: number;
  revenue_this_week: number;
}

export interface WeekTimeseriesPoint {
  day: string;
  leads: number;
  signups: number;
  first_messages: number;
}

