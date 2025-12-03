import { z } from 'zod';

export const FocusAreaSchema = z.enum(['timing_help', 'script_help', 'lead_quality', 'balanced']);
export type FocusArea = z.infer<typeof FocusAreaSchema>;

export const SegmentSchema = z.enum(['overdue', 'today', 'week', 'later']);
export type Segment = z.infer<typeof SegmentSchema>;

export const SquadCoachRowSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email().nullable(),
  full_name: z.string().nullable(),
  role: z.string().nullable(),
  leads_created: z.number().int().nonnegative(),
  contacts_contacted: z.number().int().nonnegative(),
  contacts_signed: z.number().int().nonnegative(),
  first_messages: z.number().int().nonnegative(),
  reply_events: z.number().int().nonnegative(),
  reply_rate_percent: z.number().nonnegative(),
  conversion_rate_percent: z.number().nonnegative(),
  overdue_followups: z.number().int().nonnegative(),
  high_priority_open_followups: z.number().int().nonnegative(),
  avg_priority_score: z.number().nonnegative(),
  focus_area: FocusAreaSchema,
  health_score: z.number().nonnegative().optional(),
  coaching_priority: z.number().int().min(1).max(4).optional(),
});
export type SquadCoachRow = z.infer<typeof SquadCoachRowSchema>;

export const FollowupScoredSchema = z.object({
  task_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  assigned_user_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  contact_name: z.string().nullable(),
  contact_status: z.string().nullable(),
  task_status: z.string(),
  due_at: z.string(),
  last_action_type: z.string().nullable(),
  last_contact_at: z.string().nullable(),
  segment_inferred: SegmentSchema,
  priority_score: z.number().nonnegative(),
});
export type FollowupScored = z.infer<typeof FollowupScoredSchema>;

export const CoachingInputHighPriorityContactSchema = z.object({
  contact_name: z.string().nullable(),
  segment: SegmentSchema,
  priority_score: z.number().nonnegative(),
  status: z.string().nullable(),
  due_at: z.string(),
  last_contact_at: z.string().nullable(),
});
export type CoachingInputHighPriorityContact = z.infer<
  typeof CoachingInputHighPriorityContactSchema
>;

export const CoachingInputRepSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email().nullable(),
  display_name: z.string().nullable(),
  focus_area: FocusAreaSchema,
  metrics: z.object({
    leads_created: z.number().int().nonnegative(),
    contacts_contacted: z.number().int().nonnegative(),
    contacts_signed: z.number().int().nonnegative(),
    first_messages: z.number().int().nonnegative(),
    reply_events: z.number().int().nonnegative(),
    reply_rate_percent: z.number().nonnegative(),
    conversion_rate_percent: z.number().nonnegative(),
  }),
  followups: z.object({
    overdue_followups: z.number().int().nonnegative(),
    high_priority_open_followups: z.number().int().nonnegative(),
    avg_priority_score: z.number().nonnegative(),
  }),
  recent_examples: z.object({
    high_priority_contacts: z.array(CoachingInputHighPriorityContactSchema),
  }),
});
export type CoachingInputRep = z.infer<typeof CoachingInputRepSchema>;

export const CoachingInputSchema = z.object({
  workspace_id: z.string().uuid(),
  timeframe_days: z.number().int().positive(),
  language: z.string().default('de'),
  team_summary: z.object({
    total_reps: z.number().int().nonnegative(),
    avg_reply_rate_percent: z.number().nonnegative(),
    avg_conversion_rate_percent: z.number().nonnegative(),
    avg_overdue_followups: z.number().nonnegative(),
  }),
  reps: z.array(CoachingInputRepSchema),
});
export type CoachingInput = z.infer<typeof CoachingInputSchema>;

export const CoachingOutputRepSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().nullable(),
  focus_area: FocusAreaSchema,
  diagnosis: z.string(),
  suggested_actions: z.array(z.string()),
  script_ideas: z.array(z.string()),
  priority_actions: z.array(z.string()).optional(),
  timeline: z.string().optional(),
});
export type CoachingOutputRep = z.infer<typeof CoachingOutputRepSchema>;

export const CoachingOutputSchema = z.object({
  timeframe_days: z.number().int().positive(),
  language: z.string(),
  generated_at: z.string().optional(),
  team_summary: z.object({
    headline: z.string(),
    description: z.string(),
    suggested_team_actions: z.array(z.string()),
    key_insights: z.array(z.string()).optional(),
  }),
  reps: z.array(CoachingOutputRepSchema),
});
export type CoachingOutput = z.infer<typeof CoachingOutputSchema>;

export interface CoachingError {
  code: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'API_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: unknown;
}

export interface CoachingState {
  report: SquadCoachRow[] | null;
  coaching: CoachingOutput | null;
  loading: boolean;
  error: CoachingError | null;
  lastFetched: Date | null;
}
/**
 * TEAM-CHIEF Coaching Types
 * Type definitions for AI-powered squad coaching system
 */

export interface SquadCoachingInput {
  leader: {
    user_id: string;
    name: string;
  };
  squad: {
    id: string;
    name: string;
  };
  challenge: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    target_points: number;
  };
  leaderboard: Array<{
    rank: number;
    user_id: string;
    name: string;
    points: number;
  }>;
  member_stats: Array<{
    user_id: string;
    name: string;
    points: number;
    contacts: number;
    active_days: number;
    last_active_at: string;
  }>;
  summary: {
    total_points: number;
    total_contacts: number;
    member_count: number;
    active_members: number;
    inactive_members: number;
    period_from: string;
    period_to: string;
  };
}

export interface CoachingAction {
  target_type: "member" | "squad";
  target_name: string;
  reason: string;
  suggested_action: string;
  tone_hint: "empathisch" | "klar" | "motiviert" | "fordernd";
}

export interface SuggestedMessages {
  to_squad: string;
  to_underperformer_template: string;
  to_top_performer_template: string;
}

export interface SquadCoachingOutput {
  summary: string;
  highlights: string[];
  risks: string[];
  priorities: string[];
  coaching_actions: CoachingAction[];
  celebrations: string[];
  suggested_messages: SuggestedMessages;
}

