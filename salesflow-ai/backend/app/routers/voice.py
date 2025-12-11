from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Body
from typing import Optional
import os
import httpx
import tempfile
import json
import base64
from datetime import datetime, timedelta
import traceback
import openai

from app.core.security.main import get_current_user
from app.supabase_client import get_supabase_client
from .smart_import import analyze_input, AnalyzeRequest

# Prefix wird in main.py gesetzt, daher hier ohne Prefix
router = APIRouter(tags=["voice"])


ALLOWED_AUDIO_TYPES = [
    "audio/webm",
    "audio/mp3",
    "audio/mpeg",
    "audio/mp4",
    "audio/m4a",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
]


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Transkribiert Audio mit OpenAI Whisper."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY nicht konfiguriert")

    content_type = file.content_type or "audio/webm"
    if not any(t in content_type for t in ["audio", "video"]):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be audio.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Audio-Datei ist leer")
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 25MB.")

    ext = ".webm"
    if "mp3" in content_type or "mpeg" in content_type:
        ext = ".mp3"
    elif "mp4" in content_type or "m4a" in content_type:
        ext = ".m4a"
    elif "ogg" in content_type:
        ext = ".ogg"
    elif "wav" in content_type:
        ext = ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            with open(tmp_path, "rb") as audio_file:
                response = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    files={
                        "file": (
                            file.filename or f"audio{ext}",
                            audio_file,
                            content_type,
                        )
                    },
                    data={
                        "model": "whisper-1",
                        "language": "de",
                        "response_format": "json",
                    },
                )

        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "text": result.get("text", ""),
                "language": result.get("language", "de"),
            }

        return {
            "success": False,
            "error": f"Whisper API error: {response.status_code}",
            "detail": response.text,
        }
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail=f"Whisper API request failed: {exc}"
        ) from exc
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@router.post("/transcribe-and-analyze")
async def transcribe_and_analyze(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Transkribiert Audio und analysiert den Text per Smart Import."""
    transcription = await transcribe_audio(file, current_user)
    if not transcription.get("success"):
        return transcription

    text = transcription.get("text") or transcription.get("transcription") or ""

    if not text or len(text.strip()) < 10:
        return {
            "success": True,
            "transcription": text,
            "analysis": None,
            "message": "Text zu kurz für Analyse",
        }

    analysis = await analyze_input(AnalyzeRequest(text=text), current_user)

    return {
        "success": True,
        "transcription": text,
        "analysis": analysis,
    }


@router.post("/command")
async def process_voice_command(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Wrapper mit Auth-Check und Fehler-Handling für Voice Commands."""
    try:
        user_id = (current_user or {}).get("sub") or (current_user or {}).get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User nicht authentifiziert")

        normalized_user = dict(current_user or {})
        normalized_user.setdefault("id", user_id)

        return await _process_voice_command_inner(file=file, current_user=normalized_user)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Voice command error: {e}")
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}


@router.post("/speak")
async def text_to_speech(
    payload: dict = Body(...),
    current_user=Depends(get_current_user),
):
    """Text-to-Speech für CHIEF-Antworten."""
    text = (payload or {}).get("text", "")
    if not text:
        return {"error": "No text provided"}

    try:
        response = openai.audio.speech.create(
            model="tts-1",
            voice="onyx",
            input=text,
        )
        audio_base64 = base64.b64encode(response.content).decode()
        return {"audio": audio_base64, "format": "mp3"}
    except Exception as e:
        print(f"TTS error: {e}")
        print(traceback.format_exc())
        return {"error": str(e)}


