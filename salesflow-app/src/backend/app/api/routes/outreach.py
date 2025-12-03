"""
API Routes für Outreach Tracker & Ghost Follow-up System
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import logging

from ...db.deps import get_db, get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...services.outreach import OutreachService, GhostDetector

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/outreach", tags=["outreach"])


# =============================================================================
# Pydantic Models
# =============================================================================

class OutreachCreate(BaseModel):
    """Quick-Log für neue Outreach-Nachricht"""
    contact_name: str = Field(..., min_length=1, description="Name des Kontakts")
    platform: str = Field(..., description="instagram, facebook, linkedin, whatsapp, etc.")
    message_type: str = Field(default="cold_dm", description="cold_dm, warm_intro, story_reply, etc.")
    contact_handle: Optional[str] = Field(None, description="@username auf der Plattform")
    contact_profile_url: Optional[str] = Field(None, description="Link zum Profil")
    message_preview: Optional[str] = Field(None, description="Kurze Vorschau der gesendeten Nachricht")
    conversation_starter: Optional[str] = Field(None, description="Worauf bezogen (Story, Post, etc.)")
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    lead_id: Optional[str] = Field(None, description="Verknüpfung zu bestehendem Lead")
    template_id: Optional[str] = Field(None, description="Verwendetes Template")


class OutreachStatusUpdate(BaseModel):
    """Status-Update für Outreach"""
    status: str = Field(..., description="sent, delivered, seen, replied, positive, negative, converted, blocked")


class FollowupAction(BaseModel):
    """Aktion für Follow-up Queue"""
    action: str = Field(..., description="send, skip, snooze")
    skip_reason: Optional[str] = None
    snooze_hours: Optional[int] = Field(default=24, ge=1, le=168)


class GenerateFollowupRequest(BaseModel):
    """Request für Follow-up Generierung"""
    outreach_id: str
    custom_context: Optional[str] = None


# =============================================================================
# CRUD Endpoints
# =============================================================================

@router.post("/", response_model=dict)
async def create_outreach(
    data: OutreachCreate,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Quick-Log: Neue Outreach-Nachricht erfassen
    Wird sofort nach dem Senden einer Nachricht auf Social Media aufgerufen
    """
    service = OutreachService(supabase)
    
    result = await service.create_outreach(
        user_id=str(current_user.id),
        contact_name=data.contact_name,
        platform=data.platform,
        message_type=data.message_type,
        contact_handle=data.contact_handle,
        contact_profile_url=data.contact_profile_url,
        message_preview=data.message_preview,
        conversation_starter=data.conversation_starter,
        notes=data.notes,
        tags=data.tags,
        lead_id=data.lead_id,
        template_id=data.template_id
    )
    
    return {"success": True, "outreach": result}


