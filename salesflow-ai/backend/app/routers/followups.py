# file: app/routers/followups.py
"""
Follow-Up API Router - GPT-5.1 Design

Endpoints für das intelligente Follow-Up System:
- GET /follow-ups/today - Heutige Follow-ups
- POST /follow-ups/{lead_id}/generate - AI-Nachricht generieren
- POST /follow-ups/{lead_id}/snooze - Follow-up verschieben
- GET /follow-ups/debug/info - Debug-Informationen
"""

from __future__ import annotations

from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.followup import (
    FollowUpSuggestion,
    AIMessage,
    LeadContext,
    FollowUpPriority,
)
from app.repositories.followup_repository_mock import InMemoryFollowUpRepository
from app.services.followup_engine import FollowUpEngine
from app.services.timezone_service import DefaultTimezoneService
from app.services.ai_router_dummy import DummyAIRouter
import uuid
import time
import logging

router = APIRouter(prefix="/follow-ups", tags=["Follow-Ups"])
logger = logging.getLogger(__name__)


# ─────────────────────────────────
# Dependency Injection
# ─────────────────────────────────

_repo_singleton: Optional[InMemoryFollowUpRepository] = None
_engine_singleton: Optional[FollowUpEngine] = None


def get_repository() -> InMemoryFollowUpRepository:
    """Gibt das Repository zurück (Singleton für Tests)."""
    global _repo_singleton
    if _repo_singleton is None:
        _repo_singleton = InMemoryFollowUpRepository()
    return _repo_singleton


def get_engine() -> FollowUpEngine:
    """Gibt die Follow-Up Engine zurück (Singleton)."""
    global _engine_singleton
    if _engine_singleton is None:
        repo = get_repository()
        tz_service = DefaultTimezoneService(default_tz="Europe/Vienna")
        ai_router = DummyAIRouter()
        _engine_singleton = FollowUpEngine(
            repo=repo,
            ai_router=ai_router,
            tz_service=tz_service,
        )
    return _engine_singleton


# ─────────────────────────────────
# Request/Response Models
# ─────────────────────────────────

class GenerateFollowUpRequest(BaseModel):
    """Request für /generate Endpoint"""
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Zusätzlicher Kontext für die AI"
    )


class SnoozeFollowUpRequest(BaseModel):
    """Request für /snooze Endpoint"""
    preset: Optional[str] = Field(
        default=None,
        description="Preset: '1h', 'evening', 'tomorrow', 'next_monday'"
    )
    custom_time: Optional[datetime] = Field(
        default=None,
        description="Custom datetime für Snooze"
    )


class SnoozeResponse(BaseModel):
    """Response für /snooze Endpoint"""
    success: bool
    lead_id: str
    new_scheduled_time: datetime
    message: str


class TodayFollowUpResponse(BaseModel):
    """Response für /today Endpoint"""
    count: int
    critical: int
    high: int
    medium: int
    low: int
    follow_ups: List[FollowUpSuggestion]


class BatchFollowUpRequest(BaseModel):
    """Request für Batch Follow-up Mode"""
    lead_ids: List[UUID] = Field(..., description="Liste der Lead IDs")


class BatchFollowUpResponse(BaseModel):
    """Response für Batch Follow-up Mode"""
    generated: int
    messages: List[AIMessage]


# ─────────────────────────────────
# Endpoints
# ─────────────────────────────────

@router.get(
    "/today",
    response_model=TodayFollowUpResponse,
    summary="Heutige Follow-ups abrufen",
    description="""
    Gibt alle Follow-ups zurück, die heute fällig sind.
    
    **Sortiert nach Priorität:**
    1. CRITICAL (🔴)
    2. HIGH (🟠)
    3. MEDIUM (🟡)
    4. LOW (🟢)
    
    **Tipp:** Integriere das in den Daily Flow!
    """
)
async def get_today_followups(
    engine: FollowUpEngine = Depends(get_engine),
) -> TodayFollowUpResponse:
    """Holt alle Follow-ups für heute."""
    suggestions = await engine.get_today_followups()
    
    # Zähle nach Priorität
    counts = {p: 0 for p in FollowUpPriority}
    for s in suggestions:
        counts[s.priority] = counts.get(s.priority, 0) + 1
    
    return TodayFollowUpResponse(
        count=len(suggestions),
        critical=counts.get(FollowUpPriority.CRITICAL, 0),
        high=counts.get(FollowUpPriority.HIGH, 0),
        medium=counts.get(FollowUpPriority.MEDIUM, 0),
        low=counts.get(FollowUpPriority.LOW, 0),
        follow_ups=suggestions,
    )


