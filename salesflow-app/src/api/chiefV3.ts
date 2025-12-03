/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CHIEF V3.0 API                                                           ║
 * ║  Frontend API Calls für Onboarding, Ghost-Buster, Team-Leader             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';

const API_BASE = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

// --- Onboarding ---
export interface OnboardingProgress {
  current_stage: 'day_1' | 'days_2_3' | 'days_4_7' | 'days_8_14';
  days_since_start: number;
  tasks_completed: number;
  tasks_total: number;
  completion_percent: number;
  first_contact_sent: boolean;
  first_reply_received: boolean;
  first_sale: boolean;
  is_overwhelmed: boolean;
  next_task: {
    id: string;
    title: string;
    description: string;
    estimated_minutes: number;
  } | null;
  message: string | null;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  is_required: boolean;
  is_completed: boolean;
  celebration_message: string | null;
}

export interface TaskCompleteResult {
  success: boolean;
  task_id: string;
  celebration: string | null;
  tasks_completed: number;
}

export interface MilestoneResult {
  success: boolean;
  milestone: string;
  celebration: string;
}

// --- Ghost Buster ---
export type GhostType = 'soft' | 'hard' | 'deep';
export type ReEngagementStrategy = 
  | 'value_add' 
  | 'casual_checkin' 
  | 'soft_urgency' 
  | 'humor' 
  | 'takeaway' 
  | 'channel_switch' 
  | 'voice_note' 
  | 'breakup';

export interface Ghost {
  id: string;
  name: string;
  platform: string;
  ghost_type: GhostType;
  hours_since_seen: number;
  was_online_since: boolean;
  reengagement_attempts: number;
  conversion_probability: number;
  recommended_strategy: ReEngagementStrategy;
  optimal_timing: string;
}

export interface GhostDetail extends Ghost {
  profile_url: string | null;
  ghost_type_description: string;
  days_since_seen: number;
  last_message_preview: string | null;
  last_strategy_used: string | null;
  strategy_description: string;
  is_final_attempt: boolean;
  suggested_message: string;
}

export interface ReEngageResponse {
  strategy: string;
  message: string;
  timing_suggestion: string;
  success_probability: number;
  is_final_attempt: boolean;
  alternatives: string[];
}

export interface GhostReport {
  total_ghosts: number;
  soft_ghosts: number;
  hard_ghosts: number;
  deep_ghosts: number;
  report_text: string;
  top_priority: Array<{
    id: string;
    name: string;
    platform: string;
    hours: number;
    strategy: string;
    probability: number;
  }>;
}

// --- Team Leader ---
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  last_active_at: string | null;
  level: string;
  outreach_today: number;
  outreach_week: number;
  follow_ups_due: number;
  conversion_rate: number;
  streak_days: number;
  needs_attention: boolean;
  attention_reason: string | null;
}

export interface TeamDashboard {
  total_members: number;
  active_today: number;
  total_outreach_today: number;
  total_outreach_week: number;
  team_conversion_rate: number;
  top_performer: {
    id: string;
    name: string;
    outreach_week: number;
    conversion_rate: number;
  } | null;
  needs_attention: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
  team_momentum: string;
  dashboard_text: string;
}

export interface TeamAlert {
  id: string;
  member_id: string;
  member_name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  alert_type: string;
  message: string;
  action: string;
  created_at: string;
}

export interface MeetingAgenda {
  meeting_date: string;
  team_summary: string;
  agenda_items: Array<{
    title: string;
    duration: number;
    notes: string;
  }>;
  wins_to_celebrate: string[];
  challenges_to_address: string[];
  focus_for_next_week: string;
  agenda_text: string;
}

export interface NudgeResult {
  success: boolean;
  message_sent: string;
  nudge_type: string;
  member_id: string;
}


// =============================================================================
// ONBOARDING API
// =============================================================================

export const onboardingApi = {
  /**
   * Aktueller Onboarding-Fortschritt
   */
  async getProgress(): Promise<OnboardingProgress> {
    const response = await fetch(`${API_BASE}/onboarding/progress`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch onboarding progress');
    return response.json();
  },

  /**
   * Liste aller Tasks (optional nach Stage)
   */
  async getTasks(stage?: string): Promise<OnboardingTask[]> {
    const url = stage 
      ? `${API_BASE}/onboarding/tasks?stage=${stage}`
      : `${API_BASE}/onboarding/tasks`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },

  /**
   * Task abschließen
   */
  async completeTask(taskId: string, notes?: string): Promise<TaskCompleteResult> {
    const response = await fetch(`${API_BASE}/onboarding/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) throw new Error('Failed to complete task');
    return response.json();
  },

  /**
   * Nächste einfache Aktion (für Overwhelmed)
   */
  async getNextAction(): Promise<{
    action: string;
    description: string;
    estimated_minutes: number;
    task_id?: string;
    cta: string;
  }> {
    const response = await fetch(`${API_BASE}/onboarding/next`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get next action');
    return response.json();
  },

  /**
   * Milestone tracken
   */
  async trackMilestone(
    milestoneType: 'first_contact' | 'first_reply' | 'first_sale' | 'first_objection',
    leadId?: string
  ): Promise<MilestoneResult> {
    const response = await fetch(`${API_BASE}/onboarding/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ milestone_type: milestoneType, lead_id: leadId }),
    });
    if (!response.ok) throw new Error('Failed to track milestone');
    return response.json();
  },
};


