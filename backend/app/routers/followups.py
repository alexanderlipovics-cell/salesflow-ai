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

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
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
from app.core.security import get_current_active_user
from app.core.deps import get_supabase
from app.core.security.main import get_current_user
from app.core.deps import get_supabase as get_db
from app.services.activity_logger import ActivityLogger
import uuid
import time
import logging
from fastapi import HTTPException

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


def _extract_user_id(current_user) -> str:
    """Extrahiert die User-ID aus dem aktuellen User-Objekt oder Dict."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="User nicht authentifiziert")
    if isinstance(current_user, dict):
        user_id = current_user.get("id") or current_user.get("user_id") or current_user.get("sub") or current_user.get("team_member_id")
    else:
        user_id = getattr(current_user, "id", None) or getattr(current_user, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="User nicht authentifiziert")
    return str(user_id)


# ============================================================================
# Lead-bezogene Follow-up Aktionen (Mapping für Frontend Buttons)
# ============================================================================


@router.post("/lead/{lead_id}/responded")
async def mark_responded(
    lead_id: str,
    current_user=Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Markiert Follow-up als beantwortet."""
    user_id = current_user.get("sub") or current_user.get("id")
    result = (
        db.table("followup_suggestions")
        .update({"status": "sent", "completed_at": datetime.now().isoformat()})
        .eq("lead_id", lead_id)
        .eq("user_id", user_id)
        .eq("status", "pending")
        .execute()
    )
    db.table("leads").update({"status": "contacted"}).eq("id", lead_id).eq("user_id", user_id).execute()
    updated = len(result.data) if result and result.data else 0
    return {"success": True, "updated": updated}


