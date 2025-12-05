// types/leadCrud.ts

export type Stage =
  | 'new'
  | 'contacted'
  | 'early_follow_up'
  | 'interested'
  | 'qualified'
  | 'candidate'
  | 'customer'
  | 'partner'
  | 'reactivation'
  | 'hot_prospect'
  | 'closed_won'
  | 'closed_lost'
  | 'lost'
  | 'inactive';

export type Channel =
  | 'whatsapp'
  | 'instagram_dm'
  | 'facebook_messenger'
  | 'telegram'
  | 'email'
  | 'phone_call'
  | 'sms'
  | 'call';

export type Outcome =
  | 'follow_up_scheduled'
  | 'done'
  | 'snooze'
  | 'interested'
  | 'no_answer'
  | 'message_sent'
  | 'lead_inbound';

export type DISC = 'D' | 'I' | 'S' | 'C';

export type LeadSource = 'manual' | 'import' | 'web_form' | 'referral' | 'event' | 'api';

export type LeadSegment = 'consumer' | 'business' | 'partner' | 'vip';

export interface LeadFormData {
  name: string;
  email?: string;
  phone: string;
  company_id: string;
  stage: Stage;
  source: LeadSource;
  segment?: LeadSegment;
  tags?: string[];
  notes?: string;
  custom_fields?: Record<string, any>;
}

export interface BulkOperation {
  operation: 'tag' | 'assign' | 'stage' | 'delete' | 'archive';
  lead_ids: string[];
  value?: any;
}

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: { row: number; reason: string }[];
}

