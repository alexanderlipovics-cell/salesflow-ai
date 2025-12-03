"""
Follow-up-Router für die Follow-up Engine & Tages-Cockpit.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Literal, Optional, cast
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai_client import AIClient
from app.config import get_settings
from app.prompts_chief import CHIEF_SYSTEM_PROMPT
from app.schemas import ChatMessage
from app.supabase_client import get_supabase_client

router = APIRouter(prefix="/followups", tags=["followups"])
settings = get_settings()
logger = logging.getLogger(__name__)

_ai_client: Optional[AIClient] = None

FollowUpStage = Literal["first_contact", "followup1", "followup2", "reactivation"]
FollowUpChannel = Literal["whatsapp", "email", "dm"]
FollowUpTone = Literal["du", "sie"]

VALID_STAGE_VALUES = set(FollowUpStage.__args__)  # type: ignore[attr-defined]
VALID_CHANNEL_VALUES = set(FollowUpChannel.__args__)  # type: ignore[attr-defined]
VALID_TONE_VALUES = set(FollowUpTone.__args__)  # type: ignore[attr-defined]

LEGACY_STAGE_MAP = {
    "first_touch": "first_contact",
    "followup_1": "followup1",
    "followup_2": "followup2",
}
LEGACY_CHANNEL_MAP = {
    "instagram_dm": "dm",
    "facebook_dm": "dm",
}


class FollowupGenerateRequest(BaseModel):
    branch: str
    stage: FollowUpStage
    channel: FollowUpChannel
    tone: FollowUpTone
    name: Optional[str] = None
    context: Optional[str] = None


class FollowupGenerateResponse(BaseModel):
    message: str
    template_id: Optional[str] = None
    source: Optional[str] = None


class FollowupTaskItem(BaseModel):
    id: UUID
    lead_id: Optional[UUID] = None
    lead_name: str
    branch: str
    stage: FollowUpStage
    channel: FollowUpChannel
    tone: FollowUpTone
    context: Optional[str] = None
    due_at: datetime
    last_result: Optional[str] = None


def _get_ai_client() -> Optional[AIClient]:
    """
    Liefert einen wiederverwendeten AIClient oder None, wenn keine Credentials vorhanden sind.
    """

    global _ai_client
    if not settings.openai_api_key:
        return None

    if _ai_client is None:
        _ai_client = AIClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )
    return _ai_client


def build_followup_prompt(req: FollowupGenerateRequest) -> str:
    """
    Baut einen klaren Prompt für das FOLLOW-UP ENGINE Modul des CHIEF.
    """

    branch_label = (req.branch or "Sales / Business").strip() or "Sales / Business"

    stage_label = {
        "first_contact": "Erstkontakt",
        "followup1": "erstes Follow-up",
        "followup2": "zweites Follow-up / letztes höfliches Nachfassen",
        "reactivation": "Reaktivierung nach längerer Pause",
    }.get(req.stage, "Follow-up")

    channel_label = {
        "whatsapp": "WhatsApp",
        "email": "E-Mail",
        "dm": "Direktnachricht",
    }.get(req.channel, "Nachricht")

    tone_label = "du" if req.tone == "du" else "Sie"

    name = req.name or "dein Kontakt"
    context = req.context.strip() if req.context else "Kein zusätzlicher Kontext."

    prompt = f"""
Du arbeitest im FOLLOW-UP ENGINE Modul.

Aufgabe:
Schreibe eine einzige Follow-up-Nachricht auf Deutsch, die sofort verschickt werden kann.

Rahmen:
- Branche: {branch_label}
- Phase: {stage_label}
- Kanal: {channel_label}
- Ton: {tone_label}
- Name des Kontakts: {name}

Kontext (falls relevant):
{context}

Zusatzregeln:
- Nutze den Ton "{tone_label}" konsequent und baue einen klaren, aber nicht aufdringlichen Call-to-Action ein (z. B. kurzer Call, Termin, Rückmeldung).
- Passe die Dramaturgie an die Phase an:
  - first_contact -> freundlicher Erstkontakt, kurzer Pitch, klarer CTA.
  - followup1 -> referenziere letzte Nachricht, öffne Einwände ("falls du unsicher bist ...").
  - followup2 -> höfliches letztes Nachfassen, Entscheidung erleichtern, Option zum Absagen lassen.
  - reactivation -> Bezug auf früheren Kontakt, echtes Interesse an Entwicklung, Einladung zum unverbindlichen Update.
