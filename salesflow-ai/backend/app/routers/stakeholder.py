import json
import logging
import os
from typing import List, Optional
from urllib.parse import quote_plus

from anthropic import Anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..core.deps import get_current_user, get_supabase
from ..core.ai_router import get_model_for_task, get_max_tokens_for_task


router = APIRouter(prefix="/stakeholder", tags=["stakeholder"])


class StakeholderQuery(BaseModel):
    name: str
    company: Optional[str] = None
    context: Optional[str] = None  # z.B. Einkauf, IT-Leiter
    lead_id: Optional[str] = None  # Optional: bestehender Lead-Bezug


class StakeholderResult(BaseModel):
    name: str
    probable_title: Optional[str] = None
    probable_email_pattern: Optional[str] = None
    linkedin_search_url: str
    google_search_url: str
    confidence: float = 0.5
    suggestions: List[str] = []


class SaveStakeholderRequest(BaseModel):
    name: str
    company: Optional[str] = None
    position: Optional[str] = None
    email: Optional[str] = None
    linkedin: Optional[str] = None
    lead_id: Optional[str] = None
    notes: Optional[str] = None


@router.post("/lookup", response_model=StakeholderResult)
async def lookup_stakeholder(
    query: StakeholderQuery,
    current_user=Depends(get_current_user),
):
    """Recherche eines Stakeholders inkl. LinkedIn/Google-Suchlinks."""
    name = query.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name darf nicht leer sein.")

    company = (query.company or "").strip()
    context = (query.context or "").strip()

    linkedin_query = f"{name} {company}".strip()
    linkedin_url = (
        f"https://www.linkedin.com/search/results/people/?keywords={quote_plus(linkedin_query)}"
    )

    google_query = f"{name} {company} LinkedIn".strip()
    google_url = f"https://www.google.com/search?q={quote_plus(google_query)}"

    # Default-Werte, falls KI-Auswertung fehlschlägt
    ai_data = {
        "probable_title": None,
        "probable_email_pattern": None,
        "confidence": 0.3,
        "suggestions": ["Suche manuell auf LinkedIn"],
    }

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        try:
            client = Anthropic(api_key=api_key)
            prompt = f"""Basierend auf diesen Infos, was kannst du über diese Person vermuten?

Name: {name}
Firma: {company}
Kontext: {context}

Antworte NUR mit JSON:
{{
    "probable_title": "Wahrscheinlicher Jobtitel basierend auf Kontext",
    "probable_email_pattern": "vorname.nachname@firma.com oder v.nachname@firma.com",
    "confidence": 0.7,
    "suggestions": [
        "Suche auf LinkedIn nach...",
        "Frag deinen Kontakt nach der genauen Position",
        "..."
    ]
}}

Wenn wenig Info vorhanden, niedrige confidence setzen."""

            model = get_model_for_task("stakeholder_inference")
            max_tokens = get_max_tokens_for_task("stakeholder_inference")
            message = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = message.content[0].text.strip()
            if "```" in response_text:
                parts = response_text.split("```")
                response_text = parts[1] if len(parts) > 1 else parts[0]
                if response_text.startswith("json"):
                    response_text = response_text[4:]

            ai_data = json.loads(response_text.strip())
        except Exception as exc:  # pragma: no cover - defensive fallback
            logging.warning("Stakeholder lookup: KI-Auswertung fehlgeschlagen: %s", exc)
    else:
        logging.warning("Stakeholder lookup: ANTHROPIC_API_KEY fehlt - verwende Fallback.")

    return StakeholderResult(
        name=name,
        probable_title=ai_data.get("probable_title"),
        probable_email_pattern=ai_data.get("probable_email_pattern"),
        linkedin_search_url=linkedin_url,
        google_search_url=google_url,
        confidence=ai_data.get("confidence", 0.5),
        suggestions=ai_data.get("suggestions", []),
    )


@router.post("/save-contact")
async def save_stakeholder_as_contact(
    payload: SaveStakeholderRequest,
    current_user=Depends(get_current_user),
):
    """Stakeholder als Kontakt in Supabase-Leads speichern."""
    supabase = get_supabase()

    parts = payload.name.strip().split()
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    contact_data = {
        "user_id": str(current_user["id"]),
        "name": payload.name,
        "first_name": first_name,
        "last_name": last_name,
        "company": payload.company,
        "position": payload.position,
        "email": payload.email,
        "linkedin": payload.linkedin,
        "source": "stakeholder_mapping",
        "status": "active",
        "temperature": "cold",
        "notes": payload.notes,
        "related_lead_id": payload.lead_id,
    }

    # None-Werte entfernen
    contact_data = {key: value for key, value in contact_data.items() if value is not None}

    result = supabase.table("leads").insert(contact_data).execute()

    return {"success": True, "contact": result.data[0] if result.data else None}

