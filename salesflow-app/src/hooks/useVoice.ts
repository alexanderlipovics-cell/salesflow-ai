/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useVoice Hook                                                             ║
 * ║  React Hook für Voice Input/Output & Speech                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback } from 'react';
import { 
  voiceApi, 
  TranscriptionResult,
  SpeechSynthesisResult,
  VoiceNote,
  VoiceCommand,
} from '../api/voice';

export interface UseVoiceReturn {
  // State
  transcription: TranscriptionResult | null;
  synthesizedAudio: SpeechSynthesisResult | null;
  voiceNotes: VoiceNote[];
  lastCommand: VoiceCommand | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  transcribe: (audioFile: File | Blob, options?: { language?: string }) => Promise<TranscriptionResult>;
  synthesize: (text: string, options?: { voice?: string; language?: string; speed?: number }) => Promise<SpeechSynthesisResult>;
  saveVoiceNote: (audioFile: File | Blob, options?: { leadId?: string; context?: string }) => Promise<VoiceNote>;
  loadVoiceNotes: (leadId?: string) => Promise<void>;
  deleteVoiceNote: (noteId: string) => Promise<void>;
  processCommand: (audioFile: File | Blob) => Promise<VoiceCommand>;
  processTextCommand: (text: string) => Promise<VoiceCommand>;
  clearTranscription: () => void;
}

export function useVoice(): UseVoiceReturn {
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [synthesizedAudio, setSynthesizedAudio] = useState<SpeechSynthesisResult | null>(null);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transcribe
  const transcribe = useCallback(async (audioFile: File | Blob, options?: { language?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await voiceApi.transcribe(audioFile, options);
      setTranscription(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transkription fehlgeschlagen');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Synthesize
  const synthesize = useCallback(async (text: string, options?: { voice?: string; language?: string; speed?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await voiceApi.synthesize({
        text,
        voice: options?.voice,
        language: options?.language,
        speed: options?.speed,
      });
      setSynthesizedAudio(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthese fehlgeschlagen');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save Voice Note
  const saveVoiceNote = useCallback(async (audioFile: File | Blob, options?: { leadId?: string; context?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const note = await voiceApi.saveVoiceNote(audioFile, options);
      setVoiceNotes(prev => [note, ...prev]);
      return note;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Voice Notes
  const loadVoiceNotes = useCallback(async (leadId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const notes = await voiceApi.getVoiceNotes({ leadId });
      setVoiceNotes(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete Voice Note
  const deleteVoiceNote = useCallback(async (noteId: string) => {
    try {
      await voiceApi.deleteVoiceNote(noteId);
      setVoiceNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
    }
  }, []);

  // Process Command (Audio)
  const processCommand = useCallback(async (audioFile: File | Blob) => {
    setLoading(true);
    setError(null);
    try {
      const command = await voiceApi.processCommand(audioFile);
      setLastCommand(command);
      return command;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Command fehlgeschlagen');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Process Text Command
  const processTextCommand = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const command = await voiceApi.processTextCommand(text);
      setLastCommand(command);
      return command;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Command fehlgeschlagen');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear Transcription
  const clearTranscription = useCallback(() => {
    setTranscription(null);
  }, []);

  return {
    transcription,
    synthesizedAudio,
    voiceNotes,
    lastCommand,
    loading,
    error,
    transcribe,
    synthesize,
    saveVoiceNote,
    loadVoiceNotes,
    deleteVoiceNote,
    processCommand,
    processTextCommand,
    clearTranscription,
  };
}

export default useVoice;

