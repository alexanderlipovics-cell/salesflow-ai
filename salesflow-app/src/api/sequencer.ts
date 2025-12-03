/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SEQUENCER API                                                             ║
 * ║  Frontend API für Outreach Automation                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';

const API_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export interface SequenceSettings {
  timezone: string;
  send_days: string[];
  send_hours_start: number;
  send_hours_end: number;
  max_per_day: number;
  stop_on_reply: boolean;
  stop_on_bounce: boolean;
  track_opens: boolean;
  track_clicks: boolean;
}

export interface SequenceStats {
  enrolled: number;
  active: number;
  completed: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
}

export interface Sequence {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  settings: SequenceSettings;
  stats: SequenceStats;
  tags: string[];
  created_at: string;
  updated_at: string;
  activated_at?: string;
  completed_at?: string;
  steps?: SequenceStep[];
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  step_type: 'email' | 'linkedin_connect' | 'linkedin_dm' | 'linkedin_inmail' | 'whatsapp' | 'sms' | 'wait' | 'condition';
  delay_days: number;
  delay_hours: number;
  delay_minutes: number;
  subject?: string;
  content?: string;
  content_html?: string;
  ab_variant?: string;
  condition_type?: string;
  condition_step_id?: string;
  platform_settings?: Record<string, any>;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  };
  is_active: boolean;
  created_at: string;
}

export interface Enrollment {
  id: string;
  sequence_id: string;
  user_id: string;
  lead_id?: string;
  contact_email?: string;
  contact_name?: string;
  contact_linkedin_url?: string;
  contact_phone?: string;
  variables: Record<string, string>;
  status: 'active' | 'paused' | 'completed' | 'replied' | 'bounced' | 'unsubscribed' | 'stopped';
  current_step: number;
  next_step_at?: string;
  enrolled_at: string;
  completed_at?: string;
  replied_at?: string;
  stopped_at?: string;
  stop_reason?: string;
  ab_variant?: string;
}

export interface EmailAccount {
  id: string;
  name: string;
  email_address: string;
  from_name?: string;
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'gmail';
  is_active: boolean;
  is_verified: boolean;
  daily_limit: number;
  hourly_limit: number;
  sent_today: number;
  sent_this_hour: number;
  last_sent_at?: string;
  last_error?: string;
  consecutive_errors: number;
  created_at: string;
}

// =============================================================================
// SEQUENCES API
// =============================================================================

