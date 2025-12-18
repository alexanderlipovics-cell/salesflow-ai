"""
Delay-Master-Endpoint mit Supabase-Templates und Fallback-Logik.
"""

from __future__ import annotations

import random
from typing import Any, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import Client

from app.core.deps import get_supabase

DelayBranch = Literal["network_marketing", "immo", "finance", "coaching", "generic"]
DelayChannel = Literal["whatsapp", "email", "instagram_dm", "facebook_dm"]
DelayTone = Literal["du", "sie"]
DelaySource = Literal["template", "llm", "fallback"]

router = APIRouter(prefix="/api/delay", tags=["delay"])


class DelayRequest(BaseModel):
    branch: DelayBranch
    channel: DelayChannel
    tone: DelayTone
    minutes_late: int = Field(..., ge=1, le=240)
    name: Optional[str] = None
    location: Optional[str] = None
    context: Optional[str] = None
    last_template_id: Optional[UUID] = None


class DelayResponse(BaseModel):
    message: str
    template_id: Optional[UUID] = None
    source: DelaySource


def fetch_delay_templates_from_db(
    client: Client,
    branch: DelayBranch,
    channel: DelayChannel,
    tone: DelayTone,
) -> list[dict[str, Any]]:
    try:
        response = (
            client.table("delay_message_templates")
            .select("*")
            .eq("branch", branch)
            .eq("channel", channel)
            .eq("tone", tone)
            .eq("is_active", True)
            .execute()
        )
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=502, detail="Supabase-Fehler beim Laden der Delay-Templates."
        ) from exc

    return getattr(response, "data", None) or []


def choose_template_variant(
    templates: list[dict[str, Any]], last_template_id: Optional[UUID]
) -> Optional[dict[str, Any]]:
    if not templates:
        return None

    if last_template_id:
        filtered = [
            template
            for template in templates
            if str(template.get("id")) != str(last_template_id)
        ]
        if filtered:
            templates = filtered

    return random.choice(templates)


def render_template_message(template: dict[str, Any], payload: DelayRequest) -> str:
    message = template.get("message") or ""
    if not message:
        return ""

    replacements = {
        "name": payload.name or ("dir" if payload.tone == "du" else "Ihnen"),
        "location": payload.location or "vor Ort",
        "minutes": str(payload.minutes_late),
        "context": payload.context or "",
    }

    for key, value in replacements.items():
        message = message.replace(f"{{{key}}}", value)

    return " ".join(message.split())


DEFAULT_BRANCH_REASONS: dict[DelayBranch, str] = {
    "network_marketing": "Ein spontaner Call mit einem potenziellen Partner zieht sich gerade noch etwas.",
    "immo": "Ich komme direkt aus einem Besichtigungstermin, der ein paar Minuten länger dauert.",
    "finance": "Ein Kundengespräch zu Finanzunterlagen braucht gerade noch einen Moment.",
    "coaching": "Die vorherige Session geht noch ein paar Minuten länger als geplant.",
    "generic": "Mein voriger Termin überschneidet sich minimal.",
}

CHANNEL_ASSURANCES: dict[DelayChannel, dict[DelayTone, str]] = {
    "whatsapp": {
        "du": "Ich schreibe dir hier sofort, sobald ich losfahre.",
        "sie": "Ich melde mich hier direkt, sobald ich losfahre.",
    },
    "email": {
        "du": "Ich gebe dir per Mail kurz Bescheid, sobald ich unterwegs bin.",
        "sie": "Ich informiere Sie per Mail, sobald ich auf dem Weg bin.",
    },
    "instagram_dm": {
        "du": "Ich droppe dir gleich hier ein kurzes Update, sobald ich näher dran bin.",
        "sie": "Ich sende Ihnen gleich hier ein kurzes Update, sobald ich näher dran bin.",
    },
    "facebook_dm": {
        "du": "Ich ping dich hier nochmal an, sobald ich losfahre.",
        "sie": "Ich melde mich hier erneut, sobald ich losfahre.",
    },
}

CLOSINGS: dict[DelayTone, str] = {
    "du": "Danke dir fürs Verständnis!",
    "sie": "Vielen Dank für Ihr Verständnis.",
}


def build_delay_fallback_message(payload: DelayRequest) -> str:
    informal = payload.tone == "du"
    name = (payload.name or "").strip()
    salutation = f"Hey {name}".strip() if informal else f"Guten Tag {name}".strip()
    if salutation:
        salutation = f"{salutation},"

    reason = (payload.context or "").strip() or DEFAULT_BRANCH_REASONS[payload.branch]
    location = (payload.location or "").strip()

    if location:
        location_sentence = (
            f"Ich bin gleich bei {location} und wir starten dann entspannt."
            if informal
            else f"Ich bin gleich bei Ihnen in {location} und wir starten dann entspannt."
        )
    else:
        location_sentence = (
            "Ich beeile mich und komme direkt zu dir."
            if informal
            else "Ich beeile mich und bin umgehend bei Ihnen."
        )

    assurance = CHANNEL_ASSURANCES[payload.channel][payload.tone]
    closing = CLOSINGS[payload.tone]

    parts = [
        f"{salutation} ich hänge gerade noch etwa {payload.minutes_late} Minuten fest."
        if salutation
        else f"Ich hänge gerade noch etwa {payload.minutes_late} Minuten fest.",
        reason,
        location_sentence,
        assurance,
        closing,
    ]

    return " ".join(part for part in parts if part).strip()


@router.post("/generate", response_model=DelayResponse)
async def generate_delay_message(
    request: DelayRequest,
    supabase: Client = Depends(get_supabase),
) -> DelayResponse:
    templates = fetch_delay_templates_from_db(
        client=supabase,
        branch=request.branch,
        channel=request.channel,
        tone=request.tone,
    )

    chosen = choose_template_variant(templates, request.last_template_id)
    if chosen:
        message = render_template_message(chosen, request).strip()
        if message:
            return DelayResponse(
                message=message,
                template_id=chosen.get("id"),
                source="template",
            )

    fallback_message = build_delay_fallback_message(request)
    return DelayResponse(message=fallback_message, template_id=None, source="fallback")


__all__ = [
    "router",
    "DelayRequest",
    "DelayResponse",
    "build_delay_fallback_message",
    "fetch_delay_templates_from_db",
]

