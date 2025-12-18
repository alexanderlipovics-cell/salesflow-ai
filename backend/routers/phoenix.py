from datetime import datetime
from typing import List, Literal, Optional

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import Client, create_client


SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("SUPABASE_URL und SUPABASE_SERVICE_KEY müssen gesetzt sein")

# KRITISCH: Nur URL und Key übergeben - KEINE zusätzlichen Parameter!
# Signatur: create_client(url: str, key: str) -> Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

router = APIRouter(prefix="/phoenix", tags=["phoenix"])

Vertical = Literal["network_marketing", "immo", "finance", "coaching", "generic"]
SuggestionType = Literal["customer_nearby", "lead_nearby", "cafe"]


class LocationPayload(BaseModel):
    description: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class PhoenixRequest(BaseModel):
    user_id: str
    vertical: Vertical = "generic"
    mode: Literal["too_early"] = "too_early"
    time_window_minutes: int = 30
    location: LocationPayload
    max_suggestions: int = 3


class PhoenixSuggestion(BaseModel):
    type: SuggestionType
    title: str
    subtitle: Optional[str] = None
    reason: str
    distance_km: Optional[float] = None
    lead_id: Optional[str] = None
    address: Optional[str] = None


class PhoenixResponse(BaseModel):
    summary: str
    suggestions: List[PhoenixSuggestion]


def _score_lead_for_vertical(vertical: Vertical, lead: dict) -> float:
    """
    Einfache Lead-Bewertung: Stage, Notizen und letzter Kontakt erhöhen den Score.
    """

    stage = (lead.get("stage") or "").lower()
    last_contacted = lead.get("last_contacted_at")
    score = 0.0

    if stage in ("interested", "warm", "follow_up"):
        score += 2.0
    elif stage in ("customer", "client"):
        score += 1.5
    elif stage in ("lost", "cold"):
        score += 0.5

    notes = (lead.get("notes") or "").lower()
    if vertical == "network_marketing" and "team" in notes:
        score += 0.5
    elif vertical == "immo" and "immobilie" in notes:
        score += 0.5
    elif vertical == "finance" and "vorsorge" in notes:
        score += 0.5

    if last_contacted:
        try:
            dt = datetime.fromisoformat(last_contacted.replace("Z", "+00:00"))
            days_ago = (datetime.utcnow() - dt).days
            score += min(days_ago / 30.0, 3.0)
        except Exception:
            pass

    return score


def _fetch_nearby_leads(req: PhoenixRequest) -> List[PhoenixSuggestion]:
    """
    Aktuell: einfacher Stadt-Substring-Match. Später echte Distanz-Logik.
    """

    city_hint = req.location.description.split(",")[0].strip()
    query = supabase.table("leads").select("*").eq("owner_user_id", req.user_id)

    if city_hint:
        query = query.ilike("location_city", f"%{city_hint}%")

    query = query.in_("stage", ["interested", "follow_up", "customer", "warm"])
    resp = query.limit(50).execute()

    if resp.error:
        raise HTTPException(status_code=500, detail=str(resp.error))

    leads = resp.data or []
    scored = sorted(
        ((lead, _score_lead_for_vertical(req.vertical, lead)) for lead in leads),
        key=lambda item: item[1],
        reverse=True,
    )

    suggestions: List[PhoenixSuggestion] = []
    for lead, score in scored[: req.max_suggestions]:
        suggestions.append(
            PhoenixSuggestion(
                type="lead_nearby",
                title=f"{lead.get('full_name') or 'Unbekannter Kontakt'} – {lead.get('company_name') or ''}".strip(
                    " –"
                ),
                subtitle=f"Stage: {lead.get('stage') or 'unbekannt'}",
                reason=(
                    f"Reaktivierungskandidat (Score {score:.1f}) – letzter Kontakt: "
                    f"{lead.get('last_contacted_at') or 'unbekannt'}"
                ),
                distance_km=None,
                lead_id=lead.get("id"),
                address=", ".join(
                    [
                        (lead.get("street") or "").strip(),
                        (lead.get("postal_code") or "").strip(),
                        (lead.get("location_city") or "").strip(),
                    ]
                ).strip(", "),
            )
        )

    return suggestions


def _dummy_cafes(req: PhoenixRequest, remaining_slots: int) -> List[PhoenixSuggestion]:
    """
    Platzhalter für künftige Places-API-Integration.
    """

    if remaining_slots <= 0:
        return []

    base_title = f"Café in der Nähe von {req.location.description}"
    cafes: List[PhoenixSuggestion] = [
        PhoenixSuggestion(
            type="cafe",
            title=base_title,
            subtitle="Ruhiger Spot für Calls & DMs",
            reason="Nutze die Zeit für Follow-ups, Voice-Nachrichten und Termin-Nacharbeit.",
            distance_km=0.2,
            address=req.location.description,
        )
    ]

    if remaining_slots > 1:
        cafes.append(
            PhoenixSuggestion(
                type="cafe",
                title=f"Alternatives Café in {req.location.description}",
                subtitle="Gut zum Laptop-Arbeiten",
                reason=(
                    "Setz dich hin, arbeite 30 Minuten deinen Phönix-Stack ab "
                    "(alte Leads, offene Angebote)."
                ),
                distance_km=0.5,
                address=req.location.description,
            )
        )

    return cafes[:remaining_slots]


@router.post("/opportunities", response_model=PhoenixResponse)
def get_phoenix_opportunities(req: PhoenixRequest) -> PhoenixResponse:
    """
    Liefert Vorschläge, wie Nutzer Wartezeit bestmöglich nutzen können.
    """

    if req.mode != "too_early":
        raise HTTPException(status_code=400, detail="Nur mode 'too_early' wird aktuell unterstützt.")

    lead_suggestions = _fetch_nearby_leads(req)
    remaining = max(req.max_suggestions - len(lead_suggestions), 0)
    cafe_suggestions = _dummy_cafes(req, remaining)
    all_suggestions = lead_suggestions + cafe_suggestions

    if not all_suggestions:
        return PhoenixResponse(
            summary=(
                "Phönix-Modus: Du bist zu früh in "
                f"{req.location.description}, aber ich finde keine passenden Kunden "
                "in deiner Nähe. Nutze die Zeit für generische Follow-ups."
            ),
            suggestions=[],
        )

    summary = (
        f"Phönix-Modus: Du bist zu früh in {req.location.description}. "
        f"Hier sind {len(all_suggestions)} Optionen, wie du die nächsten "
        f"{req.time_window_minutes} Minuten nutzen kannst."
    )

    return PhoenixResponse(summary=summary, suggestions=all_suggestions)

