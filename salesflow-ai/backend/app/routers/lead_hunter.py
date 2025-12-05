# file: app/routers/lead_hunter.py
"""
Lead Hunter API Router - Speziell für Network Marketing

Das Killer-Feature für Networker:
"Wer soll ich heute anschreiben?" → AI findet die besten Leads!

Endpoints:
- GET /lead-hunter/daily - Tägliche Lead-Vorschläge
- POST /lead-hunter/hunt - Aktive Lead-Suche
- GET /lead-hunter/lookalikes - Ähnliche wie Top-Partner
- GET /lead-hunter/reactivation - Reaktivierungs-Kandidaten
- GET /lead-hunter/quota - Tägliche Quote
"""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.lead_hunter_service import (
    LeadHunterService,
    get_lead_hunter_service,
    HuntedLead,
    HuntCriteria,
    HuntResult,
    DailyHuntQuota,
    LeadHuntPriority,
)

router = APIRouter(prefix="/lead-hunter", tags=["Lead Hunter"])


# ─────────────────────────────────
# Mock Auth
# ─────────────────────────────────

def get_current_user_id() -> UUID:
    """Mock: Aktuelle User-ID."""
    return uuid4()


# ─────────────────────────────────
# Request Models
# ─────────────────────────────────

class HuntRequest(BaseModel):
    """Request für aktive Lead-Suche"""
    hashtags: List[str] = Field(
        default=["networkmarketing", "nebeneinkommen", "mama"],
        description="Hashtags zum Suchen"
    )
    bio_keywords: List[str] = Field(
        default=["coach", "lifestyle", "business"],
        description="Keywords in der Bio"
    )
    locations: List[str] = Field(
        default=["deutschland", "österreich", "schweiz"],
        description="DACH-Region"
    )
    min_followers: int = Field(500, ge=0)
    max_followers: int = Field(50000, ge=0)
    limit: int = Field(20, ge=1, le=50)


class LookalikeRequest(BaseModel):
    """Request für Lookalike-Suche"""
    reference_lead_ids: List[UUID] = Field(
        default_factory=list,
        description="IDs von Referenz-Leads (z.B. Top-Partner)"
    )
    limit: int = Field(10, ge=1, le=30)


class ConvertToLeadRequest(BaseModel):
    """Request um Hunted Lead in echten Lead zu konvertieren"""
    hunted_lead_id: UUID
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


# ─────────────────────────────────
# Endpoints
# ─────────────────────────────────

@router.get(
    "/daily",
    response_model=List[HuntedLead],
    summary="🎯 Tägliche Lead-Vorschläge",
    description="""
    **Das Herzstück für den Daily Flow!**
    
    Gibt 5 Leads zurück die du HEUTE anschreiben solltest:
    - 2x Lookalikes (ähnlich wie deine Top-Partner)
    - 2x Reaktivierungen (Leads die geghosted haben)
    - 1x Neuer Lead (aus Hashtag-Suche)
    
    **Sortiert nach:**
    1. HOT 🔥 - Sofort kontaktieren
    2. WARM 🟠 - Heute noch
    3. COLD 🟢 - Diese Woche
    
    **Tipp:** Integriere das in deinen Daily Flow Widget!
    """
)
async def get_daily_suggestions(
    count: int = Query(5, ge=1, le=10, description="Anzahl der Vorschläge"),
    service: LeadHunterService = Depends(get_lead_hunter_service),
    user_id: UUID = Depends(get_current_user_id),
) -> List[HuntedLead]:
    """Gibt tägliche Lead-Vorschläge zurück."""
    return await service.get_daily_suggestions(user_id, count)


@router.post(
    "/hunt",
    response_model=HuntResult,
    summary="🔍 Aktive Lead-Suche starten",
    description="""
    Startet eine aktive Lead-Suche basierend auf Kriterien.
    
    **Suchkriterien:**
    - Hashtags (Instagram, TikTok)
    - Bio-Keywords
    - Location (DACH)
    - Follower-Range (für Micro-Influencer)
    
    **Was die AI analysiert:**
    - MLM-Affinität Signale
    - Business vs. Produkt Interesse
    - Engagement-Level
    - Ähnlichkeit zu erfolgreichen Partnern
    
    **Output:**
    - Liste von Leads mit Score & Priorität
    - Personalisierte Opener-Vorschläge
    - Tipps für die Ansprache
    """
)
async def hunt_leads(
    request: HuntRequest,
    service: LeadHunterService = Depends(get_lead_hunter_service),
    user_id: UUID = Depends(get_current_user_id),
) -> HuntResult:
    """Startet eine aktive Lead-Suche."""
    criteria = HuntCriteria(
        hashtags=request.hashtags,
        bio_keywords=request.bio_keywords,
        locations=request.locations,
        min_followers=request.min_followers,
        max_followers=request.max_followers,
    )
    
    return await service.hunt_by_criteria(user_id, criteria, request.limit)


@router.post(
    "/lookalikes",
    response_model=HuntResult,
    summary="👥 Lookalike-Suche",
    description="""
    **"Finde Leute wie meine besten Partner!"**
    
    Analysiert deine erfolgreichsten Partner und findet ähnliche Profile:
    - Gleiche Interessen
    - Ähnliche Bio-Keywords
    - Vergleichbare Follower-Zahlen
    - Ähnliches Engagement-Verhalten
    
    **Perfekt für:**
    - Schnelles Team-Wachstum
    - Qualitativ hochwertige Leads
    - Weniger "Kaltakquise-Feeling"
    """
)
async def find_lookalikes(
    request: LookalikeRequest,
    service: LeadHunterService = Depends(get_lead_hunter_service),
    user_id: UUID = Depends(get_current_user_id),
) -> HuntResult:
    """Findet ähnliche Leads wie Referenz-Leads."""
    return await service.hunt_lookalikes(
        user_id,
        request.reference_lead_ids,
        request.limit,
    )


