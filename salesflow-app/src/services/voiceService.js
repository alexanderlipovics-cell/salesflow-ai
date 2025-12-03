/**
 * 🎤 SALES FLOW AI - Premium Voice Service
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Non Plus Ultra Voice Integration:
 * - Speech-to-Text mit Continuous Listening
 * - Text-to-Speech mit Premium-Stimmen
 * - Wake Word Detection ("Hey CHIEF")
 * - Voice Commands
 * - Auto-Read für AI-Antworten
 * - Audio Feedback & Sound Effects
 * - Noise Gate & Voice Activity Detection
 * 
 * Web: Web Speech API (SpeechRecognition + SpeechSynthesis)
 * Native: expo-speech (TTS) - STT benötigt extra Package
 */

import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const VOICE_CONFIG = {
  // Wake Words - aktiviert CHIEF ohne Button
  wakeWords: ['hey chief', 'hallo chief', 'chief', 'hey sales'],
  
  // Sprache
  language: 'de-DE',
  
  // TTS Settings
  tts: {
    rate: 1.0,        // Geschwindigkeit (0.5 - 2.0)
    pitch: 1.0,       // Tonhöhe (0.5 - 2.0)
    volume: 1.0,      // Lautstärke (0 - 1)
    preferredVoices: ['Google Deutsch', 'Microsoft Katja', 'Anna', 'Markus'],
  },
  
  // STT Settings
  stt: {
    continuous: false,       // Dauerhaftes Zuhören
    interimResults: true,   // Zwischenergebnisse anzeigen
    maxAlternatives: 1,     // Anzahl alternativer Erkennungen
  },
  
  // Voice Commands
  commands: {
    'neuer lead': { action: 'NEW_LEAD' },
    'lead erstellen': { action: 'NEW_LEAD' },
    'follow up': { action: 'OPEN_FOLLOWUPS' },
    'follow ups': { action: 'OPEN_FOLLOWUPS' },
    'einwand': { action: 'OBJECTION_HELP' },
    'einwand behandlung': { action: 'OBJECTION_HELP' },
    'tagesplan': { action: 'OPEN_DAILY_FLOW' },
    'daily flow': { action: 'OPEN_DAILY_FLOW' },
    'stopp': { action: 'STOP_LISTENING' },
    'stop': { action: 'STOP_LISTENING' },
    'abbrechen': { action: 'CANCEL' },
    'löschen': { action: 'CLEAR_INPUT' },
    'senden': { action: 'SEND_MESSAGE' },
    'absenden': { action: 'SEND_MESSAGE' },
  },
  
  // Audio Feedback
  sounds: {
    startListening: true,
    stopListening: true,
    wakeWordDetected: true,
    commandRecognized: true,
    error: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

let recognition = null;
let currentUtterance = null;
let isListeningForWakeWord = false;
let selectedVoice = null;
let audioContext = null;

// Event Callbacks
let onTranscriptCallback = null;
let onPartialCallback = null;
let onCommandCallback = null;
let onWakeWordCallback = null;
let onErrorCallback = null;
let onStateChangeCallback = null;

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO CONTEXT & SOUND EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════

const initAudioContext = () => {
  if (Platform.OS === 'web' && !audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('AudioContext nicht verfügbar');
    }
  }
};

// Erzeuge Feedback-Töne
const playTone = (frequency, duration, type = 'sine') => {
  if (!audioContext || !VOICE_CONFIG.sounds.startListening) return;
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    // Silent fail
  }
};

