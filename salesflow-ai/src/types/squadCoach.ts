// types/squadCoach.ts

export interface CoachingAction {
  target_type: 'member' | 'squad';
  target_name: string;
  reason: string;
  suggested_action: string;
  tone_hint?: 'empathisch' | 'klar' | 'motiviert' | 'fordernd' | 'ermutigend' | null;
}

export interface SuggestedMessages {
  to_squad: string;
  to_underperformer_template: string;
  to_top_performer_template: string;
}

export interface SquadCoachResponse {
  summary: string;
  highlights: string[];
  risks: string[];
  priorities: string[];
  coaching_actions: CoachingAction[];
  celebrations: string[];
  suggested_messages: SuggestedMessages;
  
  // Metadata (if backend provides it)
  cached?: boolean;
  generated_at?: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

