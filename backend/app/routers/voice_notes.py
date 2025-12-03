"""
Voice Notes Router
Handles audio uploads, transcription kickoff and listing per contact.
"""
import base64
import logging
import os
import tempfile
import uuid
from typing import Optional
from urllib.request import Request, urlopen

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from openai import OpenAI
from pydantic import BaseModel, Field
from storage3.utils import StorageException

from app.core.auth_helper import get_current_user_id
from app.core.supabase import get_supabase_client
from config import settings

logger = logging.getLogger("voice-notes")

VOICE_BUCKET = "voice-notes"
TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe"

router = APIRouter(prefix="/api/voice-notes", tags=["voice_notes"])


class VoiceNotePayload(BaseModel):
    workspace_id: str
    contact_id: Optional[str] = None
    audio_data: str = Field(..., description="Base64 encoded audio payload")
    duration_seconds: int = 0
    language: str = "en-US"


def _upload_audio(audio_bytes: bytes, workspace_id: str, content_type: str = "audio/m4a") -> str:
    supabase = get_supabase_client()
    storage = supabase.storage.from_(VOICE_BUCKET)
    file_path = f"{workspace_id}/{uuid.uuid4()}.m4a"
    try:
        storage.upload(
            file_path,
            audio_bytes,
            {"content-type": content_type, "x-upsert": "true"},
        )
    except StorageException as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Upload fehlgeschlagen: {exc.message}") from exc

    return storage.get_public_url(file_path)


def _transcribe_async(voice_note_id: str, audio_bytes: bytes, language: str):
    """
    Background transcription worker (executed via FastAPI BackgroundTasks)
    """
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY missing - skipping transcription.")
        _update_transcription_status(voice_note_id, status_value="failed")
        return

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        with open(tmp_path, "rb") as audio_file:
            result = client.audio.transcriptions.create(
                model=TRANSCRIBE_MODEL,
                file=audio_file,
                language=language,
            )

        transcription_text = getattr(result, "text", None) or getattr(result, "transcription", "")
        _update_transcription_status(voice_note_id, transcription_text or "")
    except Exception as exc:  # pragma: no cover
        logger.error("Transcription failed: %s", exc)
        _update_transcription_status(voice_note_id, status_value="failed")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _update_transcription_status(voice_note_id: str, transcription: Optional[str] = None, status_value: str = "completed"):
    supabase = get_supabase_client()
    updates = {"transcription_status": status_value}
    if transcription is not None:
        updates["transcription"] = transcription

    try:
        supabase.table("voice_notes").update(updates).eq("id", voice_note_id).execute()
    except Exception as exc:  # pragma: no cover
        logger.error("Failed to update transcription status for %s: %s", voice_note_id, exc)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_voice_note(
    payload: VoiceNotePayload,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """
    Uploads an audio note, stores metadata and triggers background transcription.
    """
    try:
        audio_bytes = base64.b64decode(payload.audio_data)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail="Ungültiges Audio (Base64).") from exc

    audio_url = _upload_audio(audio_bytes, payload.workspace_id)
    supabase = get_supabase_client()
    record = {
        "workspace_id": payload.workspace_id,
        "contact_id": payload.contact_id,
        "user_id": user_id,
        "audio_url": audio_url,
        "duration_seconds": payload.duration_seconds,
        "language": payload.language,
        "transcription_status": "processing" if settings.OPENAI_API_KEY else "pending",
    }

    try:
        response = supabase.table("voice_notes").insert(record).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Voice Note konnte nicht gespeichert werden: {exc}") from exc

    if not response.data:
        raise HTTPException(status_code=500, detail="Voice Note wurde nicht gespeichert.")

    voice_note = response.data[0]
    background_tasks.add_task(_transcribe_async, voice_note["id"], audio_bytes, payload.language)

    return voice_note


@router.get("/contact/{contact_id}")
async def list_voice_notes(
    contact_id: str,
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001
):
    """
    List all voice notes for a given contact ordered by newest first.
    """
    supabase = get_supabase_client()
    try:
        response = (
            supabase.table("voice_notes")
            .select("*")
            .eq("contact_id", contact_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Voice Notes konnten nicht geladen werden: {exc}") from exc

    return {"voice_notes": response.data or []}


@router.post("/{voice_note_id}/transcribe", status_code=status.HTTP_202_ACCEPTED)
async def retrigger_transcription(
    voice_note_id: str,
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001
):
    """
    Allows manual re-trigger of the transcription job.
    """
    supabase = get_supabase_client()
    try:
        response = (
            supabase.table("voice_notes")
            .select("audio_url, workspace_id, language")
            .eq("id", voice_note_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Voice Note konnte nicht geladen werden: {exc}") from exc

    if not response.data:
        raise HTTPException(status_code=404, detail="Voice Note nicht gefunden.")

    record = response.data[0]
    # audio_url is public, fetch bytes via urllib
    try:
        req = Request(record["audio_url"], headers={"User-Agent": "SalesFlowAI/1.0"})
        with urlopen(req, timeout=30) as resp:
            audio_bytes = resp.read()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Download fehlgeschlagen: {exc}") from exc

    _update_transcription_status(voice_note_id, status_value="processing")
    _transcribe_async(voice_note_id, audio_bytes, record.get("language") or "en-US")

    return {"status": "processing"}


