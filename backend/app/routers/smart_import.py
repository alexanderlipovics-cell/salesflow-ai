from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from anthropic import Anthropic
from ..core.ai_router import get_model_for_task, get_max_tokens_for_task
import json
import os
from datetime import datetime, timedelta

from app.core.deps import get_current_user
from ..core.deps import get_supabase
from ..services.lead_status import (
    set_contact_status_from_chat_analysis,
    CONTACT_STATUS_NEVER_CONTACTED,
    CONTACT_STATUS_AWAITING_REPLY,
    CONTACT_STATUS_IN_CONVERSATION,
)


router = APIRouter(prefix="/smart-import", tags=["smart-import"])


# Prompt für Bulk-Listen (Instagram/WhatsApp/LinkedIn/Telefonkontakte)
BULK_LIST_PROMPT = """Analysiere dieses Bild. Es zeigt eine LISTE von Kontakten.


Erkenne ALLE sichtbaren Kontakte und extrahiere für jeden:
- name: Vollständiger Name
- username: @username falls sichtbar (Instagram/Twitter)
- title: Jobtitel falls sichtbar
- company: Firma falls sichtbar
- phone: Telefonnummer falls sichtbar
- location: Ort falls sichtbar
- bio: Bio/Status falls sichtbar
- platform: instagram|whatsapp|linkedin|phone_contacts
- warm_score: 1-100 (basierend auf: hat Bio=+20, hat Firma=+30, hat Titel=+20, persönlicher Name=+30)


Antworte NUR mit JSON:
{
    "is_bulk_list": true,
    "platform": "instagram|whatsapp|linkedin|phone_contacts",
    "contacts": [
        {
            "name": "Max Mustermann",
            "username": "@max.muster",
            "title": "CEO",
            "company": "ABC GmbH",
            "bio": "Entrepreneur | Coach",
            "warm_score": 85,
            "import_priority": "high"
        },
        ...
    ],
    "total_found": 12,
    "scroll_hint": "Mehr Kontakte sichtbar - scrolle für weitere"
}
"""


def is_bulk_list(
    image_text: str,
    multiple_profile_pics_detected: bool = False,
    list_layout_detected: bool = False,
) -> bool:
    """
    Heuristik, um Bulk-Listen in Bildanalysen zu erkennen.
    Nutzt Textindikatoren + einfache Layout-Hints.
    """
    text = (image_text or "").lower()
    indicators = [
        "follower" in text,
        "following" in text,
        "kontakte" in text,
        "connections" in text,
        multiple_profile_pics_detected,
        list_layout_detected,
    ]
    return sum(1 for flag in indicators if flag) >= 2


# ============ MODELS ============


