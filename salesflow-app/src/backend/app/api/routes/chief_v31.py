"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF V3.1 API ROUTES                                                     ║
║  API Endpoints für alle v3.1 Features                                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /v31/analyze-objection - Einwand analysieren (Signal Detector)
- POST /v31/get-closer - Killer Phrase für Situation holen
- POST /v31/analyze-personality - DISG-Analyse für Lead
- POST /v31/check-deal-health - Deal Medic Check
- POST /v31/get-daily-targets - Revenue Engineer Targets
- POST /v31/check-compliance - Enterprise Compliance Check
- GET /v31/killer-phrases/{situation} - Alle Phrases für Situation
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date

from ...core.security import get_current_user
from ...core.database import get_db
from ...config.prompts.chief_v31_additions import (
    # Enums
    CompanyMode,
    ObjectionType,
    ClosingSituation,
    DISGType,
    # Dataclasses
    ComplianceRules,
    BrandVoice,
    UserGoal,
    # Functions
    analyze_objection,
    get_killer_phrases,
    get_best_killer_phrase,
    detect_personality_type,
    adapt_message_to_personality,
    calculate_daily_targets,
    build_goal_analysis,
    detect_deal_at_risk,
    analyze_lost_deal,
    check_compliance,
    # Static Data
    KILLER_PHRASES,
    DISG_PROFILES,
)
from ...services.chief_context import (
    build_chief_v31_context,
    analyze_objection_with_context,
    check_deal_health,
    get_deal_post_mortem,
    get_closing_help,
)

router = APIRouter(prefix="/v31", tags=["chief-v31"])


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class ObjectionAnalysisRequest(BaseModel):
    """Request für Einwand-Analyse."""
    objection_text: str = Field(..., description="Der Einwand-Text")
    lead_id: Optional[str] = Field(None, description="Lead ID für Kontext")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ObjectionAnalysisResponse(BaseModel):
    """Response mit Einwand-Analyse."""
    objection_text: str
    objection_type: str  # real, pretense, buying_signal
    confidence: float
    real_problem: Optional[str]
    recommended_response: str
    alternative_response: str
    type_emoji: str
    type_label: str


class CloserRequest(BaseModel):
    """Request für Killer Phrase."""
    situation: str = Field(..., description="hesitation, price, time, ghost_risk, ready")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


class CloserResponse(BaseModel):
    """Response mit Killer Phrase."""
    recommended: Dict[str, Any]
    alternatives: List[Dict[str, Any]]
    situation: str


class PersonalityAnalysisRequest(BaseModel):
    """Request für DISG-Analyse."""
    messages: List[str] = Field(..., description="Lead-Nachrichten zur Analyse")
    lead_id: Optional[str] = Field(None)


class PersonalityAnalysisResponse(BaseModel):
    """Response mit DISG-Profil."""
    primary_type: str
    type_emoji: str
    type_name: str
    type_label: str
    confidence: float
    signals: List[str]
    dos: List[str]
    donts: List[str]
    message_length: str
    emoji_policy: str
    tone: str


class DealHealthRequest(BaseModel):
    """Request für Deal Health Check."""
    lead_id: str


class DealHealthResponse(BaseModel):
    """Response mit Deal Health."""
    at_risk: bool
    warnings: List[str]
    intervention_message: Optional[str]
    risk_level: str  # healthy, warning, critical


class DailyTargetsRequest(BaseModel):
    """Request für Daily Targets."""
    monthly_target: float = Field(..., gt=0)
    current_revenue: float = Field(0, ge=0)
    avg_deal_size: float = Field(100, gt=0)
    days_remaining: Optional[int] = Field(None)
    conversion_rates: Optional[Dict[str, float]] = Field(None)


class DailyTargetsResponse(BaseModel):
    """Response mit Daily Targets."""
    revenue_gap: float
    deals_needed: int
    daily_outreach_required: int
    expected_replies: float
    expected_meetings: float
    expected_deals: float
    on_track: bool
    goal_analysis: str


class ComplianceCheckRequest(BaseModel):
    """Request für Compliance Check."""
    message: str
    forbidden_words: Optional[List[str]] = Field(default_factory=list)
    required_disclaimers: Optional[Dict[str, str]] = Field(default_factory=dict)


class ComplianceCheckResponse(BaseModel):
    """Response mit Compliance Check."""
    is_compliant: bool
    violations: List[Dict[str, Any]]
    requires_disclaimer: Optional[str]
    suggested_fix: Optional[str]


class PostMortemRequest(BaseModel):
    """Request für Deal Post-Mortem."""
    lead_id: str
    lead_name: str


class PostMortemResponse(BaseModel):
    """Response mit Post-Mortem Analyse."""
    lead_name: str
    death_cause: str
    critical_errors: List[Dict[str, str]]
    patterns: List[str]
    learnings: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/analyze-objection", response_model=ObjectionAnalysisResponse)
