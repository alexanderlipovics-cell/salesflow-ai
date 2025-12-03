/**
 * TEAM-CHIEF Complete Type Definitions
 * Input and output types for AI squad coaching system
 */

// ===== INPUT TYPES =====

export interface Leader {
  user_id: string;
  name: string;
}

export interface Squad {
  id: string;
  name: string;
}

export interface Challenge {
  id: string;
  title: string;
  start_date: string;        // ISO date
  end_date: string;          // ISO date
  target_points: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  points: number;
}

export interface MemberStats {
  user_id: string;
  name: string;
  points: number;
  contacts: number;
  active_days: number;
  last_active_at: string;    // ISO timestamp
}

export interface Summary {
  total_points: number;
  total_contacts: number;
  member_count: number;
  active_members: number;
  inactive_members: number;
  period_from: string;       // ISO date
  period_to: string;         // ISO date
}

export interface TeamChiefInput {
  leader: Leader;
  squad: Squad;
  challenge: Challenge;
  leaderboard: LeaderboardEntry[];
  member_stats: MemberStats[];
  summary: Summary;
}

// ===== OUTPUT TYPES =====

export type ToneHint = 'empathisch' | 'klar' | 'motiviert' | 'fordernd' | 'ermutigend';
export type TargetType = 'member' | 'squad';

export interface CoachingAction {
  target_type: TargetType;
  target_name: string;
  reason: string;
  suggested_action: string;
  tone_hint: ToneHint;
}

export interface SuggestedMessages {
  to_squad: string;
  to_underperformer_template: string;
  to_top_performer_template: string;
}

export interface TeamChiefOutput {
  summary: string;
  highlights: string[];
  risks: string[];
  priorities: string[];
  coaching_actions: CoachingAction[];
  celebrations: string[];
  suggested_messages: SuggestedMessages;
}

// ===== TEST SCENARIO TYPES =====

export type ScenarioType = 
  | 'balanced'        // Healthy squad with mix of performance
  | 'struggling'      // Low activity, many inactive
  | 'star_heavy'      // Few top performers, rest inactive
  | 'all_inactive'    // Worst case - everyone stopped
  | 'perfect'         // Everyone crushing it
  | 'new_squad';      // Just started, low numbers

export interface TestScenario {
  id: ScenarioType;
  name: string;
  description: string;
  data: TeamChiefInput;
  expected_focus: string[];  // What AI should focus on
}

