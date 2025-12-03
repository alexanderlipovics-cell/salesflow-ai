/**
 * Types für Voice In/Out
 */

export interface VoiceInRequestMeta {
  leadId?: string | null;
  channel?: string | null;
  languageHint?: string | null;
  context?: string | null;
}

export interface SuggestedVoiceReply {
  label: string;
  message: string;
  tone?: string | null;
  bestFor?: string | null;
}

export interface VoiceInAnalysis {
  transcript: string;
  transcriptConfidence?: number | null;
  summary: string;
  intent: string;
  sentiment: string;
  urgency?: string | null;
  keyPoints: string[];
  questionsAsked: string[];
  objections: string[];
  actionItems: string[];
  durationSeconds?: number | null;
  languageDetected?: string | null;
}

export interface VoiceInResponse {
  analysis: VoiceInAnalysis;
  suggestedReplies: SuggestedVoiceReply[];
  recommendedIndex: number;
  recommendedAction?: string | null;
}

export interface VoiceOutRequest {
  text: string;
  language?: string;
  voiceId?: string;
  speed?: number;
  format?: "mp3" | "wav" | "ogg";
}

export interface VoiceOutResponse {
  audioUrl: string;
  durationSeconds?: number | null;
  format: string;
  expiresAt?: string | null;
}

