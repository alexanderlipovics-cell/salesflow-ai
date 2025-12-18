import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader, Upload, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const VoiceRecorder = ({
  onTranscription,
  onAnalysis,
  onCommandExecuted,
  onMeetingPrep,
  analyzeAfter = true,
  showUpload = true,
  className = ""
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const startRecording = async () => {
    try {
      setError(null);
      setRecordingTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        clearInterval(timerRef.current);
        await processAudio(blob, 'recording.webm');
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

    } catch (err) {
      console.error('Recording error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.');
      } else {
        setError('Mikrofon nicht verfügbar');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a'];
    if (!validTypes.some(t => file.type.includes(t.split('/')[1]))) {
      setError('Ungültiges Format. Erlaubt: MP3, M4A, OGG, WAV, WebM');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Datei zu groß. Max 25MB.');
      return;
    }

    await processAudio(file, file.name);
    e.target.value = '';
  };

  const processAudio = async (blob, filename) => {
    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', blob, filename);

    try {
      const endpoint = '/api/voice/command';
      let token = null;
      if (typeof window !== 'undefined') {
        // Debug: lokale Tokens prüfen
        try {
          console.log('All localStorage keys:', Object.keys(localStorage));
          console.log('access_token:', localStorage.getItem('access_token'));
          console.log('token:', localStorage.getItem('token'));
          console.log('salesflow_token:', localStorage.getItem('salesflow_token'));
        } catch {
          /* ignore */
        }

        token =
          localStorage.getItem('access_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('salesflow_token') ||
          localStorage.getItem('refresh_token');
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        const text = data.text || data.transcription;

        if (data.executed) {
          onCommandExecuted?.(data);
        } else if (data.intent === 'NORMAL_CHAT') {
          onTranscription?.(data.transcription || text);
        } else if (data.trigger_meeting_prep) {
          onMeetingPrep?.(data.command?.lead_name || text);
        } else if (analyzeAfter && data.analysis?.result) {
          onAnalysis?.(data.analysis, text);
        } else {
          onTranscription?.(text);
        }
      } else {
        setError(data.error || 'Transkription fehlgeschlagen');
      }

    } catch (err) {
      console.error('Processing error:', err);
      setError('Netzwerkfehler beim Verarbeiten');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`relative p-3 rounded-full transition-all duration-200 ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/50'
            : isProcessing
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-gray-700 hover:bg-gray-600'
        }`}
        title={isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}
      >
        {isProcessing ? (
          <Loader className="w-5 h-5 animate-spin text-white" />
        ) : isRecording ? (
          <MicOff className="w-5 h-5 text-white" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}

        {isRecording && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
        )}
      </button>

      {isRecording && (
        <span className="text-red-400 text-sm font-mono min-w-[50px]">
          {formatTime(recordingTime)}
        </span>
      )}

      {isProcessing && (
        <span className="text-blue-400 text-sm animate-pulse">
          Wird transkribiert...
        </span>
      )}

      {showUpload && !isRecording && !isProcessing && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Sprachnachricht hochladen"
          >
            <Upload className="w-5 h-5 text-gray-300" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.ogg,.wav,.webm"
            onChange={handleFileUpload}
            className="hidden"
          />
        </>
      )}

      {error && (
        <div className="flex items-center gap-1 text-red-400 text-sm">
          <X className="w-4 h-4" />
          <span className="max-w-[200px] truncate">{error}</span>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;

