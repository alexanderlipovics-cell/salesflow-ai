/**
 * Billing API Client
 * Stripe Integration für Subscriptions
 */

import { API_CONFIG } from '../services/apiConfig';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Subscription {
  has_subscription: boolean;
  subscription_id?: string;
  plan: string;
  status?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  addons: string[];
  limits: PlanLimits;
}

export interface PlanLimits {
  leads: number;
  chats_import: number;
  ai_analyses: number;
  follow_ups: number;
  templates: number;
  team_members: number;
  auto_actions: number;
  ghost_reengages: number;
  transactions: number;
  lead_suggestions: number;
}

export interface UsageData {
  period_start: string;
  usage: Record<string, number>;
  limits: PlanLimits;
  usage_percentage: Record<string, number>;
}

export interface CheckoutSession {
  checkout_url: string;
  session_id: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════════════════

class BillingApi {
  private baseUrl = `${API_CONFIG.baseUrl}/billing`;
  
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }
    return response.json();
  }
  
  async getSubscription(): Promise<Subscription> {
    return this.fetch<Subscription>('/subscription');
  }
  
  async createCheckout(priceId: string, trialDays?: number): Promise<CheckoutSession> {
    return this.fetch<CheckoutSession>('/checkout', {
      method: 'POST',
      body: JSON.stringify({ price_id: priceId, trial_days: trialDays ?? 7 }),
    });
  }
  
  async addAddon(addonPriceId: string): Promise<{ success: boolean }> {
    return this.fetch('/checkout/addon', {
      method: 'POST',
      body: JSON.stringify({ price_id: addonPriceId }),
    });
  }
  
  async createPortalSession(): Promise<{ portal_url: string }> {
    return this.fetch('/portal', { method: 'POST', body: JSON.stringify({}) });
  }
  
  async getUsage(): Promise<UsageData> {
    return this.fetch<UsageData>('/usage');
  }
  
  async recordUsage(feature: string, quantity: number = 1): Promise<void> {
    await this.fetch('/usage/record', {
      method: 'POST',
      body: JSON.stringify({ feature, quantity }),
    });
  }
}

export const billingApi = new BillingApi();
export default billingApi;