@router.get("/", response_model=dict)
async def list_outreach(
    platform: Optional[str] = Query(None, description="Filter nach Plattform"),
    status: Optional[str] = Query(None, description="Filter nach Status"),
    is_ghost: Optional[bool] = Query(None, description="Nur Ghosts anzeigen"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Liste aller Outreach-Nachrichten mit Filtern"""
    service = OutreachService(supabase)
    
    outreach_list = await service.get_user_outreach(
        user_id=str(current_user.id),
        platform=platform,
        status=status,
        is_ghost=is_ghost,
        limit=limit,
        offset=offset
    )
    
    return {"outreach": outreach_list, "count": len(outreach_list)}


@router.get("/{outreach_id}", response_model=dict)
async def get_outreach(
    outreach_id: str,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Einzelnen Outreach-Eintrag abrufen"""
    service = OutreachService(supabase)
    
    result = await service.get_outreach(outreach_id, str(current_user.id))
    
    if not result:
        raise HTTPException(status_code=404, detail="Outreach not found")
    
    return {"outreach": result}


@router.patch("/{outreach_id}/status", response_model=dict)
async def update_outreach_status(
    outreach_id: str,
    data: OutreachStatusUpdate,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Status einer Outreach-Nachricht aktualisieren
    
    Status-Flow: sent → delivered → seen → replied/positive/negative/converted/blocked
    
    WICHTIG: Bei 'seen' startet der Ghost-Timer!
    """
    service = OutreachService(supabase)
    
    result = await service.update_status(
        outreach_id=outreach_id,
        new_status=data.status,
        user_id=str(current_user.id)
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Outreach not found")
    
    return {"success": True, "outreach": result}


@router.post("/{outreach_id}/seen", response_model=dict)
async def mark_as_seen(
    outreach_id: str,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Schnell-Aktion: Nachricht als 'gelesen' markieren
    
    Ab jetzt läuft der Ghost-Timer! 
    Nach 24h ohne Antwort wird automatisch ein Follow-up vorgeschlagen.
    """
    service = OutreachService(supabase)
    
    result = await service.mark_as_seen(outreach_id, str(current_user.id))
    
    if not result:
        raise HTTPException(status_code=404, detail="Outreach not found")
    
    return {
        "success": True, 
        "outreach": result,
        "message": "Ghost-Timer gestartet! Follow-up in 24h falls keine Antwort."
    }


@router.post("/{outreach_id}/replied", response_model=dict)
async def mark_as_replied(
    outreach_id: str,
    is_positive: Optional[bool] = Query(None, description="True=Interesse, False=Absage, None=Neutral"),
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Schnell-Aktion: Antwort erhalten markieren
    
    Hebt Ghost-Status auf und stoppt Follow-up Sequenz.
    """
    service = OutreachService(supabase)
    
    result = await service.mark_as_replied(
        outreach_id=outreach_id,
        user_id=str(current_user.id),
        is_positive=is_positive
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Outreach not found")
    
    return {"success": True, "outreach": result}


# =============================================================================
# Ghost & Follow-up Endpoints
# =============================================================================

@router.get("/ghosts/list", response_model=dict)
async def get_ghosts(
    platform: Optional[str] = Query(None, description="Filter nach Plattform"),
    min_ghost_hours: int = Query(24, ge=1, description="Mindest-Stunden ohne Antwort"),
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Liste aller Ghost-Kontakte
    
    Ghosts = Nachrichten die gelesen wurden aber keine Antwort kam
    """
    service = OutreachService(supabase)
    
    ghosts = await service.get_ghosts(
        user_id=str(current_user.id),
        platform=platform,
        min_ghost_hours=min_ghost_hours
    )
    
    return {
        "ghosts": ghosts,
        "count": len(ghosts),
        "message": f"{len(ghosts)} Kontakte haben gelesen aber nicht geantwortet"
    }


@router.get("/ghosts/summary", response_model=dict)
async def get_ghost_summary(
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Zusammenfassung der Ghost-Situation für Dashboard
    """
    from ...config import settings
    detector = GhostDetector(supabase, anthropic_key=settings.ANTHROPIC_API_KEY if hasattr(settings, 'ANTHROPIC_API_KEY') else None)
    
    summary = await detector.get_ghost_summary(str(current_user.id))
    
    return {"summary": summary}


@router.get("/followups/queue", response_model=dict)
async def get_followup_queue(
    limit: int = Query(20, ge=1, le=50),
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Anstehende Follow-ups aus der Queue
    
    Zeigt alle Ghosts an für die jetzt ein Follow-up fällig ist
    """
    service = OutreachService(supabase)
    
    queue = await service.get_followup_queue(
        user_id=str(current_user.id),
        limit=limit
    )
    
    return {
        "queue": queue,
        "count": len(queue),
        "message": f"{len(queue)} Follow-ups stehen an"
    }


@router.post("/followups/{queue_id}/action", response_model=dict)
async def process_followup(
    queue_id: str,
    data: FollowupAction,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Aktion für Follow-up ausführen
    
    - send: Follow-up wurde gesendet
    - skip: Überspringen (mit optionalem Grund)
    - snooze: Auf später verschieben
    """
    service = OutreachService(supabase)
    
    if data.action == 'send':
        result = await service.complete_followup(
            queue_id=queue_id,
            user_id=str(current_user.id),
            sent=True
        )
    elif data.action == 'skip':
        result = await service.complete_followup(
            queue_id=queue_id,
            user_id=str(current_user.id),
            sent=False,
            skip_reason=data.skip_reason
        )
    elif data.action == 'snooze':
        result = await service.snooze_followup(
            queue_id=queue_id,
            user_id=str(current_user.id),
            snooze_hours=data.snooze_hours or 24
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    return {"success": True, "result": result}


@router.post("/followups/generate", response_model=dict)
async def generate_followup_message(
    data: GenerateFollowupRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Generiere eine personalisierte Follow-up Nachricht für einen Ghost
    """
    from ...config import settings
    
    service = OutreachService(supabase)
    detector = GhostDetector(supabase, anthropic_key=settings.ANTHROPIC_API_KEY if hasattr(settings, 'ANTHROPIC_API_KEY') else None)
    
    # Hole Outreach-Daten
    outreach = await service.get_outreach(data.outreach_id, str(current_user.id))
    
    if not outreach:
        raise HTTPException(status_code=404, detail="Outreach not found")
    
    # Berechne Follow-up Step
    step = (outreach.get('ghost_followup_count', 0) or 0) + 1
    
    # Generiere Nachricht
    message = await detector.generate_followup_message(
        outreach=outreach,
        step=step,
        custom_context=data.custom_context
    )
    
    return {
        "message": message,
        "followup_step": step,
        "platform": outreach.get('platform'),
        "contact_name": outreach.get('contact_name')
    }


@router.post("/followups/bulk-generate", response_model=dict)
async def bulk_generate_followups(
    platform: Optional[str] = Query(None, description="Filter nach Plattform"),
    limit: int = Query(10, ge=1, le=20),
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Generiere Follow-up Vorschläge für mehrere Ghosts auf einmal
    """
    from ...config import settings
    
    detector = GhostDetector(supabase, anthropic_key=settings.ANTHROPIC_API_KEY if hasattr(settings, 'ANTHROPIC_API_KEY') else None)
    
    suggestions = await detector.bulk_generate_followups(
        user_id=str(current_user.id),
        platform=platform,
        limit=limit
    )
    
    return {
        "suggestions": suggestions,
        "count": len(suggestions)
    }


# =============================================================================
# Templates
# =============================================================================

@router.get("/templates", response_model=dict)
async def get_templates(
    platform: Optional[str] = Query(None, description="Filter nach Plattform"),
    message_type: Optional[str] = Query(None, description="Filter nach Nachrichtentyp"),
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Verfügbare Nachrichtenvorlagen abrufen
    
    Sortiert nach Reply-Rate (beste zuerst)
    """
    service = OutreachService(supabase)
    
    templates = await service.get_templates(
        user_id=str(current_user.id),
        platform=platform,
        message_type=message_type
    )
    
    return {"templates": templates}


# =============================================================================
# Statistics
# =============================================================================

@router.get("/stats", response_model=dict)
async def get_outreach_stats(
    days: int = Query(7, ge=1, le=90, description="Zeitraum in Tagen"),
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Outreach-Statistiken
    
    - Gesamt-Zahlen (gesendet, gesehen, geantwortet)
    - Raten (Seen-Rate, Reply-Rate, Ghost-Rate)
    - Tägliche Aufschlüsselung
    """
    service = OutreachService(supabase)
    
    stats = await service.get_stats(
        user_id=str(current_user.id),
        days=days
    )
    
    return {"stats": stats}


@router.get("/stats/platforms", response_model=dict)
async def get_platform_stats(
    days: int = Query(30, ge=1, le=90),
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Statistiken nach Plattform aufgeschlüsselt
    
    Zeigt welche Plattform die beste Conversion hat
    """
    service = OutreachService(supabase)
    
    breakdown = await service.get_platform_breakdown(
        user_id=str(current_user.id),
        days=days
    )
    
    return {"platforms": breakdown}


# =============================================================================
# System Endpoints (für Cron-Jobs)
# =============================================================================

@router.post("/system/detect-ghosts", response_model=dict)
async def run_ghost_detection(
    supabase = Depends(get_supabase)
):
    """
    SYSTEM: Ghost-Detection ausführen (für Cron-Job)
    
    Findet neue Ghosts und erstellt Follow-up Queue Einträge
    """
    from ...config import settings
    
    detector = GhostDetector(supabase, anthropic_key=settings.ANTHROPIC_API_KEY if hasattr(settings, 'ANTHROPIC_API_KEY') else None)
    
    result = await detector.mark_ghosts_and_queue_followups()
    
    return result