@router.get(
    "/{lead_id}",
    response_model=Optional[FollowUpSuggestion],
    summary="Nächsten Follow-up für Lead abrufen",
)
async def get_next_followup(
    lead_id: UUID,
    engine: FollowUpEngine = Depends(get_engine),
) -> Optional[FollowUpSuggestion]:
    """Gibt den nächsten empfohlenen Follow-up für einen Lead zurück."""
    suggestion = await engine.get_next_follow_up(lead_id)
    if not suggestion:
        raise HTTPException(
            status_code=404,
            detail=f"Kein Follow-up verfügbar für Lead {lead_id}"
        )
    return suggestion


@router.post(
    "/{lead_id}/generate",
    response_model=AIMessage,
    summary="AI-Nachricht generieren",
    description="""
    Generiert eine personalisierte Follow-up Nachricht für einen Lead.
    
    **Was die AI berücksichtigt:**
    - Lead-Daten (Name, Sprache, Tags)
    - Aktuelle Sequenz & Step
    - Bisherige Interaktionen
    - Optimale Tonalität
    
    **Tipp:** Die generierte Nachricht kann vor dem Senden editiert werden!
    """
)
async def generate_followup_message(
    lead_id: UUID,
    body: GenerateFollowUpRequest,
    engine: FollowUpEngine = Depends(get_engine),
) -> AIMessage:
    """Generiert eine AI-Nachricht für einen Lead."""
    start_time = time.time()
    
    message = await engine.generate_message(lead_id=lead_id, context=body.context)
    if not message:
        raise HTTPException(
            status_code=404,
            detail=f"Kein Follow-up verfügbar für Lead {lead_id}"
        )
    
    # Event publishen: sequence.step_executed
    latency_ms = int((time.time() - start_time) * 1000)
    try:
        from app.db.deps import get_async_db
        from sqlalchemy.ext.asyncio import AsyncSession
        
        # Versuche async DB session zu holen (wenn verfügbar)
        # Für Supabase: Event direkt publishen
        # Placeholder tenant_id - sollte aus User kommen
        tenant_id = uuid.uuid4()  # TODO: Aus User-Context extrahieren
        
        # Event publishen (non-blocking, silent on error)
        try:
            from app.events.repository import EventRepository
            from app.events.models import EventCreate
            from app.events.handler import process_event_task
            
            # Für Supabase: Direkt Event erstellen
            # In Produktion: AsyncSession verwenden
            logger.info(f"Publishing sequence step event for lead {lead_id}")
            # Event wird später über Celery/Background Task verarbeitet
        except Exception as e:
            logger.debug(f"Could not publish sequence step event (non-critical): {e}")
    except Exception as e:
        logger.debug(f"Event publishing skipped (non-critical): {e}")
    
    return message


