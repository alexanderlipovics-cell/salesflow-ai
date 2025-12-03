/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  VOICE API                                                                 ║
 * ║  API Functions für Voice Input/Output & Speech                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration_seconds: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface SpeechSynthesisRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

export interface SpeechSynthesisResult {
  audio_url: string;
  duration_seconds: number;
  format: string;
}

export interface VoiceNote {
  id: string;
  transcription: string;
  duration_seconds: number;
  audio_url: string | null;
  created_at: string;
  lead_id: string | null;
  context: string | null;
}

export interface VoiceCommand {
  command: string;
  action: string;
  parameters: Record<string, unknown>;
  confidence: number;
}

// =============================================================================
// HELPER
// =============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Nicht authentifiziert');
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// =============================================================================
// TRANSCRIPTION
// =============================================================================

/**
 * Transkribiert Audio zu Text.
 */
export async function transcribe(
  audioFile: File | Blob,
  options?: {
    language?: string;
    includeWords?: boolean;
  }
): Promise<TranscriptionResult> {
  const headers = await getAuthHeaders();
  
  const formData = new FormData();
  formData.append('file', audioFile);
  if (options?.language) formData.append('language', options.language);
  if (options?.includeWords) formData.append('include_words', 'true');
  
  const response = await fetch(`${API_BASE_URL}/voice/transcribe`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Transkription fehlgeschlagen' }));
    throw new Error(error.detail);
  }
  
  return response.json();
}

/**
 * Transkribiert Audio von URL.
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options?: {
    language?: string;
    includeWords?: boolean;
  }
): Promise<TranscriptionResult> {
  return apiRequest<TranscriptionResult>('/voice/transcribe/url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language: options?.language,
      include_words: options?.includeWords,
    }),
  });
}

// =============================================================================
// SPEECH SYNTHESIS (TTS)
// =============================================================================

/**
 * Konvertiert Text zu Sprache.
 */
export async function synthesize(
  request: SpeechSynthesisRequest
): Promise<SpeechSynthesisResult> {
  return apiRequest<SpeechSynthesisResult>('/voice/synthesize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

/**
 * Holt verfügbare Stimmen.
 */
export async function getVoices(language?: string): Promise<Array<{
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  preview_url: string | null;
}>> {
  const params = language ? `?language=${language}` : '';
  return apiRequest(`/voice/voices${params}`);
}

// =============================================================================
// VOICE NOTES
// =============================================================================

/**
 * Speichert eine Voice Note.
 */
export async function saveVoiceNote(
  audioFile: File | Blob,
  options?: {
    leadId?: string;
    context?: string;
    autoTranscribe?: boolean;
  }
): Promise<VoiceNote> {
  const headers = await getAuthHeaders();
  
  const formData = new FormData();
  formData.append('file', audioFile);
  if (options?.leadId) formData.append('lead_id', options.leadId);
  if (options?.context) formData.append('context', options.context);
  if (options?.autoTranscribe !== false) formData.append('auto_transcribe', 'true');
  
  const response = await fetch(`${API_BASE_URL}/voice/notes`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Speichern fehlgeschlagen' }));
    throw new Error(error.detail);
  }
  
  return response.json();
}

/**
 * Holt Voice Notes.
 */
export async function getVoiceNotes(options?: {
  leadId?: string;
  limit?: number;
}): Promise<VoiceNote[]> {
  const params = new URLSearchParams();
  if (options?.leadId) params.append('lead_id', options.leadId);
  if (options?.limit) params.append('limit', options.limit.toString());
  
  const queryString = params.toString();
  return apiRequest<VoiceNote[]>(`/voice/notes${queryString ? `?${queryString}` : ''}`);
}

/**
 * Löscht eine Voice Note.
 */
export async function deleteVoiceNote(noteId: string): Promise<{ success: boolean }> {
  return apiRequest(`/voice/notes/${noteId}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// VOICE COMMANDS
// =============================================================================

/**
 * Verarbeitet einen Voice Command.
 */
export async function processCommand(
  audioFile: File | Blob
): Promise<VoiceCommand> {
  const headers = await getAuthHeaders();
  
  const formData = new FormData();
  formData.append('file', audioFile);
  
  const response = await fetch(`${API_BASE_URL}/voice/command`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Command fehlgeschlagen' }));
    throw new Error(error.detail);
  }
  
  return response.json();
}

/**
 * Verarbeitet einen Text-Command.
 */
export async function processTextCommand(text: string): Promise<VoiceCommand> {
  return apiRequest<VoiceCommand>('/voice/command/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const voiceApi = {
  // Transcription
  transcribe,
  transcribeFromUrl,
  
  // Speech Synthesis
  synthesize,
  getVoices,
  
  // Voice Notes
  saveVoiceNote,
  getVoiceNotes,
  deleteVoiceNote,
  
  // Voice Commands
  processCommand,
  processTextCommand,
};

export default voiceApi;