async def _process_voice_command_inner(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Verarbeitet Sprachbefehle: transkribiert, erkennt Intent und führt Aktionen aus."""

    transcription = await transcribe_audio(file, current_user)
    if not transcription.get("success"):
        return transcription

    text = transcription.get("text", "")

    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    prompt = f"""Analysiere diesen Sprachbefehl und extrahiere die Aktion.

BEFEHL: "{text}"
HEUTE: {today}

Mögliche Intents:
- CREATE_LEAD: Neuen Lead anlegen
- UPDATE_LEAD: Lead aktualisieren (Status, Temperatur, Notiz)
- SET_FOLLOW_UP: Follow-up/Erinnerung setzen
- GET_INFO: Info über Lead abrufen
- MEETING_PREP: Gesprächsvorbereitung
- SEARCH_LEADS: Leads suchen
- NORMAL_CHAT: Normale Frage/Konversation

Antworte NUR mit JSON:
{{
    "intent": "CREATE_LEAD|UPDATE_LEAD|SET_FOLLOW_UP|GET_INFO|MEETING_PREP|SEARCH_LEADS|NORMAL_CHAT",
    "confidence": 0.95,

    "lead_name": "Name des Leads falls erwähnt",
    "company": "Firma falls erwähnt",
    "phone": "Telefon falls erwähnt",
    "email": "Email falls erwähnt",

    "temperature": "hot|warm|cold falls erwähnt",
    "deal_value": 5000 falls Budget/Wert erwähnt,
    "notes": "Notiz falls erwähnt",

    "follow_up_date": "YYYY-MM-DD falls Datum erwähnt (morgen={tomorrow})",
    "follow_up_reason": "Grund für Follow-up",

    "search_query": "Suchbegriff falls Suche",
    "question": "Frage falls normale Chat-Frage"
}}

Regeln:
- "morgen" = {tomorrow}
- "übermorgen" = {(datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")}
- "nächste Woche" = {(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")}
- Erkenne auch informelle Sprache ("leg an", "mach ne Notiz", "ruf an")
- Bei Unsicherheit: NORMAL_CHAT mit der Frage"""

    completion = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Du bist CHIEF, ein Sales-Assistent. Analysiere die Spracheingabe und gib eine hilfreiche Antwort als JSON wie beschrieben.",
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=500,
        temperature=0.7,
    )

    response_text = completion.choices[0].message.content.strip()

    if "```" in response_text:
        parts = response_text.split("```")
        response_text = parts[1] if len(parts) > 1 else parts[0]
        if response_text.startswith("json"):
            response_text = response_text[4:]

    try:
        command = json.loads(response_text.strip())
    except Exception:
        return {
            "success": True,
            "transcription": text,
            "intent": "NORMAL_CHAT",
            "executed": False,
            "message": "Konnte Befehl nicht verstehen",
        }

    intent = command.get("intent", "NORMAL_CHAT")
    result = {"success": True, "transcription": text, "intent": intent, "command": command}

    supabase = get_supabase_client()

    if intent == "CREATE_LEAD" and command.get("lead_name"):
        lead_data = {
            "user_id": str(current_user["id"]),
            "name": command["lead_name"],
            "company": command.get("company"),
            "phone": command.get("phone"),
            "email": command.get("email"),
            "temperature": command.get("temperature", "cold"),
            "deal_value": command.get("deal_value"),
            "notes": command.get("notes"),
            "source": "voice_command",
            "status": "active",
            "created_at": datetime.now().isoformat(),
        }

        if command.get("follow_up_date"):
            lead_data["next_follow_up"] = command["follow_up_date"]
            lead_data["follow_up_reason"] = command.get("follow_up_reason", "Voice Reminder")

        lead_data = {k: v for k, v in lead_data.items() if v is not None}
        db_result = supabase.table("leads").insert(lead_data).execute()

        result["executed"] = True
        result["action"] = "Lead erstellt"
        result["lead"] = db_result.data[0] if db_result.data else None
        result["message"] = f"✅ Lead '{command['lead_name']}' wurde angelegt!"

        if command.get("follow_up_date"):
            result["message"] += f"\n📅 Follow-up am {command['follow_up_date']}"

    elif intent == "SET_FOLLOW_UP" and command.get("lead_name"):
        search = (
            supabase.table("leads")
            .select("id, name")
            .eq("user_id", str(current_user["id"]))
            .ilike("name", f"%{command['lead_name']}%")
            .limit(1)
            .execute()
        )

        if search.data:
            lead_id = search.data[0]["id"]
            update_data = {
                "next_follow_up": command.get("follow_up_date", tomorrow),
                "follow_up_reason": command.get("follow_up_reason", "Voice Reminder"),
                "updated_at": datetime.now().isoformat(),
            }

            supabase.table("leads").update(update_data).eq("id", lead_id).execute()

            result["executed"] = True
            result["action"] = "Follow-up gesetzt"
            result["message"] = f"📅 Follow-up für '{command['lead_name']}' am {command.get('follow_up_date', tomorrow)} gesetzt!"
        else:
            result["executed"] = False
            result["message"] = f"❌ Lead '{command['lead_name']}' nicht gefunden"

    elif intent == "UPDATE_LEAD" and command.get("lead_name"):
        search = (
            supabase.table("leads")
            .select("id, name")
            .eq("user_id", str(current_user["id"]))
            .ilike("name", f"%{command['lead_name']}%")
            .limit(1)
            .execute()
        )

        if search.data:
            lead_id = search.data[0]["id"]
            update_data = {"updated_at": datetime.now().isoformat()}

            if command.get("temperature"):
                update_data["temperature"] = command["temperature"]
            if command.get("notes"):
                update_data["notes"] = command["notes"]
            if command.get("deal_value"):
                update_data["deal_value"] = command["deal_value"]

            supabase.table("leads").update(update_data).eq("id", lead_id).execute()

            result["executed"] = True
            result["action"] = "Lead aktualisiert"
            result["message"] = f"✅ Lead '{command['lead_name']}' aktualisiert!"
        else:
            result["executed"] = False
            result["message"] = f"❌ Lead '{command['lead_name']}' nicht gefunden"

    elif intent == "GET_INFO" and command.get("lead_name"):
        search = (
            supabase.table("leads")
            .select("*")
            .eq("user_id", str(current_user["id"]))
            .ilike("name", f"%{command['lead_name']}%")
            .limit(1)
            .execute()
        )

        if search.data:
            lead = search.data[0]
            result["executed"] = True
            result["action"] = "Info abgerufen"
            result["lead"] = lead
            result["message"] = (
                f"📋 {lead['name']}: {lead.get('temperature', 'cold').upper()}, "
                f"Firma: {lead.get('company', '-')}, Follow-up: {lead.get('next_follow_up', '-')}"
            )
        else:
            result["executed"] = False
            result["message"] = f"❌ Lead '{command['lead_name']}' nicht gefunden"

    elif intent == "MEETING_PREP" and command.get("lead_name"):
        result["executed"] = False
        result["action"] = "meeting_prep"
        result["trigger_meeting_prep"] = True
        result["message"] = f"🎯 Starte Gesprächsvorbereitung für '{command['lead_name']}'..."

    else:
        result["executed"] = False
        result["intent"] = "NORMAL_CHAT"
        result["message"] = text

    return result

