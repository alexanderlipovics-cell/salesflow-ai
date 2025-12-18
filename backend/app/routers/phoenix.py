"""
Phönix-Router: liefert Dummy-Vorschläge für Außendienst-Zeitfenster.
"""

from typing import Callable, Dict, List, Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/phoenix", tags=["phoenix"])

SuggestionType = Literal["customer_nearby", "lead_nearby", "cafe"]

SUMMARY_LABELS: Dict[str, str] = {
    "network_marketing": "Network-Marketing",
    "immo": "Immobilien",
    "finance": "Finanzberatung",
    "coaching": "Coaching / Beratung",
    "generic": "Allgemein / Außendienst",
}


def _clamp_minutes(raw_minutes: Optional[int]) -> int:
    if not raw_minutes:
        return 30
    return max(5, min(raw_minutes, 120))


def _resolve_location_description(location: Optional["Location"]) -> str:
    if location and location.description:
        cleaned = location.description.strip()
        if cleaned:
            return cleaned
    return "deiner Gegend"


def _network_marketing_suggestions(loc: str, minutes: int) -> List["PhoenixSuggestion"]:
    return [
        PhoenixSuggestion(
            type="lead_nearby",
            title="Warme Interessenten per Voice-Note reaktivieren",
            subtitle=f"{loc} · Fokus auf alte Gespräche",
            reason=(
                f"Schicke 2–3 kurze Voice-Nachrichten an Leads, die in {loc} zuletzt "
                f"nichts mehr von dir gehört haben. {minutes} Minuten reichen, um eine "
                "konkrete Aktion anzubieten."
            ),
            distance_km=0.6,
            lead_id="net-react-101",
        ),
        PhoenixSuggestion(
            type="customer_nearby",
            title="Aktive Team-Partner coachen",
            subtitle="Mini-Coaching / Status-Abgleich",
            reason=(
                f"Frag 1–2 Partner in {loc}, ob sie gerade 10 Minuten haben. "
                "Kurzer Status-Abgleich oder ein Mini-Coaching hält die Energie hoch."
            ),
            distance_km=1.1,
            lead_id="net-team-204",
        ),
        PhoenixSuggestion(
            type="lead_nearby",
            title="Neue Kontakte für Launch einladen",
            subtitle="Stories + kurze Einladung verschicken",
            reason=(
                f"Nutze {minutes} freie Minuten in {loc}, um 3 Kontakte persönlich auf deinen "
                "nächsten Call oder Launch aufmerksam zu machen."
            ),
            distance_km=0.3,
            lead_id="net-launch-310",
        ),
    ]


def _immo_suggestions(loc: str, minutes: int) -> List["PhoenixSuggestion"]:
    return [
        PhoenixSuggestion(
            type="customer_nearby",
            title="Alt-Kunden mit Marktupdate überraschen",
            subtitle=f"Verkäufer/Käufer aus {loc}",
            reason=(
                f"Ruf einen früheren Kunden an und gib ein kurzes Markt-Update. "
                f"In {loc} tut sich gerade viel – {minutes} Minuten reichen für einen "
                "wertigen Touchpoint."
            ),
            distance_km=1.0,
            lead_id="immo-cust-087",
        ),
        PhoenixSuggestion(
            type="lead_nearby",
            title="Besichtigung nachfassen",
            subtitle="Interessenten warten auf ein Update",
            reason=(
                f"Call 1–2 Leads, die zuletzt ein Objekt in {loc} besichtigt haben. "
                "Check, ob Fragen offen sind und biete eine Alternative an."
            ),
            distance_km=2.0,
            lead_id="immo-lead-144",
        ),
        PhoenixSuggestion(
            type="lead_nearby",
            title="Eigentümer für neue Listings ansprechen",
            subtitle=f"Kurzer Check bei Eigentümern aus {loc}",
            reason=(
                f"Schicke eine kurze Nachricht an Eigentümer in deinem Netzwerk, "
                f"ob sie über einen Verkauf nachdenken. {minutes} Minuten = 2 hochwertige Touchpoints."
            ),
            distance_km=1.5,
            lead_id="immo-owner-221",
        ),
    ]


def _finance_suggestions(loc: str, minutes: int) -> List["PhoenixSuggestion"]:
    return [
        PhoenixSuggestion(
            type="customer_nearby",
            title="Portfolio-Blitz-Check",
            subtitle=f"Bestandskunde in {loc}",
            reason=(
                f"Melde dich bei einem Kunden und biete einen 10-Minuten-Check zu Depot, "
                f"Rücklage oder Absicherung an. {minutes} Minuten reichen für ein kurzes Update."
            ),
            distance_km=0.9,
            lead_id="fin-cust-055",
        ),
        PhoenixSuggestion(
            type="lead_nearby",
            title="Vorsorge-Interessent einplanen",
            subtitle="Lead wartet auf Rückruf",
            reason=(
                f"Ein Interessent aus {loc} hatte Fragen zur Vorsorge. Ruf kurz an, "
                "nimm Einwände und vereinbare einen längeren Termin."
            ),
            distance_km=1.4,
            lead_id="fin-lead-122",
        ),
        PhoenixSuggestion(
            type="cafe",
            title="Ruhiger Spot für Angebot/Analyse",
            subtitle=f"Café oder Coworking in {loc}",
            reason=(
                f"Setz dich {minutes} Minuten hin und bereite Unterlagen für die nächsten zwei "
                "Beratungen vor."
            ),
            distance_km=0.4,
            address=f"Empfehlung in {loc}",
        ),
    ]


