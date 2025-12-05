/**
 * SALES FLOW AI - DASHBOARD ANALYTICS TYPES
 * 
 * TypeScript Definitions für alle Dashboard Analytics Datenstrukturen
 * Version: 1.0.0
 */

// ============================================================================
// TODAY DASHBOARD TYPES
// ============================================================================

export type TodayOverview = {
  tasks_due_today: number;
  tasks_done_today: number;
  leads_created_today: number;
  first_messages_today: number;
  signups_today: number;
  revenue_today: number;
};

export type TodayTask = {
  task_id: string;
  contact_id: string;
  contact_name: string | null;
  contact_status: string;
  contact_lead_score: number;
  task_type: string;
  task_due_at: string; // ISO 8601 timestamp
  task_status: string;
  assigned_user_id: string | null;
  priority: string;
};

// ============================================================================
// WEEK DASHBOARD TYPES
// ============================================================================

export type WeekOverview = {
  leads_this_week: number;
  first_messages_this_week: number;
  signups_this_week: number;
  revenue_this_week: number;
};

export type WeekTimeseriesPoint = {
  day: string; // ISO date string (YYYY-MM-DD)
  leads: number;
  signups: number;
  first_messages: number;
};

// ============================================================================
// TEMPLATE ANALYTICS TYPES
// ============================================================================

export type TopTemplate = {
  template_id: string;
  title: string;
  purpose: string;
  channel: string;
  contacts_contacted: number;
  contacts_signed: number;
  conversion_rate_percent: number;
};

// ============================================================================
// FUNNEL ANALYTICS TYPES
// ============================================================================

export type FunnelStats = {
  avg_days_to_signup: number;
  median_days_to_signup: number;
  min_days_to_signup: number;
  max_days_to_signup: number;
  contacts_with_signup: number;
};

// ============================================================================
// TEAM / SQUAD COACH TYPES
// ============================================================================

export type TopNetworker = {
  user_id: string;
  email: string;
  name: string;
  contacts_contacted: number;
  contacts_signed: number;
  conversion_rate_percent: number;
  active_days: number;
  current_streak: number;
};

export type NeedsHelpRep = {
  user_id: string;
  email: string;
  name: string;
  contacts_contacted: number;
  contacts_signed: number;
  conversion_rate_percent: number;
  active_days: number;
};

// ============================================================================
// AGGREGATED DASHBOARD TYPE
// ============================================================================

export type DashboardData = {
  todayOverview: TodayOverview | null;
  todayTasks: TodayTask[];
  weekOverview: WeekOverview | null;
  weekTimeseries: WeekTimeseriesPoint[];
  topTemplates: TopTemplate[];
  funnelStats: FunnelStats | null;
  topNetworkers: TopNetworker[];
  needsHelp: NeedsHelpRep[];
};

// ============================================================================
// HOOK STATE TYPES
// ============================================================================

export type LoadState = 'idle' | 'loading' | 'success' | 'error';

export type HookResult<T> = {
  data: T;
  state: LoadState;
  error: Error | null;
  refetch: () => Promise<void>;
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  timestamp: string;
};

export type DashboardApiResponse = ApiResponse<DashboardData>;

