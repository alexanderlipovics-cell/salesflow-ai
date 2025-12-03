"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVE ASSIST API                                                           ║
║  API für Echtzeit-Verkaufsassistenz während Kundengesprächen              ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import uuid4
from enum import Enum

from fastapi import APIRouter, HTTPException, WebSocket, Query
from pydantic import BaseModel

from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/live-assist", tags=["live-assist"])


# =============================================================================
# MODELS
# =============================================================================

class FactType(str, Enum):
    PRODUCT = "product"
    PRICE = "price"
    BENEFIT = "benefit"
    TESTIMONIAL = "testimonial"
    FAQ = "faq"


class ObjectionType(str, Enum):
    PRICE = "price"
    TIME = "time"
    TRUST = "trust"
    NEED = "need"
    COMPETITOR = "competitor"
    THINK_ABOUT = "think_about"


class IntentType(str, Enum):
    GREETING = "greeting"
    INFO_REQUEST = "info_request"
    OBJECTION = "objection"
    INTEREST = "interest"
    QUESTION = "question"
    SCHEDULING = "scheduling"
    COMPLAINT = "complaint"
    OTHER = "other"


class StartSessionRequest(BaseModel):
    """Request zum Starten einer Session."""
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    channel: str = "phone"
    context: Optional[dict] = None


class StartSessionResponse(BaseModel):
    """Response nach Session-Start."""
    session_id: str
    message: str
    quick_facts: List[dict]


class EndSessionRequest(BaseModel):
    """Request zum Beenden einer Session."""
    session_id: str
    outcome: Optional[str] = None
    notes: Optional[str] = None


class LiveQueryRequest(BaseModel):
    """Request für eine Live-Anfrage."""
    session_id: str
    query: str
    query_type: str = "text"


class LiveQueryResponse(BaseModel):
    """Response auf eine Live-Anfrage."""
    query_id: str
    intent: IntentType
    response: str
    response_short: Optional[str] = None
    objection_type: Optional[ObjectionType] = None
    follow_up: Optional[str] = None
    technique: Optional[str] = None
    confidence: float
    response_time_ms: int


class QuickFactItem(BaseModel):
    """Ein Quick Fact."""
    id: str
    fact_type: FactType
    title: str
    content: str
    is_key: bool = False


class ObjectionResponseItem(BaseModel):
    """Eine Einwand-Antwort."""
    id: str
    objection_type: ObjectionType
    objection_text: str
    response: str
    technique: str
    success_rate: float
    times_used: int


class SessionStats(BaseModel):
    """Session-Statistiken."""
    session_id: str
    duration_minutes: int
    queries_count: int
    objections_handled: int
    outcome: Optional[str] = None


class CoachInsight(BaseModel):
    """Ein Coach-Insight (Legacy)."""
    type: str
    title: str
    description: str
    priority: str
    action: Optional[str] = None


class CoachTip(BaseModel):
    """Ein Coach-Tip für das Frontend."""
    id: str
    title: str
    description: str
    priority: str  # 'high', 'medium', 'low'
    action_type: str  # 'follow_up', 'training', 'call', etc.


class CoachInsightsResponse(BaseModel):
    """Response mit Coach-Insights - Frontend-Format."""
    sessions_analyzed: int = 0
    tips: List[CoachTip] = []
    generated_at: str
    # Legacy fields (optional)
    mood_trend: Optional[str] = None
    decision_pattern: Optional[str] = None
    recommendations: Optional[List[str]] = None


class PerformanceMetrics(BaseModel):
    """Performance-Metriken."""
    total_sessions: int
    avg_session_duration_min: float
    avg_response_time_ms: int
    success_rate: float
    objections_per_session: float


# =============================================================================
# IN-MEMORY STORE
# =============================================================================

_active_sessions: dict = {}