export const sequenceApi = {
  // List sequences
  list: async (token: string, status?: string): Promise<{ sequences: Sequence[] }> => {
    const url = new URL(`${API_URL}/api/v1/sequences`);
    if (status) url.searchParams.set('status', status);
    
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Get single sequence with steps
  get: async (token: string, sequenceId: string): Promise<{ sequence: Sequence }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Create sequence
  create: async (
    token: string,
    data: { name: string; description?: string; settings?: Partial<SequenceSettings>; tags?: string[] }
  ): Promise<{ success: boolean; sequence: Sequence }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Update sequence
  update: async (
    token: string,
    sequenceId: string,
    data: Partial<{ name: string; description: string; settings: Partial<SequenceSettings>; tags: string[] }>
  ): Promise<{ success: boolean; sequence: Sequence }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Delete sequence
  delete: async (token: string, sequenceId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Activate sequence
  activate: async (token: string, sequenceId: string): Promise<{ success: boolean; sequence: Sequence }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}/activate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Pause sequence
  pause: async (token: string, sequenceId: string): Promise<{ success: boolean; sequence: Sequence }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Duplicate sequence
  duplicate: async (token: string, sequenceId: string): Promise<{ success: boolean; sequence: Sequence }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Get stats
  getStats: async (token: string, sequenceId: string): Promise<{ sequence: Sequence; daily_stats: any[] }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
};

// =============================================================================
// STEPS API
// =============================================================================

export const stepApi = {
  // Add step
  add: async (
    token: string,
    sequenceId: string,
    data: {
      step_type: SequenceStep['step_type'];
      step_order: number;
      delay_days?: number;
      delay_hours?: number;
      delay_minutes?: number;
      subject?: string;
      content?: string;
      content_html?: string;
      platform_settings?: Record<string, any>;
    }
  ): Promise<{ success: boolean; step: SequenceStep }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}/steps`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Update step
  update: async (
    token: string,
    sequenceId: string,
    stepId: string,
    data: Partial<{
      delay_days: number;
      delay_hours: number;
      delay_minutes: number;
      subject: string;
      content: string;
      content_html: string;
      is_active: boolean;
      platform_settings: Record<string, any>;
    }>
  ): Promise<{ success: boolean; step: SequenceStep }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}/steps/${stepId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Delete step
  delete: async (token: string, sequenceId: string, stepId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}/steps/${stepId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
};

// =============================================================================
// ENROLLMENTS API
// =============================================================================

export const enrollmentApi = {
  // Enroll contact
  enroll: async (
    token: string,
    sequenceId: string,
    data: {
      contact_email?: string;
      contact_name?: string;
      contact_linkedin_url?: string;
      contact_phone?: string;
      lead_id?: string;
      variables?: Record<string, string>;
    }
  ): Promise<{ success: boolean; enrollment: Enrollment }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}/enroll`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Bulk enroll
  bulkEnroll: async (
    token: string,
    sequenceId: string,
    contacts: Array<{
      email?: string;
      name?: string;
      linkedin_url?: string;
      phone?: string;
      lead_id?: string;
      variables?: Record<string, string>;
    }>
  ): Promise<{ success: boolean; enrolled: number; errors: number; error_details: any[] }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/${sequenceId}/enroll-bulk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contacts }),
    });
    return res.json();
  },

  // List enrollments
  list: async (
    token: string,
    sequenceId: string,
    status?: string
  ): Promise<{ enrollments: Enrollment[]; count: number }> => {
    const url = new URL(`${API_URL}/api/v1/sequences/${sequenceId}/enrollments`);
    if (status) url.searchParams.set('status', status);
    
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Pause enrollment
  pause: async (token: string, enrollmentId: string): Promise<{ success: boolean; enrollment: Enrollment }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/enrollments/${enrollmentId}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Resume enrollment
  resume: async (token: string, enrollmentId: string): Promise<{ success: boolean; enrollment: Enrollment }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/enrollments/${enrollmentId}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Stop enrollment
  stop: async (token: string, enrollmentId: string, reason?: string): Promise<{ success: boolean; enrollment: Enrollment }> => {
    const url = new URL(`${API_URL}/api/v1/sequences/enrollments/${enrollmentId}/stop`);
    if (reason) url.searchParams.set('reason', reason);
    
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Mark as replied
  markReplied: async (token: string, enrollmentId: string): Promise<{ success: boolean; enrollment: Enrollment }> => {
    const res = await fetch(`${API_URL}/api/v1/sequences/enrollments/${enrollmentId}/mark-replied`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
};

// =============================================================================
// EMAIL ACCOUNTS API
// =============================================================================

export const emailAccountApi = {
  // List accounts
  list: async (token: string): Promise<{ accounts: EmailAccount[] }> => {
    const res = await fetch(`${API_URL}/api/v1/email-accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Get account
  get: async (token: string, accountId: string): Promise<{ account: EmailAccount }> => {
    const res = await fetch(`${API_URL}/api/v1/email-accounts/${accountId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Create account
  create: async (
    token: string,
    data: {
      name: string;
      email_address: string;
      from_name?: string;
      reply_to?: string;
      provider?: 'smtp' | 'sendgrid' | 'mailgun';
      smtp_host?: string;
      smtp_port?: number;
      smtp_username?: string;
      smtp_password?: string;
      smtp_secure?: boolean;
      api_key?: string;
      daily_limit?: number;
      hourly_limit?: number;
    }
  ): Promise<{ success: boolean; account: EmailAccount }> => {
    const res = await fetch(`${API_URL}/api/v1/email-accounts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Update account
  update: async (
    token: string,
    accountId: string,
    data: Partial<{
      name: string;
      from_name: string;
      reply_to: string;
      smtp_host: string;
      smtp_port: number;
      smtp_username: string;
      smtp_password: string;
      smtp_secure: boolean;
      api_key: string;
      daily_limit: number;
      hourly_limit: number;
      is_active: boolean;
    }>
  ): Promise<{ success: boolean; account: EmailAccount }> => {
    const res = await fetch(`${API_URL}/api/v1/email-accounts/${accountId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Delete account
  delete: async (token: string, accountId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/api/v1/email-accounts/${accountId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Verify account (send test email)
  verify: async (token: string, accountId: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`${API_URL}/api/v1/email-accounts/${accountId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Send test email
  test: async (token: string, accountId: string, toEmail: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`${API_URL}/api/v1/email-accounts/${accountId}/test?to_email=${encodeURIComponent(toEmail)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Start warmup
  startWarmup: async (token: string, accountId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/api/v1/email-accounts/${accountId}/warmup/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Stop warmup
  stopWarmup: async (token: string, accountId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/api/v1/email-accounts/${accountId}/warmup/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
};

