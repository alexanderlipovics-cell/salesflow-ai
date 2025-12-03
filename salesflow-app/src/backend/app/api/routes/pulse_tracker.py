"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PULSE TRACKER API ROUTES v2.1                                             ║
║  Message Status Tracking + Ghost-Buster + Behavioral Intelligence          ║
║                                                                            ║
║  NEU v2.1:                                                                ║
║  - Intent-basiertes Funnel Analytics                                      ║
║  - Dynamic Timing Endpoints                                               ║
║  - Smart Status Inference                                                 ║
║  - Ghost Classification (Soft/Hard)                                       ║
║  - A/B Testing by Behavioral Profile                                      ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Optional, List
from datetime import date
import logging

from ...db.deps import get_db, get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ..schemas.pulse_tracker import (
    CreateOutreachRequest,
    UpdateStatusRequest,
    BulkStatusUpdateRequest,
    BulkSkipRequest,
    MessageStatus,
    MessageIntent,
    GhostType,
    FollowUpStrategy,
    SendGhostBusterRequest,
    AnalyzeBehaviorRequest,
    IntentCorrectionRequest,
    CheckInItem,
    CheckInSummary,
    AccurateFunnelResponse,
    GhostBusterSuggestion,
    BehaviorAnalysisResult,
    # NEU v2.1
    IntentFunnelResponse,
    IntentCoachingInsight,
    DynamicTimingInfo,
    SmartInferenceRequest,
    SmartInferenceResult,
    GhostClassificationRequest,
    GhostClassificationResponse,
    GhostStatsByType,
    BestTemplateRecommendation,
)
from ...services.pulse_tracker import PulseTrackerService
from ...core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pulse", tags=["pulse-tracker"])


def get_pulse_service(db = Depends(get_db)) -> PulseTrackerService:
    """Dependency für PulseTrackerService"""
    anthropic_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
    return PulseTrackerService(db, anthropic_key=anthropic_key)


# =============================================================================
# OUTREACH TRACKING
# =============================================================================