@router.get(
    "/reactivation",
    response_model=HuntResult,
    summary="♻️ Reaktivierungs-Kandidaten",
    description="""
    **"Wer hat lange nicht reagiert aber war mal interessiert?"**
    
    Scannt deine existierenden Leads und findet:
    - Ghosted Leads (keine Antwort seit X Tagen)
    - Ursprünglich interessierte Leads
    - Leads die "vielleicht später" gesagt haben
    
    **Inkludiert:**
    - Reaktivierungs-Opener Vorschläge
    - Tipps für die Ansprache
    - Beste Kontaktzeit
    """
)
async def get_reactivation_candidates(
    days_inactive: int = Query(30, ge=7, le=365, description="Tage ohne Kontakt"),
    service: LeadHunterService = Depends(get_lead_hunter_service),
    user_id: UUID = Depends(get_current_user_id),
) -> HuntResult:
    """Findet Reaktivierungs-Kandidaten."""
    return await service.scan_reactivation_candidates(user_id, days_inactive)


@router.get(
    "/quota",
    response_model=DailyHuntQuota,
    summary="📊 Tägliche Quote",
    description="""
    Zeigt den Fortschritt der täglichen Lead-Quote.
    
    **Standard-Ziel:** 10 neue Leads pro Tag
    
    **Tracking:**
    - Leads gefunden
    - Leads kontaktiert
    - Fortschritt in %
    
    **Perfekt für:** Gamification im Daily Flow!
    """
)
async def get_daily_quota(
    service: LeadHunterService = Depends(get_lead_hunter_service),
    user_id: UUID = Depends(get_current_user_id),
) -> DailyHuntQuota:
    """Gibt die tägliche Quote zurück."""
    return await service.get_daily_quota(user_id)


@router.post(
    "/convert",
    summary="✅ Lead in CRM übernehmen",
    description="""
    Konvertiert einen gefundenen Lead in einen echten CRM-Lead.
    
    **Was passiert:**
    1. Lead wird in der Datenbank erstellt
    2. Tags werden zugewiesen
    3. Sequenz wird gestartet (optional)
    4. Erster Task wird erstellt
    """
)
async def convert_to_lead(
    request: ConvertToLeadRequest,
    service: LeadHunterService = Depends(get_lead_hunter_service),
    user_id: UUID = Depends(get_current_user_id),
):
    """Konvertiert einen Hunted Lead in einen echten Lead."""
    # In Produktion: Hier würde der Lead in Supabase erstellt
    return {
        "success": True,
        "lead_id": str(uuid4()),
        "message": "Lead erfolgreich in CRM übernommen!",
        "next_action": "Follow-up Sequenz wurde gestartet",
    }


# ─────────────────────────────────
# Hashtag Suggestions
# ─────────────────────────────────

@router.get(
    "/hashtags",
    summary="📌 Empfohlene Hashtags",
    description="Gibt empfohlene Hashtags für die Lead-Suche zurück.",
)
async def get_recommended_hashtags():
    """Gibt empfohlene Hashtags zurück."""
    return {
        "categories": {
            "network_marketing": [
                "#networkmarketing", "#mlm", "#directsales",
                "#networkmarketingpro", "#mlmsuccess",
            ],
            "business": [
                "#nebeneinkommen", "#selbstständig", "#entrepreneur",
                "#homebusiness", "#onlinebusiness", "#passiveseinkommen",
            ],
            "lifestyle": [
                "#freiheit", "#zeitfreiheit", "#traumleben",
                "#worklifebalance", "#ortsunabhängig",
            ],
            "mama": [
                "#momboss", "#mamabusiness", "#workingmom",
                "#mamalife", "#mompreneur", "#homeoffice",
            ],
            "health_wellness": [
                "#health", "#wellness", "#fitness",
                "#healthylifestyle", "#nutrition",
            ],
            "dach_specific": [
                "#deutscheunternehmer", "#österreich", "#schweiz",
                "#dach", "#germanblogger",
            ],
        },
        "top_10_for_mlm": [
            "#networkmarketing",
            "#nebeneinkommen",
            "#homebusiness",
            "#mompreneur",
            "#passiveseinkommen",
            "#freiheit",
            "#selbstständig",
            "#onlinebusiness",
            "#teamwork",
            "#erfolg",
        ],
    }


@router.get(
    "/signals",
    summary="🎯 MLM-Signale erklärt",
    description="Erklärt welche Signale auf MLM-Interesse hindeuten.",
)
async def get_mlm_signals():
    """Erklärt MLM-Signale für die Lead-Bewertung."""
    return {
        "strong_signals": {
            "description": "Starke Hinweise auf Business-Interesse",
            "keywords": [
                "nebeneinkommen", "passives einkommen", "business aufbauen",
                "team aufbauen", "network marketing", "selbstständig",
            ],
            "action": "Sofort kontaktieren!",
        },
        "medium_signals": {
            "description": "Wahrscheinlich offen für Gespräch",
            "keywords": [
                "coach", "freiheit", "lifestyle", "unabhängig",
                "homeoffice", "flexibel",
            ],
            "action": "Innerhalb 24h kontaktieren",
        },
        "weak_signals": {
            "description": "Potentiell interessiert",
            "keywords": [
                "mama", "fitness", "health", "reisen",
            ],
            "action": "Mit Mehrwert-Content ansprechen",
        },
        "negative_signals": {
            "description": "Nicht kontaktieren!",
            "keywords": [
                "anti mlm", "kein network", "keine anfragen",
            ],
            "action": "Überspringen",
        },
    }


__all__ = ["router"]

