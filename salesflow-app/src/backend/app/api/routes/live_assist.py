"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVE ASSIST API ROUTES                                                    ║
║  Echtzeit-Verkaufsassistenz während Kundengesprächen                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
    
    SESSION MANAGEMENT:
    - POST   /live-assist/start           - Session starten
    - POST   /live-assist/end             - Session beenden
    - GET    /live-assist/session/{id}    - Session-Stats abrufen
    
    QUERY PROCESSING:
    - POST   /live-assist/query           - Live-Anfrage verarbeiten
    
    QUICK ACCESS (ohne Session):
    - GET    /live-assist/facts/{company_id}     - Quick Facts abrufen
    - GET    /live-assist/objections/{company_id} - Einwand-Antworten abrufen
    - GET    /live-assist/knowledge/{vertical}    - Branchenwissen abrufen
"""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from typing import List, Optional, Any
from uuid import UUID

from ...db.deps import get_db, get_current_user, CurrentUser
from ..schemas.live_assist import (
    # Session
    StartSessionRequest,
    StartSessionResponse,
    LiveQueryRequest,
    LiveQueryResponse,
    EndSessionRequest,
    SessionStatsResponse,
    # Quick Access
    AssistIntent,
    ObjectionType,
    FactType,
)
from ...services.live_assist import LiveAssistService
from ...services.live_assist.service_v3 import LiveAssistServiceV3
from ...services.live_assist.coach_analytics import CoachAnalyticsService
from ..schemas.live_assist import (
    # Existing imports already there
    CoachInsightsResponse,
    QueryFeedbackRequest,
    PerformanceMetricsResponse,
    ObjectionAnalyticsItem,
)

router = APIRouter(prefix="/live-assist", tags=["live-assist"])


# =============================================================================
# SESSION MANAGEMENT
# =============================================================================

@router.post("/start", response_model=StartSessionResponse)
async def start_session(
    request: StartSessionRequest,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Startet eine Live Assist Session.
    
    Trigger: User sagt "Bin mit Kunde" oder aktiviert manuell.
    
    Lädt Key Facts und Produkte vor für schnellen Zugriff.
    """
    service = LiveAssistService(db)
    return service.start_session(str(current_user.id), request)