// =============================================================================
// GHOST BUSTER API
// =============================================================================

export const ghostBusterApi = {
  /**
   * Liste aller Ghosts
   */
  async listGhosts(options?: {
    ghostType?: GhostType;
    platform?: string;
    limit?: number;
  }): Promise<Ghost[]> {
    const params = new URLSearchParams();
    if (options?.ghostType) params.set('ghost_type', options.ghostType);
    if (options?.platform) params.set('platform', options.platform);
    if (options?.limit) params.set('limit', options.limit.toString());
    
    const url = `${API_BASE}/ghosts?${params.toString()}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch ghosts');
    return response.json();
  },

  /**
   * Ghost-Details mit Re-Engagement Plan
   */
  async getGhostDetail(ghostId: string): Promise<GhostDetail> {
    const response = await fetch(`${API_BASE}/ghosts/${ghostId}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch ghost detail');
    return response.json();
  },

  /**
   * Re-Engagement Nachricht generieren
   */
  async generateReEngageMessage(
    ghostId: string,
    strategy?: ReEngagementStrategy,
    customContext?: Record<string, string>
  ): Promise<ReEngageResponse> {
    const response = await fetch(`${API_BASE}/ghosts/${ghostId}/reengage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ strategy, custom_context: customContext }),
    });
    if (!response.ok) throw new Error('Failed to generate message');
    return response.json();
  },

  /**
   * Aktion ausführen
   */
  async performAction(
    ghostId: string,
    action: 'send' | 'skip' | 'breakup' | 'snooze',
    details?: {
      messageSent?: string;
      snoozeDays?: number;
      skipReason?: string;
    }
  ): Promise<{ success: boolean; action: string; message: string }> {
    const response = await fetch(`${API_BASE}/ghosts/${ghostId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action,
        message_sent: details?.messageSent,
        snooze_days: details?.snoozeDays,
        skip_reason: details?.skipReason,
      }),
    });
    if (!response.ok) throw new Error('Failed to perform action');
    return response.json();
  },

  /**
   * Ghost-Report
   */
  async getReport(): Promise<GhostReport> {
    const response = await fetch(`${API_BASE}/ghosts/report`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch report');
    return response.json();
  },
};


// =============================================================================
// TEAM LEADER API
// =============================================================================

export const teamLeaderApi = {
  /**
   * Liste aller Team-Mitglieder
   */
  async listMembers(): Promise<TeamMember[]> {
    const response = await fetch(`${API_BASE}/team`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch team members');
    return response.json();
  },

  /**
   * Team-Dashboard
   */
  async getDashboard(): Promise<TeamDashboard> {
    const response = await fetch(`${API_BASE}/team/dashboard`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
  },

  /**
   * Member-Details
   */
  async getMemberDetail(memberId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: string;
    level: string;
    stats: Record<string, number>;
    activity_log: Array<{ action: string; timestamp: string; details: any }>;
    coaching_suggestions: string[];
    next_actions: string[];
    analysis_text: string;
  }> {
    const response = await fetch(`${API_BASE}/team/members/${memberId}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch member detail');
    return response.json();
  },

  /**
   * Team-Alerts
   */
  async getAlerts(priority?: 'critical' | 'high' | 'medium' | 'low'): Promise<TeamAlert[]> {
    const url = priority 
      ? `${API_BASE}/team/alerts?priority=${priority}`
      : `${API_BASE}/team/alerts`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch alerts');
    return response.json();
  },

  /**
   * Member nudgen/pushen
   */
  async nudgeMember(
    memberId: string,
    nudgeType: 'gentle' | 'direct' | 'motivational',
    customMessage?: string
  ): Promise<NudgeResult> {
    const response = await fetch(`${API_BASE}/team/members/${memberId}/nudge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nudge_type: nudgeType, custom_message: customMessage }),
    });
    if (!response.ok) throw new Error('Failed to nudge member');
    return response.json();
  },

  /**
   * Meeting-Agenda generieren
   */
  async getMeetingAgenda(meetingDate?: string): Promise<MeetingAgenda> {
    const url = meetingDate 
      ? `${API_BASE}/team/agenda?meeting_date=${meetingDate}`
      : `${API_BASE}/team/agenda`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch agenda');
    return response.json();
  },

  /**
   * Template ans Team teilen
   */
  async shareTemplate(templateId: string, message?: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/team/templates/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ template_id: templateId, message }),
    });
    if (!response.ok) throw new Error('Failed to share template');
    return response.json();
  },
};

