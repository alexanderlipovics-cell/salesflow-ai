// ═══════════════════════════════════════════════════════════════════════════
// LEAD SEGMENTATION & FILTER TYPES
// ═══════════════════════════════════════════════════════════════════════════
// Production-ready type definitions for advanced lead filtering

// ============================================================================
// ENUMS
// ============================================================================

export type LeadSegment = 
  | 'VIP' 
  | 'Warm_Prospect' 
  | 'Cold_Contact' 
  | 'Fast_Track'
  | 'Reactivation'
  | 'New_Contact';

export type LeadSource = 
  | 'Facebook' 
  | 'LinkedIn' 
  | 'Instagram'
  | 'Referral' 
  | 'Webinar'
  | 'Cold_Outreach'
  | 'Event'
  | 'Website';

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
  | 'lost'
  | 'inactive';

export type Channel = 
  | 'whatsapp'
  | 'instagram_dm'
  | 'facebook_messenger'
  | 'telegram'
  | 'email'
  | 'phone_call'
  | 'sms';

// ============================================================================
// LEAD INTERFACE (EXTENDED)
// ============================================================================

export interface DueLead {
  id: string;
  name: string;
  stage: Stage;
  next_contact_due_at: string;
  priority_score: number;
  channel: Channel;
  company_name: string;
  
  // NEW FIELDS for segmentation
  segment: LeadSegment;
  source: LeadSource;
  last_activity_days: number;
  is_new_today: boolean;
  tags?: string[];  // Optional tags for custom categorization
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export type FilterOperator = 'AND' | 'OR';

export interface FilterCriteria {
  segments?: LeadSegment[];
  sources?: LeadSource[];
  stages?: Stage[];
  channels?: Channel[];
  companies?: string[];
  daysInactive?: {
    min?: number;
    max?: number;
  };
  priorityScore?: {
    min?: number;
    max?: number;
  };
  isNewToday?: boolean;
  tags?: string[];
}

export interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriteria;
  operator: FilterOperator;
  created_at: string;
  user_id: string;
}

export interface FilterState {
  active: FilterCriteria;
  operator: FilterOperator;
  presets: FilterPreset[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const LEAD_SEGMENTS: LeadSegment[] = [
  'VIP',
  'Warm_Prospect',
  'Cold_Contact',
  'Fast_Track',
  'Reactivation',
  'New_Contact'
];

export const LEAD_SOURCES: LeadSource[] = [
  'Facebook',
  'LinkedIn',
  'Instagram',
  'Referral',
  'Webinar',
  'Cold_Outreach',
  'Event',
  'Website'
];

export const STAGES: Stage[] = [
  'new',
  'contacted',
  'early_follow_up',
  'interested',
  'qualified',
  'candidate',
  'customer',
  'partner',
  'reactivation',
  'lost',
  'inactive'
];

export const CHANNELS: Channel[] = [
  'whatsapp',
  'instagram_dm',
  'facebook_messenger',
  'telegram',
  'email',
  'phone_call',
  'sms'
];

// Format segment for display
export function formatSegment(segment: LeadSegment): string {
  return segment.replace(/_/g, ' ');
}

// Format source for display
export function formatSource(source: LeadSource): string {
  return source.replace(/_/g, ' ');
}

// Format stage for display
export function formatStage(stage: Stage): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