- Keine Erklärungen oder Meta-Kommentare - gib nur den Nachrichtentext aus, optional mit Zeilenumbrüchen.
- Halte die Nachricht kompakt (max. 5-6 Sätze) und schreibe sie so, als käme sie von einem erfahrenen Vertriebler.
""".strip()

    return prompt


async def _generate_followup_via_llm(req: FollowupGenerateRequest) -> str:
    """
    Versucht, über die zentrale CHIEF-/LLM-Infrastruktur eine Follow-up-Nachricht zu erzeugen.
    """

    client = _get_ai_client()
    if not client:
        raise NotImplementedError("CHIEF-Client ist nicht konfiguriert.")

    prompt = build_followup_prompt(req)
    return client.generate(
        CHIEF_SYSTEM_PROMPT,
        [ChatMessage(role="user", content=prompt)],
    )


async def call_chief_followup_engine(req: FollowupGenerateRequest) -> FollowupGenerateResponse:
    """
    Wrapper gegen den CHIEF-LLM. Dient als saubere Integrations-Schicht.
    """

    message = await _generate_followup_via_llm(req)
    return FollowupGenerateResponse(
        message=message.strip(),
        template_id=None,
        source="chief",
    )


async def generate_followup_message(req: FollowupGenerateRequest) -> FollowupGenerateResponse:
    """
    Orchestriert die Generierung: zuerst CHIEF, dann Fallback.
    """

    try:
        return await call_chief_followup_engine(req)
    except NotImplementedError:
        logger.info("OPENAI_API_KEY fehlt - nutze Follow-up-Fallback.")
    except Exception as llm_exc:  # pragma: no cover - defensive
        logger.warning("LLM-Follow-up fehlgeschlagen: %s", llm_exc)

    fallback_message = build_followup_message_fallback(req)
    return FollowupGenerateResponse(
        message=fallback_message,
        template_id=None,
        source="fallback",
    )


@router.post("/generate", response_model=FollowupGenerateResponse)
async def generate_followup(req: FollowupGenerateRequest) -> FollowupGenerateResponse:
    """
    Erzeugt eine Follow-up-Nachricht inkl. Fallback-Mechanik.
    """

    try:
        return await generate_followup_message(req)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/due-today", response_model=list[FollowupTaskItem])
async def get_due_followups_today() -> list[FollowupTaskItem]:
    """
    Liefert alle offenen Follow-up Tasks, die am aktuellen Tag fällig sind.
    """

    try:
        client = get_supabase_client()
        today_iso = date.today().isoformat()
        response = (
            client.table("followup_tasks")
            .select(
                "id,lead_id,lead_name,branch,stage,channel,tone,context,due_at,last_result"
            )
            .eq("status", "open")
            .filter("due_at::date", "eq", today_iso)
            .order("due_at", desc=False)
            .limit(20)
            .execute()
        )
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    rows = getattr(response, "data", None) or []

    items: list[FollowupTaskItem] = []
    for row in rows:
        try:
            items.append(
                FollowupTaskItem(
                    id=row["id"],
                    lead_id=row.get("lead_id"),
                    lead_name=row.get("lead_name") or "Unbekannt",
                    branch=(row.get("branch") or "generic").strip() or "generic",
                    stage=_sanitize_stage(row.get("stage")),
                    channel=_sanitize_channel(row.get("channel")),
                    tone=_sanitize_tone(row.get("tone")),
                    context=row.get("context"),
                    due_at=row.get("due_at"),
                    last_result=row.get("last_result"),
                )
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Konnte Follow-up-Row nicht parsen: %s", exc)

    return items


def build_followup_message_fallback(req: FollowupGenerateRequest) -> str:
    name = req.name or "dein Kontakt"
    kanal = {
        "whatsapp": "WhatsApp",
        "email": "E-Mail",
        "dm": "DM",
    }.get(req.channel, "Nachricht")

    branch_label = (req.branch or "Sales / Business").strip() or "Sales / Business"
    tone_du = req.tone == "du"

    if req.context:
        context = f"{req.context.strip()}\n\n"
    else:
        context = ""

    if req.stage == "first_contact":
        if tone_du:
            return (
                f"Hey {name},\n\n"
                f"ich wollte dir kurz schreiben, weil du super in unser {branch_label}-Profil passt. "
                f"Lass uns gern in den nächsten Tagen einen kurzen {kanal}-Call machen und schauen, "
                f"wie ich dich unterstützen kann.\n\n"
                f"Sag mir einfach, was dir zeitlich passt. 🙂"
            )
        return (
            f"Guten Tag {name},\n\n"
            f"ich melde mich, weil Sie hervorragend in unser {branch_label}-Profil passen. "
            f"Gern würde ich mich kurz per {kanal} mit Ihnen austauschen, um zu sehen, wie wir helfen können.\n\n"
            f"Geben Sie mir einfach ein kurzes Zeichen, wann es für Sie passt."
        )

    if req.stage == "followup1":
        if tone_du:
            return (
                f"Hey {name},\n\n"
                f"{context}"
                f"ich wollte kurz nachhaken, ob du dir meine letzte Nachricht schon anschauen konntest. "
                f"Wenn du Fragen hast oder dir unsicher bist, klären wir das gern in einem kurzen Call.\n\n"
                f"Lass mich wissen, ob das spannend für dich ist."
            )
        return (
            f"Guten Tag {name},\n\n"
            f"{context}"
            f"ich wollte freundlich nachfragen, ob Sie meine vorherige Nachricht bereits sehen konnten. "
            f"Sehr gern beantworte ich offene Fragen in einem kurzen Gespräch.\n\n"
            f"Über eine kurze Rückmeldung freue ich mich."
        )

    if req.stage == "followup2":
        if tone_du:
            return (
                f"Hi {name},\n\n"
                f"{context}"
                f"ich melde mich ein letztes Mal, damit wir das Thema sauber abschließen. "
                f"Wenn es gerade nicht passt, gib mir einfach ein kurzes Update – vollkommen okay.\n\n"
                f"Und falls doch Interesse da ist, finden wir sofort einen Termin."
            )
        return (
            f"Guten Tag {name},\n\n"
            f"{context}"
            f"ich wollte ein letztes Mal kurz nachfassen, damit wir das Thema für Sie einordnen können. "
            f"Wenn es momentan nicht passt, reicht eine kurze Nachricht.\n\n"
            f"Sollte weiterhin Interesse bestehen, plane ich gern einen Termin ein."
        )

    if req.stage == "reactivation":
        if tone_du:
            return (
                f"Hey {name},\n\n"
                f"{context}"
                f"wir hatten vor einiger Zeit schon Kontakt zu {branch_label}-Themen. "
                f"Mich würde interessieren, wie sich deine Situation seitdem entwickelt hat "
                f"und ob es gerade wieder Sinn macht, dazu zu sprechen.\n\n"
                f"Wenn du magst, lass uns kurz updaten."
            )
        return (
            f"Guten Tag {name},\n\n"
            f"{context}"
            f"wir hatten vor einiger Zeit bereits Kontakt zu {branch_label}. "
            f"Mich würde interessieren, wie sich Ihre Situation entwickelt hat "
            f"und ob eine kurze Abstimmung erneut hilfreich wäre.\n\n"
            f"Gern können wir uns unverbindlich austauschen."
        )

    if tone_du:
        return (
            f"Hey {name},\n\n"
            f"{context}"
            f"ich wollte kurz hören, wo du gerade stehst.\n\n"
            f"Freue mich über ein kurzes Update."
        )
    return (
        f"Guten Tag {name},\n\n"
        f"{context}"
        f"ich wollte mich kurz nach dem aktuellen Stand erkundigen.\n\n"
        f"Über ein kurzes Feedback freue ich mich."
    )


def _sanitize_stage(value: Optional[str]) -> FollowUpStage:
    normalized = (value or "").strip().lower()
    normalized = LEGACY_STAGE_MAP.get(normalized, normalized)
    if normalized in VALID_STAGE_VALUES:
        return cast(FollowUpStage, normalized)
    return "followup1"


def _sanitize_channel(value: Optional[str]) -> FollowUpChannel:
    normalized = (value or "").strip().lower()
    normalized = LEGACY_CHANNEL_MAP.get(normalized, normalized)
    if normalized in VALID_CHANNEL_VALUES:
        return cast(FollowUpChannel, normalized)
    return "whatsapp"


def _sanitize_tone(value: Optional[str]) -> FollowUpTone:
    normalized = (value or "").strip().lower()
    if normalized in VALID_TONE_VALUES:
        return cast(FollowUpTone, normalized)
    return "du"


__all__ = [
    "generate_followup",
    "get_due_followups_today",
    "call_chief_followup_engine",
    "generate_followup_message",
]