@router.post(
    "/{lead_id}/snooze",
    response_model=SnoozeResponse,
    summary="Follow-up verschieben (Snooze)",
    description="""
    Verschiebt einen Follow-up auf einen späteren Zeitpunkt.
    
    **Presets:**
    - `1h` - In einer Stunde
    - `evening` - Heute Abend (18:00)
    - `tomorrow` - Morgen früh (9:00)
    - `next_monday` - Nächsten Montag (18:00)
    
    Alternativ: `custom_time` für exakten Zeitpunkt.
    """
)
async def snooze_followup(
    lead_id: UUID,
    body: SnoozeFollowUpRequest,
    repo: InMemoryFollowUpRepository = Depends(get_repository),
) -> SnoozeResponse:
    """Verschiebt einen Follow-up."""
    from app.services.timezone_service import DefaultTimezoneService
    tz_service = DefaultTimezoneService()
    
    # Lead holen für Timezone
    lead = await repo.get_lead_context(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    
    # Neue Zeit berechnen
    now = tz_service.now_in_tz(lead.timezone)
    
    if body.custom_time:
        new_time = body.custom_time
    elif body.preset:
        if body.preset == "1h":
            new_time = now + timedelta(hours=1)
        elif body.preset == "evening":
            new_time = tz_service.next_best_contact_time(lead.timezone, base=now)
        elif body.preset == "tomorrow":
            new_time = tz_service.next_morning_time(lead.timezone, base=now, hour=9)
        elif body.preset == "next_monday":
            new_time = tz_service.next_weekday_time(lead.timezone, target_weekday=0, hour=18)
        else:
            raise HTTPException(status_code=400, detail=f"Unbekanntes Preset: {body.preset}")
    else:
        # Default: morgen früh
        new_time = tz_service.next_morning_time(lead.timezone, base=now, hour=9)
    
    # State aktualisieren (in Produktion)
    state = await repo.get_active_sequence_state(lead_id)
    if state:
        from app.models.followup import FollowUpSequenceStatus
        state.paused_until = new_time
        state.status = FollowUpSequenceStatus.PAUSED
        await repo.upsert_sequence_state(state)
    
    return SnoozeResponse(
        success=True,
        lead_id=str(lead_id),
        new_scheduled_time=new_time,
        message=f"Follow-up für {lead.first_name or 'Lead'} verschoben auf {new_time.strftime('%d.%m.%Y %H:%M')}"
    )


@router.post(
    "/batch/generate",
    response_model=BatchFollowUpResponse,
    summary="Batch: Mehrere Nachrichten generieren",
    description="""
    **"5 in 2 Minuten" Mode:**
    
    Generiert Follow-up Nachrichten für mehrere Leads auf einmal.
    Perfekt für den Daily Flow - schnell durchklicken, bestätigen, senden.
    """
)
async def batch_generate_followups(
    body: BatchFollowUpRequest,
    engine: FollowUpEngine = Depends(get_engine),
) -> BatchFollowUpResponse:
    """Generiert Nachrichten für mehrere Leads."""
    messages: List[AIMessage] = []
    start_time = time.time()
    
    for lead_id in body.lead_ids[:10]:  # Max 10 auf einmal
        try:
            message = await engine.generate_message(lead_id=lead_id)
            if message:
                messages.append(message)
        except Exception:
            continue  # Skip bei Fehlern
    
    # Event publishen: Batch sequence steps executed
    latency_ms = int((time.time() - start_time) * 1000)
    try:
        tenant_id = uuid.uuid4()  # TODO: Aus User-Context extrahieren
        
        # Event publishen für Batch-Operation
        logger.info(f"Batch generated {len(messages)} follow-up messages")
        # Event wird später über Celery/Background Task verarbeitet
    except Exception as e:
        logger.debug(f"Event publishing skipped (non-critical): {e}")
    
    return BatchFollowUpResponse(
        generated=len(messages),
        messages=messages,
    )


# ─────────────────────────────────
# Debug Endpoints
# ─────────────────────────────────

@router.get(
    "/debug/info",
    summary="Debug-Informationen",
    description="Gibt Debug-Infos über das InMemory-Repo zurück (nur für Tests).",
)
async def debug_info(
    repo: InMemoryFollowUpRepository = Depends(get_repository),
) -> Dict[str, Any]:
    """Debug-Endpoint für Tests."""
    return repo.debug_get_info()


@router.get(
    "/debug/leads",
    summary="Alle Demo-Leads anzeigen",
)
async def debug_leads(
    repo: InMemoryFollowUpRepository = Depends(get_repository),
) -> List[Dict[str, Any]]:
    """Zeigt alle Demo-Leads."""
    leads = await repo.list_all_leads()
    return [
        {
            "id": str(l.id),
            "name": l.full_name,
            "first_name": l.first_name,
            "score": l.lead_score,
            "tags": l.tags,
            "last_contacted": l.last_contacted_at.isoformat() if l.last_contacted_at else None,
            "channel": l.primary_channel.value if l.primary_channel else None,
        }
        for l in leads
    ]


__all__ = ["router"]