async def analyze_objection_endpoint(
    request: ObjectionAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    🎯 Signal Detector: Analysiert ob ein Einwand echt oder ein Vorwand ist.
    
    Gibt zurück:
    - objection_type: "real", "pretense", oder "buying_signal"
    - confidence: 0-1 wie sicher die Analyse ist
    - real_problem: Was das eigentliche Problem ist (bei Vorwand)
    - recommended_response: Empfohlene Antwort
    """
    # Mit Lead-Kontext wenn vorhanden
    if request.lead_id:
        analysis = await analyze_objection_with_context(
            db, request.lead_id, request.objection_text
        )
    else:
        analysis = analyze_objection(request.objection_text, request.context)
    
    # Type-spezifische Infos
    type_emojis = {
        "real": "✅",
        "pretense": "🟡",
        "buying_signal": "🔥",
    }
    type_labels = {
        "real": "Echter Einwand",
        "pretense": "Wahrscheinlich Vorwand",
        "buying_signal": "Verstecktes Kaufsignal",
    }
    
    return ObjectionAnalysisResponse(
        objection_text=analysis.objection_text,
        objection_type=analysis.objection_type.value,
        confidence=analysis.confidence,
        real_problem=analysis.real_problem,
        recommended_response=analysis.recommended_response,
        alternative_response=analysis.alternative_response,
        type_emoji=type_emojis.get(analysis.objection_type.value, "❓"),
        type_label=type_labels.get(analysis.objection_type.value, "Unbekannt"),
    )


@router.post("/get-closer", response_model=CloserResponse)
async def get_closer_endpoint(
    request: CloserRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    🔥 Closer Library: Gibt Killer Phrases für eine Situation.
    
    Situationen:
    - hesitation: Kunde zögert aber hat Interesse
    - price: "Zu teuer"
    - time: "Keine Zeit"
    - ghost_risk: Droht zu ghosten
    - ready: Ready zum Abschluss
    """
    try:
        situation = ClosingSituation(request.situation)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültige Situation. Erlaubt: {[s.value for s in ClosingSituation]}"
        )
    
    result = await get_closing_help(situation, request.context)
    
    return CloserResponse(
        recommended=result["recommended"],
        alternatives=result["alternatives"],
        situation=result["situation"],
    )


@router.get("/killer-phrases/{situation}")
async def list_killer_phrases(
    situation: str,
    current_user: dict = Depends(get_current_user),
):
    """
    📋 Alle Killer Phrases für eine Situation auflisten.
    """
    try:
        sit = ClosingSituation(situation)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültige Situation. Erlaubt: {[s.value for s in ClosingSituation]}"
        )
    
    phrases = get_killer_phrases(sit)
    
    return {
        "situation": situation,
        "count": len(phrases),
        "phrases": phrases,
    }


