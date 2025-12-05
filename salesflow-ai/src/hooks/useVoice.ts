/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - useVoice Hook                                                   ║
 * ║  Einfache Voice-Integration für alle Components                            ║
 * ║                                                                             ║
 * ║  Features:                                                                  ║
 * ║  - Speech-to-Text (Spracheingabe)                                          ║
 * ║  - Text-to-Speech (Vorlesen)                                               ║
 * ║  - Wake Word Detection ("Hey CHIEF")                                       ║
 * ║  - Voice Commands                                                           ║
 * ║  - Auto-Read für AI-Antworten                                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeaking,
  startListening,
  stopListening,
  isListening,
  isVoiceSupported,
  initVoices,
  handleVoiceCommand,
  setAutoRead,
  isAutoReadEnabled,
  autoReadMessage,
  SoundEffects,
  VOICE_CONFIG,
} from '../services/voiceService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type VoiceState = 'idle' | 'listening' | 'hearing' | 'processing' | 'speaking' | 'paused' | 'error';

export type ListeningMode = 'normal' | 'continuous' | 'wake-word' | 'command';

export interface VoiceCommand {
  action: string;
  phrase: string;
  transcript: string;
}

export interface WakeWordResult {
  detected: boolean;
  wakeWord?: string;
  followingText?: string;
}

export interface UseVoiceOptions {
  // Auto-Read aktivieren?
  autoRead?: boolean;
  // Callback wenn Wake Word erkannt
  onWakeWord?: (result: WakeWordResult) => void;
  // Callback für Voice Commands
  onCommand?: (command: VoiceCommand) => void;
  // Callback bei Fehlern
  onError?: (error: string) => void;
  // Navigation für Commands
  navigation?: any;
}

export interface UseVoiceReturn {
  // State
  voiceState: VoiceState;
  isSupported: { tts: boolean; stt: boolean; wakeWord: boolean };
  partialTranscript: string;
  autoReadEnabled: boolean;
  
  // STT Functions
  startRecording: (mode?: ListeningMode) => void;
  stopRecording: () => void;
  
  // TTS Functions
  speak: (text: string, priority?: 'normal' | 'high') => Promise<void>;
  stopSpeech: () => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  
  // Settings
  toggleAutoRead: () => void;
  setAutoReadEnabled: (enabled: boolean) => void;
  
