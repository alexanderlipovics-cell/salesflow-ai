# app/api/schemas/voice.py

"""
Schemas für Voice In/Out - Sprachnachrichten-Analyse.

Voice In: User lädt Audio hoch → CHIEF analysiert und schlägt Antworten vor
Voice Out: Text wird zu Sprache (TTS) für Antwort als Audio

Use Case:
"Hab heute eine 8-Minuten-Sprachnachricht bekommen, keine Zeit zum Anhören.
CHIEF, hör dir das an und sag mir was sie will + bereite mir eine Antwort vor."
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field


# ============================================================
# VOICE IN - Sprachnachricht analysieren
# ============================================================

class VoiceInRequestMeta(BaseModel):
    """Metadata für Voice-In Request."""
    lead_id: Optional[str] = Field(
        None,
        description="Lead-ID, zu dem die Sprachnachricht gehört"
    )
    channel: Optional[str] = Field(
        None,
        description="whatsapp | instagram | facebook | voice_memo"
    )
    language_hint: Optional[str] = Field(
        None,
        description="Sprachhinweis für bessere Transkription, z.B. 'de', 'en'"
    )
    context: Optional[str] = Field(
        None,
        max_length=1000,
        description="Zusätzlicher Kontext zum Lead/Gespräch"
    )


class SuggestedVoiceReply(BaseModel):
    """Ein Antwortvorschlag für eine Sprachnachricht."""
    label: str = Field(
        ...,
        description="Kurzbeschreibung, z.B. 'Empfohlene Antwort', 'Soft-Follow-up'"
    )
    message: str = Field(
        ...,
        max_length=2000,
        description="Konkreter Antworttext zum Kopieren/Senden"
    )
    tone: Optional[str] = Field(
        None,
        description="Ton der Antwort: locker, professionell, empathisch, direkt"
    )
    best_for: Optional[str] = Field(
        None,
        description="Wann diese Antwort am besten passt"
    )


class VoiceInAnalysis(BaseModel):
    """Analyse einer Sprachnachricht."""
    # Transkription
    transcript: str = Field(
        ...,
        description="Vollständiges Transkript der Audionachricht"
    )
    transcript_confidence: Optional[float] = Field(
        None, ge=0, le=1,
        description="Konfidenz der Transkription (0-1)"
    )
    
    # Zusammenfassung
    summary: str = Field(
        ...,
        max_length=1000,
        description="Kurze Zusammenfassung in 2-4 Sätzen"
    )
    
    # Absicht & Stimmung
    intent: str = Field(
        ...,
        description="Absicht: hat_fragen, will_kaufen, ist_unsicher, beschwert_sich, etc."
    )
    sentiment: str = Field(
        ...,
        description="Stimmung: positiv, neutral, negativ, begeistert, frustriert"
    )
    urgency: Optional[str] = Field(
        None,
        description="Dringlichkeit: hoch, mittel, niedrig"
    )
    
    # Extrahierte Infos
    key_points: list[str] = Field(
        default_factory=list,
        description="Wichtige Stichpunkte aus der Nachricht"
    )
    questions_asked: list[str] = Field(
        default_factory=list,
        description="Fragen die gestellt wurden"
    )
    objections: list[str] = Field(
        default_factory=list,
        description="Erkannte Einwände"
    )
    action_items: list[str] = Field(
        default_factory=list,
        description="Was der Lead von dir erwartet/will"
    )
    
    # Audio-Metadaten
    duration_seconds: Optional[int] = Field(
        None,
        description="Länge der Nachricht in Sekunden"
    )
    language_detected: Optional[str] = Field(
        None,
        description="Erkannte Sprache"
    )


class VoiceInResponse(BaseModel):
    """Response nach Voice-In Analyse."""
    analysis: VoiceInAnalysis
    suggested_replies: list[SuggestedVoiceReply] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="2-3 Antwortvorschläge"
    )
    recommended_index: int = Field(
        0,
        ge=0,
        description="Index der empfohlenen Antwort in suggested_replies"
    )
    
    # Optional: Direkte Handlungsempfehlung
    recommended_action: Optional[str] = Field(
        None,
        description="z.B. 'Sofort antworten', 'Heute Abend anrufen', 'Info-Material schicken'"
    )


# ============================================================
# VOICE OUT - Text zu Sprache
# ============================================================

class VoiceOutRequest(BaseModel):
    """Request für Text-to-Speech."""
    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Text der eingesprochen werden soll"
    )
    language: str = Field(
        default="de",
        description="Sprache: de, en, es, fr, etc."
    )
    voice_id: str = Field(
        default="default",
        description="Stimmen-ID (provider-spezifisch)"
    )
    speed: float = Field(
        default=1.0,
        ge=0.5, le=2.0,
        description="Sprechgeschwindigkeit (0.5-2.0)"
    )
    format: Literal["mp3", "wav", "ogg"] = Field(
        default="mp3",
        description="Audio-Format"
    )


class VoiceOutResponse(BaseModel):
    """Response mit generiertem Audio."""
    audio_url: str = Field(
        ...,
        description="URL zur generierten Audiodatei"
    )
    duration_seconds: Optional[int] = Field(
        None,
        description="Länge des Audios in Sekunden"
    )
    format: str = Field(
        default="mp3",
        description="Audio-Format"
    )
    expires_at: Optional[str] = Field(
        None,
        description="Wann die URL abläuft (ISO datetime)"
    )


# ============================================================
# QUICK VOICE REPLY - Schnellantwort mit einem Klick
# ============================================================

class QuickVoiceReplyRequest(BaseModel):
    """
    Kombiniert Voice-In + Voice-Out für schnelle Antwort.
    
    User lädt Audio hoch → CHIEF analysiert → generiert Audio-Antwort.
    """
    # Audio Input
    lead_id: Optional[str] = None
    language: str = Field(default="de")
    
    # Response Preferences
    generate_audio_reply: bool = Field(
        default=False,
        description="Soll die empfohlene Antwort als Audio generiert werden?"
    )
    reply_tone: Optional[str] = Field(
        None,
        description="Gewünschter Ton: locker, professionell, empathisch"
    )


class QuickVoiceReplyResponse(BaseModel):
    """Response für Quick Voice Reply."""
    analysis: VoiceInAnalysis
    text_reply: str = Field(..., description="Empfohlene Text-Antwort")
    audio_reply_url: Optional[str] = Field(
        None,
        description="URL zur Audio-Antwort (wenn generate_audio_reply=True)"
    )

