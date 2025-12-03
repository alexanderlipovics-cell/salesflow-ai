/**
 * Types für CHIEF Chat
 */

export interface ChiefChatRequest {
  message: string;
  companyId?: string | null;
  includeContext?: boolean;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface ChiefAction {
  type: string;
  params?: string | string[];
}

export interface ChiefChatResponse {
  reply: string;
  actions: ChiefAction[];
  contextUsed: boolean;
}

export interface LeadSuggestion {
  id: string;
  name: string;
  status: string;
  lastContactAt?: string | null;
  reason: string;
}

export interface ChiefContext {
  dailyFlowStatus: {
    date: string;
    newContacts: { target: number; done: number; remaining: number; percent: number };
    followups: { target: number; done: number; remaining: number; percent: number };
    reactivations: { target: number; done: number; remaining: number; percent: number };
    overallPercent: number;
    isOnTrack: boolean;
  };
  remainingToday: {
    newContacts: number;
    followups: number;
    reactivations: number;
  };
  suggestedLeads: LeadSuggestion[];
  verticalProfile: {
    verticalId: string;
    verticalLabel: string;
    role?: string | null;
    productContext?: string | null;
    conversationStyle: string;
    keyMetrics: string[];
  };
  userName?: string | null;
  currentGoalSummary?: string | null;
}