_quick_facts: List[dict] = [
    {
        "id": "fact_001",
        "fact_type": "product",
        "title": "Balance Oil Omega-3",
        "content": "Hochwertigstes Omega-3 aus wild gefangenem Fisch. 95% Absorptionsrate.",
        "is_key": True,
    },
    {
        "id": "fact_002",
        "fact_type": "benefit",
        "title": "Ergebnisse nach 120 Tagen",
        "content": "97% der Nutzer verbessern ihre Omega-Balance nachweislich.",
        "is_key": True,
    },
    {
        "id": "fact_003",
        "fact_type": "price",
        "title": "Preis-Leistung",
        "content": "Ab 2,30€ pro Tag für messbare Gesundheitsverbesserung.",
        "is_key": False,
    },
    {
        "id": "fact_004",
        "fact_type": "testimonial",
        "title": "Kundenfeedback",
        "content": "\"Seit 3 Monaten mehr Energie, besserer Schlaf\" - Maria K.",
        "is_key": False,
    },
]

_objection_responses: List[dict] = [
    {
        "id": "obj_001",
        "objection_type": "price",
        "objection_text": "Das ist mir zu teuer",
        "response": "Ich verstehe - lass uns mal rechnen: 70€ im Monat sind 2,30€ pro Tag. Weniger als ein Kaffee. Aber was kostet dich schlechte Gesundheit langfristig?",
        "technique": "Reframing",
        "success_rate": 0.72,
        "times_used": 156,
    },
    {
        "id": "obj_002",
        "objection_type": "time",
        "objection_text": "Ich habe gerade keine Zeit",
        "response": "Kein Problem! Wann passt es dir besser? Ich schick dir vorher kurz die wichtigsten Infos - so kannst du schon mal reinschauen.",
        "technique": "Terminvereinbarung",
        "success_rate": 0.65,
        "times_used": 89,
    },
    {
        "id": "obj_003",
        "objection_type": "think_about",
        "objection_text": "Ich muss noch drüber nachdenken",
        "response": "Absolut verständlich! Was genau möchtest du dir noch überlegen? Vielleicht kann ich dir dabei helfen.",
        "technique": "Isolierung",
        "success_rate": 0.58,
        "times_used": 234,
    },
    {
        "id": "obj_004",
        "objection_type": "trust",
        "objection_text": "Ich kenne das Produkt nicht",
        "response": "Total nachvollziehbar! Deshalb gibt es den BalanceTest - du siehst VORHER und NACHHER deine echten Werte. Kein Risiko, pure Fakten.",
        "technique": "Proof Points",
        "success_rate": 0.81,
        "times_used": 67,
    },
]


# =============================================================================
# SESSION ENDPOINTS
# =============================================================================

@router.post("/start", response_model=StartSessionResponse)
async def start_session(
    request: StartSessionRequest,
) -> StartSessionResponse:
    """
    Startet eine Live Assist Session.
    
    Args:
        request: Session-Details
        
    Returns:
        StartSessionResponse mit Session-ID und Quick Facts
    """
    session_id = f"session_{uuid4().hex[:8]}"
    
    _active_sessions[session_id] = {
        "id": session_id,
        "user_id": "demo-user",
        "lead_id": request.lead_id,
        "lead_name": request.lead_name,
        "channel": request.channel,
        "started_at": datetime.now(),
        "queries": [],
    }
    
    logger.info(f"Live assist session started: {session_id}")
    
    # Key Facts als Quick Start
    key_facts = [f for f in _quick_facts if f.get("is_key", False)]
    
    return StartSessionResponse(
        session_id=session_id,
        message=f"Session gestartet! Ich bin bereit, dir bei diesem Gespräch zu helfen.",
        quick_facts=key_facts[:3],
    )


@router.post("/end")
async def end_session(
    request: EndSessionRequest,
) -> dict:
    """
    Beendet eine Live Assist Session.
    
    Args:
        request: EndSessionRequest mit outcome
        
    Returns:
        Bestätigung mit Statistiken
    """
    session = _active_sessions.pop(request.session_id, None)
    
    if not session:
        return {"success": True, "message": "Session nicht gefunden oder bereits beendet"}
    
    duration = (datetime.now() - session["started_at"]).seconds // 60
    
    logger.info(f"Session {request.session_id} ended. Duration: {duration}min, Outcome: {request.outcome}")
    
    return {
        "success": True,
        "message": "Session beendet",
        "stats": {
            "duration_minutes": duration,
            "queries_count": len(session.get("queries", [])),
            "outcome": request.outcome,
        },
    }


