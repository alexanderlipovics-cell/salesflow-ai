/**
 * Gemeinsame TypeScript Types für CloserClub Mobile
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  status: LeadStatus;
  priority: LeadPriority;
  score: number;
  last_contact?: string;
  estimated_value?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'won'
  | 'lost';

export type LeadPriority = 'high' | 'medium' | 'low';

export interface DashboardStats {
  openFollowUps: number;
  todayTasks: number;
  totalLeads: number;
  conversionRate: number;
  hotLeads: number;
  warmLeads: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  lead_id?: string;
}

export interface CoachTip {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category?: string;
}

export interface HotAccount {
  id: string;
  name: string;
  meta: string;
  value: string;
  score: number;
  freshness: string;
  owner: string;
  signals: string[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