  // Utilities
  playSound: (sound: keyof typeof SoundEffects) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    autoRead: initialAutoRead = false,
    onWakeWord,
    onCommand,
    onError,
    navigation,
  } = options;

  // State
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isSupported, setIsSupported] = useState({ tts: false, stt: false, wakeWord: false });
  const [partialTranscript, setPartialTranscript] = useState('');
  const [autoReadEnabled, setAutoReadEnabledState] = useState(initialAutoRead);
  
  // Refs
  const transcriptCallbackRef = useRef<((text: string, confidence: number) => void) | null>(null);
  
  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    // Check voice support
    const support = isVoiceSupported();
    setIsSupported(support);
    
    // Init voices for TTS
    if (support.tts) {
      initVoices();
    }
    
    // Set initial auto-read state
    setAutoRead(initialAutoRead);
    
    // Cleanup
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [initialAutoRead]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // COMMAND HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const handleCommand = useCallback((command: VoiceCommand) => {
    // External callback
    onCommand?.(command);
    
    // Built-in navigation commands
    if (navigation) {
      handleVoiceCommand(command, {
        onNewLead: () => navigation.navigate('Leads', { action: 'create' }),
        onOpenFollowups: () => navigation.navigate('FollowUps'),
        onObjectionHelp: () => navigation.navigate('Chat', { initialMessage: 'Hilf mir bei einem Einwand' }),
        onOpenDailyFlow: () => navigation.navigate('DailyFlow'),
        onStopListening: () => setVoiceState('idle'),
        onCancel: () => {
          setPartialTranscript('');
          setVoiceState('idle');
        },
      });
    }
  }, [navigation, onCommand]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // STT FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  
  const startRecording = useCallback((mode: ListeningMode = 'normal') => {
    if (!isSupported.stt) {
      onError?.('Spracherkennung nicht verfügbar');
      return;
    }
    
    setPartialTranscript('');
    
    const success = startListening({
      mode,
      onResult: (transcript: string, confidence: number) => {
        setPartialTranscript('');
        transcriptCallbackRef.current?.(transcript, confidence);
      },
      onPartialResult: (partial: string) => {
        setPartialTranscript(partial);
      },
      onCommand: handleCommand,
      onWakeWord: (result: WakeWordResult) => {
        onWakeWord?.(result);
      },
      onError: (error: string) => {
        setVoiceState('error');
        onError?.(error);
      },
      onEnd: () => {
        if (mode !== 'continuous' && mode !== 'wake-word') {
          setVoiceState('idle');
        }
      },
      onStateChange: (state: VoiceState) => {
        setVoiceState(state);
      },
    });
    
    if (!success) {
      onError?.('Spracherkennung konnte nicht gestartet werden');
    }
  }, [isSupported.stt, handleCommand, onWakeWord, onError]);
  
  const stopRecording = useCallback(() => {
    stopListening();
    setVoiceState('idle');
    setPartialTranscript('');
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // TTS FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  
  const speak = useCallback(async (text: string, priority: 'normal' | 'high' = 'normal') => {
    if (!isSupported.tts) {
      onError?.('Sprachausgabe nicht verfügbar');
      return;
    }
    
    try {
      await speakText(text, {
        priority,
        onStart: () => setVoiceState('speaking'),
        onEnd: () => setVoiceState('idle'),
        onPause: () => setVoiceState('paused'),
        onResume: () => setVoiceState('speaking'),
        onError: (error: string) => {
          setVoiceState('error');
          onError?.(error);
        },
      });
    } catch (error) {
      console.error('TTS Error:', error);
    }
  }, [isSupported.tts, onError]);
  
  const stopSpeech = useCallback(() => {
    stopSpeaking();
    setVoiceState('idle');
  }, []);
  
  const pauseSpeech = useCallback(() => {
    pauseSpeaking();
    setVoiceState('paused');
  }, []);
  
  const resumeSpeech = useCallback(() => {
    resumeSpeaking();
    setVoiceState('speaking');
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-READ
  // ─────────────────────────────────────────────────────────────────────────
  
  const toggleAutoRead = useCallback(() => {
    const newValue = !autoReadEnabled;
    setAutoReadEnabledState(newValue);
    setAutoRead(newValue);
  }, [autoReadEnabled]);
  
  const setAutoReadEnabledFunc = useCallback((enabled: boolean) => {
    setAutoReadEnabledState(enabled);
    setAutoRead(enabled);
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────
  
  const playSound = useCallback((sound: keyof typeof SoundEffects) => {
    SoundEffects[sound]?.();
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────
  
  return {
    // State
    voiceState,
    isSupported,
    partialTranscript,
    autoReadEnabled,
    
    // STT Functions
    startRecording,
    stopRecording,
    
    // TTS Functions
    speak,
    stopSpeech,
    pauseSpeech,
    resumeSpeech,
    
    // Settings
    toggleAutoRead,
    setAutoReadEnabled: setAutoReadEnabledFunc,
    
    // Utilities
    playSound,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE HOOK FOR TRANSCRIPT
// ═══════════════════════════════════════════════════════════════════════════

export interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  autoSend?: boolean;
}

export function useVoiceInput(options: UseVoiceInputOptions) {
  const { onTranscript, autoSend = false } = options;
  const voice = useVoice();
  
  // Callback für Transkript setzen
  useEffect(() => {
    // Direkte Verbindung über Ref - vorerst nicht implementiert
    // da der voiceService die Callbacks direkt bekommt
  }, [onTranscript]);
  
  const startVoiceInput = useCallback(() => {
    voice.startRecording('normal');
  }, [voice]);
  
  const stopVoiceInput = useCallback(() => {
    voice.stopRecording();
  }, [voice]);
  
  return {
    ...voice,
    startVoiceInput,
    stopVoiceInput,
    isRecording: voice.voiceState === 'listening' || voice.voiceState === 'hearing',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default useVoice;
