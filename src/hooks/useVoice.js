/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  VOICE HOOK - Speech-to-Text & Text-to-Speech                              ║
 * ║  Uses Web Speech API (Browser native)                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Check browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;

export const useVoice = (options = {}) => {
  const {
    language = 'de-DE',
    continuous = false,
    interimResults = true,
    onResult = () => {},
    onError = () => {},
  } = options;

  // Speech-to-Text State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Text-to-Speech State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  // Browser Support Check
  const isSupported = !!SpeechRecognition;
  const isTTSSupported = !!speechSynthesis;

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        onResult(finalTranscript);
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      onError(event.error);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, interimResults, onResult, onError, isSupported]);

  // Start Listening
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      console.warn('Speech recognition not supported');
      return;
    }

    setTranscript('');
    setInterimTranscript('');
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      // Already started
      console.warn('Recognition already started');
    }
  }, [isSupported]);

  // Stop Listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Toggle Listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Text-to-Speech: Speak text
  const speak = useCallback((text, options = {}) => {
    if (!isTTSSupported) {
      console.warn('Text-to-speech not supported');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || language;
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // Get German voice if available
    const voices = speechSynthesis.getVoices();
    const germanVoice = voices.find(v => v.lang.startsWith('de')) || voices[0];
    if (germanVoice) {
      utterance.voice = germanVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [language, isTTSSupported]);

  // Stop Speaking
  const stopSpeaking = useCallback(() => {
    if (isTTSSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isTTSSupported]);

  return {
    // Speech-to-Text
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    isSupported,

    // Text-to-Speech
    isSpeaking,
    speak,
    stopSpeaking,
    isTTSSupported,
  };
};

export default useVoice;