def _coaching_suggestions(loc: str, minutes: int) -> List["PhoenixSuggestion"]:
    return [
        PhoenixSuggestion(
            type="customer_nearby",
            title="Coachee mit kurzem Voice-Check begleiten",
            subtitle=f"Individueller Touchpoint in {loc}",
            reason=(
                f"Schick einer Kundin oder einem Klienten eine 2-Minuten-Voice, um den Fokus "
                f"für diese Woche zu schärfen. {minutes} Minuten reichen für einen wertigen Impuls."
            ),
            distance_km=0.8,
            lead_id="coach-client-041",
        ),
        PhoenixSuggestion(
            type="lead_nearby",
            title="Warm Leads für das nächste Programm anstoßen",
            subtitle="Zwei Follow-ups planen",
            reason=(
                f"Nutze {minutes} Minuten, um Interessenten aus {loc} kurz zu pingen. "
                "Frag nach dem Stand und biete ein Gratis-Check-in an."
            ),
            distance_km=0.5,
            lead_id="coach-lead-118",
        ),
        PhoenixSuggestion(
            type="cafe",
            title="Ruhigen Spot für Content/Prep finden",
            subtitle=f"Café / Workspace in {loc}",
            reason="Skizziere Inhalte oder Q&A-Fragen für dein nächstes Coaching-Live.",
            distance_km=0.4,
            address=f"Empfehlung in {loc}",
        ),
    ]


def _generic_suggestions(loc: str, minutes: int) -> List["PhoenixSuggestion"]:
    return [
        PhoenixSuggestion(
            type="customer_nearby",
            title="Bestandskunde für Check-in anrufen",
            subtitle=f"Kunde in {loc}",
            reason=(
                f"Frag kurz nach, wie es läuft und ob es offene Punkte gibt. "
                f"{minutes} Minuten reichen für ein persönliches Update."
            ),
            distance_km=1.2,
            lead_id="gen-cust-011",
        ),
        PhoenixSuggestion(
            type="lead_nearby",
            title="Pipeline aufräumen",
            subtitle="2 Leads mit offenem Follow-up",
            reason=(
                f"Nutz {minutes} Minuten, um Leads in {loc} anzurufen, die auf ein Angebot "
                "oder ein Go warten."
            ),
            distance_km=0.7,
            lead_id="gen-lead-044",
        ),
        PhoenixSuggestion(
            type="cafe",
            title="Ruhiger Spot für Admin-Tasks",
            subtitle=f"Café / Workspace in {loc}",
            reason="Zieh E-Mails, Angebote oder kurze Voice-Nachrichten nach.",
            distance_km=0.3,
            address=f"Café-Empfehlung in {loc}",
        ),
    ]


SUGGESTION_BUILDERS: Dict[str, Callable[[str, int], List["PhoenixSuggestion"]]] = {
    "network_marketing": _network_marketing_suggestions,
    "immo": _immo_suggestions,
    "finance": _finance_suggestions,
    "coaching": _coaching_suggestions,
    "generic": _generic_suggestions,
}


class Location(BaseModel):
    description: str


class PhoenixOpportunityRequest(BaseModel):
    user_id: str
    vertical: Optional[str] = None
    mode: str
    time_window_minutes: int
    location: Optional[Location] = None
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


@router.post("/opportunities", response_model=PhoenixResponse)
async def get_opportunities(payload: PhoenixOpportunityRequest) -> PhoenixResponse:
    """
    Gibt branchenspezifische Dummy-Vorschläge zurück, damit das Frontend testen kann.
    """

    requested_vertical = (payload.vertical or "generic").strip().lower()
    summary_label = SUMMARY_LABELS.get(requested_vertical, SUMMARY_LABELS["generic"])
    effective_vertical = requested_vertical if requested_vertical in SUGGESTION_BUILDERS else "generic"
    loc = _resolve_location_description(payload.location)
    minutes = _clamp_minutes(payload.time_window_minutes)

    summary = (
        f"Phönix-Modus ({summary_label}): Du hast etwa {minutes} Minuten Zeit in {loc}. "
        "Hier sind 2–3 konkrete Ideen, wie du die Zeit sinnvoll nutzen kannst."
    )

    builder = SUGGESTION_BUILDERS[effective_vertical]
    suggestions = builder(loc, minutes)

    max_suggestions = max(1, payload.max_suggestions or 3)
    return PhoenixResponse(summary=summary, suggestions=suggestions[:max_suggestions])


