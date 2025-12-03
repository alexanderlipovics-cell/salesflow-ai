# backend/app/services/voice_service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  VOICE SERVICE                                                             ║
║  Speech-to-Text (Whisper) und Text-to-Speech (ElevenLabs/OpenAI)           ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Voice-In: Whisper Transkription + AI-Analyse
- Voice-Out: ElevenLabs oder OpenAI TTS
- Storage: Supabase Storage für Audio-Dateien
"""

import httpx
import uuid
from typing import Optional, List, Literal
from dataclasses import dataclass, field
from datetime import datetime

from ..core.config import settings
from .llm_client import get_llm_client


# ═══════════════════════════════════════════════════════════════════════════
# TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class TranscriptionResult:
    """Ergebnis der Whisper-Transkription."""
    text: str
    language: str = "de"
    duration_seconds: int = 0
    confidence: float = 0.9


@dataclass
class VoiceAnalysis:
    """AI-Analyse einer Sprachnachricht."""
    summary: str
    intent: str
    sentiment: Literal["positive", "neutral", "negative", "mixed"]
    urgency: Literal["high", "medium", "low"]
    key_points: List[str] = field(default_factory=list)
    objections: List[str] = field(default_factory=list)
    questions: List[str] = field(default_factory=list)
    action_items: List[str] = field(default_factory=list)


@dataclass
class SuggestedReply:
    """Antwort-Vorschlag für eine Sprachnachricht."""
    label: str
    message: str
    tone: str = "locker"
    estimated_duration: int = 0


@dataclass
class TTSResult:
    """Ergebnis der Text-to-Speech Generierung."""
    audio_bytes: bytes
    audio_format: str = "mp3"
    duration_seconds: int = 0
    voice_id: str = ""


# ═══════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPTS
# ═══════════════════════════════════════════════════════════════════════════

VOICE_ANALYSIS_PROMPT = """Du analysierst das Transkript einer Sprachnachricht und gibst strukturiertes JSON zurück.

WICHTIG: Gib NUR valides JSON aus, keine Erklärungen davor oder danach.

AUSGABE FORMAT:
{
  "summary": "2-3 Sätze Zusammenfassung der Kernaussage",
  "intent": "hat_fragen|will_kaufen|ist_unsicher|beschwert_sich|informiert|neutral",
  "sentiment": "positive|neutral|negative|mixed",
  "urgency": "high|medium|low",
  "key_points": ["Wichtiger Punkt 1", "Wichtiger Punkt 2"],
  "objections": ["Einwand 1", "Einwand 2"],
  "questions": ["Frage die gestellt wurde"],
  "action_items": ["Was der Sender will/erwartet"],
  "suggested_replies": [
    {
      "label": "Empfohlen",
      "message": "Konkrete Antwort-Nachricht, locker formuliert",
      "tone": "locker|professionell|empathisch|direkt"
    },
    {
      "label": "Kurz",
      "message": "Kürzere Alternative",
      "tone": "direkt"
    }
  ]
}