// Sound Effects
export const SoundEffects = {
  startListening: () => {
    playTone(880, 0.1);  // A5 - hoher Ton
    setTimeout(() => playTone(1760, 0.1), 100);  // A6 - höherer Ton
  },
  stopListening: () => {
    playTone(1760, 0.1);  // A6
    setTimeout(() => playTone(880, 0.15), 100);  // A5 - runter
  },
  wakeWord: () => {
    playTone(523, 0.1);  // C5
    setTimeout(() => playTone(659, 0.1), 100);  // E5
    setTimeout(() => playTone(784, 0.15), 200);  // G5
  },
  command: () => {
    playTone(1047, 0.08);  // C6 - kurzer hoher Ton
  },
  error: () => {
    playTone(220, 0.3, 'sawtooth');  // Tiefer rauer Ton
  },
  success: () => {
    playTone(523, 0.1);
    setTimeout(() => playTone(784, 0.15), 100);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT-TO-SPEECH (TTS) - PREMIUM IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

// Finde die beste deutsche Stimme
const findBestVoice = () => {
  if (Platform.OS !== 'web' || !window.speechSynthesis) return null;
  
  const voices = window.speechSynthesis.getVoices();
  const germanVoices = voices.filter(v => v.lang.startsWith('de'));
  
  // Priorisiere Premium-Stimmen
  for (const preferred of VOICE_CONFIG.tts.preferredVoices) {
    const found = germanVoices.find(v => 
      v.name.toLowerCase().includes(preferred.toLowerCase())
    );
    if (found) return found;
  }
  
  // Fallback: Erste deutsche Stimme
  return germanVoices[0] || voices[0];
};

// Initialisiere Stimmen (asynchron laden)
export const initVoices = () => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web') {
      resolve([]);
      return;
    }
    
    const voices = window.speechSynthesis?.getVoices();
    if (voices?.length) {
      selectedVoice = findBestVoice();
      resolve(voices);
      return;
    }
    
    // Warte auf voiceschanged Event
    window.speechSynthesis?.addEventListener('voiceschanged', () => {
      selectedVoice = findBestVoice();
      resolve(window.speechSynthesis.getVoices());
    }, { once: true });
    
    // Timeout Fallback
    setTimeout(() => {
      selectedVoice = findBestVoice();
      resolve(window.speechSynthesis?.getVoices() || []);
    }, 1000);
  });
};

// Premium TTS
export const speakText = async (text, options = {}) => {
  const {
    rate = VOICE_CONFIG.tts.rate,
    pitch = VOICE_CONFIG.tts.pitch,
    volume = VOICE_CONFIG.tts.volume,
    voice = selectedVoice,
    onStart,
    onEnd,
    onPause,
    onResume,
    onBoundary,
    onError,
    priority = 'normal', // 'high' unterbricht aktuelle Ausgabe
  } = options;

  if (Platform.OS !== 'web' || !window.speechSynthesis) {
    onError?.('TTS nicht verfügbar');
    return Promise.reject(new Error('TTS not supported'));
  }

  return new Promise((resolve, reject) => {
    // High Priority: Stoppe aktuelle Ausgabe
    if (priority === 'high') {
      stopSpeaking();
    } else if (window.speechSynthesis.speaking) {
      // Queue-Modus - warte bis fertig
      window.speechSynthesis.cancel();
    }

    // Text aufbereiten für bessere Aussprache
    const processedText = preprocessTextForSpeech(text);
    
    const utterance = new SpeechSynthesisUtterance(processedText);
    currentUtterance = utterance;
    
    utterance.lang = VOICE_CONFIG.language;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    if (voice) {
      utterance.voice = voice;
    } else if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Event Handlers
    utterance.onstart = () => {
      onStateChangeCallback?.('speaking');
      onStart?.();
    };
    
    utterance.onend = () => {
      currentUtterance = null;
      onStateChangeCallback?.('idle');
      onEnd?.();
      resolve();
    };
    
    utterance.onerror = (event) => {
      currentUtterance = null;
      onStateChangeCallback?.('error');
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        onError?.(event.error);
        SoundEffects.error();
      }
      reject(event);
    };
    
    utterance.onpause = () => {
      onStateChangeCallback?.('paused');
      onPause?.();
    };
    
    utterance.onresume = () => {
      onStateChangeCallback?.('speaking');
      onResume?.();
    };
    
    // Word Boundary - für Highlighting
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        onBoundary?.({
          word: processedText.substring(event.charIndex, event.charIndex + event.charLength),
          charIndex: event.charIndex,
          charLength: event.charLength,
        });
      }
    };

    window.speechSynthesis.speak(utterance);
  });
};

