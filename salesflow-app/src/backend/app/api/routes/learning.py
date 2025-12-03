"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LEARNING ROUTES                                                           ║
║  API Endpoints für Learning Events                                         ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Body
from datetime import date

from ..schemas.learning import (
    LogLearningEventRequest,
    LogLearningEventResponse,
    LogMessageSentRequest,
    LogReplyReceivedRequest,
    LogDealOutcomeRequest,
    TemplateStatsEntry,
    ChannelStatsEntry,
    TopTemplatesResponse,
    TopTemplateForChief,
)
from ...services.learning.service import LearningService
from ...services.learning.top_templates import (
    get_top_templates_for_context,
    format_top_templates_for_prompt,
)
from ...db.deps import get_supabase, get_current_user, CurrentUser

router = APIRouter(prefix="/learning", tags=["learning"])


# =============================================================================
# EVENT LOGGING
# =============================================================================

@router.post("/events", response_model=LogLearningEventResponse)
def log_learning_event(
    payload: LogLearningEventRequest,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Loggt ein Learning Event.
    
    Unterstützte Event-Types:
    - message_suggested: CHIEF hat Nachricht vorgeschlagen
    - message_sent: User hat Nachricht gesendet
    - message_edited: User hat vor Senden editiert
    - message_replied: Lead hat geantwortet
    - message_positive_reply: Positive Antwort
    - message_negative_reply: Negative Antwort
    - message_no_reply: Keine Antwort nach X Tagen
    - deal_won: Abschluss
    - deal_lost: Verloren
    - call_booked: Call gebucht
    - meeting_held: Meeting durchgeführt
    """
    service = LearningService(db)
    return service.log_event(
        company_id=current_user.company_id,
        user_id=str(current_user.id),
        request=payload,
    )


# =============================================================================
# CONVENIENCE ENDPOINTS
# =============================================================================

@router.post("/events/message-sent", response_model=LogLearningEventResponse)
def log_message_sent(
    payload: LogMessageSentRequest = Body(...),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Convenience: Nachricht gesendet.
    
    Loggt automatisch auch ein 'message_edited' Event, wenn was_edited=true.
    """
    service = LearningService(db)
    return service.log_message_sent(
        company_id=current_user.company_id,
        user_id=str(current_user.id),
        lead_id=payload.lead_id,
        template_id=payload.template_id,
        channel=payload.channel,
        vertical_id=payload.vertical_id,
        was_edited=payload.was_edited,
        message_preview=payload.message_preview,
    )


@router.post("/events/reply-received", response_model=LogLearningEventResponse)
def log_reply_received(
    payload: LogReplyReceivedRequest = Body(...),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Convenience: Antwort erhalten.
    
    Loggt:
    - message_replied (immer)
    - message_positive_reply ODER message_negative_reply (wenn is_positive bekannt)
    """
    service = LearningService(db)
    return service.log_reply_received(
        company_id=current_user.company_id,
        user_id=str(current_user.id),
        lead_id=payload.lead_id,
        is_positive=payload.is_positive,
        response_time_hours=payload.response_time_hours,
        template_id=payload.template_id,
        channel=payload.channel,
        vertical_id=payload.vertical_id,
    )


@router.post("/events/deal-outcome", response_model=LogLearningEventResponse)
def log_deal_outcome(
    payload: LogDealOutcomeRequest = Body(...),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Convenience: Deal gewonnen/verloren.
    """
    service = LearningService(db)
    return service.log_deal_outcome(
        company_id=current_user.company_id,
        user_id=str(current_user.id),
        lead_id=payload.lead_id,
        won=payload.won,
        template_id=payload.template_id,
        channel=payload.channel,
        vertical_id=payload.vertical_id,
        deal_value=payload.deal_value,
    )


@router.post("/events/call-booked", response_model=LogLearningEventResponse)
def log_call_booked(
    lead_id: str = Query(...),
    template_id: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    vertical_id: Optional[str] = Query(None),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Convenience: Call gebucht."""
    service = LearningService(db)
    return service.log_call_booked(
        company_id=current_user.company_id,
        user_id=str(current_user.id),
        lead_id=lead_id,
        template_id=template_id,
        channel=channel,
        vertical_id=vertical_id,
    )


@router.post("/events/meeting-held", response_model=LogLearningEventResponse)
def log_meeting_held(
    lead_id: str = Query(...),
    template_id: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    vertical_id: Optional[str] = Query(None),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Convenience: Meeting durchgeführt."""
    service = LearningService(db)
    return service.log_meeting_held(
        company_id=current_user.company_id,
        user_id=str(current_user.id),
        lead_id=lead_id,
        template_id=template_id,
        channel=channel,
        vertical_id=vertical_id,
    )


# =============================================================================
# STATS QUERIES
# =============================================================================

@router.get("/templates/{template_id}/stats", response_model=TemplateStatsEntry)
def get_template_stats(
    template_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Stats für ein spezifisches Template.
    """
    service = LearningService(db)
    return service.get_template_stats(
        company_id=current_user.company_id,
        template_id=template_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/channels/stats")
def get_channel_stats(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Stats gruppiert nach Channel.
    """
    service = LearningService(db)
    return service.get_channel_stats(
        company_id=current_user.company_id,
        from_date=from_date,
        to_date=to_date,
    )


# =============================================================================
# TOP TEMPLATES (für CHIEF)
# =============================================================================

@router.get("/top-templates", response_model=TopTemplatesResponse)
def get_top_templates(
    vertical_id: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    lookback_days: int = Query(30, ge=7, le=90),
    min_sends: int = Query(20, ge=5, le=100),
    limit: int = Query(3, ge=1, le=10),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt die Top-performenden Templates für CHIEF Context.
    
    Sortiert nach:
    1. Win-Rate (höchste zuerst)
    2. Reply-Rate (bei gleicher Win-Rate)
    
    Nur Templates mit >= min_sends werden berücksichtigt.
    """
    templates = get_top_templates_for_context(
        db,
        current_user.company_id,
        vertical_id=vertical_id,
        channel=channel,
        lookback_days=lookback_days,
        min_sends=min_sends,
        limit=limit,
    )
    
    return TopTemplatesResponse(
        templates=[
            TopTemplateForChief(
                template_id=t.template_id,
                name=t.name,
                channel=t.channel,
                vertical_id=t.vertical_id,
                preview=t.preview,
                stats=t.stats,
            )
            for t in templates
        ],
        lookback_days=lookback_days,
        min_sends=min_sends,
    )


@router.get("/top-templates/formatted")
def get_top_templates_formatted(
    vertical_id: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    lookback_days: int = Query(30, ge=7, le=90),
    min_sends: int = Query(20, ge=5, le=100),
    limit: int = Query(3, ge=1, le=10),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt die Top-Templates als formatierten String für CHIEF System Prompt.
    """
    templates = get_top_templates_for_context(
        db,
        current_user.company_id,
        vertical_id=vertical_id,
        channel=channel,
        lookback_days=lookback_days,
        min_sends=min_sends,
        limit=limit,
    )
    
    return {
        "formatted": format_top_templates_for_prompt(templates),
        "template_count": len(templates),
    }

