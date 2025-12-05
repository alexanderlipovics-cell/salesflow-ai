/**
 * Mobile API Service - Verbindet Mobile App mit Backend
 * 
 * Features:
 * - Follow-Up Engine
 * - Lead Hunter
 * - Screenshot Import
 * - Team Templates
 * - Chat Import
 */

// API Base URL - in Produktion durch echte URL ersetzen
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.100:8000/api'  // Lokale IP für Entwicklung
  : 'https://api.salesflow.ai/api';  // Produktion

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
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
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
}

// Singleton Export
export const mobileApi = new MobileApiClient();

export default mobileApi;

