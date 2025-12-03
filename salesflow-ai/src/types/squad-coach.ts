// ============================================================================
// FILE: src/types/squad-coach.ts
// DESCRIPTION: Types for Squad Coach Analytics System
// ============================================================================

export interface SquadCoachPriorityAnalysis {
  user_id: string;
  user_email: string;
  user_name: string;
  total_open_followups: number;
  critical_followups: number;
  very_high_followups: number;
  high_followups: number;
  avg_priority_score: number;
  max_priority_score: number;
  overdue_count: number;
  today_count: number;
  needs_coaching: boolean;
}

export interface SquadCoachReport {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  health_score: number;
  focus_area: FocusArea;
  coaching_priority: number;
  conversion_rate_percent: number;
  reply_rate_percent: number;
  contacts_contacted: number;
  contacts_signed: number;
  overdue_followups: number;
  high_priority_open_followups: number;
  avg_days_to_reply: number;
}

export type FocusArea = 'timing_help' | 'script_help' | 'lead_quality' | 'balanced';

export interface FocusAreaConfig {
  label: string;
  description: string;
  color: 'red' | 'orange' | 'yellow' | 'green';
  icon: string;
  actionItems: string[];
}

export const FOCUS_AREA_CONFIGS: Record<FocusArea, FocusAreaConfig> = {
  timing_help: {
    label: 'Follow-up Disziplin',
    description: 'Viele überfällige Tasks → Zeitmangement-Training nötig',
    color: 'red',
    icon: 'Clock',
    actionItems: [
      'Daily Command Routine etablieren',
      'Task-Batch-Processing einführen',
      'Calendar-Blocking für Follow-ups',
      'Automatische Erinnerungen aktivieren',
    ],
  },
  script_help: {
    label: 'Message Quality',
    description: 'Viele Erstkontakte aber wenig Replies → Script-Verbesserung',
    color: 'orange',
    icon: 'MessageSquare',
    actionItems: [
      'Top-Performer Messages analysieren',
      'A/B-Testing für neue Scripts',
      'Objection-Handling Training',
      'Personalisierung verbessern',
    ],
  },
  lead_quality: {
    label: 'Lead Qualifikation',
    description: 'Viele Replies aber wenig Conversion → Lead Scoring überdenken',
    color: 'yellow',
    icon: 'Target',
    actionItems: [
      'Lead-Scoring-Kriterien überarbeiten',
      'Qualifikations-Fragen schärfen',
      'Ideal Customer Profile definieren',
      'Disqualifikation früher im Prozess',
    ],
  },
  balanced: {
    label: 'Balanced & On-Track',
    description: 'Alles im grünen Bereich, weiter so!',
    color: 'green',
    icon: 'CheckCircle',
    actionItems: [
      'Best Practices dokumentieren',
      'Junior Reps mentoren',
      'Neue Strategien testen',
      'Team-Wissen teilen',
    ],
  },
};

export interface SquadCoachFilters {
  daysBack: number;
  refetchInterval?: number;
}

export const DEFAULT_SQUAD_COACH_FILTERS: SquadCoachFilters = {
  daysBack: 7,
  refetchInterval: 300000, // 5 minutes
};

export const COACHING_THRESHOLDS = {
  CRITICAL_FOLLOWUPS: 10,
  OVERDUE_COUNT: 5,
  AVG_SCORE: 75,
} as const;

