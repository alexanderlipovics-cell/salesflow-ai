/**
 * SALES FLOW AI - PRIORITY SCORING TYPES
 * 
 * Types for intelligent follow-up prioritization
 * Version: 2.0.0
 */

// ============================================================================
// PRIORITY TYPES
// ============================================================================

export type SegmentKey = 'overdue' | 'today' | 'week' | 'hot';

export interface FollowUpItem {
  task_id: string;
  contact_id: string;
  contact_name: string | null;
  contact_status: string | null;
  contact_lead_score: number;
  due_at: string;
  priority: string;
  last_action_type: string | null;
  last_contact_at: string | null;
  days_since_contact: number | null;
  priority_score: number; // 0-120 range
}

export interface PriorityLevel {
  min: number;
  max: number;
  label: string;
  color: string;
  colorClass: string;
  description: string;
}

// ============================================================================
// PRIORITY LEVELS CONFIGURATION
// ============================================================================

export const PRIORITY_LEVELS: PriorityLevel[] = [
  { 
    min: 100, 
    max: 120, 
    label: 'Kritisch', 
    color: 'red',
    colorClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    description: 'Sofort handeln – höchste Priorität' 
  },
  { 
    min: 85, 
    max: 99, 
    label: 'Sehr hoch', 
    color: 'orange',
    colorClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    description: 'Heute erledigen – hohe Dringlichkeit' 
  },
  { 
    min: 70, 
    max: 84, 
    label: 'Hoch', 
    color: 'yellow',
    colorClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    description: 'Prioritär behandeln – wichtig' 
  },
  { 
    min: 50, 
    max: 69, 
    label: 'Mittel', 
    color: 'blue',
    colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    description: 'Normal einplanen – standard' 
  },
  { 
    min: 0, 
    max: 49, 
    label: 'Niedrig', 
    color: 'gray',
    colorClass: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    description: 'Bei Gelegenheit – niedrige Priorität' 
  },
];

// ============================================================================
// SEGMENT CONFIGURATION
// ============================================================================

export interface SegmentConfig {
  key: SegmentKey;
  label: string;
  icon: string;
  description: string;
  color: string;
}

export const SEGMENTS: SegmentConfig[] = [
  {
    key: 'overdue',
    label: 'Überfällig',
    icon: 'AlertCircle',
    description: 'Tasks die bereits überfällig sind',
    color: 'red',
  },
  {
    key: 'today',
    label: 'Heute',
    icon: 'Clock',
    description: 'Tasks die heute fällig sind',
    color: 'orange',
  },
  {
    key: 'week',
    label: 'Diese Woche',
    icon: 'Calendar',
    description: 'Tasks für diese Woche',
    color: 'blue',
  },
  {
    key: 'hot',
    label: 'Hot Leads',
    icon: 'Flame',
    description: 'Hochwertige Leads mit hohem Score',
    color: 'yellow',
  },
];

// ============================================================================
// PRIORITY SCORE BREAKDOWN
// ============================================================================

export interface PriorityScoreBreakdown {
  total: number;
  baseScore: number;
  urgencyBonus: number;
  statusBonus: number;
  recencyBonus: number;
  leadScoreBonus: number;
}