@router.post("/analyze-personality", response_model=PersonalityAnalysisResponse)
async def analyze_personality_endpoint(
    request: PersonalityAnalysisRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    🎭 DISG Personality Matching: Erkennt Kommunikationsstil aus Nachrichten.
    
    Gibt zurück:
    - DISG-Typ (D/I/S/G)
    - Kommunikations-Tipps
    - Dos & Don'ts
    """
    profile = detect_personality_type(request.messages)
    tips = DISG_PROFILES[profile.primary_type]
    
    return PersonalityAnalysisResponse(
        primary_type=profile.primary_type.value,
        type_emoji=tips["emoji"],
        type_name=tips["name"],
        type_label=tips["label"],
        confidence=profile.confidence,
        signals=profile.signals,
        dos=tips["dos"],
        donts=tips["donts"],
        message_length=tips["message_length"],
        emoji_policy=tips["emoji_policy"],
        tone=tips["tone"],
    )


@router.post("/check-deal-health", response_model=DealHealthResponse)
async def check_deal_health_endpoint(
    request: DealHealthRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    💔 Deal Medic: Prüft ob ein Deal in Gefahr ist.
    
    Gibt Warnsignale und Interventions-Vorschläge zurück.
    """
    result = await check_deal_health(db, request.lead_id)
    
    if result:
        return DealHealthResponse(
            at_risk=True,
            warnings=result["warnings"],
            intervention_message=result["intervention_message"],
            risk_level="critical" if len(result["warnings"]) > 2 else "warning",
        )
    
    return DealHealthResponse(
        at_risk=False,
        warnings=[],
        intervention_message=None,
        risk_level="healthy",
    )


@router.post("/deal-post-mortem", response_model=PostMortemResponse)
async def deal_post_mortem_endpoint(
    request: PostMortemRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    📊 Deal Medic: Post-Mortem Analyse für verlorenen Deal.
    
    Analysiert:
    - Todesursache
    - Kritische Fehler
    - Patterns
    - Learnings
    """
    result = await get_deal_post_mortem(db, request.lead_id, request.lead_name)
    
    return PostMortemResponse(
        lead_name=result.lead_name,
        death_cause=result.death_cause,
        critical_errors=result.critical_errors,
        patterns=result.patterns,
        learnings=result.learnings,
    )


@router.post("/daily-targets", response_model=DailyTargetsResponse)
async def calculate_daily_targets_endpoint(
    request: DailyTargetsRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    📊 Revenue Engineer: Berechnet tägliche Targets basierend auf Monatsziel.
    
    Rechnet vom Ziel rückwärts:
    Revenue Gap → Deals → Meetings → Replies → Outreaches
    """
    # Days remaining berechnen wenn nicht angegeben
    if request.days_remaining is None:
        from datetime import timedelta
        today = date.today()
        last_day = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        days_remaining = (last_day - today).days + 1
    else:
        days_remaining = request.days_remaining
    
    # Default conversion rates
    conversion_rates = request.conversion_rates or {
        "outreach_to_reply": 0.30,
        "reply_to_meeting": 0.50,
        "meeting_to_close": 0.25,
    }
    
    goal = UserGoal(
        monthly_target=request.monthly_target,
        days_remaining=days_remaining,
        current_revenue=request.current_revenue,
        avg_deal_size=request.avg_deal_size,
        conversion_rates=conversion_rates,
    )
    
    targets = calculate_daily_targets(goal)
    analysis = build_goal_analysis(goal, targets)
    
    # Expected deals pro Tag
    expected_deals = targets.expected_meetings * conversion_rates.get("meeting_to_close", 0.25)
    
    return DailyTargetsResponse(
        revenue_gap=targets.revenue_gap,
        deals_needed=targets.deals_needed,
        daily_outreach_required=targets.daily_outreach_required,
        expected_replies=targets.expected_replies,
        expected_meetings=targets.expected_meetings,
        expected_deals=expected_deals,
        on_track=targets.on_track,
        goal_analysis=analysis,
    )


@router.post("/check-compliance", response_model=ComplianceCheckResponse)
async def check_compliance_endpoint(
    request: ComplianceCheckRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    🛡️ Enterprise Mode: Prüft Nachricht gegen Compliance-Regeln.
    """
    rules = ComplianceRules(
        forbidden_words=request.forbidden_words,
        required_disclaimers=request.required_disclaimers,
    )
    
    result = check_compliance(request.message, rules)
    
    # Suggested fix wenn nicht compliant
    suggested_fix = None
    if not result["is_compliant"] and result["violations"]:
        # Einfacher Fix: Verbotene Wörter ersetzen
        fixed = request.message
        for v in result["violations"]:
            if v["type"] == "forbidden_word":
                fixed = fixed.replace(v["word"], "[...]")
        suggested_fix = fixed if fixed != request.message else None
    
    return ComplianceCheckResponse(
        is_compliant=result["is_compliant"],
        violations=result["violations"],
        requires_disclaimer=result["requires_disclaimer"],
        suggested_fix=suggested_fix,
    )


@router.get("/disg-profiles")
async def get_disg_profiles(
    current_user: dict = Depends(get_current_user),
):
    """
    📚 Gibt alle DISG-Profile mit Tipps zurück.
    """
    profiles = {}
    for disg_type, data in DISG_PROFILES.items():
        profiles[disg_type.value] = {
            "emoji": data["emoji"],
            "name": data["name"],
            "label": data["label"],
            "signals": data["signals"],
            "dos": data["dos"],
            "donts": data["donts"],
            "message_length": data["message_length"],
            "emoji_policy": data["emoji_policy"],
            "tone": data["tone"],
        }
    
    return {"profiles": profiles}


@router.get("/closing-situations")
async def get_closing_situations(
    current_user: dict = Depends(get_current_user),
):
    """
    📚 Gibt alle Closing-Situationen mit Beschreibung zurück.
    """
    situations = {
        "hesitation": {
            "name": "Kunde zögert",
            "emoji": "🤔",
            "description": "Hat Interesse, aber zögert mit der Entscheidung",
        },
        "price": {
            "name": "Preis-Einwand",
            "emoji": "💰",
            "description": "Sagt 'zu teuer' oder ähnliches",
        },
        "time": {
            "name": "Zeit-Einwand",
            "emoji": "⏰",
            "description": "Sagt 'keine Zeit' oder ist zu beschäftigt",
        },
        "ghost_risk": {
            "name": "Ghost-Gefahr",
            "emoji": "👻",
            "description": "Droht zu ghosten, antwortet weniger",
        },
        "ready": {
            "name": "Bereit zum Abschluss",
            "emoji": "🔥",
            "description": "Kaufbereit, braucht nur den letzten Push",
        },
    }
    
    return {"situations": situations}

