/**
 * TypeScript Typen für Template Performance Tracking
 */

export type Channel = 'whatsapp' | 'email' | 'dm' | 'phone';
export type Result = 'reply' | 'meeting' | 'no_response' | 'negative' | 'positive';
export type Phase = 'cold_outreach' | 'follow_up' | 'reactivation' | 'closing';

/**
 * Einzelne gesendete Nachricht mit Template und Ergebnis
 */
export interface TemplatePerformance {
  id: string;
  lead_id: string | null;
  template_key: string;
  template_text: string;
  channel: Channel;
  sent_at: string;
  result: Result | null;
  result_at: string | null;
  vertical: string | null;
  phase: Phase | null;
  created_at: string;
}

/**
 * Aggregierte Statistiken pro Template (aus der View template_leaderboard)
 */
export interface TemplateLeaderboardEntry {
  template_key: string;
  template_preview: string;
  phase: Phase | null;
  primary_channel: Channel | null;
  total_sent: number;
  replies: number;
  meetings: number;
  positive_responses: number;
  negative_responses: number;
  no_responses: number;
  total_responses: number;
  reply_rate: number;
  meeting_rate: number;
  response_rate: number;
  success_rate: number;
  first_used: string;
  last_used: string;
}

