"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AUTOPILOT API ROUTES                                                      ║
║  Endpoints für Webhooks, Settings, Drafts und Stats                        ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from supabase import Client

from ..schemas.autopilot import (
    # Webhook
    InboundWebhookPayload,
    WebhookResponse,
    ChannelEnum,
    
    # Settings
    AutopilotSettingsCreate,
    AutopilotSettingsUpdate,
    AutopilotSettingsResponse,
    
    # Overrides
    LeadOverrideCreate,
    LeadOverrideUpdate,
    LeadOverrideResponse,
    
    # Drafts
    DraftResponse,
    DraftApproveRequest,
    DraftListResponse,
    DraftStatus,
    
    # Actions
    ActionLogResponse,
    ActionLogListResponse,
    
    # Briefings
    MorningBriefingResponse,
    EveningSummaryResponse,
    TodayTask,
    
    # Stats
    AutopilotStatsResponse,
    ProcessingDetailResponse,
    ConfidenceBreakdownResponse,
    
    # Enums
    ActionEnum,
    IntentEnum,
    LeadTemperatureEnum
)
from ...services.autopilot import (
    AutopilotEngine,
    AutopilotOrchestrator,
    IntentDetector,
    ConfidenceEngine
)
from ...config.prompts.chief_autopilot import (
    InboundMessage,
    InboundChannel,
    AutopilotSettings,
    AutonomyLevel
)
from ...db.deps import get_current_user, get_supabase


router = APIRouter(prefix="/autopilot", tags=["autopilot"])


# ═══════════════════════════════════════════════════════════════════════════
# WEBHOOKS - Universal Inbound Gateway
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/webhooks/inbound", response_model=WebhookResponse)
async def receive_inbound_webhook(
    payload: InboundWebhookPayload,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase)
):
    """
    Universal Webhook Endpoint für eingehende Nachrichten.
    
    Empfängt Nachrichten von allen Kanälen (Instagram, WhatsApp, etc.)
    und verarbeitet sie asynchron.
    """
    try:
        # Lead-Zuordnung finden (welcher User?)
        # TODO: Implementierung für Multi-Tenant
        # Für jetzt: User aus external_id ableiten
        
        user_mapping = supabase.table("channel_mappings").select(
            "user_id"
        ).eq(
            "channel", payload.channel.value
        ).eq(
            "external_account_id", payload.lead_external_id.split(":")[0] if ":" in payload.lead_external_id else ""
        ).single().execute()
        
        if not user_mapping.data:
            # Fallback: Ersten User nehmen (für Dev)
            return WebhookResponse(
                success=False,
                error="No user mapping found for this channel"
            )
        
        user_id = user_mapping.data["user_id"]
        
        # Message erstellen
        message = InboundMessage(
            channel=InboundChannel(payload.channel.value),
            external_id=payload.external_id,
            lead_external_id=payload.lead_external_id,
            content_type=payload.content.type,
            text=payload.content.text,
            media_url=payload.content.media_url,
            timestamp=payload.timestamp or datetime.utcnow(),
            raw_payload=payload.raw_payload
        )
        
        # Async verarbeiten
        background_tasks.add_task(
            process_inbound_message_task,
            user_id=user_id,
            message=message,
            supabase=supabase
        )
        
        return WebhookResponse(
            success=True,
            message_id=payload.external_id,
            action_taken=None,  # Wird async entschieden
            response_sent=False
        )
        
    except Exception as e:
        return WebhookResponse(
            success=False,
            error=str(e)
        )


@router.post("/webhooks/{channel}", response_model=WebhookResponse)
async def receive_channel_webhook(
    channel: ChannelEnum,
    payload: dict,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase)
):
    """
    Channel-spezifischer Webhook Endpoint.
    
    Für direktere Integration mit bestimmten Plattformen.
    Parst das native Payload-Format des Kanals.
    """
    try:
        # Channel-spezifisches Parsing
        parsed = parse_channel_payload(channel, payload)
        
        if not parsed:
            return WebhookResponse(
                success=False,
                error=f"Could not parse {channel.value} payload"
            )
        
        # Weiterleiten an Universal Handler
        return await receive_inbound_webhook(
            payload=parsed,
            background_tasks=background_tasks,
            supabase=supabase
        )
        
    except Exception as e:
        return WebhookResponse(
            success=False,
            error=str(e)
        )