@router.get("/session/{session_id}", response_model=SessionStats)
async def get_session_stats(
    session_id: str,
) -> SessionStats:
    """
    Holt Session-Statistiken.
    
    Args:
        session_id: ID der Session
        
    Returns:
        SessionStats
    """
    session = _active_sessions.get(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")
    
    duration = (datetime.now() - session["started_at"]).seconds // 60
    queries = session.get("queries", [])
    objections = sum(1 for q in queries if q.get("is_objection", False))
    
    return SessionStats(
        session_id=session_id,
        duration_minutes=duration,
        queries_count=len(queries),
        objections_handled=objections,
        outcome=None,
    )


# =============================================================================
# QUERY ENDPOINT
# =============================================================================

@router.post("/query", response_model=LiveQueryResponse)
async def process_query(
    request: LiveQueryRequest,
) -> LiveQueryResponse:
    """
    Verarbeitet eine Live-Anfrage.
    
    Args:
        request: Die Anfrage mit Query-Text
        
    Returns:
        LiveQueryResponse mit KI-Antwort
    """
    import time
    start = time.time()
    
    query_lower = request.query.lower()
    query_id = f"query_{uuid4().hex[:8]}"
    
    # Einfache Intent-Erkennung
    intent = IntentType.OTHER
    objection_type = None
    response = ""
    technique = None
    
    # Einwand-Erkennung
    if any(word in query_lower for word in ["teuer", "preis", "kostet", "geld"]):
        intent = IntentType.OBJECTION
        objection_type = ObjectionType.PRICE
        obj = next((o for o in _objection_responses if o["objection_type"] == "price"), None)
        if obj:
            response = obj["response"]
            technique = obj["technique"]
    elif any(word in query_lower for word in ["zeit", "später", "busy", "beschäftigt"]):
        intent = IntentType.OBJECTION
        objection_type = ObjectionType.TIME
        obj = next((o for o in _objection_responses if o["objection_type"] == "time"), None)
        if obj:
            response = obj["response"]
            technique = obj["technique"]
    elif any(word in query_lower for word in ["überlegen", "nachdenken", "entscheiden"]):
        intent = IntentType.OBJECTION
        objection_type = ObjectionType.THINK_ABOUT
        obj = next((o for o in _objection_responses if o["objection_type"] == "think_about"), None)
        if obj:
            response = obj["response"]
            technique = obj["technique"]
    elif any(word in query_lower for word in ["was ist", "wie", "erkläre", "info"]):
        intent = IntentType.INFO_REQUEST
        response = "Das Balance Oil ist ein hochwertiges Omega-3 Supplement mit wissenschaftlich nachgewiesener Wirkung. 97% der Nutzer verbessern ihre Werte nachweislich."
    elif any(word in query_lower for word in ["interesse", "klingt gut", "mehr erfahren"]):
        intent = IntentType.INTEREST
        response = "Super! Soll ich dir den BalanceTest erklären? Damit siehst du genau, wo du stehst - ganz unverbindlich."
    else:
        intent = IntentType.OTHER
        response = "Lass mich kurz überlegen... Kannst du mir mehr dazu sagen?"
    
    response_time = int((time.time() - start) * 1000)
    
    # Session updaten
    if request.session_id in _active_sessions:
        _active_sessions[request.session_id].setdefault("queries", []).append({
            "id": query_id,
            "query": request.query,
            "intent": intent,
            "is_objection": intent == IntentType.OBJECTION,
        })
    
    return LiveQueryResponse(
        query_id=query_id,
        intent=intent,
        response=response,
        response_short=response[:100] + "..." if len(response) > 100 else response,
        objection_type=objection_type,
        follow_up="Möchtest du mehr Details?" if intent == IntentType.INTEREST else None,
        technique=technique,
        confidence=0.85 if response else 0.5,
        response_time_ms=response_time,
    )


# =============================================================================
# QUICK ACCESS ENDPOINTS
# =============================================================================

@router.get("/facts", response_model=List[QuickFactItem])
async def get_facts(
    fact_type: Optional[str] = None,
    key_only: bool = False,
    limit: int = 10,
) -> List[QuickFactItem]:
    """
    Holt Quick Facts.
    
    Args:
        fact_type: Optional Filter nach Typ
        key_only: Nur Key Facts
        limit: Maximum
        
    Returns:
        Liste von QuickFactItem
    """
    facts = _quick_facts
    
    if fact_type:
        facts = [f for f in facts if f["fact_type"] == fact_type]
    
    if key_only:
        facts = [f for f in facts if f.get("is_key", False)]
    
    return [QuickFactItem(**f) for f in facts[:limit]]


@router.get("/facts/{company_id}", response_model=List[QuickFactItem])
async def get_company_facts(
    company_id: str,
    fact_type: Optional[str] = None,
    key_only: bool = False,
    limit: int = 10,
) -> List[QuickFactItem]:
    """
    Holt Quick Facts für eine Firma.
    
    Args:
        company_id: Firmen-ID
        fact_type: Optional Filter
        key_only: Nur Key Facts
        limit: Maximum
        
    Returns:
        Liste von QuickFactItem
    """
    # Gleiche Facts für alle (später firmenspezifisch)
    return await get_facts(fact_type=fact_type, key_only=key_only, limit=limit)


@router.get("/objections", response_model=List[ObjectionResponseItem])
async def get_objections(
    objection_type: Optional[str] = None,
) -> List[ObjectionResponseItem]:
    """
    Holt Einwand-Antworten.
    
    Args:
        objection_type: Optional Filter
        
    Returns:
        Liste von ObjectionResponseItem
    """
    objs = _objection_responses
    
    if objection_type:
        objs = [o for o in objs if o["objection_type"] == objection_type]
    
    return [ObjectionResponseItem(**o) for o in objs]


@router.get("/objections/{company_id}", response_model=List[ObjectionResponseItem])
async def get_company_objections(
    company_id: str,
    objection_type: Optional[str] = None,
) -> List[ObjectionResponseItem]:
    """
    Holt Einwand-Antworten für eine Firma.
    """
    return await get_objections(objection_type=objection_type)


# =============================================================================
# COACH ANALYTICS
# =============================================================================

@router.get("/coach/insights", response_model=CoachInsightsResponse)
async def get_coach_insights(
    company_id: str,
    days: int = 30,
) -> CoachInsightsResponse:
    """
    Holt personalisierte Coach-Insights.
    
    Args:
        company_id: Firmen-ID
        days: Zeitraum in Tagen
        
    Returns:
        CoachInsightsResponse
    """
    return CoachInsightsResponse(
        sessions_analyzed=days * 2,  # Demo: ca. 2 Sessions pro Tag
        tips=[
            CoachTip(
                id="tip_001",
                title="🎯 5 Hot Leads warten auf dich",
                description="Diese Leads haben hohes Kaufinteresse gezeigt. Kontaktiere sie heute!",
                priority="high",
                action_type="follow_up",
            ),
            CoachTip(
                id="tip_002",
                title="⏰ Follow-up Timing optimieren",
                description="Leads die innerhalb von 24h nachgefasst werden konvertieren 2.3x besser.",
                priority="medium",
                action_type="training",
            ),
            CoachTip(
                id="tip_003",
                title="💪 Starke Einwandbehandlung",
                description="Du hast 78% der Preis-Einwände erfolgreich behandelt. Weiter so!",
                priority="low",
                action_type="insight",
            ),
        ],
        generated_at=datetime.now().isoformat(),
        mood_trend="positive",
        decision_pattern="Entscheidet schnell bei klarem Mehrwert",
        recommendations=[
            "Fokussiere dich auf die 5 Hot Leads heute",
            "Nutze mehr Social Proof bei Preis-Einwänden",
            "Probiere die 'Bridge-Technik' bei 'Muss überlegen'",
        ],
    )


@router.get("/coach/performance", response_model=PerformanceMetrics)
async def get_performance_metrics(
    company_id: str,
    days: int = 30,
) -> PerformanceMetrics:
    """
    Holt Performance-Metriken.
    
    Args:
        company_id: Firmen-ID
        days: Zeitraum
        
    Returns:
        PerformanceMetrics
    """
    return PerformanceMetrics(
        total_sessions=23,
        avg_session_duration_min=12.5,
        avg_response_time_ms=450,
        success_rate=0.68,
        objections_per_session=2.3,
    )


@router.get("/coach/objection-analytics")
async def get_objection_analytics(
    company_id: str,
    days: int = 30,
) -> List[dict]:
    """
    Holt Einwand-Analytics.
    
    Args:
        company_id: Firmen-ID
        days: Zeitraum
        
    Returns:
        Liste mit Analytics pro Einwand-Typ
    """
    return [
        {
            "objection_type": "price",
            "count": 45,
            "success_rate": 0.72,
            "best_technique": "Reframing",
            "trend": "stable",
        },
        {
            "objection_type": "time",
            "count": 28,
            "success_rate": 0.65,
            "best_technique": "Terminvereinbarung",
            "trend": "improving",
        },
        {
            "objection_type": "think_about",
            "count": 67,
            "success_rate": 0.58,
            "best_technique": "Isolierung",
            "trend": "declining",
        },
    ]


# =============================================================================
# FEEDBACK
# =============================================================================

@router.post("/query/{query_id}/feedback")
async def submit_feedback(
    query_id: str,
    was_helpful: bool,
) -> dict:
    """
    Gibt Feedback zu einer Query-Antwort.
    
    Args:
        query_id: Query-ID
        was_helpful: War hilfreich?
        
    Returns:
        Bestätigung
    """
    logger.info(f"Feedback for query {query_id}: helpful={was_helpful}")
    
    return {
        "success": True,
        "message": "Danke für dein Feedback!",
    }


@router.post("/objection/{response_id}/used")
async def log_objection_used(
    response_id: str,
    was_successful: Optional[bool] = None,
) -> dict:
    """
    Loggt Verwendung einer Einwand-Antwort.
    
    Args:
        response_id: Response-ID
        was_successful: War erfolgreich?
        
    Returns:
        Aktualisierte Stats
    """
    # Update in-memory (später DB)
    for obj in _objection_responses:
        if obj["id"] == response_id:
            obj["times_used"] += 1
            if was_successful is not None:
                # Vereinfachte Success-Rate-Berechnung
                current_rate = obj["success_rate"]
                new_rate = (current_rate * 0.9) + (0.1 if was_successful else 0)
                obj["success_rate"] = round(new_rate, 2)
            
            return {
                "success": True,
                "times_used": obj["times_used"],
                "success_rate": obj["success_rate"],
            }
    
    return {
        "success": False,
        "times_used": 0,
        "success_rate": 0,
    }


# =============================================================================
# KNOWLEDGE
# =============================================================================

@router.get("/knowledge/{vertical}")
async def get_vertical_knowledge(
    vertical: str,
    knowledge_type: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 10,
) -> List[dict]:
    """
    Holt Branchenwissen.
    
    Args:
        vertical: Branche (z.B. 'health', 'finance')
        knowledge_type: Optional Typ
        query: Optional Suchbegriff
        limit: Maximum
        
    Returns:
        Liste mit Wissenseinträgen
    """
    # Demo-Daten nach Branche
    knowledge_base = {
        "health": [
            {
                "id": "know_001",
                "type": "regulation",
                "title": "Health Claims",
                "content": "Keine Heilversprechen! Nur 'kann unterstützen', 'trägt bei zu'.",
            },
            {
                "id": "know_002",
                "type": "competitor",
                "title": "vs. Standard Omega-3",
                "content": "Höhere Bioverfügbarkeit, garantierter Test, personalisiert.",
            },
        ],
        "finance": [
            {
                "id": "know_003",
                "type": "regulation",
                "title": "Anlageberatung",
                "content": "Keine konkreten Renditeversprechen ohne Disclaimer.",
            },
        ],
        "realestate": [
            {
                "id": "know_004",
                "type": "market",
                "title": "Marktlage 2024",
                "content": "Zinsen stabilisieren sich, Käufermarkt in vielen Regionen.",
            },
        ],
    }
    
    items = knowledge_base.get(vertical, [])
    
    if knowledge_type:
        items = [i for i in items if i["type"] == knowledge_type]
    
    if query:
        items = [i for i in items if query.lower() in i["title"].lower() or query.lower() in i["content"].lower()]
    
    return items[:limit]