REGELN:
- Fasse die Kernaussage prägnant zusammen
- Erkenne Stimmung und Dringlichkeit
- Schlage 2-3 konkrete Antwort-Vorschläge vor
- Antworten sollen copy-paste-fähig sein
- Ton: locker, freundlich, mit 1-2 Emojis"""


# ═══════════════════════════════════════════════════════════════════════════
# VOICE SERVICE
# ═══════════════════════════════════════════════════════════════════════════

class VoiceService:
    """
    Service für Sprachnachrichten-Verarbeitung.
    
    Features:
    - transcribe(): Whisper STT
    - analyze(): AI-Analyse des Transkripts
    - generate_tts(): Text-to-Speech
    """
    
    def __init__(self):
        self.llm_client = get_llm_client()
    
    # ─────────────────────────────────────────────────────────────────────
    # SPEECH-TO-TEXT (Whisper)
    # ─────────────────────────────────────────────────────────────────────
    
    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.mp3",
        language: str = "de",
    ) -> TranscriptionResult:
        """
        Transkribiert Audio mit OpenAI Whisper.
        
        Args:
            audio_bytes: Die Audio-Daten als Bytes
            filename: Name der Datei (für Content-Type Erkennung)
            language: Sprachhinweis (de, en, etc.)
            
        Returns:
            TranscriptionResult mit Transkript
        """
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY nicht konfiguriert")
        
        # Content-Type aus Filename ableiten
        content_type = self._get_audio_content_type(filename)
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                },
                files={
                    "file": (filename, audio_bytes, content_type),
                },
                data={
                    "model": settings.WHISPER_MODEL,
                    "language": language,
                    "response_format": "verbose_json",
                },
            )
            
            if response.status_code != 200:
                raise Exception(f"Whisper API error ({response.status_code}): {response.text}")
            
            data = response.json()
            
            return TranscriptionResult(
                text=data.get("text", ""),
                language=data.get("language", language),
                duration_seconds=int(data.get("duration", 0)),
                confidence=0.9,  # Whisper gibt keine Confidence zurück
            )
    
    def _get_audio_content_type(self, filename: str) -> str:
        """Ermittelt Content-Type aus Dateiname."""
        ext = filename.lower().split('.')[-1] if '.' in filename else 'mp3'
        types = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'm4a': 'audio/m4a',
            'ogg': 'audio/ogg',
            'webm': 'audio/webm',
            'flac': 'audio/flac',
        }
        return types.get(ext, 'audio/mpeg')
    
    # ─────────────────────────────────────────────────────────────────────
    # AI-ANALYSE
    # ─────────────────────────────────────────────────────────────────────
    
    async def analyze(
        self,
        transcript: str,
        context: Optional[str] = None,
    ) -> tuple[VoiceAnalysis, List[SuggestedReply]]:
        """
        Analysiert ein Transkript mit AI und generiert Antwort-Vorschläge.
        
        Args:
            transcript: Das Transkript der Sprachnachricht
            context: Optionaler Kontext (Lead-Info, etc.)
            
        Returns:
            Tuple aus (VoiceAnalysis, List[SuggestedReply])
        """
        user_prompt = f"Analysiere dieses Transkript einer Sprachnachricht:\n\n{transcript}"
        
        if context:
            user_prompt += f"\n\nKontext: {context}"
        
        response = await self.llm_client.chat(
            messages=[
                {"role": "system", "content": VOICE_ANALYSIS_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=1500,
        )
        
        # JSON parsen
        import re
        import json
        
        text = response.strip()
        text = re.sub(r'^```json?\n?', '', text)
        text = re.sub(r'\n?```$', '', text)
        
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Fallback bei Parse-Fehler
            return self._fallback_analysis(transcript)
        
        analysis = VoiceAnalysis(
            summary=data.get("summary", ""),
            intent=data.get("intent", "neutral"),
            sentiment=data.get("sentiment", "neutral"),
            urgency=data.get("urgency", "medium"),
            key_points=data.get("key_points", []),
            objections=data.get("objections", []),
            questions=data.get("questions", []),
            action_items=data.get("action_items", []),
        )
        
        replies = []
        for r in data.get("suggested_replies", []):
            replies.append(SuggestedReply(
                label=r.get("label", "Antwort"),
                message=r.get("message", ""),
                tone=r.get("tone", "locker"),
                estimated_duration=len(r.get("message", "").split()) // 3,  # ~3 Wörter/Sekunde
            ))
        
        return analysis, replies
    
    def _fallback_analysis(self, transcript: str) -> tuple[VoiceAnalysis, List[SuggestedReply]]:
        """Fallback-Analyse wenn AI fehlschlägt."""
        word_count = len(transcript.split())
        
        analysis = VoiceAnalysis(
            summary=f"Sprachnachricht mit {word_count} Wörtern.",
            intent="neutral",
            sentiment="neutral",
            urgency="medium",
            key_points=[transcript[:100] + "..." if len(transcript) > 100 else transcript],
        )
        
        replies = [
            SuggestedReply(
                label="Empfohlen",
                message="Hey! Danke für deine Nachricht 😊 Ich hab mir alles angehört und melde mich gleich mit einer ausführlichen Antwort!",
                tone="locker",
            ),
        ]
        
        return analysis, replies
    
    # ─────────────────────────────────────────────────────────────────────
    # TEXT-TO-SPEECH
    # ─────────────────────────────────────────────────────────────────────
    
    async def generate_tts(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
    ) -> TTSResult:
        """
        Generiert Audio aus Text (TTS).
        
        Nutzt je nach Konfiguration ElevenLabs oder OpenAI TTS.
        
        Args:
            text: Der zu sprechende Text
            voice_id: Stimmen-ID (provider-spezifisch)
            speed: Sprechgeschwindigkeit (0.5-2.0)
            
        Returns:
            TTSResult mit Audio-Bytes
        """
        if settings.TTS_PROVIDER == "elevenlabs" and settings.ELEVENLABS_API_KEY:
            return await self._tts_elevenlabs(text, voice_id, speed)
        elif settings.OPENAI_API_KEY:
            return await self._tts_openai(text, voice_id, speed)
        else:
            raise ValueError("Kein TTS-Provider konfiguriert (ELEVENLABS_API_KEY oder OPENAI_API_KEY)")
    
    async def _tts_elevenlabs(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
    ) -> TTSResult:
        """ElevenLabs Text-to-Speech."""
        voice = voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": settings.ELEVENLABS_MODEL_ID,
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "speed": speed,
                    },
                },
            )
            
            if response.status_code != 200:
                raise Exception(f"ElevenLabs API error ({response.status_code}): {response.text}")
            
            # ElevenLabs gibt direkt Audio-Bytes zurück
            audio_bytes = response.content
            
            # Dauer schätzen (~150 Wörter/Minute)
            words = len(text.split())
            duration = int((words / 150) * 60 / speed)
            
            return TTSResult(
                audio_bytes=audio_bytes,
                audio_format="mp3",
                duration_seconds=duration,
                voice_id=voice,
            )
    
    async def _tts_openai(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
    ) -> TTSResult:
        """OpenAI Text-to-Speech."""
        voice = voice_id or settings.OPENAI_TTS_VOICE
        
        # OpenAI TTS Voices: alloy, echo, fable, onyx, nova, shimmer
        valid_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        if voice not in valid_voices:
            voice = "nova"  # Default
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.OPENAI_TTS_MODEL,
                    "input": text,
                    "voice": voice,
                    "speed": speed,
                    "response_format": "mp3",
                },
            )
            
            if response.status_code != 200:
                raise Exception(f"OpenAI TTS error ({response.status_code}): {response.text}")
            
            audio_bytes = response.content
            
            # Dauer schätzen
            words = len(text.split())
            duration = int((words / 150) * 60 / speed)
            
            return TTSResult(
                audio_bytes=audio_bytes,
                audio_format="mp3",
                duration_seconds=duration,
                voice_id=voice,
            )
    
    # ─────────────────────────────────────────────────────────────────────
    # HELPER
    # ─────────────────────────────────────────────────────────────────────
    
    def get_available_voices(self) -> List[dict]:
        """Gibt die verfügbaren Stimmen zurück."""
        if settings.TTS_PROVIDER == "elevenlabs":
            # ElevenLabs Voices (Beispiele)
            return [
                {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "language": "de", "gender": "female"},
                {"id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "language": "de", "gender": "female"},
                {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "language": "de", "gender": "female"},
                {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "language": "de", "gender": "male"},
                {"id": "MF3mGyEYCl7XYWbV9V6O", "name": "Elli", "language": "de", "gender": "female"},
            ]
        else:
            # OpenAI Voices
            return [
                {"id": "nova", "name": "Nova", "language": "de", "gender": "female", "style": "freundlich"},
                {"id": "alloy", "name": "Alloy", "language": "de", "gender": "neutral", "style": "neutral"},
                {"id": "echo", "name": "Echo", "language": "de", "gender": "male", "style": "professionell"},
                {"id": "fable", "name": "Fable", "language": "de", "gender": "neutral", "style": "expressiv"},
                {"id": "onyx", "name": "Onyx", "language": "de", "gender": "male", "style": "tief"},
                {"id": "shimmer", "name": "Shimmer", "language": "de", "gender": "female", "style": "warm"},
            ]


# ═══════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════

_voice_service: Optional[VoiceService] = None


def get_voice_service() -> VoiceService:
    """Gibt den Voice Service Singleton zurück."""
    global _voice_service
    
    if _voice_service is None:
        _voice_service = VoiceService()
    
    return _voice_service