@router.post("/lead/{lead_id}/completed")
async def mark_completed(
    lead_id: str,
    current_user=Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Markiert Follow-up als erledigt."""
    user_id = current_user.get("sub") or current_user.get("id")
    result = (
        db.table("followup_suggestions")
        .update({"status": "completed", "completed_at": datetime.now().isoformat()})
        .eq("lead_id", lead_id)
        .eq("user_id", user_id)
        .eq("status", "pending")
        .execute()
    )
    db.table("leads").update({"status": "won"}).eq("id", lead_id).eq("user_id", user_id).execute()
    updated = len(result.data) if result and result.data else 0
    return {"success": True, "updated": updated}


@router.post("/lead/{lead_id}/no-response")
async def mark_no_response(
    lead_id: str,
    current_user=Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Markiert als keine Antwort erhalten und plant neuen Follow-up."""
    user_id = current_user.get("sub") or current_user.get("id")

    # Aktuellen pending Follow-up auf no_response setzen
    db.table("followup_suggestions").update({"status": "no_response"}).eq("lead_id", lead_id).eq("user_id", user_id).eq("status", "pending").execute()
    db.table("leads").update({"last_outreach_at": datetime.now().isoformat()}).eq("id", lead_id).eq("user_id", user_id).execute()

    # Neues Follow-up in 3 Tagen erstellen
    db.table("followup_suggestions").insert(
        {
            "user_id": user_id,
            "lead_id": lead_id,
            "due_at": (datetime.now() + timedelta(days=3)).isoformat(),
            "type": "follow_up",
            "status": "pending",
            "suggested_action": "Erneut nachfassen (keine Antwort)",
        }
    ).execute()

    return {"success": True}


@router.post("/lead/{lead_id}/lost")
async def mark_lost(
    lead_id: str,
    current_user=Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Markiert Follow-up als verloren."""
    user_id = current_user.get("sub") or current_user.get("id")
    result = (
        db.table("followup_suggestions")
        .update({"status": "lost", "completed_at": datetime.now().isoformat()})
        .eq("lead_id", lead_id)
        .eq("user_id", user_id)
        .eq("status", "pending")
        .execute()
    )
    db.table("leads").update({"status": "lost"}).eq("id", lead_id).eq("user_id", user_id).execute()
    updated = len(result.data) if result and result.data else 0
    return {"success": True, "updated": updated}


@router.post("/lead/{lead_id}/start-sequence")
async def start_sequence(
    lead_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Startet eine Follow-up Sequenz für einen Lead."""
    user_id = current_user.get("sub") or current_user.get("id")

    sequence = [
        {"days": 1, "type": "follow_up", "action": "Erster Follow-up Kontakt"},
        {"days": 3, "type": "follow_up", "action": "Zweiter Follow-up - Nachfassen"},
        {"days": 7, "type": "follow_up", "action": "Dritter Follow-up - Finaler Check"},
    ]

    created = 0
    for step in sequence:
        due_date = (datetime.now() + timedelta(days=step["days"])).isoformat()
        db.table("followup_suggestions").insert(
            {
                "user_id": user_id,
                "lead_id": lead_id,
                "due_at": due_date,
                "type": step["type"],
                "status": "pending",
                "suggested_action": step["action"],
            }
        ).execute()
        created += 1

    return {
        "success": True,
        "message": f"Sequenz mit {created} Follow-ups gestartet",
        "created": created,
    }


@router.post("/{lead_id}/start-sequence")
async def start_sequence_v2(
    lead_id: str,
    current_user=Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Startet eine Follow-up Sequenz für einen Lead (Tag 1, 3, 7)."""
    user_id = _extract_user_id(current_user)

    lead = (
        db.table("leads")
        .select("*")
        .eq("id", lead_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not lead or not lead.data:
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")

    now = datetime.utcnow()
    followups = []
    for i, days in enumerate([1, 3, 7], 1):
        due_date = now + timedelta(days=days)
        followups.append(
            {
                "user_id": user_id,
                "lead_id": lead_id,
                "title": f"Follow-up #{i} - {lead.data.get('name', 'Lead')}",
                "message": "",
                "due_at": due_date.isoformat(),
                "status": "pending",
                "priority": "medium",
                "channel": "WHATSAPP",
                "source": "USER_SEQUENCE",
            }
        )

    result = db.table("followup_suggestions").insert(followups).execute()

    db.table("lead_interactions").insert(
        {
            "user_id": user_id,
            "lead_id": lead_id,
            "interaction_type": "sequence_started",
            "raw_notes": f"Follow-up Sequenz gestartet: {len(followups)} Follow-ups geplant für Tag 1, 3, 7",
            "created_at": now.isoformat(),
        }
    ).execute()

    created_count = len(result.data) if result and result.data else 0
    return {
        "success": True,
        "created": created_count,
        "message": f"Sequenz mit {created_count} Follow-ups erstellt",
    }


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


# ═══════════════════════════════════════════════════════════════
# Follow-up V2 (Supabase-backed) - /followups
# ═══════════════════════════════════════════════════════════════


class SuggestionAction(BaseModel):
    action: str  # 'send', 'skip', 'snooze'
    snooze_days: Optional[int] = None
    edited_message: Optional[str] = None


class StartFlowRequest(BaseModel):
    lead_id: str
    flow: str  # 'COLD_NO_REPLY' or 'INTERESTED_LATER'


router_v2 = APIRouter(prefix="/followups", tags=["followups"])


def _get_user_id(user: Any) -> str:
    if isinstance(user, dict):
        return str(user.get("sub") or user.get("id") or user.get("user_id"))
    if hasattr(user, "id"):
        return str(getattr(user, "id"))
    return str(user)


@router_v2.get("/pending")
async def get_pending_suggestions_v2(
    limit: int = 50,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Hole alle fälligen Follow-up Vorschläge (nächste 7 Tage) mit Confidence Scores."""
    user_id = _get_user_id(user)
    
    # Nächste 90 Tage laden (erweitert von 7 Tagen)
    end_of_range = (datetime.utcnow() + timedelta(days=90)).isoformat()

    result = (
        supabase.table("followup_suggestions")
        .select("*, leads(id, name, email, phone, company, status, whatsapp, instagram, linkedin)")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .lte("due_at", end_of_range)
        .order("confidence_score", desc=True)  # High confidence zuerst
        .order("due_at")
        .limit(limit)
        .execute()
    )

    suggestions = result.data or []
    
    # Enrichiere mit Confidence-Anzeige
    for sug in suggestions:
        confidence = sug.get("confidence_score")
        if confidence is not None:
            if confidence >= 90:
                sug["confidence_display"] = f"🟢 {int(confidence)}%"
            elif confidence >= 70:
                sug["confidence_display"] = f"🟡 {int(confidence)}%"
            else:
                sug["confidence_display"] = f"🔴 {int(confidence)}%"
        else:
            sug["confidence_display"] = "⚪ N/A"
    
    return {"suggestions": suggestions, "count": len(suggestions)}


@router_v2.post("")
async def create_followup(
    data: dict,
    current_user = Depends(get_current_active_user),
    db = Depends(get_supabase)
):
    """Erstellt einen neuen Follow-up/Termin"""
    user_id = current_user.get("sub") or current_user.get("id")

    result = db.from_("followup_suggestions").insert({
        "user_id": user_id,
        "lead_id": data.get("lead_id"),
        "due_at": data.get("due_at"),
        "suggested_message": data.get("suggested_message", ""),
        "channel": data.get("channel", "whatsapp"),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }).execute()

    return result.data[0] if result.data else {"success": True}


@router_v2.get("/all")
async def get_all_followups(
    limit: int = 100,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Hole ALLE pending Follow-ups (auch weit in der Zukunft)."""
    user_id = _get_user_id(user)

    result = (
        supabase.table("followup_suggestions")
        .select("*, leads(id, name, email, phone, company, status, whatsapp, instagram, linkedin)")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .order("due_at")
        .limit(limit)
        .execute()
    )

    suggestions = result.data or []

    # Enrichiere mit Confidence-Anzeige
    for sug in suggestions:
        confidence = sug.get("confidence_score")
        if confidence is not None:
            if confidence >= 90:
                sug["confidence_display"] = f"🟢 {int(confidence)}%"
            elif confidence >= 70:
                sug["confidence_display"] = f"🟡 {int(confidence)}%"
            else:
                sug["confidence_display"] = f"🔴 {int(confidence)}%"
        else:
            sug["confidence_display"] = "⚪ N/A"

    return {"suggestions": suggestions, "count": len(suggestions)}


@router_v2.get("/suggestions")
async def get_suggestions_alias(
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Alias für /pending - Frontend Kompatibilität"""
    return await get_pending_suggestions_v2(user=user, supabase=supabase)


@router_v2.get("/today")
async def get_todays_followups_v2(
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Alle Follow-ups für heute (für Dashboard Widget) mit Confidence Scores."""
    user_id = _get_user_id(user)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=0).isoformat()

    result = (
        supabase.table("followup_suggestions")
        .select("*, leads(name, company, phone)")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .gte("due_at", today_start)
        .lte("due_at", today_end)
        .order("confidence_score", desc=True)  # High confidence zuerst
        .order("due_at")
        .execute()
    )

    suggestions = result.data or []
    
    # Enrichiere mit Confidence-Anzeige
    for sug in suggestions:
        confidence = sug.get("confidence_score")
        if confidence is not None:
            if confidence >= 90:
                sug["confidence_display"] = f"🟢 {int(confidence)}%"
            elif confidence >= 70:
                sug["confidence_display"] = f"🟡 {int(confidence)}%"
            else:
                sug["confidence_display"] = f"🔴 {int(confidence)}%"
        else:
            sug["confidence_display"] = "⚪ N/A"
    
    return {"today": suggestions, "count": len(suggestions)}


@router_v2.post("/suggestions/{suggestion_id}/action")
async def handle_suggestion_v2(
    suggestion_id: str,
    action: SuggestionAction,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Bearbeite einen Follow-up Vorschlag."""
    user_id = _get_user_id(user)
    now = datetime.utcnow()

    sug_result = (
        supabase.table("followup_suggestions")
        .select("*")
        .eq("id", suggestion_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not sug_result.data:
        raise HTTPException(status_code=404, detail="Suggestion nicht gefunden")

    suggestion = sug_result.data

    if action.action == "send":
        supabase.table("followup_suggestions").update(
            {
                "status": "sent",
                "sent_at": now.isoformat(),
                "suggested_message": action.edited_message or suggestion["suggested_message"],
            }
        ).eq("id", suggestion_id).execute()

        rule = (
            supabase.table("followup_rules")
            .select("*")
            .eq("flow", suggestion["flow"])
            .eq("stage", suggestion["stage"])
            .single()
            .execute()
        )

        if rule.data:
            next_followup = now + timedelta(days=rule.data["wait_days"])
            supabase.table("leads").update(
                {
                    "follow_up_stage": rule.data["next_stage"],
                    "next_follow_up_at": next_followup.isoformat(),
                    "last_outreach_at": now.isoformat(),
                    "status": rule.data["next_status"],
                }
            ).eq("id", suggestion["lead_id"]).eq("user_id", user_id).execute()
        else:
            # Fallback: zumindest Status auf contacted setzen
            supabase.table("leads").update(
                {
                    "status": "contacted",
                    "last_outreach_at": now.isoformat(),
                }
            ).eq("id", suggestion["lead_id"]).eq("user_id", user_id).execute()

        activity = ActivityLogger(supabase, user_id)
        await activity.log(
            action_type="completed",
            entity_type="follow_up",
            entity_id=suggestion_id,
            entity_name=suggestion.get("title") or f"Follow-up für {suggestion.get('lead_id')}",
            details={"action": "send", "lead_id": suggestion.get("lead_id")},
            source="ui",
        )

        return {"success": True, "message": "Follow-up als gesendet markiert"}

    if action.action == "skip":
        supabase.table("followup_suggestions").update({"status": "skipped"}).eq("id", suggestion_id).execute()
        activity = ActivityLogger(supabase, user_id)
        await activity.log(
            action_type="updated",
            entity_type="follow_up",
            entity_id=suggestion_id,
            entity_name=suggestion.get("title") or f"Follow-up für {suggestion.get('lead_id')}",
            details={"action": "skip", "lead_id": suggestion.get("lead_id")},
            source="ui",
        )
        return {"success": True, "message": "Follow-up übersprungen"}

    if action.action == "snooze":
        snooze_days = action.snooze_days or 1
        snooze_until = now + timedelta(days=snooze_days)

        supabase.table("followup_suggestions").update(
            {
                "status": "snoozed",
                "snoozed_until": snooze_until.isoformat(),
                "due_at": snooze_until.isoformat(),
            }
        ).eq("id", suggestion_id).execute()

        activity = ActivityLogger(supabase, user_id)
        await activity.log(
            action_type="updated",
            entity_type="follow_up",
            entity_id=suggestion_id,
            entity_name=suggestion.get("title") or f"Follow-up für {suggestion.get('lead_id')}",
            details={"action": "snooze", "lead_id": suggestion.get("lead_id"), "snooze_days": snooze_days},
            source="ui",
        )

        return {"success": True, "message": f"Follow-up um {snooze_days} Tag(e) verschoben"}

    raise HTTPException(status_code=400, detail="Unbekannte Aktion")


@router_v2.post("/start-flow")
async def start_flow_for_lead_v2(
    request: StartFlowRequest,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Startet einen Follow-up Flow für einen Lead."""
    user_id = _get_user_id(user)

    rule = (
        supabase.table("followup_rules")
        .select("*")
        .eq("flow", request.flow)
        .eq("stage", 0)
        .single()
        .execute()
    )

    if not rule.data:
        raise HTTPException(status_code=400, detail=f"Flow '{request.flow}' nicht gefunden")

    next_followup = datetime.utcnow() + timedelta(days=rule.data["wait_days"])

    supabase.table("leads").update(
        {
            "flow": request.flow,
            "follow_up_stage": 0,
            "next_follow_up_at": next_followup.isoformat(),
            "last_outreach_at": datetime.utcnow().isoformat(),
        }
    ).eq("id", request.lead_id).eq("user_id", user_id).execute()

    activity = ActivityLogger(supabase, user_id)
    await activity.log(
        action_type="created",
        entity_type="follow_up",
        entity_id=request.lead_id,
        entity_name=f"Flow {request.flow}",
        details={"flow": request.flow, "stage": 0},
        source="ui",
    )

    return {"success": True, "message": f"Flow '{request.flow}' gestartet", "next_followup_at": next_followup.isoformat()}


@router_v2.post("/generate")
async def generate_suggestions_v2(
    background_tasks: BackgroundTasks,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Generiert Follow-up Vorschläge für fällige Leads (manueller Trigger)."""
    user_id = _get_user_id(user)
    import asyncio
    background_tasks.add_task(lambda: asyncio.run(generate_suggestions_for_user(user_id, supabase)))
    return {"success": True, "message": "Vorschläge werden generiert..."}


async def generate_suggestions_for_user(user_id: str, supabase):
    """Background Task: Generiert Vorschläge mit Confidence Score."""
    now = datetime.utcnow()

    leads_result = (
        supabase.table("leads")
        .select("*")
        .eq("user_id", user_id)
        .eq("do_not_contact", False)
        .lte("next_follow_up_at", now.isoformat())
        .not_.is_("flow", None)
        .execute()
    )

    if not leads_result.data:
        return

    # Import für Confidence-Generierung
    from app.services.followup_autopilot import generate_followup_with_confidence
    
    # Hole letzte Nachricht für Kontext
    def get_previous_message(lead_id: str):
        interactions = (
            supabase.table("lead_interactions")
            .select("raw_notes, notes")
            .eq("lead_id", lead_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if interactions.data:
            return interactions.data[0].get("raw_notes") or interactions.data[0].get("notes")
        return None

    for lead in leads_result.data:
        existing = (
            supabase.table("followup_suggestions")
            .select("id")
            .eq("lead_id", lead["id"])
            .eq("status", "pending")
            .execute()
        )
        if existing.data:
            continue

        rule = (
            supabase.table("followup_rules")
            .select("*, message_templates(*)")
            .eq("flow", lead.get("flow"))
            .eq("stage", lead.get("follow_up_stage"))
            .single()
            .execute()
        )

        if not rule.data:
            continue

        if not rule.data.get("template_key"):
            next_followup = now + timedelta(days=rule.data["wait_days"])
            supabase.table("leads").update(
                {"follow_up_stage": rule.data["next_stage"], "next_follow_up_at": next_followup.isoformat()}
            ).eq("id", lead["id"]).execute()
            continue

        # Generiere Nachricht mit Confidence Score
        previous_msg = get_previous_message(lead["id"])
        
        context = {
            "lead_name": lead.get("name"),
            "lead_status": lead.get("status"),
            "flow": lead.get("flow"),
            "stage": lead.get("follow_up_stage")
        }
        
        try:
            confidence_result = await generate_followup_with_confidence(
                lead_id=lead["id"],
                user_id=user_id,
                context=context,
                previous_message=previous_msg
            )
            message = confidence_result.get("message", "")
            confidence_score = confidence_result.get("confidence_score", 70.0)
            confidence_reason = confidence_result.get("confidence_reason", "Standard Follow-up")
            execution_mode = confidence_result.get("execution_mode", "prepared")
        except Exception as e:
            logger.warning(f"Error generating confidence for lead {lead['id']}: {e}")
            # Fallback zu Template
            template_body = rule.data.get("message_templates", {}).get("body", "")
            message = template_body.replace("{name}", lead.get("name", ""))
            confidence_score = 70.0
            confidence_reason = "Template-basiert"
            execution_mode = "prepared"

        supabase.table("followup_suggestions").insert(
            {
                "user_id": user_id,
                "lead_id": lead["id"],
                "flow": lead.get("flow"),
                "stage": lead.get("follow_up_stage"),
                "template_key": rule.data.get("template_key"),
                "channel": lead.get("preferred_channel", "WHATSAPP"),
                "suggested_message": message,
                "reason": rule.data.get("description", f"Stage {lead.get('follow_up_stage')}"),
                "due_at": now.isoformat(),
                "status": "pending",
                "confidence_score": confidence_score,
                "confidence_reason": confidence_reason,
                "execution_mode": execution_mode,
            }
        ).execute()
    
    # Reaktivierungs-Logik für "nicht_interessiert" Leads nach 90 Tagen
    ninety_days_ago = now - timedelta(days=90)
    reactivation_leads = (
        supabase.table("leads")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "nicht_interessiert")
        .eq("do_not_contact", False)
        .lt("updated_at", ninety_days_ago.isoformat())
        .execute()
    )
    
    for lead in reactivation_leads.data or []:
        # Prüfe ob bereits ein Reaktivierungs-Vorschlag existiert
        existing = (
            supabase.table("followup_suggestions")
            .select("id")
            .eq("lead_id", lead["id"])
            .eq("status", "pending")
            .eq("reason", "Reaktivierung nach 90 Tagen")
            .execute()
        )
        if existing.data:
            continue
        
        # Erstelle Reaktivierungs-Vorschlag
        reactivation_message = f"Hallo {lead.get('name', '')}, wir haben uns gefragt, ob sich in den letzten Monaten etwas an deiner Situation geändert hat. Falls du Interesse hast, würden wir uns freuen, von dir zu hören!"
        
        supabase.table("followup_suggestions").insert(
            {
                "user_id": user_id,
                "lead_id": lead["id"],
                "channel": lead.get("preferred_channel", "WHATSAPP"),
                "suggested_message": reactivation_message,
                "reason": "Reaktivierung nach 90 Tagen",
                "due_at": now.isoformat(),
                "status": "pending",
                "confidence_score": 50.0,
                "confidence_reason": "Reaktivierung für nicht_interessiert Leads",
                "execution_mode": "prepared",
            }
        ).execute()


@router_v2.get("/templates")
async def get_templates_v2(
    user=Depends(get_current_active_user),  # noqa: ARG001 - reserved for future tenant scoping
    supabase=Depends(get_supabase),
):
    """Alle verfügbaren Templates."""
    result = supabase.table("message_templates").select("*").eq("is_active", True).execute()
    return {"templates": result.data or []}


@router_v2.get("/stats")
async def get_followup_stats_v2(
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Statistiken für Follow-ups."""
    user_id = _get_user_id(user)

    pending = (
        supabase.table("followup_suggestions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .execute()
    )

    sent_this_week = (
        supabase.table("followup_suggestions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "sent")
        .gte("sent_at", (datetime.utcnow() - timedelta(days=7)).isoformat())
        .execute()
    )

    return {"pending_count": pending.count or 0, "sent_this_week": sent_this_week.count or 0}


@router_v2.get("/sent")
async def get_sent_followups(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Get sent followup suggestions for the current user"""
    user_id = current_user.get("sub")
    
    result = db.table("followup_suggestions").select(
        "id, lead_id, suggested_message, channel, sent_at, template_key, leads(id, name, email, phone, company)"
    ).eq("user_id", user_id).eq("status", "sent").order("sent_at", desc=True).limit(limit).execute()
    
    return {"items": result.data or []}


# ============================================================================
# AUTOPILOT SETTINGS ENDPOINTS (für Follow-ups)
# ============================================================================

@router_v2.get("/autopilot/settings")
async def get_followup_autopilot_settings(
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Holt Autopilot-Settings für Follow-ups."""
    user_id = _get_user_id(user)
    
    result = (
        supabase.table("autopilot_settings")
        .select("*")
        .eq("user_id", user_id)
        .is_("contact_id", "null")
        .single()
        .execute()
    )
    
    if result.data:
        return result.data
    else:
        # Default Settings
        return {
            "enabled": False,
            "is_active": False,
            "min_confidence": 90.0,
            "auto_channels": ["email"],
            "daily_limit": 50,
            "mode": "off"
        }


@router_v2.put("/autopilot/settings")
async def update_followup_autopilot_settings(
    settings: dict,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Aktualisiert Autopilot-Settings für Follow-ups."""
    user_id = _get_user_id(user)
    
    # Upsert Settings
    settings_data = {
        "user_id": user_id,
        "contact_id": None,
        "is_active": settings.get("enabled", False) or settings.get("is_active", False),
        "mode": settings.get("mode", "off"),
        "channels": settings.get("auto_channels", ["email"]),
        "max_auto_replies_per_day": settings.get("daily_limit", 50),
        "min_confidence": settings.get("min_confidence", 90.0),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Prüfe ob Settings existieren
    existing = (
        supabase.table("autopilot_settings")
        .select("id")
        .eq("user_id", user_id)
        .is_("contact_id", "null")
        .single()
        .execute()
    )
    
    if existing.data:
        result = (
            supabase.table("autopilot_settings")
            .update(settings_data)
            .eq("id", existing.data["id"])
            .execute()
        )
    else:
        settings_data["created_at"] = datetime.utcnow().isoformat()
        result = (
            supabase.table("autopilot_settings")
            .insert(settings_data)
            .execute()
        )
    
    return {"success": True, "settings": result.data[0] if result.data else settings_data}


__all__ = ["router", "router_v2"]
