/**
 * Mobile API Service - Verbindet Mobile App mit Backend
 * 
 * Features:
 * - Follow-Up Engine
 * - Lead Hunter
 * - Screenshot Import
 * - Team Templates
 * - Chat Import
 * - Commission Tracker
 * - Closing Coach
 * - Cold Call Assistant
 * - Performance Insights
 * - Gamification
 */

// API Base URL - in Produktion durch echte URL ersetzen
const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001/api')  // Lokale IP für Entwicklung
  : 'https://api.salesflow.ai/api';  // Produktion

// Auth Token Provider - wird von AuthContext gesetzt
let getAuthToken: (() => Promise<string | null>) | null = null;

export const setAuthTokenProvider = (provider: () => Promise<string | null>) => {
  getAuthToken = provider;
};

// ============================================
// TYPES
// ============================================

export interface FollowUpSuggestion {
  lead_id: string;
  recommended_channel: 'whatsapp' | 'sms' | 'email' | 'phone' | 'instagram_dm';
  recommended_time: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  meta: {
    sequence_name?: string;
    step_action?: string;
    lead_name?: string;
  };
}

export interface HuntedLead {
  id: string;
  name?: string;
  handle?: string;
  platform: string;
  bio_keywords: string[];
  mlm_signals: string[];
  hunt_score: number;
  priority: 'hot' | 'warm' | 'cold' | 'nurture';
  suggested_opener?: string;
  reason: string;
}

export interface AIMessage {
  content: string;
  channel: string;
  language: string;
}

// ============================================
// API CLIENT
// ============================================

class MobileApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Auth Token hinzufügen, falls verfügbar
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (getAuthToken) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // FOLLOW-UP ENGINE
  // ============================================

  async getTodayFollowUps(): Promise<{
    count: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    follow_ups: FollowUpSuggestion[];
  }> {
    return this.request('/follow-ups/today');
  }

  async generateFollowUpMessage(leadId: string): Promise<AIMessage> {
    return this.request(`/follow-ups/${leadId}/generate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async snoozeFollowUp(
    leadId: string,
    preset: '1h' | 'evening' | 'tomorrow' | 'next_monday'
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/follow-ups/${leadId}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ preset }),
    });
  }

  // ============================================
  // LEAD HUNTER
  // ============================================

  async getDailySuggestions(count: number = 5): Promise<HuntedLead[]> {
    return this.request(`/lead-hunter/daily?count=${count}`);
  }

  async huntLeads(hashtags: string[]): Promise<{
    success: boolean;
    total_found: number;
    leads: HuntedLead[];
    suggestions: string[];
  }> {
    return this.request('/lead-hunter/hunt', {
      method: 'POST',
      body: JSON.stringify({
        hashtags,
        bio_keywords: ['coach', 'mama', 'business'],
        limit: 20,
      }),
    });
  }

  async getReactivationCandidates(): Promise<{
    leads: HuntedLead[];
  }> {
    return this.request('/lead-hunter/reactivation?days_inactive=30');
  }

  async getDailyQuota(): Promise<{
    leads_found: number;
    leads_contacted: number;
    goal: number;
    progress_percent: number;
  }> {
    return this.request('/lead-hunter/quota');
  }

  // ============================================
  // SCREENSHOT IMPORT
  // ============================================

  async importScreenshot(imageBase64: string): Promise<{
    status: string;
    lead_id: string;
    lead_name: string;
    platform: string;
    icebreaker?: string;
    confidence: number;
  }> {
    // Für Mobile: Base64 Bild senden
    const formData = new FormData();
    formData.append('file', {
      uri: imageBase64,
      type: 'image/jpeg',
      name: 'screenshot.jpg',
    } as any);

    const response = await fetch(`${this.baseURL}/screenshot/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Screenshot import failed');
    }

    return response.json();
  }

  // ============================================
  // TEAM TEMPLATES
  // ============================================

  async listTeamTemplates(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    times_cloned: number;
    is_public: boolean;
  }>> {
    return this.request('/team-templates');
  }

  async cloneTeamTemplate(templateId: string): Promise<{
    success: boolean;
    cloned_template_id: string;
    message: string;
  }> {
    return this.request(`/team-templates/${templateId}/clone`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // ============================================
  // CHAT IMPORT
  // ============================================

  async importChatPaste(chatText: string): Promise<{
    parsed_leads: Array<{
      name: string;
      sentiment: string;
      suggested_next_action?: string;
    }>;
    total_leads_imported: number;
  }> {
    return this.request('/import/chat-paste', {
      method: 'POST',
      body: JSON.stringify({ chat_text: chatText }),
    });
  }

  // ============================================
  // COMMISSION TRACKER
  // ============================================

  async getCommissions(params?: {
    month?: string; // YYYY-MM
    status?: 'paid' | 'pending' | 'overdue';
  }): Promise<Array<{
    id: string;
    deal_name: string;
    deal_value: number;
    commission_rate: number;
    commission_amount: number;
    status: 'paid' | 'pending' | 'overdue';
    date: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append('month', params.month);
    if (params?.status) queryParams.append('status', params.status);
    const query = queryParams.toString();
    return this.request(`/commissions${query ? `?${query}` : ''}`);
  }

  async getCommissionSummary(month?: string): Promise<{
    gross: number;
    net: number;
    tax: number;
    open_amount: number;
  }> {
    const query = month ? `?month=${month}` : '';
    return this.request(`/commissions/summary${query}`);
  }

  async createCommission(data: {
    deal_name: string;
    deal_value: number;
    commission_rate: number;
    date: string;
  }): Promise<{
    id: string;
    deal_name: string;
    commission_amount: number;
    status: string;
  }> {
    return this.request('/commissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async downloadCommissionInvoice(commissionId: string): Promise<Blob> {
    const url = `${this.baseURL}/commissions/${commissionId}/invoice`;
    const token = getAuthToken ? await getAuthToken() : null;
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Invoice download failed');
    return response.blob();
  }

  async sendCommissionToAccounting(commissionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/commissions/${commissionId}/send-to-accounting`, {
      method: 'POST',
    });
  }

  // ============================================
  // CLOSING COACH
  // ============================================

  async getClosingDeals(): Promise<Array<{
    id: string;
    deal_name: string;
    account: string;
    closing_score: number;
    probability: number;
    blockers: Array<{
      issue: string;
      severity: 'high' | 'medium' | 'low';
      context: string;
    }>;
    strategies: Array<{
      name: string;
      script: string;
      focus: string;
    }>;
    last_analyzed: string;
  }>> {
    return this.request('/closing-coach/deals?mobile=true');
  }

  async analyzeDeal(dealId: string): Promise<{
    id: string;
    deal_name: string;
    account: string;
    closing_score: number;
    probability: number;
    blockers: Array<{
      issue: string;
      severity: 'high' | 'medium' | 'low';
      context: string;
    }>;
    strategies: Array<{
      name: string;
      script: string;
      focus: string;
    }>;
    last_analyzed: string;
  }> {
    return this.request(`/closing-coach/analyze/${dealId}`, {
      method: 'POST',
    });
  }

  // ============================================
  // COLD CALL ASSISTANT
  // ============================================

  async generateColdCallScript(data: {
    contact_id?: string;
    contact_name?: string;
    company_name?: string;
    goal: 'book_meeting' | 'qualify' | 'identify_decision_maker';
  }): Promise<{
    contact_name: string;
    company_name: string;
    goal: string;
    sections: Array<{
      section_type: 'opener' | 'objection_response' | 'close';
      title: string;
      script: string;
      tips: string[];
    }>;
    suggested_objections: string[];
  }> {
    return this.request('/cold-call/generate-script', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getColdCallContacts(): Promise<Array<{
    id: string;
    name: string;
    company?: string;
    phone?: string;
  }>> {
    return this.request('/cold-call/contacts');
  }

  async startColdCallSession(data: {
    contact_id: string;
    goal: string;
    mode: 'live' | 'practice';
  }): Promise<{
    id: string;
    contact_id: string;
    status: string;
    mode: string;
  }> {
    return this.request('/cold-call/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateColdCallSession(sessionId: string, data: {
    status?: 'in_progress' | 'completed';
    duration_seconds?: number;
    notes?: string;
  }): Promise<{
    id: string;
    status: string;
    duration_seconds?: number;
    notes?: string;
  }> {
    return this.request(`/cold-call/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // PERFORMANCE INSIGHTS
  // ============================================

  async getPerformanceInsights(params?: {
    period_start?: string; // YYYY-MM-DD
    period_end?: string; // YYYY-MM-DD
  }): Promise<{
    period: {
      start: string;
      end: string;
    };
    metrics: {
      calls: number;
      deals: number;
      revenue: number;
      conversion_rate: number;
    };
    previous_period: {
      calls: number;
      deals: number;
      revenue: number;
      conversion_rate: number;
    };
    trends: {
      calls: number; // percentage change
      deals: number;
      revenue: number;
      conversion_rate: number;
    };
    issues: Array<{
      issue: string;
      severity: 'high' | 'medium' | 'low';
      impact: string;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      action_items: string[];
    }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.period_start) queryParams.append('period_start', params.period_start);
    if (params?.period_end) queryParams.append('period_end', params.period_end);
    queryParams.append('mobile', 'true'); // mobile=true immer hinzufügen
    const query = queryParams.toString();
    return this.request(`/performance-insights/analyze?${query}`);
  }

  // ============================================
  // GAMIFICATION
  // ============================================

  async getGamificationData(): Promise<{
    streak: {
      current: number;
      longest: number;
      last_activity: string;
    };
    achievements: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      progress: number;
      max_progress: number;
      unlocked: boolean;
      unlocked_at?: string;
    }>;
    leaderboard: Array<{
      rank: number;
      user_id: string;
      user_name: string;
      total_xp: number;
      achievements_count: number;
    }>;
    daily_activities: Array<{
      id: string;
      name: string;
      description: string;
      xp_reward: number;
      completed: boolean;
    }>;
  }> {
    return this.request('/gamification/overview?mobile=true');
  }

  async trackDailyActivity(activityId: string): Promise<{
    success: boolean;
    xp_gained: number;
    new_achievements?: Array<{
      id: string;
      name: string;
    }>;
  }> {
    return this.request('/gamification/daily-activities/track', {
      method: 'POST',
      body: JSON.stringify({ activity_id: activityId }),
    });
  }

  async getLeaderboard(limit: number = 10): Promise<Array<{
    rank: number;
    user_id: string;
    user_name: string;
    total_xp: number;
    achievements_count: number;
  }>> {
    return this.request(`/gamification/leaderboard?limit=${limit}&mobile=true`);
  }
}

// Singleton Export
export const mobileApi = new MobileApiClient();

export default mobileApi;

