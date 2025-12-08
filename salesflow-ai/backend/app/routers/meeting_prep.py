import json
import logging
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from ..ai_client import chat_completion
from ..core.config import settings
from ..core.deps import get_current_user, get_supabase

router = APIRouter(prefix="/meeting-prep", tags=["meeting-prep"])

logger = logging.getLogger(__name__)


class MeetingPrepRequest(BaseModel):
    name: str
    company: Optional[str] = None


class MeetingPrepResponse(BaseModel):
    success: bool
    lead: Optional[Dict[str, Any]] = None
    web_sources: Dict[str, Any] = {}
    prep: Dict[str, Any] = {}
    message: Optional[str] = None


def _build_web_sources(name: str, company: Optional[str], lead: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Construct helpful research links without relying on external API keys."""
    search_query = f"{name} {company}".strip() if company else name
    web_sources: Dict[str, Any] = {
        "google_search": f"https://www.google.com/search?q={quote_plus(search_query)}",
        "linkedin_search": f"https://www.linkedin.com/search/results/all/?keywords={quote_plus(search_query)}",
    }

    instagram = (lead or {}).get("instagram")
    if instagram:
        handle = instagram.lstrip("@")
        web_sources["instagram_profile"] = f"https://instagram.com/{handle}"

    company_val = company or (lead or {}).get("company")
    if company_val:
        web_sources["company_news"] = f"https://www.google.com/search?q={quote_plus(company_val + ' news')}"

    return web_sources


def _build_crm_snapshot(lead: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not lead:
        return {}
    fields = [
        "name",
        "first_name",
        "last_name",
        "company",
        "status",
        "temperature",
        "notes",
        "last_message",
        "last_contact",
        "next_follow_up",
        "follow_up_reason",
    ]
    return {k: lead.get(k) for k in fields if lead.get(k) is not None}


async def _generate_prep(crm_data: Dict[str, Any], web_sources: Dict[str, Any]) -> Dict[str, Any]:
    """Call the LLM to craft a concise meeting prep doc."""
    context = {
        "crm_data": crm_data,
        "web_sources": web_sources,
    }
    system_prompt = (
        "Du bist ein deutschsprachiger Meeting-Prep-Coach. "
        "Nutze nur die gelieferten CRM-Daten und Links. Erfinde nichts. "
        "Liefere JSON mit Schlüsseln: "
        "opener (string), "
        "talking_points (array von Objekten mit title, reason), "
        "objections (array von Objekten mit title, rebuttal), "
        "recommendation (string), "
        "summary (string). "
        "Halte Antworten prägnant."
    )
    user_prompt = (
        "Bereite ein Gespräch vor. Kontext und Links:\n"
        f"{json.dumps(context, ensure_ascii=False, indent=2)}\n"
        "Antwort NUR als JSON."
    )

    try:
        raw = await chat_completion(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model=settings.openai_model,
            max_tokens=700,
            temperature=0.4,
        )
        cleaned = raw.strip().strip("`").strip()
        if cleaned.startswith("{"):
            return json.loads(cleaned)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Meeting prep generation failed: %s", exc)

    # Fallback minimal structure
    fallback_points: List[Dict[str, str]] = []
    notes = crm_data.get("notes")
    if notes:
        fallback_points.append({"title": "Wissensstand", "reason": notes[:280]})

    return {
        "opener": "Danke, dass du dir Zeit nimmst – ich habe ein paar gezielte Fragen vorbereitet.",
        "talking_points": fallback_points or [
            {"title": "Ziele & Status", "reason": "Kurz klären, was aktuell wichtig ist und wo du unterstützen kannst."}
        ],
        "objections": [
            {"title": "Preis", "rebuttal": "Rahmen klären, Nutzen betonen und eine kleine Pilotphase anbieten."}
        ],
        "recommendation": "Halte das Gespräch fokussiert, sichere ein klares Next Step (z. B. Demo oder Angebot).",
        "summary": "Nutze CRM-Notizen und die Links, um 1–2 personalisierte Hooks zu setzen.",
    }


@router.post("", response_model=MeetingPrepResponse)
async def prepare_meeting(
    payload: MeetingPrepRequest,
    supabase: Client = Depends(get_supabase),
    current_user=Depends(get_current_user),
):
    """Generate a meeting preparation packet combining CRM + research links."""
    if not payload.name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name darf nicht leer sein.")

    try:
        query = supabase.table("leads").select("*").ilike("name", f"%{payload.name.strip()}%")
        if payload.company:
            query = query.ilike("company", f"%{payload.company.strip()}%")
        lead_result = query.limit(1).execute()
        lead = lead_result.data[0] if lead_result and lead_result.data else None
    except Exception as exc:  # noqa: BLE001
        logger.error("Lead lookup failed: %s", exc)
        raise HTTPException(status_code=500, detail="Lead-Suche fehlgeschlagen.")

    web_sources = _build_web_sources(payload.name, payload.company, lead)
    crm_snapshot = _build_crm_snapshot(lead)

    prep = await _generate_prep(crm_snapshot, web_sources)

    return MeetingPrepResponse(
        success=True,
        lead=lead,
        web_sources=web_sources,
        prep=prep,
        message=f"Gesprächsvorbereitung für {payload.name} erstellt.",
    )