# ═══════════════════════════════════════════════════════════════════════════
# SETTINGS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/settings", response_model=AutopilotSettingsResponse)
async def get_autopilot_settings(
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lädt die Autopilot-Settings des Users."""
    
    result = supabase.table("autopilot_settings").select("*").eq(
        "user_id", user["id"]
    ).single().execute()
    
    if not result.data:
        # Defaults erstellen
        defaults = AutopilotSettingsCreate()
        result = supabase.table("autopilot_settings").insert({
            "user_id": user["id"],
            **defaults.model_dump(),
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        return AutopilotSettingsResponse(**result.data[0])
    
    return AutopilotSettingsResponse(**result.data)


@router.put("/settings", response_model=AutopilotSettingsResponse)
async def update_autopilot_settings(
    settings: AutopilotSettingsUpdate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Updated die Autopilot-Settings."""
    
    update_data = settings.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = supabase.table("autopilot_settings").update(
        update_data
    ).eq(
        "user_id", user["id"]
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    return AutopilotSettingsResponse(**result.data[0])


# ═══════════════════════════════════════════════════════════════════════════
# LEAD OVERRIDES
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/leads/{lead_id}/override", response_model=Optional[LeadOverrideResponse])
async def get_lead_override(
    lead_id: str,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lädt Override-Settings für einen Lead."""
    
    result = supabase.table("lead_autopilot_overrides").select("*").eq(
        "lead_id", lead_id
    ).single().execute()
    
    if not result.data:
        return None
    
    return LeadOverrideResponse(**result.data)


@router.post("/leads/{lead_id}/override", response_model=LeadOverrideResponse)
async def create_lead_override(
    lead_id: str,
    override: LeadOverrideCreate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Erstellt Override-Settings für einen Lead."""
    
    result = supabase.table("lead_autopilot_overrides").insert({
        "lead_id": lead_id,
        "mode": override.mode.value,
        "reason": override.reason,
        "is_vip": override.is_vip,
        "created_at": datetime.utcnow().isoformat()
    }).execute()
    
    return LeadOverrideResponse(**result.data[0])


@router.put("/leads/{lead_id}/override", response_model=LeadOverrideResponse)
async def update_lead_override(
    lead_id: str,
    override: LeadOverrideUpdate,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Updated Override-Settings für einen Lead."""
    
    update_data = override.model_dump(exclude_unset=True)
    
    result = supabase.table("lead_autopilot_overrides").update(
        update_data
    ).eq(
        "lead_id", lead_id
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Override not found")
    
    return LeadOverrideResponse(**result.data[0])


@router.delete("/leads/{lead_id}/override")
async def delete_lead_override(
    lead_id: str,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Löscht Override-Settings für einen Lead."""
    
    supabase.table("lead_autopilot_overrides").delete().eq(
        "lead_id", lead_id
    ).execute()
    
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════
# DRAFTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/drafts", response_model=DraftListResponse)
async def get_drafts(
    status: Optional[DraftStatus] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = 0,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lädt alle Drafts des Users."""
    
    query = supabase.table("autopilot_drafts").select(
        "*, leads(name)"
    ).eq(
        "user_id", user["id"]
    ).order(
        "created_at", desc=True
    ).range(offset, offset + limit - 1)
    
    if status:
        query = query.eq("status", status.value)
    
    result = query.execute()
    
    drafts = []
    for row in (result.data or []):
        drafts.append(DraftResponse(
            id=row["id"],
            lead_id=row["lead_id"],
            lead_name=row.get("leads", {}).get("name") if row.get("leads") else None,
            content=row["content"],
            intent=row["intent"],
            status=DraftStatus(row["status"]),
            created_at=row["created_at"]
        ))
    
    # Counts
    pending_result = supabase.table("autopilot_drafts").select(
        "id", count="exact"
    ).eq(
        "user_id", user["id"]
    ).eq(
        "status", "pending"
    ).execute()
    
    return DraftListResponse(
        drafts=drafts,
        total=len(drafts),
        pending_count=pending_result.count or 0
    )


@router.post("/drafts/{draft_id}/approve", response_model=DraftResponse)
async def approve_draft(
    draft_id: str,
    request: DraftApproveRequest,
    background_tasks: BackgroundTasks,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Genehmigt einen Draft und sendet die Nachricht."""
    from ...services.learning import (
        LearningEventsService,
        AIDecisionLog,
        UserActionLog
    )
    
    # Draft laden
    result = supabase.table("autopilot_drafts").select(
        "*, leads(*)"
    ).eq(
        "id", draft_id
    ).eq(
        "user_id", user["id"]
    ).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    draft = result.data
    content = request.edited_content or draft["content"]
    new_status = "edited" if request.edited_content else "approved"
    is_edited = request.edited_content is not None
    
    # Draft updaten
    supabase.table("autopilot_drafts").update({
        "status": new_status,
        "content": content,
        "approved_at": datetime.utcnow().isoformat()
    }).eq("id", draft_id).execute()
    
    # Learning Event loggen
    background_tasks.add_task(
        log_draft_approval_event,
        supabase=supabase,
        user_id=user["id"],
        draft=draft,
        edited_content=request.edited_content if is_edited else None
    )
    
    # Nachricht senden (async)
    background_tasks.add_task(
        send_approved_draft_task,
        lead=draft["leads"],
        content=content,
        supabase=supabase
    )
    
    return DraftResponse(
        id=draft["id"],
        lead_id=draft["lead_id"],
        lead_name=draft.get("leads", {}).get("name"),
        content=content,
        intent=draft["intent"],
        status=DraftStatus(new_status),
        created_at=draft["created_at"]
    )


@router.post("/drafts/{draft_id}/reject")
async def reject_draft(
    draft_id: str,
    background_tasks: BackgroundTasks,
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lehnt einen Draft ab."""
    
    # Erst Draft laden für Learning Event
    draft_result = supabase.table("autopilot_drafts").select(
        "*, leads(*)"
    ).eq(
        "id", draft_id
    ).eq(
        "user_id", user["id"]
    ).single().execute()
    
    if not draft_result.data:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    draft = draft_result.data
    
    # Draft updaten
    result = supabase.table("autopilot_drafts").update({
        "status": "rejected"
    }).eq(
        "id", draft_id
    ).eq(
        "user_id", user["id"]
    ).execute()
    
    # Learning Event loggen (Rejection ist wichtiges Signal)
    background_tasks.add_task(
        log_draft_rejection_event,
        supabase=supabase,
        user_id=user["id"],
        draft=draft
    )
    
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════
# ACTIONS & LOGS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/actions", response_model=ActionLogListResponse)
async def get_action_logs(
    days: int = Query(7, le=30),
    action: Optional[ActionEnum] = None,
    limit: int = Query(50, le=200),
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lädt Action Logs der letzten X Tage."""
    
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    query = supabase.table("autopilot_actions").select(
        "*, leads(name)"
    ).eq(
        "user_id", user["id"]
    ).gte(
        "created_at", since
    ).order(
        "created_at", desc=True
    ).limit(limit)
    
    if action:
        query = query.eq("action", action.value)
    
    result = query.execute()
    
    actions = []
    auto_sent = 0
    drafts = 0
    human_needed = 0
    
    for row in (result.data or []):
        actions.append(ActionLogResponse(
            id=row["id"],
            lead_id=row["lead_id"],
            lead_name=row.get("leads", {}).get("name") if row.get("leads") else None,
            action=ActionEnum(row["action"]),
            intent=IntentEnum(row["intent"]),
            confidence_score=row["confidence_score"],
            response_sent=row["response_sent"],
            created_at=row["created_at"]
        ))
        
        if row["action"] == "auto_send":
            auto_sent += 1
        elif row["action"] == "draft_review":
            drafts += 1
        elif row["action"] == "human_needed":
            human_needed += 1
    
    return ActionLogListResponse(
        actions=actions,
        total=len(actions),
        auto_sent_count=auto_sent,
        draft_count=drafts,
        human_needed_count=human_needed
    )


# ═══════════════════════════════════════════════════════════════════════════
# BRIEFINGS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/briefing/morning", response_model=MorningBriefingResponse)
async def get_morning_briefing(
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Generiert das Morning Briefing."""
    
    # TODO: Vollständige Implementierung mit Orchestrator
    
    today = datetime.utcnow().date()
    yesterday_night = datetime.combine(today, datetime.min.time()) - timedelta(hours=12)
    
    # Quick Stats
    overnight = supabase.table("autopilot_actions").select(
        "action, response_sent"
    ).eq(
        "user_id", user["id"]
    ).gte(
        "created_at", yesterday_night.isoformat()
    ).execute()
    
    actions = overnight.data or []
    
    # Pending Drafts
    drafts = supabase.table("autopilot_drafts").select(
        "id", count="exact"
    ).eq(
        "user_id", user["id"]
    ).eq(
        "status", "pending"
    ).execute()
    
    return MorningBriefingResponse(
        date=today.isoformat(),
        overnight_messages=len(actions),
        auto_replied=sum(1 for a in actions if a.get("response_sent")),
        drafts_pending=drafts.count or 0,
        human_needed=sum(1 for a in actions if a["action"] == "human_needed"),
        auto_booked_appointments=0,
        new_hot_leads=0,
        ready_to_close=0,
        estimated_pipeline_value=0,
        today_tasks=[
            TodayTask(
                type="draft_review",
                priority="medium",
                description=f"{drafts.count or 0} Entwürfe prüfen"
            )
        ] if drafts.count else [],
        estimated_user_time_minutes=(drafts.count or 0) * 2,
        greeting_message="☀️ Guten Morgen! Hier ist dein Briefing..."
    )


@router.get("/briefing/evening", response_model=EveningSummaryResponse)
async def get_evening_summary(
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Generiert das Evening Summary."""
    
    today = datetime.utcnow().date()
    day_start = datetime.combine(today, datetime.min.time())
    
    # Day Stats
    day_actions = supabase.table("autopilot_actions").select("*").eq(
        "user_id", user["id"]
    ).gte(
        "created_at", day_start.isoformat()
    ).execute()
    
    actions = day_actions.data or []
    total_sent = sum(1 for a in actions if a.get("response_sent"))
    
    return EveningSummaryResponse(
        date=today.isoformat(),
        total_messages_sent=total_sent,
        auto_replies=sum(1 for a in actions if a["action"] == "auto_send"),
        followups_sent=0,
        user_approved=sum(1 for a in actions if a["action"] == "draft_review" and a.get("response_sent")),
        new_replies_received=0,
        appointments_booked=0,
        deals_closed=0,
        revenue=0,
        user_time_minutes=30,  # Placeholder
        estimated_manual_time_minutes=total_sent * 3,
        time_saved_minutes=max(0, (total_sent * 3) - 30),
        tomorrow_preview={
            "scheduled_followups": 0,
            "scheduled_calls": 0
        }
    )


# ═══════════════════════════════════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/stats", response_model=AutopilotStatsResponse)
async def get_autopilot_stats(
    period: str = Query("week", regex="^(today|week|month)$"),
    user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lädt Autopilot Performance Stats."""
    
    # Zeitraum bestimmen
    if period == "today":
        since = datetime.utcnow().replace(hour=0, minute=0, second=0)
    elif period == "week":
        since = datetime.utcnow() - timedelta(days=7)
    else:  # month
        since = datetime.utcnow() - timedelta(days=30)
    
    # Actions laden
    result = supabase.table("autopilot_actions").select("*").eq(
        "user_id", user["id"]
    ).gte(
        "created_at", since.isoformat()
    ).execute()
    
    actions = result.data or []
    total = len(actions)
    
    if total == 0:
        return AutopilotStatsResponse(
            period=period,
            total_inbound=0,
            total_processed=0,
            auto_sent=0,
            drafts_created=0,
            human_needed=0,
            archived=0,
            auto_rate=0,
            success_rate=0,
            estimated_time_saved_minutes=0,
            avg_confidence_score=0,
            confidence_distribution={}
        )
    
    # Zählen
    auto_sent = sum(1 for a in actions if a["action"] == "auto_send")
    drafts = sum(1 for a in actions if a["action"] == "draft_review")
    human = sum(1 for a in actions if a["action"] == "human_needed")
    archived = sum(1 for a in actions if a["action"] == "archive")
    
    # Confidence Distribution
    conf_dist = {"90-100": 0, "80-90": 0, "70-80": 0, "<70": 0}
    total_conf = 0
    
    for a in actions:
        conf = a.get("confidence_score", 0)
        total_conf += conf
        if conf >= 90:
            conf_dist["90-100"] += 1
        elif conf >= 80:
            conf_dist["80-90"] += 1
        elif conf >= 70:
            conf_dist["70-80"] += 1
        else:
            conf_dist["<70"] += 1
    
    return AutopilotStatsResponse(
        period=period,
        total_inbound=total,
        total_processed=total,
        auto_sent=auto_sent,
        drafts_created=drafts,
        human_needed=human,
        archived=archived,
        auto_rate=round((auto_sent / total) * 100, 1) if total > 0 else 0,
        success_rate=0,  # TODO: Aus Outcomes berechnen
        estimated_time_saved_minutes=auto_sent * 3,
        avg_confidence_score=round(total_conf / total, 1) if total > 0 else 0,
        confidence_distribution=conf_dist
    )


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

async def process_inbound_message_task(
    user_id: str,
    message: InboundMessage,
    supabase: Client
):
    """Background Task für Nachrichtenverarbeitung."""
    from ...services.llm_client import get_llm_client
    from ...services.learning import LearningEventsService, AIDecisionLog
    
    # LLM Client initialisieren
    llm_client = get_llm_client()
    
    engine = AutopilotEngine(
        supabase=supabase,
        llm_client=llm_client
    )
    
    result = await engine.process_inbound_message(
        user_id=user_id,
        message=message
    )
    
    # Logging
    if result.success:
        print(f"✅ Processed message for lead {result.lead_id}: {result.decision.action}")
        
        # Learning Event loggen
        try:
            learning_service = LearningEventsService(supabase)
            ai_decision = AIDecisionLog(
                intent=result.intent_analysis.intent.value,
                confidence=result.confidence_result.score,
                action=result.decision.action.value,
                reasoning=result.decision.reasoning or "",
                suggested_response=result.response_message
            )
            await learning_service.log_autopilot_decision(
                user_id=user_id,
                lead_id=result.lead_id,
                action_id=result.message_id,
                ai_decision=ai_decision,
                channel=message.channel.value if message.channel else None
            )
        except Exception as e:
            print(f"⚠️ Failed to log learning event: {e}")
    else:
        print(f"⚠️ Failed to process message: {result.error}")


async def log_draft_approval_event(
    supabase: Client,
    user_id: str,
    draft: dict,
    edited_content: str = None
):
    """Loggt ein Draft-Approval als Learning Event."""
    from ...services.learning import (
        LearningEventsService,
        AIDecisionLog,
        UserActionLog
    )
    
    try:
        learning_service = LearningEventsService(supabase)
        
        ai_decision = AIDecisionLog(
            intent=draft.get("intent", "unknown"),
            confidence=draft.get("confidence_score", 80),
            action="draft_review",
            reasoning="Draft zur User-Prüfung erstellt",
            suggested_response=draft.get("content", "")
        )
        
        if edited_content:
            # User hat editiert - wichtiges Lernsignal
            user_action = UserActionLog(
                action_type="edit",
                original_content=draft.get("content", ""),
                edited_content=edited_content
            )
            await learning_service.log_user_correction(
                user_id=user_id,
                lead_id=draft.get("lead_id", ""),
                draft_id=draft.get("id", ""),
                original_ai_decision=ai_decision,
                user_action=user_action
            )
        else:
            # Direktes Approval - positives Signal
            await learning_service.log_user_approval(
                user_id=user_id,
                lead_id=draft.get("lead_id", ""),
                draft_id=draft.get("id", ""),
                ai_decision=ai_decision,
                time_to_action_seconds=0
            )
            
        print(f"✅ Logged draft {'edit' if edited_content else 'approval'} event")
        
    except Exception as e:
        print(f"⚠️ Failed to log draft approval event: {e}")


async def log_draft_rejection_event(
    supabase: Client,
    user_id: str,
    draft: dict
):
    """Loggt eine Draft-Ablehnung als Learning Event."""
    from ...services.learning import (
        LearningEventsService,
        AIDecisionLog,
        UserActionLog
    )
    
    try:
        learning_service = LearningEventsService(supabase)
        
        ai_decision = AIDecisionLog(
            intent=draft.get("intent", "unknown"),
            confidence=draft.get("confidence_score", 80),
            action="draft_review",
            reasoning="Draft zur User-Prüfung erstellt",
            suggested_response=draft.get("content", "")
        )
        
        user_action = UserActionLog(
            action_type="reject",
            original_content=draft.get("content", "")
        )
        
        await learning_service.log_user_correction(
            user_id=user_id,
            lead_id=draft.get("lead_id", ""),
            draft_id=draft.get("id", ""),
            original_ai_decision=ai_decision,
            user_action=user_action
        )
        
        print(f"✅ Logged draft rejection event")
        
    except Exception as e:
        print(f"⚠️ Failed to log draft rejection event: {e}")


async def send_approved_draft_task(
    lead: dict,
    content: str,
    supabase: Client
):
    """Background Task für Draft-Versand."""
    
    # TODO: Channel-spezifisches Senden
    
    # Nachricht in DB speichern
    supabase.table("lead_messages").insert({
        "lead_id": lead["id"],
        "channel": lead.get("channel", "manual"),
        "direction": "outbound",
        "content_type": "text",
        "content": content,
        "timestamp": datetime.utcnow().isoformat(),
        "auto_sent": False,
        "user_approved": True
    }).execute()


def parse_channel_payload(
    channel: ChannelEnum,
    payload: dict
) -> Optional[InboundWebhookPayload]:
    """Parst ein channel-spezifisches Payload in unser Format."""
    
    if channel == ChannelEnum.INSTAGRAM:
        # Instagram/Meta Graph API Format
        entry = payload.get("entry", [{}])[0]
        messaging = entry.get("messaging", [{}])[0]
        
        return InboundWebhookPayload(
            channel=channel,
            external_id=messaging.get("message", {}).get("mid", ""),
            lead_external_id=messaging.get("sender", {}).get("id", ""),
            content=WebhookMessageContent(
                type="text",
                text=messaging.get("message", {}).get("text", "")
            ),
            raw_payload=payload
        )
    
    elif channel == ChannelEnum.WHATSAPP:
        # WhatsApp Business API Format
        entry = payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        message = value.get("messages", [{}])[0]
        
        return InboundWebhookPayload(
            channel=channel,
            external_id=message.get("id", ""),
            lead_external_id=message.get("from", ""),
            content=WebhookMessageContent(
                type="text",
                text=message.get("text", {}).get("body", "")
            ),
            raw_payload=payload
        )
    
    elif channel == ChannelEnum.TELEGRAM:
        # Telegram Bot API Format
        message = payload.get("message", {})
        
        return InboundWebhookPayload(
            channel=channel,
            external_id=str(message.get("message_id", "")),
            lead_external_id=str(message.get("from", {}).get("id", "")),
            content=WebhookMessageContent(
                type="text",
                text=message.get("text", "")
            ),
            raw_payload=payload
        )
    
    # Fallback für andere Kanäle
    return None