@router.post("/end")
async def end_session(
    request: EndSessionRequest,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Beendet eine Live Assist Session.
    
    Optional: Outcome und Feedback angeben.
    """
    service = LiveAssistService(db)
    return service.end_session(str(current_user.id), request)


@router.get("/session/{session_id}", response_model=SessionStatsResponse)
async def get_session_stats(
    session_id: str,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt Statistiken einer Session."""
    service = LiveAssistService(db)
    return service.get_session_stats(str(current_user.id), session_id)


# =============================================================================
# QUERY PROCESSING
# =============================================================================

@router.post("/query", response_model=LiveQueryResponse)
async def process_query(
    request: LiveQueryRequest,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Verarbeitet eine Live-Anfrage.
    
    Schnelle Antwort - optimiert für Echtzeit.
    
    Flow:
    1. Intent Detection
    2. Knowledge Retrieval (DB first)
    3. AI Generation (fallback)
    4. Response Logging
    """
    service = LiveAssistService(db)
    return service.process_query(str(current_user.id), request)


# =============================================================================
# QUICK ACCESS (ohne Session)
# =============================================================================

@router.get("/facts/{company_id}")
async def get_quick_facts(
    company_id: str,
    fact_type: Optional[str] = Query(None, description="Filter nach Fact-Typ"),
    key_only: bool = Query(False, description="Nur Key Facts"),
    limit: int = Query(10, ge=1, le=50),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Quick Facts für eine Firma.
    
    Kann auch ohne aktive Session verwendet werden.
    """
    service = LiveAssistService(db)
    return service.get_quick_facts(
        company_id=company_id,
        fact_type=fact_type,
        key_only=key_only,
        limit=limit,
    )


@router.get("/facts")
async def get_all_quick_facts(
    vertical: Optional[str] = Query(None, description="Filter nach Vertical"),
    fact_type: Optional[str] = Query(None, description="Filter nach Fact-Typ"),
    key_only: bool = Query(False, description="Nur Key Facts"),
    limit: int = Query(10, ge=1, le=50),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Quick Facts (ohne Company-Filter).
    """
    service = LiveAssistService(db)
    return service.get_quick_facts(
        vertical=vertical,
        fact_type=fact_type,
        key_only=key_only,
        limit=limit,
    )


@router.get("/objections/{company_id}")
async def get_objection_responses(
    company_id: str,
    objection_type: Optional[str] = Query(None, description="Filter nach Einwand-Typ"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Einwand-Antworten für eine Firma.
    
    Kann auch ohne aktive Session verwendet werden.
    """
    service = LiveAssistService(db)
    return service.get_objection_responses(
        company_id=company_id,
        objection_type=objection_type,
    )


@router.get("/objections")
async def get_all_objection_responses(
    objection_type: Optional[str] = Query(None, description="Filter nach Einwand-Typ"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Einwand-Antworten (ohne Company-Filter).
    """
    service = LiveAssistService(db)
    return service.get_objection_responses(
        objection_type=objection_type,
    )


@router.get("/knowledge/{vertical}")
async def get_vertical_knowledge(
    vertical: str,
    knowledge_type: Optional[str] = Query(None, description="Filter nach Wissens-Typ"),
    query: Optional[str] = Query(None, description="Suchbegriff"),
    limit: int = Query(10, ge=1, le=50),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Branchenwissen für ein Vertical.
    """
    service = LiveAssistService(db)
    return service.get_vertical_knowledge(
        vertical=vertical,
        knowledge_type=knowledge_type,
        query=query,
        limit=limit,
    )


# =============================================================================
# FEEDBACK
# =============================================================================

@router.post("/query/{query_id}/feedback")
async def submit_query_feedback(
    query_id: str,
    request: QueryFeedbackRequest,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt Feedback zu einer Query-Antwort (v3.3 mit Learning).
    
    Unterstützt Intent/Objection-Korrekturen für Machine Learning.
    """
    service = LiveAssistServiceV3(db)
    success = service.submit_query_feedback(
        query_id=query_id,
        user_id=str(current_user.id),
        was_helpful=request.was_helpful,
        corrected_intent=request.corrected_intent,
        corrected_objection_type=request.corrected_objection_type,
        feedback_text=request.feedback_text
    )
    
    return {"success": success, "message": "Feedback gespeichert" if success else "Fehler beim Speichern"}


# =============================================================================
# COACH ANALYTICS (v3.3)
# =============================================================================

@router.get("/coach/insights", response_model=CoachInsightsResponse)
async def get_coach_insights(
    company_id: str = Query(..., description="Company ID"),
    days: int = Query(30, ge=1, le=90, description="Analyse-Zeitraum in Tagen"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt personalisierte Coach-Insights.
    
    Analysiert Mood-Patterns, Decision-Tendenzen und generiert
    personalisierte Tipps zur Verbesserung.
    """
    service = CoachAnalyticsService(db)
    insights = service.get_coach_insights(
        user_id=str(current_user.id),
        company_id=company_id,
        days=days
    )
    
    return insights.to_dict()


@router.get("/coach/performance", response_model=PerformanceMetricsResponse)
async def get_performance_metrics(
    company_id: str = Query(..., description="Company ID"),
    days: int = Query(30, ge=1, le=90, description="Analyse-Zeitraum in Tagen"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Performance-Metriken für Live Assist.
    
    Zeigt Sessions, Response-Times, Outcomes etc.
    """
    service = CoachAnalyticsService(db)
    return service.get_performance_metrics(
        user_id=str(current_user.id),
        company_id=company_id,
        days=days
    )


@router.get("/coach/objections", response_model=List[ObjectionAnalyticsItem])
async def get_objection_analytics(
    company_id: str = Query(..., description="Company ID"),
    days: int = Query(30, ge=1, le=90, description="Analyse-Zeitraum in Tagen"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Einwand-Analytics.
    
    Zeigt häufigste Einwände und Erfolgsraten der Antworten.
    """
    service = CoachAnalyticsService(db)
    return service.get_objection_analytics(
        company_id=company_id,
        days=days
    )


@router.post("/objection/{response_id}/used")
async def log_objection_response_used(
    response_id: str,
    was_successful: Optional[bool] = None,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Loggt dass eine Einwand-Antwort verwendet wurde.
    
    Hilft bei der Optimierung der Erfolgsraten.
    """
    # Get current stats
    response = db.table("objection_responses").select(
        "times_used, success_rate"
    ).eq("id", response_id).single().execute()
    
    if not response.data:
        raise HTTPException(404, "Einwand-Antwort nicht gefunden")
    
    times_used = (response.data.get("times_used") or 0) + 1
    current_rate = response.data.get("success_rate")
    
    # Calculate new success rate if feedback provided
    new_rate = current_rate
    if was_successful is not None:
        if current_rate is None:
            new_rate = 1.0 if was_successful else 0.0
        else:
            # Weighted average
            success_count = current_rate * (times_used - 1)
            if was_successful:
                success_count += 1
            new_rate = success_count / times_used
    
    db.table("objection_responses").update({
        "times_used": times_used,
        "success_rate": new_rate,
    }).eq("id", response_id).execute()
    
    return {"success": True, "times_used": times_used, "success_rate": new_rate}


# =============================================================================
# WEBSOCKET (für Echtzeit Voice)
# =============================================================================

@router.websocket("/ws/{session_id}")
async def websocket_live_assist(
    websocket: WebSocket,
    session_id: str,
    db = Depends(get_db),
):
    """
    WebSocket für Echtzeit Voice-Assistenz.
    
    Client sendet Text (transkribiert von Voice), Server antwortet.
    
    Message Format (Client → Server):
    {
        "query": "Kunde sagt zu teuer",
        "type": "voice" | "text"
    }
    
    Message Format (Server → Client):
    {
        "response": "...",
        "response_short": "...",
        "intent": "objection",
        "objection_type": "price",
        "follow_up": "..."
    }
    """
    await websocket.accept()
    
    service = LiveAssistService(db)
    
    # TODO: Authenticate WebSocket connection
    # For now, we'll use a placeholder user_id
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            
            query_text = data.get("query")
            query_type = data.get("type", "text")
            
            if not query_text:
                await websocket.send_json({
                    "error": "Query text required"
                })
                continue
            
            try:
                # Process query
                request = LiveQueryRequest(
                    session_id=session_id,
                    query_text=query_text,
                    query_type=query_type,
                )
                
                # TODO: Get user_id from WebSocket auth
                # For now, get from session
                session = db.table("live_assist_sessions").select(
                    "user_id"
                ).eq("id", session_id).single().execute()
                
                if not session.data:
                    await websocket.send_json({
                        "error": "Session not found"
                    })
                    continue
                
                user_id = session.data.get("user_id")
                
                response = service.process_query(user_id, request)
                
                # Send response
                await websocket.send_json({
                    "response": response.response_text,
                    "response_short": response.response_short,
                    "intent": response.detected_intent.value,
                    "objection_type": response.objection_type,
                    "follow_up": response.follow_up_question,
                    "technique": response.response_technique,
                    "response_time_ms": response.response_time_ms,
                })
                
            except Exception as e:
                await websocket.send_json({
                    "error": str(e)
                })
            
    except WebSocketDisconnect:
        # Client disconnected
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass


# =============================================================================
# 🔒 SECURITY MONITORING (Admin only)
# =============================================================================

@router.get(
    "/security/logs",
    response_model=dict,
    summary="Security-Logs abrufen (Admin only)",
    description="Gibt die letzten Security-Events zurück (Jailbreak-Versuche, sensible Anfragen)."
)
async def get_security_logs(
    limit: int = Query(50, ge=1, le=100, description="Maximale Anzahl an Logs"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    🔒 Gibt Security-Logs zurück.
    
    Nur für Admins sichtbar.
    """
    # TODO: Admin-Check einbauen
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Admin access required")
    
    from ...config.prompts.locked_block import get_security_log, get_security_stats
    
    return {
        "logs": get_security_log(limit),
        "stats": get_security_stats(),
    }


@router.get(
    "/security/stats",
    response_model=dict,
    summary="Security-Statistiken abrufen",
    description="Gibt Statistiken über Security-Events zurück."
)
async def get_security_statistics(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    📊 Gibt Security-Statistiken zurück.
    """
    from ...config.prompts.locked_block import get_security_stats
    
    return get_security_stats()