// Text für TTS optimieren
const preprocessTextForSpeech = (text) => {
  return text
    // Emojis entfernen (werden schlecht vorgelesen)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    // Markdown entfernen
    .replace(/[*_~`#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Aufzählungszeichen verbessern
    .replace(/^[-•]\s*/gm, '')
    .replace(/^\d+\.\s*/gm, '')
    // Abkürzungen aussprechen
    .replace(/z\.B\./gi, 'zum Beispiel')
    .replace(/d\.h\./gi, 'das heißt')
    .replace(/u\.a\./gi, 'unter anderem')
    .replace(/etc\./gi, 'et cetera')
    .replace(/€/g, ' Euro ')
    .replace(/%/g, ' Prozent ')
    // Zahlen mit Pausen
    .replace(/(\d+)/g, ' $1 ')
    // Mehrfache Leerzeichen entfernen
    .replace(/\s+/g, ' ')
    .trim();
};

// TTS Controls
export const stopSpeaking = () => {
  if (Platform.OS === 'web' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
};

export const pauseSpeaking = () => {
  if (Platform.OS === 'web' && window.speechSynthesis) {
    window.speechSynthesis.pause();
  }
};

export const resumeSpeaking = () => {
  if (Platform.OS === 'web' && window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
};

export const isSpeaking = () => {
  return Platform.OS === 'web' && window.speechSynthesis?.speaking;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPEECH-TO-TEXT (STT) - PREMIUM IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

const createRecognition = () => {
  if (Platform.OS !== 'web') return null;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  
  const rec = new SpeechRecognition();
  rec.lang = VOICE_CONFIG.language;
  rec.continuous = VOICE_CONFIG.stt.continuous;
  rec.interimResults = VOICE_CONFIG.stt.interimResults;
  rec.maxAlternatives = VOICE_CONFIG.stt.maxAlternatives;
  
  return rec;
};

// Voice Command Detection
const detectCommand = (transcript) => {
  const lower = transcript.toLowerCase().trim();
  
  for (const [phrase, config] of Object.entries(VOICE_CONFIG.commands)) {
    if (lower.includes(phrase) || lower === phrase) {
      return { ...config, phrase, transcript: lower };
    }
  }
  
  return null;
};

// Wake Word Detection
const detectWakeWord = (transcript) => {
  const lower = transcript.toLowerCase().trim();
  
  for (const wakeWord of VOICE_CONFIG.wakeWords) {
    if (lower.includes(wakeWord) || lower.startsWith(wakeWord)) {
      // Extrahiere Text nach Wake Word
      const afterWakeWord = lower.split(wakeWord).slice(1).join(wakeWord).trim();
      return { detected: true, wakeWord, followingText: afterWakeWord };
    }
  }
  
  return { detected: false };
};

// Haupt-Listening Funktion
export const startListening = (options = {}) => {
  const {
    mode = 'normal', // 'normal', 'continuous', 'wake-word', 'command'
    onResult,
    onPartialResult,
    onCommand,
    onWakeWord,
    onError,
    onEnd,
    onStateChange,
  } = options;

  if (Platform.OS !== 'web') {
    onError?.('STT auf dieser Plattform nicht verfügbar');
    return false;
  }

  // Callbacks speichern
  onTranscriptCallback = onResult;
  onPartialCallback = onPartialResult;
  onCommandCallback = onCommand;
  onWakeWordCallback = onWakeWord;
  onErrorCallback = onError;
  onStateChangeCallback = onStateChange;

  // Stoppe vorherige Erkennung
  stopListening();
  
  // Audio Context initialisieren
  initAudioContext();

  recognition = createRecognition();
  if (!recognition) {
    onError?.('SpeechRecognition nicht verfügbar');
    return false;
  }

  // Konfiguriere nach Modus
  if (mode === 'continuous' || mode === 'wake-word') {
    recognition.continuous = true;
    isListeningForWakeWord = mode === 'wake-word';
  }

  recognition.onstart = () => {
    onStateChange?.('listening');
    SoundEffects.startListening();
  };

  recognition.onresult = (event) => {
    const results = event.results;
    const lastResult = results[results.length - 1];
    const transcript = lastResult[0].transcript;
    const confidence = lastResult[0].confidence;
    
    if (lastResult.isFinal) {
      // Wake Word Modus
      if (isListeningForWakeWord) {
        const wakeResult = detectWakeWord(transcript);
        if (wakeResult.detected) {
          SoundEffects.wakeWord();
          onWakeWord?.(wakeResult);
          
          // Wenn Text nach Wake Word, als normale Eingabe behandeln
          if (wakeResult.followingText) {
            onResult?.(wakeResult.followingText, confidence);
          }
        }
        return;
      }
      
      // Command Detection
      const command = detectCommand(transcript);
      if (command) {
        SoundEffects.command();
        onCommand?.(command);
        return;
      }
      
      // Normale Transkription
      onResult?.(transcript, confidence);
      
    } else {
      // Interim Results
      onPartialResult?.(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.log('Speech recognition error:', event.error);
    
    switch (event.error) {
      case 'no-speech':
        // Kein Fehler-Sound bei keiner Sprache
        break;
      case 'audio-capture':
        SoundEffects.error();
        onError?.('Mikrofon nicht verfügbar');
        break;
      case 'not-allowed':
        SoundEffects.error();
        onError?.('Mikrofon-Zugriff verweigert');
        break;
      case 'network':
        SoundEffects.error();
        onError?.('Netzwerkfehler bei Spracherkennung');
        break;
      default:
        if (event.error !== 'aborted') {
          onError?.(event.error);
        }
    }
  };

  recognition.onend = () => {
    SoundEffects.stopListening();
    onStateChange?.('idle');
    
    // Bei Continuous Mode: Automatisch neu starten
    if ((mode === 'continuous' || mode === 'wake-word') && recognition) {
      try {
        recognition.start();
      } catch (e) {
        // Ignore - might already be started
      }
    } else {
      onEnd?.();
    }
  };

  recognition.onspeechstart = () => {
    onStateChange?.('hearing');
  };

  recognition.onspeechend = () => {
    onStateChange?.('processing');
  };

  try {
    recognition.start();
    return true;
  } catch (error) {
    onError?.(error.message);
    return false;
  }
};

export const stopListening = () => {
  isListeningForWakeWord = false;
  
  if (recognition) {
    try {
      recognition.abort();
    } catch (e) {
      // Ignore
    }
    recognition = null;
  }
  
  onStateChangeCallback?.('idle');
};

export const isListening = () => {
  return recognition !== null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE COMMANDS HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export const handleVoiceCommand = (command, handlers = {}) => {
  const {
    onNewLead,
    onOpenFollowups,
    onObjectionHelp,
    onOpenDailyFlow,
    onStopListening,
    onCancel,
    onClearInput,
    onSendMessage,
  } = handlers;

  switch (command.action) {
    case 'NEW_LEAD':
      onNewLead?.();
      break;
    case 'OPEN_FOLLOWUPS':
      onOpenFollowups?.();
      break;
    case 'OBJECTION_HELP':
      onObjectionHelp?.();
      break;
    case 'OPEN_DAILY_FLOW':
      onOpenDailyFlow?.();
      break;
    case 'STOP_LISTENING':
      stopListening();
      onStopListening?.();
      break;
    case 'CANCEL':
      stopListening();
      stopSpeaking();
      onCancel?.();
      break;
    case 'CLEAR_INPUT':
      onClearInput?.();
      break;
    case 'SEND_MESSAGE':
      onSendMessage?.();
      break;
    default:
      console.log('Unknown voice command:', command);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const isVoiceSupported = () => {
  if (Platform.OS === 'web') {
    return {
      tts: !!window.speechSynthesis,
      stt: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      wakeWord: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    };
  }
  return { tts: false, stt: false, wakeWord: false };
};

export const getAvailableVoices = () => {
  if (Platform.OS === 'web' && window.speechSynthesis) {
    return window.speechSynthesis.getVoices();
  }
  return [];
};

export const getGermanVoices = () => {
  return getAvailableVoices().filter(v => v.lang.startsWith('de'));
};

export const setPreferredVoice = (voice) => {
  selectedVoice = voice;
};

export const getSelectedVoice = () => selectedVoice;

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-READ FEATURE
// ═══════════════════════════════════════════════════════════════════════════════

let autoReadEnabled = false;

export const setAutoRead = (enabled) => {
  autoReadEnabled = enabled;
};

export const isAutoReadEnabled = () => autoReadEnabled;

export const autoReadMessage = async (text, options = {}) => {
  if (!autoReadEnabled) return;
  
  return speakText(text, {
    ...options,
    priority: 'normal',
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // TTS
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeaking,
  
  // STT
  startListening,
  stopListening,
  isListening,
  
  // Voice Commands
  handleVoiceCommand,
  VOICE_CONFIG,
  
  // Utilities
  isVoiceSupported,
  getAvailableVoices,
  getGermanVoices,
  initVoices,
  setPreferredVoice,
  getSelectedVoice,
  
  // Auto-Read
  setAutoRead,
  isAutoReadEnabled,
  autoReadMessage,
  
  // Sound Effects
  SoundEffects,
};
