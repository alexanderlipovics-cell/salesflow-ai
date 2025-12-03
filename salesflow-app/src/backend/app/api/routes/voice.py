# backend/app/api/routes/voice.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  VOICE ROUTER                                                              ║
║  API Endpoints für Sprachnachrichten-Analyse und TTS                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /ai/chief/voice-in - Sprachnachricht analysieren
- POST /ai/chief/voice-out - Text zu Sprache
- GET /ai/chief/voices - Verfügbare Stimmen
- POST /ai/chief/quick-voice-reply - Kombiniert Voice-In + Voice-Out
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from supabase import Client

from ..schemas.voice import (
    VoiceInRequestMeta,
    VoiceInResponse,
    VoiceInAnalysis,
    SuggestedVoiceReply,
    VoiceOutRequest,
    VoiceOutResponse,
)
from ...services.voice_service import get_voice_service, VoiceService
from ...services.storage_service import get_storage_service, StorageService
from ...db.deps import get_db, get_current_user, CurrentUser


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(
    prefix="/ai/chief",
    tags=["ai", "voice"],
)


# ═══════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════

def get_voice_svc() -> VoiceService:
    """Dependency für Voice Service."""
    return get_voice_service()


def get_storage_svc() -> StorageService:
    """Dependency für Storage Service."""
    return get_storage_service()


# ═══════════════════════════════════════════════════════════════════════════
# VOICE IN - Sprachnachricht analysieren
# ═══════════════════════════════════════════════════════════════════════════

@router.post(
    "/voice-in",
    response_model=VoiceInResponse,
    summary="Sprachnachricht analysieren",
    description="Analysiert eine Sprachnachricht und schlägt Antworten vor.",
)
async def analyze_voice(
    audio: UploadFile = File(..., description="Audio-Datei (mp3, wav, m4a, ogg)"),
    meta_json: str = Form(default="{}", description="Metadata als JSON"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
    voice_service: VoiceService = Depends(get_voice_svc),
    storage_service: StorageService = Depends(get_storage_svc),
) -> VoiceInResponse:
    """
    Analysiert eine eingehende Sprachnachricht.
    
    **Use Case:**
    "Hab eine 8-Minuten-Sprachnachricht bekommen, keine Zeit zum Anhören.
    CHIEF, hör dir das an und sag mir was sie will + bereite mir eine Antwort vor."
    
    **Workflow:**
    1. Audio hochladen
    2. Whisper transkribiert
    3. CHIEF analysiert Inhalt
    4. Antwortvorschläge werden generiert
    """
    # Meta-Daten parsen
    try:
        meta = VoiceInRequestMeta(**json.loads(meta_json))
    except json.JSONDecodeError:
        meta = VoiceInRequestMeta()
    
    # Content-Type validieren
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=400,
            detail="Ungültige Audio-Datei. Unterstützte Formate: mp3, wav, m4a, ogg"
        )
    
    # Audio lesen
    audio_bytes = await audio.read()
    
    # Dateigröße prüfen (max 25MB)
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Audio-Datei zu groß. Maximum: 25MB"
        )
    
    try:
        # 1. Audio in Storage speichern
        upload_result = await storage_service.upload_audio(
            audio_bytes=audio_bytes,
            user_id=current_user.id,
            filename=audio.filename or "voice_in.mp3",
            content_type=audio.content_type,
            folder="voice/in",
        )
        
        # 2. Transkription mit Whisper
        transcription = await voice_service.transcribe(
            audio_bytes=audio_bytes,
            filename=audio.filename or "audio.mp3",
            language=meta.language_hint or "de",
        )
        
        # 3. AI-Analyse
        analysis, suggested_replies = await voice_service.analyze(
            transcript=transcription.text,
            context=meta.context,
        )
        
        # 4. In DB speichern
        voice_msg_data = {
            "user_id": current_user.id,
            "lead_id": meta.lead_id,
            "direction": "in",
            "audio_url": upload_result.signed_url or upload_result.public_url,
            "audio_format": "mp3",
            "duration_seconds": transcription.duration_seconds,
            "transcript": transcription.text,
            "transcript_confidence": transcription.confidence,
            "analysis_result": {
                "summary": analysis.summary,
                "intent": analysis.intent,
                "sentiment": analysis.sentiment,
                "urgency": analysis.urgency,
                "key_points": analysis.key_points,
                "objections": analysis.objections,
                "questions": analysis.questions,
            },
            "language": transcription.language,
            "channel": meta.channel,
        }
        
        db.table("voice_messages").insert(voice_msg_data).execute()
        
        # Response bauen
        return VoiceInResponse(
            analysis=VoiceInAnalysis(
                transcript=transcription.text,
                summary=analysis.summary,
                intent=analysis.intent,
                sentiment=analysis.sentiment,
                urgency=analysis.urgency,
                key_points=analysis.key_points,
                questions_asked=analysis.questions,
                objections=analysis.objections,
                action_items=analysis.action_items,
                duration_seconds=transcription.duration_seconds,
                language_detected=transcription.language,
            ),
            suggested_replies=[
                SuggestedVoiceReply(
                    label=r.label,
                    message=r.message,
                    tone=r.tone,
                    best_for=f"Geschätzte Dauer: ~{r.estimated_duration}s" if r.estimated_duration else None,
                )
                for r in suggested_replies
            ],
            recommended_index=0,
            recommended_action=_get_recommended_action(analysis),
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei Voice-Analyse: {str(e)}"
        )