@router.post("/outreach", response_model=dict)
async def create_outreach(
    request: CreateOutreachRequest,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Erstellt eine neue Outreach-Nachricht.
    
    Wird aufgerufen wenn du eine Nachricht auf Social Media sendest.
    Check-in wird automatisch für 24h später geplant.
    """
    try:
        result = await service.create_outreach(str(current_user.id), request)
        return result
    except Exception as e:
        logger.error(f"Failed to create outreach: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/outreach/{outreach_id}/status", response_model=dict)
async def update_outreach_status(
    outreach_id: str,
    request: UpdateStatusRequest,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Aktualisiert den Status einer Outreach-Nachricht.
    
    Status-Flow: sent → seen → replied/ghosted/invisible
    
    Bei 'ghosted' wird automatisch eine Ghost-Buster Strategie vorgeschlagen.
    """
    try:
        result = await service.update_status(str(current_user.id), outreach_id, request)
        return result
    except Exception as e:
        logger.error(f"Failed to update status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# BULK OPERATIONS
# =============================================================================

@router.post("/outreach/bulk-status", response_model=dict)
async def bulk_update_status(
    request: BulkStatusUpdateRequest,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Bulk-Update für mehrere Check-ins auf einmal.
    
    Nützlich wenn du z.B. alle ausstehenden Check-ins als "ghosted" markieren willst.
    """
    try:
        result = await service.bulk_update_status(
            str(current_user.id),
            request.outreach_ids,
            request.status,
        )
        return result
    except Exception as e:
        logger.error(f"Failed to bulk update: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/outreach/bulk-skip", response_model=dict)
async def bulk_skip_checkins(
    request: BulkSkipRequest,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Überspringt mehrere Check-ins.
    
    Diese werden nach 7 Tagen automatisch zu 'stale' markiert.
    """
    try:
        result = await service.bulk_skip_checkins(
            str(current_user.id),
            request.outreach_ids,
        )
        return result
    except Exception as e:
        logger.error(f"Failed to bulk skip: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/system/auto-inference", response_model=dict)
async def run_auto_inference(
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Führt Auto-Inference aus.
    
    Markiert alle Nachrichten ohne Check-in nach 7 Tagen als 'stale'.
    """
    try:
        result = await service.run_auto_inference(str(current_user.id))
        return result
    except Exception as e:
        logger.error(f"Failed to run auto-inference: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# CHECK-INS
# =============================================================================

@router.get("/checkins", response_model=List[CheckInItem])
async def get_pending_checkins(
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Holt alle fälligen Check-ins (Was ist passiert?).
    
    Returns eine Liste von Outreach-Nachrichten die auf Status-Update warten.
    Sortiert nach Priorität (älteste/wichtigste zuerst).
    """
    try:
        return await service.get_pending_checkins(str(current_user.id))
    except Exception as e:
        logger.error(f"Failed to get checkins: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/checkins/summary", response_model=CheckInSummary)
async def get_checkin_summary(
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Zusammenfassung der Check-ins für Dashboard/Morning Briefing.
    
    Zeigt wie viele Check-ins ausstehen und geschätzte Zeit.
    """
    try:
        return await service.get_checkin_summary(str(current_user.id))
    except Exception as e:
        logger.error(f"Failed to get checkin summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# GHOST BUSTER
# =============================================================================

@router.get("/ghosts", response_model=List[dict])
async def get_ghost_leads(
    min_hours: int = Query(48, ge=24, description="Mindest-Stunden ohne Antwort"),
    max_days: int = Query(14, ge=1, le=90, description="Maximum-Tage zurück"),
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Holt alle Ghost-Leads für Ghost-Buster Kampagne.
    
    Ghosts = Nachrichten die gelesen wurden aber keine Antwort kam.
    Inkl. vorgeschlagener Follow-up Strategien und Templates.
    """
    try:
        return await service.get_ghost_leads(str(current_user.id), min_hours, max_days)
    except Exception as e:
        logger.error(f"Failed to get ghosts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ghosts/{outreach_id}/bust", response_model=dict)
async def send_ghost_buster(
    outreach_id: str,
    request: SendGhostBusterRequest,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Sendet eine Ghost-Buster Nachricht.
    
    Erstellt eine neue Outreach-Nachricht mit dem gewählten Template
    und markiert die Original-Nachricht als "follow_up_sent".
    """
    try:
        result = await service.send_ghost_buster(
            str(current_user.id),
            outreach_id,
            request.template_text,
            request.strategy,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to send ghost buster: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ghosts/templates", response_model=List[dict])
async def get_ghost_buster_templates(
    strategy: Optional[FollowUpStrategy] = None,
    db = Depends(get_db),
):
    """
    Holt alle verfügbaren Ghost-Buster Templates.
    
    Optional nach Strategie filterbar.
    """
    try:
        query = db.table("ghost_buster_templates")\
            .select("*")\
            .eq("is_active", True)\
            .order("success_rate", desc=True)
        
        if strategy:
            query = query.eq("strategy", strategy.value)
        
        result = query.execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# BEHAVIORAL ANALYSIS
# =============================================================================

@router.post("/behavior/analyze", response_model=BehaviorAnalysisResult)
async def analyze_behavior(
    request: AnalyzeBehaviorRequest,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Analysiert Verhalten aus Chatverlauf.
    
    Verwendet Claude um Emotion, Engagement, Entscheidungstendenz,
    Trust und Coherence zu analysieren.
    """
    try:
        result = await service.analyze_behavior(
            str(current_user.id),
            request.lead_id,
            request.chat_text,
            request.context,
        )
        return result
    except Exception as e:
        logger.error(f"Failed to analyze behavior: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/behavior/{lead_id}", response_model=dict)
async def get_behavior_profile(
    lead_id: str,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Holt das Verhaltensprofil eines Leads.
    """
    try:
        profile = await service.get_behavior_profile(str(current_user.id), lead_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Behavior profile not found")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get behavior profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# CONVERSION FUNNEL
# =============================================================================

@router.get("/funnel", response_model=AccurateFunnelResponse)
async def get_funnel_metrics(
    target_date: Optional[date] = None,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Holt Conversion Funnel Metriken für einen Tag.
    
    Unterscheidet zwischen bestätigten und unbestätigten Daten
    basierend auf Check-in Completion.
    """
    try:
        return await service.get_accurate_funnel(str(current_user.id), target_date)
    except Exception as e:
        logger.error(f"Failed to get funnel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/funnel/insights", response_model=dict)
async def get_funnel_insights(
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Holt AI-generierte Insights zum Funnel.
    
    Zeigt Gesundheits-Score, Top-Issues und Empfehlungen.
    """
    try:
        return await service.get_funnel_insights(str(current_user.id))
    except Exception as e:
        logger.error(f"Failed to get funnel insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/funnel/history", response_model=List[dict])
async def get_funnel_history(
    days: int = Query(30, ge=1, le=90),
    current_user: CurrentUser = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Holt Funnel-History für Chart.
    """
    try:
        result = db.table("conversion_funnel_daily")\
            .select("date, messages_sent, messages_seen, messages_replied, messages_ghosted, ghosts_reactivated, open_rate, reply_rate, ghost_rate, ghost_buster_rate")\
            .eq("user_id", str(current_user.id))\
            .order("date", desc=True)\
            .limit(days)\
            .execute()
        
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get funnel history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# INTENT CORRECTION (Training)
# =============================================================================

@router.post("/corrections", response_model=dict)
async def submit_intent_correction(
    request: IntentCorrectionRequest,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Speichert eine Intent-Korrektur für späteres Training.
    
    Wird aufgerufen wenn CHIEF einen Intent falsch erkannt hat
    und der User es korrigiert.
    """
    try:
        result = await service.submit_intent_correction(
            str(current_user.id),
            request.query_text,
            request.detected_intent,
            request.corrected_intent,
            request.detected_objection,
            request.corrected_objection,
            request.reason,
        )
        return result
    except Exception as e:
        logger.error(f"Failed to submit correction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# NEU v2.1: INTENT-BASIERTES FUNNEL
# =============================================================================

@router.get("/funnel/by-intent", response_model=IntentFunnelResponse)
async def get_funnel_by_intent(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Holt Funnel-Metriken aufgeschlüsselt nach Message Intent.
    
    Zeigt Reply-Rate für INTRO, DISCOVERY, PITCH, CLOSING etc.
    Ermöglicht Intent-basiertes Coaching.
    """
    try:
        return await service.get_funnel_by_intent(
            str(current_user.id),
            start_date,
            end_date,
        )
    except Exception as e:
        logger.error(f"Failed to get intent funnel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/funnel/coaching", response_model=List[IntentCoachingInsight])
async def get_intent_coaching(
    days: int = Query(30, ge=7, le=90),
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Generiert Intent-basierte Coaching Insights.
    
    Zeigt wo du stark/schwach bist und gibt konkrete Tipps.
    z.B. "Deine CLOSING Messages performen schlecht. Teste kürzere Fragen."
    """
    try:
        return await service.get_intent_coaching_insights(
            str(current_user.id),
            days,
        )
    except Exception as e:
        logger.error(f"Failed to get coaching insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# NEU v2.1: DYNAMIC TIMING
# =============================================================================

@router.get("/timing/{lead_id}", response_model=DynamicTimingInfo)
async def get_dynamic_timing(
    lead_id: str,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Holt dynamische Timing-Informationen für einen Lead.
    
    Zeigt personalisierte Check-in Zeit und Ghost-Threshold
    basierend auf bisherigem Antwortverhalten.
    """
    try:
        timing = await service._get_dynamic_timing(lead_id)
        if not timing:
            # Fallback mit Defaults
            return DynamicTimingInfo(
                lead_id=lead_id,
                predicted_check_in_hours=24,
                predicted_ghost_threshold_hours=48,
            )
        return timing
    except Exception as e:
        logger.error(f"Failed to get dynamic timing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timing/{lead_id}/update", response_model=DynamicTimingInfo)
async def update_dynamic_timing(
    lead_id: str,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Aktualisiert die dynamischen Thresholds für einen Lead.
    
    Berechnet neu basierend auf allen bisherigen Response-Zeiten.
    """
    try:
        return await service.update_lead_dynamic_thresholds(lead_id)
    except Exception as e:
        logger.error(f"Failed to update dynamic timing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# NEU v2.1: SMART STATUS INFERENCE
# =============================================================================

@router.post("/inference/from-chat", response_model=List[SmartInferenceResult])
async def smart_infer_from_chat(
    request: SmartInferenceRequest,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Inferiert Status automatisch aus Chat-Import.
    
    Wenn ein Chat importiert wird und der Lead geantwortet hat,
    werden alle offenen Outreach-Nachrichten automatisch auf 'replied' gesetzt.
    """
    try:
        return await service.smart_infer_status_from_chat(
            str(current_user.id),
            request.lead_id,
            request.latest_sender,
            request.has_unread_from_lead,
        )
    except Exception as e:
        logger.error(f"Failed to infer status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# NEU v2.1: GHOST CLASSIFICATION (SOFT vs HARD)
# =============================================================================

@router.post("/ghosts/{outreach_id}/classify", response_model=GhostClassificationResponse)
async def classify_ghost(
    outreach_id: str,
    request: Optional[GhostClassificationRequest] = None,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Klassifiziert einen Ghost als Soft oder Hard.
    
    SOFT Ghost: Kürzlich gesehen, evtl. busy → Sanfter Check-in
    HARD Ghost: Lange her, war online → Pattern Interrupt / Takeaway
    """
    try:
        lead_online = request.lead_was_online_since if request else None
        lead_posted = request.lead_posted_since if request else None
        
        return await service.classify_ghost(
            outreach_id,
            lead_was_online_since=lead_online,
            lead_posted_since=lead_posted,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to classify ghost: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ghosts/stats-by-type", response_model=GhostStatsByType)
async def get_ghost_stats_by_type(
    days: int = Query(30, ge=7, le=90),
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Holt Ghost-Statistiken nach Typ (Soft vs Hard).
    
    Zeigt wie viele Soft vs Hard Ghosts du hast
    und welche Reaktivierungs-Rate bei jedem Typ.
    """
    try:
        return await service.get_ghost_stats_by_type(
            str(current_user.id),
            days,
        )
    except Exception as e:
        logger.error(f"Failed to get ghost stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# NEU v2.1: A/B TESTING BY PROFILE
# =============================================================================

@router.get("/templates/best-for-lead/{lead_id}", response_model=BestTemplateRecommendation)
async def get_best_template_for_lead(
    lead_id: str,
    campaign_id: Optional[str] = None,
    current_user = Depends(get_current_user),
    service: PulseTrackerService = Depends(get_pulse_service),
):
    """
    Empfiehlt die beste Template-Variante für einen Lead.
    
    Basierend auf Lead-Mood und historischer Performance:
    - Variante A performt besser bei 'enthusiastic' Leads
    - Variante B performt besser bei 'cautious' Leads
    
    System schlägt automatisch die beste Variante vor.
    """
    try:
        return await service.get_best_template_for_lead(lead_id, campaign_id)
    except Exception as e:
        logger.error(f"Failed to get best template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