class LeadData(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    facebook: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    platform: Optional[str] = None
    notes: Optional[str] = None
    follower_count: Optional[int] = None
    topics: Optional[List[str]] = []


class AnalyzeRequest(BaseModel):
    text: str


class AnalysisResult(BaseModel):
    input_type: str  # conversation, meeting_notes, question
    lead: Optional[LeadData] = None

    # Status
    status: Optional[str] = None  # cold, warm, hot
    waiting_for: Optional[str] = None  # lead_response, my_response
    last_contact_summary: Optional[str] = None

    # Generated content
    conversation_summary: Optional[str] = None
    suggested_next_action: Optional[str] = None
    follow_up_days: int = 3
    customer_message: Optional[str] = None
    crm_note: Optional[str] = None
    follow_up_draft: Optional[str] = None
    key_points: Optional[List[str]] = []

    # Lead check
    lead_exists: bool = False
    existing_lead_id: Optional[str] = None


class AnalyzeResponse(BaseModel):
    success: bool
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None


class SaveLeadRequest(BaseModel):
    lead: LeadData
    notes: Optional[str] = None
    follow_up_days: int = 3
    status: str = "cold"
    first_message: Optional[str] = None
    channel: Optional[str] = None


class ContactListRequest(BaseModel):
    text: str


# ============ HELPERS ============


def detect_list_input(text: str) -> bool:
    """Erkennt, ob der Input eine Liste von Kontakten ist."""
    if not text:
        return False

    lines = text.strip().split("\n")
    indicators = 0

    # Mehrere Zeilen
    if len(lines) >= 3:
        indicators += 1

    # Namen-Muster
    name_pattern_count = 0
    for line in lines[:10]:
        line = line.strip()
        if line and len(line.split()) <= 5:
            if line[0].isupper() and not any(c in line for c in ["http", "@", "#", "€", "$"]):
                name_pattern_count += 1
    if lines and name_pattern_count >= len(lines) * 0.6:
        indicators += 2

    # Nummerierte Liste
    if any(line.strip().startswith(str(i)) for i, line in enumerate(lines, 1)):
        indicators += 1

    # Bullet Points
    if any(line.strip().startswith(("-", "•", "*")) for line in lines):
        indicators += 1

    return indicators >= 2


def parse_contacts_from_text(text: str):
    """Ruft Claude auf, um eine Kontaktliste zu parsen und anzureichern."""
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""Analysiere diese Liste und extrahiere alle Kontakte/Personen.

LISTE:
{text}

Für jeden erkannten Kontakt extrahiere:
- name: Vollständiger Name
- first_name: Vorname
- last_name: Nachname  
- email: E-Mail falls vorhanden
- phone: Telefon falls vorhanden
- company: Firma falls vorhanden
- position: Position falls vorhanden
- notes: Zusätzliche Infos

Antworte NUR mit JSON:
{{
    "contacts": [
        {{
            "name": "Max Mustermann",
            "first_name": "Max",
            "last_name": "Mustermann",
            "email": null,
            "phone": "+43 123 456789",
            "company": "ABC GmbH",
            "position": "CEO",
            "notes": "Kontakt von Event"
        }}
    ],
    "total": 5,
    "parsing_notes": "5 Namen erkannt, 2 mit Telefonnummer"
}}

Regeln:
- Erkenne verschiedene Formate (Name, Email, Telefon gemischt)
- Trenne Vor- und Nachname intelligent
- Erkenne Firmeninfos in Klammern: "Max Müller (ABC GmbH)"
- Erkenne Telefonnummern in verschiedenen Formaten
- Wenn nur Vornamen: trotzdem aufnehmen
- Nummerierung/Bullets entfernen"""

    # Use Claude Haiku for faster, cheaper contact parsing
    model = "claude-haiku-4-5-20251001"
    max_tokens = 2000
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text.strip()

    # Clean JSON aus Markdown-Blöcken
    if "```" in response_text:
        parts = response_text.split("```")
        response_text = parts[1] if len(parts) > 1 else parts[0]
        if response_text.startswith("json"):
            response_text = response_text[4:]

    data = json.loads(response_text.strip())

    # Warm Scores ergänzen
    for contact in data.get("contacts", []):
        score = 30
        if contact.get("phone"):
            score += 25
        if contact.get("email"):
            score += 15
        if contact.get("company"):
            score += 20
        if contact.get("position"):
            score += 10
        contact["warm_score"] = min(100, score)

    return data


# ============ ENDPOINTS ============


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_input(
    request: AnalyzeRequest,
    current_user=Depends(get_current_user),
):
    """Smart analyzer - detects input type and processes accordingly."""
    # Früh erkennen, ob eine Namens-/Kontaktliste eingegeben wurde
    if detect_list_input(request.text):
        return AnalyzeResponse(
            success=True,
            result=AnalysisResult(input_type="contact_list"),
        )

    try:
        client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        prompt = f"""Analysiere diesen Input und bestimme den Typ.


INPUT:
{request.text}


Bestimme den Typ:
- "conversation" = Kopierter Chat-Verlauf (Zeitstempel, mehrere Nachrichten, "Du hast gesendet")
- "meeting_notes" = Kurze Stichpunkte nach Termin (< 500 Zeichen, "Termin", "Budget", "Nächster Schritt")
- "question" = Normale Frage an den AI-Assistenten

Antworte NUR mit validem JSON (kein Markdown):
{{
    "input_type": "conversation|meeting_notes|question",

    "lead": {{
        "name": "Name der ANDEREN Person (nicht mein Name!)",
        "first_name": "Vorname",
        "last_name": "Nachname",
        "phone": "Telefon",
        "email": "Email",
        "instagram": "handle ohne @",
        "whatsapp": "Nummer",
        "company": "Firma",
        "position": "Position",
        "city": "Stadt",
        "platform": "whatsapp|instagram|linkedin|email"
    }},

    "status": "cold|warm|hot",
    "waiting_for": "lead_response|my_response|nothing",
    "last_contact_summary": "Letzte Nachricht kurz",

    "conversation_summary": "2-3 Sätze Zusammenfassung",
    "suggested_next_action": "Konkrete nächste Aktion",
    "follow_up_days": 3,

    "customer_message": "Fertige Nachricht an Kunden (copy-ready, Du-Form, freundlich)",
    "crm_note": "Strukturierte CRM-Notiz mit allen Fakten",
    "follow_up_draft": "Nachfass-Nachricht falls keine Antwort",
    "key_points": ["Punkt 1", "Punkt 2"]
}}


Regeln:
- Bei "question": Nur input_type, Rest null/leer
- Mein Name ist NICHT der Lead - erkenne wer ICH bin vs LEAD
- customer_message soll direkt versendbar sein
- follow_up_days: hot=2, warm=3, cold=5
"""

        model = get_model_for_task("analyze_conversation")
        max_tokens = get_max_tokens_for_task("analyze_conversation")
        message = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text.strip()

        # Clean markdown
        if "```" in response_text:
            parts = response_text.split("```")
            response_text = parts[1] if len(parts) > 1 else parts[0]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        data = json.loads(response_text)

        # Check if lead exists
        lead_exists = False
        existing_lead_id = None

        if data.get("lead", {}).get("name"):
            supabase = get_supabase_client()
            search_name = data["lead"]["name"]
            result = (
                supabase.table("leads")
                .select("id, name")
                .eq("user_id", str(current_user["id"]))
                .ilike("name", f"%{search_name}%")
                .limit(1)
                .execute()
            )

        return AnalyzeResponse(
            success=True,
            result=AnalysisResult(
                input_type=data.get("input_type", "question"),
                lead=LeadData(**data.get("lead", {})) if data.get("lead") else None,
                status=data.get("status"),
                waiting_for=data.get("waiting_for"),
                last_contact_summary=data.get("last_contact_summary"),
                conversation_summary=data.get("conversation_summary"),
                suggested_next_action=data.get("suggested_next_action"),
                follow_up_days=data.get("follow_up_days", 3),
                customer_message=data.get("customer_message"),
                crm_note=data.get("crm_note"),
                follow_up_draft=data.get("follow_up_draft"),
                key_points=data.get("key_points", []),
                lead_exists=bool(
                    result.data and len(result.data) > 0 if "result" in locals() else False
                ),
                existing_lead_id=(
                    result.data[0]["id"] if "result" in locals() and result.data else None
                ),
            ),
        )

    except json.JSONDecodeError as e:
        return AnalyzeResponse(success=False, error=f"Parse error: {str(e)}")
    except Exception as e:
        return AnalyzeResponse(success=False, error=str(e))


@router.post("/parse-list")
async def parse_contact_list(
    request: ContactListRequest,
    current_user=Depends(get_current_user),
):
    """Parse eine eingefügte Kontaktliste in strukturierte Kontakte."""
    if not request.text or not request.text.strip():
        return {"success": False, "error": "Kein Text übergeben"}

    # Optional: nur parsen, wenn es wirklich wie eine Liste aussieht
    if not detect_list_input(request.text):
        return {"success": False, "error": "Keine Liste erkannt"}

    try:
        data = parse_contacts_from_text(request.text)
        return {"success": True, "input_type": "contact_list", **data}
    except Exception:
        return {"success": False, "error": "Konnte Liste nicht parsen"}


@router.post("/save-lead")
async def save_lead_from_analysis(
    request: SaveLeadRequest,
    current_user=Depends(get_current_user),
):
    """Save analyzed lead to database with all context."""
    try:
        supabase = get_supabase_client()

        # Bestimme Contact Status basierend auf Chat-Analyse
        chat_analysis = {
            "last_message_by": "user" if request.waiting_for == "lead_response" else "lead" if request.waiting_for == "my_response" else None,
            "lead_replied": request.waiting_for == "my_response",
            "last_message_date": None,  # Könnte aus conversation_summary extrahiert werden
        }
        
        status_updates = set_contact_status_from_chat_analysis({}, chat_analysis)
        
        # Fallback: Wenn keine Chat-Analyse möglich, setze never_contacted
        if not status_updates.get("contact_status"):
            status_updates["contact_status"] = CONTACT_STATUS_NEVER_CONTACTED
            status_updates["contact_count"] = 0
        
        lead_data = {
            "user_id": str(current_user["id"]),
            "name": request.lead.name,
            "first_name": request.lead.first_name,
            "last_name": request.lead.last_name,
            "email": request.lead.email,
            "phone": request.lead.phone,
            "instagram": request.lead.instagram,
            "linkedin": request.lead.linkedin,
            "whatsapp": request.lead.whatsapp or request.lead.phone,
            "facebook": request.lead.facebook,
            "company": request.lead.company,
            "position": request.lead.position,
            "city": request.lead.city,
            "country": request.lead.country,
            "platform": request.lead.platform,
            "source": "smart_import",
            "status": "active",
            "temperature": request.status,
            "notes": request.notes,
            "last_message": request.first_message,
            "channel": request.channel,
            # Lead Status System
            **status_updates,
            "last_contact": datetime.now().isoformat(),
            "next_follow_up": (
                datetime.now() + timedelta(days=request.follow_up_days)
            )
            .date()
            .isoformat(),
            "follow_up_reason": "Follow-up nach erstem Kontakt",
        }

        # Remove None values
        lead_data = {k: v for k, v in lead_data.items() if v is not None}

        result = supabase.table("leads").insert(lead_data).execute()

        return {
            "success": True,
            "lead_id": result.data[0]["id"],
            "lead": result.data[0],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-lead-status")
async def update_lead_from_reply(
    lead_id: str,
    new_status: str,
    last_message: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """Update lead status when they reply."""
    try:
        supabase = get_supabase_client()

        update_data = {
            "temperature": new_status,
            "last_contact": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

        if last_message:
            update_data["last_message"] = last_message

        result = (
            supabase.table("leads")
            .update(update_data)
            .eq("id", lead_id)
            .eq("user_id", str(current_user["id"]))
            .execute()
        )

        return {"success": True, "lead": result.data[0] if result.data else None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