def _get_recommended_action(analysis) -> str:
    """Generiert Handlungsempfehlung basierend auf Analyse."""
    if analysis.urgency == "high":
        return "🔴 Dringend! Heute noch antworten."
    elif analysis.objections:
        return "⚠️ Einwände erkannt - mit Bedacht antworten."
    elif analysis.sentiment == "positive":
        return "✅ Positive Stimmung - zeitnah antworten!"
    else:
        return "💬 Innerhalb von 24h antworten."


# ═══════════════════════════════════════════════════════════════════════════
# VOICE OUT - Text zu Sprache
# ═══════════════════════════════════════════════════════════════════════════

@router.post(
    "/voice-out",
    response_model=VoiceOutResponse,
    summary="Text zu Sprache",
    description="Generiert eine Audio-Datei aus Text (TTS).",
)
async def generate_voice(
    payload: VoiceOutRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
    voice_service: VoiceService = Depends(get_voice_svc),
    storage_service: StorageService = Depends(get_storage_svc),
) -> VoiceOutResponse:
    """
    Generiert eine Sprachnachricht aus Text.
    
    **Use Case:**
    User hat eine Text-Antwort geschrieben und möchte sie als
    Sprachnachricht verschicken (z.B. für WhatsApp/Instagram).
    """
    if not payload.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text darf nicht leer sein"
        )
    
    try:
        # 1. TTS generieren
        tts_result = await voice_service.generate_tts(
            text=payload.text,
            voice_id=payload.voice_id,
            speed=payload.speed,
        )
        
        # 2. Audio in Storage speichern
        upload_result = await storage_service.upload_audio(
            audio_bytes=tts_result.audio_bytes,
            user_id=current_user.id,
            content_type="audio/mpeg",
            folder="voice/out",
        )
        
        # 3. In DB speichern
        voice_msg_data = {
            "user_id": current_user.id,
            "direction": "out",
            "audio_url": upload_result.signed_url or upload_result.public_url,
            "audio_format": tts_result.audio_format,
            "duration_seconds": tts_result.duration_seconds,
            "original_text": payload.text,
            "voice_id": tts_result.voice_id,
            "language": payload.language,
        }
        
        db.table("voice_messages").insert(voice_msg_data).execute()
        
        return VoiceOutResponse(
            audio_url=upload_result.signed_url or upload_result.public_url or "",
            duration_seconds=tts_result.duration_seconds,
            format=tts_result.audio_format,
            expires_at=upload_result.expires_at,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei TTS-Generierung: {str(e)}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# VOICES - Verfügbare Stimmen
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/voices",
    summary="Verfügbare Stimmen",
    description="Gibt die Liste der verfügbaren TTS-Stimmen zurück.",
)
async def list_voices(
    voice_service: VoiceService = Depends(get_voice_svc),
):
    """Listet alle verfügbaren Stimmen für TTS."""
    return voice_service.get_available_voices()


# ═══════════════════════════════════════════════════════════════════════════
# QUICK REPLY - Kombiniert Voice-In + Voice-Out
# ═══════════════════════════════════════════════════════════════════════════

@router.post(
    "/quick-voice-reply",
    summary="Schnelle Sprachantwort",
    description="Analysiert Audio und generiert optional eine Audio-Antwort.",
)
async def quick_voice_reply(
    audio: UploadFile = File(...),
    generate_audio: bool = Form(default=False),
    reply_index: int = Form(default=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
    voice_service: VoiceService = Depends(get_voice_svc),
    storage_service: StorageService = Depends(get_storage_svc),
):
    """
    Kombiniert Voice-In und Voice-Out für schnelle Antworten.
    
    1. Audio wird analysiert
    2. Antwort wird ausgewählt
    3. Optional: Antwort als Audio zurück
    """
    # Zuerst Voice-In
    voice_in_response = await analyze_voice(
        audio=audio,
        meta_json="{}",
        current_user=current_user,
        db=db,
        voice_service=voice_service,
        storage_service=storage_service,
    )
    
    # Antwort auswählen
    if reply_index >= len(voice_in_response.suggested_replies):
        reply_index = 0
    
    selected_reply = voice_in_response.suggested_replies[reply_index]
    
    result = {
        "analysis": voice_in_response.analysis,
        "text_reply": selected_reply.message,
        "audio_reply_url": None,
        "audio_expires_at": None,
    }
    
    # Optional: Audio-Antwort generieren
    if generate_audio and selected_reply.message:
        voice_out_response = await generate_voice(
            payload=VoiceOutRequest(text=selected_reply.message),
            current_user=current_user,
            db=db,
            voice_service=voice_service,
            storage_service=storage_service,
        )
        result["audio_reply_url"] = voice_out_response.audio_url
        result["audio_expires_at"] = voice_out_response.expires_at
    
    return result


# ═══════════════════════════════════════════════════════════════════════════
# HISTORY - Voice Message History
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/voice-history",
    summary="Voice-Nachricht Historie",
    description="Gibt die letzten Voice-Nachrichten zurück.",
)
async def get_voice_history(
    limit: int = 20,
    direction: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Listet die Voice-Message Historie des Users."""
    try:
        query = db.table("voice_messages").select(
            "id, direction, duration_seconds, transcript, created_at, leads(id, first_name)"
        ).eq("user_id", current_user.id)
        
        if direction in ["in", "out"]:
            query = query.eq("direction", direction)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        return {
            "messages": result.data or [],
            "total": len(result.data or []),
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Historie: {str(e)}"
        )
