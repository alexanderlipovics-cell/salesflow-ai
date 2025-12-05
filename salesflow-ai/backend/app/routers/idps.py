"""
IDPS Router - Intelligent DM Persistence System

API-Endpoints für das Non Plus Ultra DM-Persistenz-System:
- Unified Inbox (alle Plattformen konsolidiert)
- DM Conversations Management
- Follow-up Sequenzen
- Plattform-Verbindungen
- IDPS Analytics

Non Plus Ultra: Kein Lead geht verloren!
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
import logging

from ..core.deps import get_current_user
from ..supabase_client import get_supabase_client, SupabaseNotConfiguredError
from ..schemas.idps import (
    ConversationStatus,
    DMConversation,
    DMConversationCreate,
    DMConversationResponse,
    DMConversationListResponse,
    DMConversationUpdate,
    DMMessage,
    DMMessageCreate,
    DMMessageResponse,
    DMMessageListResponse,
    GenerateAIDraftRequest,
    GenerateAIDraftResponse,
    IDPSAnalytics,
    PlatformConnection,
    PlatformConnectionStatus,
    SendMessageRequest,
    StartSequenceRequest,
    UnifiedInboxFilters,
    UnifiedInboxItem,
    UnifiedInboxResponse,
)
from ..services.idps_engine import (
    add_message_to_conversation,
    create_conversation,
    generate_sequence_message,
    get_best_time_to_contact,
    get_idps_analytics,
    get_platform_connections,
    get_unified_inbox,
    process_pending_sequence_actions,
    start_sequence_for_conversation,
    update_conversation_status,
)

router = APIRouter(prefix="/idps", tags=["idps"])
logger = logging.getLogger(__name__)


# ============================================================================
# UNIFIED INBOX ENDPOINTS
# ============================================================================


@router.get("/inbox", response_model=UnifiedInboxResponse)
async def get_inbox(
    platforms: Optional[str] = Query(
        default=None,
        description="Komma-getrennte Liste von Plattformen: whatsapp,linkedin,instagram"
    ),
    statuses: Optional[str] = Query(
        default=None,
        description="Komma-getrennte Liste von Status-Werten"
    ),
    needs_attention: bool = Query(
        default=False,
        description="Nur Conversations die Aufmerksamkeit brauchen"
    ),
    search: Optional[str] = Query(
        default=None,
        description="Suche in Kontaktname, Handle, Nachrichten"
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Holt die Unified Inbox - alle DM-Conversations über alle Plattformen.
    
    **Features:**
    - Konsolidierte Ansicht über WhatsApp, LinkedIn, Instagram, Facebook, Email
    - Status-basierte Filterung (needs_attention, replied, in_sequence, etc.)
    - Prioritäts-Sortierung
    - Unread-Counts pro Conversation
    - Deep-Links zurück zur Original-Plattform
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        # Platforms und Statuses parsen
        platform_list = platforms.split(",") if platforms else None
        status_list = statuses.split(",") if statuses else None
        
        items, total_count = await get_unified_inbox(
            db=db,
            user_id=user_id,
            platforms=platform_list,
            statuses=status_list,
            needs_attention=needs_attention,
            search=search,
            limit=limit,
            offset=offset,
        )
        
        # Unread und Needs Attention Counts berechnen
        unread_total = sum(item.get("unread_count", 0) for item in items)
        needs_attention_count = sum(
            1 for item in items 
            if item.get("status") == "needs_human_attention"
        )
        
        return UnifiedInboxResponse(
            success=True,
            items=[UnifiedInboxItem(**item) for item in items],
            total_count=total_count,
            unread_total=unread_total,
            needs_attention_count=needs_attention_count,
        )
        
    except SupabaseNotConfiguredError:
        logger.warning("Supabase not configured - returning empty inbox")
        return UnifiedInboxResponse(
            success=True,
            items=[],
            total_count=0,
        )
    except Exception as e:
        logger.exception(f"Error getting inbox: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CONVERSATION ENDPOINTS
# ============================================================================


@router.post("/conversations", response_model=DMConversationResponse)
async def create_new_conversation(
    data: DMConversationCreate,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Erstellt eine neue DM-Conversation.
    
    Wird aufgerufen wenn:
    - Ein neuer Kontakt über eine Plattform initiiert wird
    - Ein Webhook eine neue Conversation meldet
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        conversation = await create_conversation(
            db=db,
            user_id=user_id,
            platform=data.platform.value,
            platform_contact_handle=data.platform_contact_handle or "",
            contact_id=data.contact_id,
            platform_metadata=data.platform_metadata,
        )
        
        return DMConversationResponse(
            success=True,
            conversation=DMConversation(**conversation),
        )
        
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}", response_model=DMConversationResponse)
async def get_conversation(
    conversation_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Holt Details einer einzelnen Conversation.
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        result = (
            db.table("dm_conversations")
            .select("*")
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Conversation nicht gefunden")
        
        return DMConversationResponse(
            success=True,
            conversation=DMConversation(**result.data),
        )
        
    except HTTPException:
        raise
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/conversations/{conversation_id}", response_model=DMConversationResponse)
async def update_conversation(
    conversation_id: str,
    data: DMConversationUpdate,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Aktualisiert eine Conversation (Status, Priority, etc.).
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        update_data = data.model_dump(exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="Keine Änderungen angegeben")
        
        # Status-Wert korrekt konvertieren
        if "status" in update_data and hasattr(update_data["status"], "value"):
            update_data["status"] = update_data["status"].value
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = (
            db.table("dm_conversations")
            .update(update_data)
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Conversation nicht gefunden")
        
        return DMConversationResponse(
            success=True,
            conversation=DMConversation(**result.data[0]),
        )
        
    except HTTPException:
        raise
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error updating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/status")
async def change_conversation_status(
    conversation_id: str,
    new_status: str = Query(..., description="Neuer Status"),
    pause_days: Optional[int] = Query(default=None, description="Pause für X Tage (bei delay_requested)"),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Ändert den Status einer Conversation.
    
    **Mögliche Status:**
    - `needs_human_attention`: Braucht menschliche Intervention
    - `in_sequence`: In automatischer Follow-up Sequenz
    - `delay_requested`: Kontakt bat um Verzögerung
    - `converted`: Konvertiert
    - `archived`: Archiviert
    - `unsubscribed`: Opt-out
    """
    user_id = user.get("user_id", "unknown")
    
    valid_statuses = [s.value for s in ConversationStatus]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültiger Status. Erlaubt: {', '.join(valid_statuses)}"
        )
    
    try:
        db = get_supabase_client()
        
        pause_until = None
        if pause_days and new_status == ConversationStatus.DELAY_REQUESTED.value:
            pause_until = datetime.utcnow() + timedelta(days=pause_days)
        
        result = await update_conversation_status(
            db=db,
            conversation_id=conversation_id,
            new_status=new_status,
            user_id=user_id,
            pause_until=pause_until,
        )
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "new_status": new_status,
            "pause_until": pause_until.isoformat() if pause_until else None,
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error changing status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# MESSAGE ENDPOINTS
# ============================================================================


@router.get("/conversations/{conversation_id}/messages", response_model=DMMessageListResponse)
async def get_conversation_messages(
    conversation_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Holt alle Nachrichten einer Conversation.
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        # Prüfen ob Conversation dem User gehört
        conv_check = (
            db.table("dm_conversations")
            .select("id")
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not conv_check.data:
            raise HTTPException(status_code=404, detail="Conversation nicht gefunden")
        
        result = (
            db.table("dm_messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("sent_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        messages = [DMMessage(**m) for m in (result.data or [])]
        
        return DMMessageListResponse(
            success=True,
            messages=messages,
            count=len(messages),
        )
        
    except HTTPException:
        raise
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/messages", response_model=DMMessageResponse)
async def send_message(
    conversation_id: str,
    data: SendMessageRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Sendet eine Nachricht in einer Conversation.
    
    Die Nachricht wird:
    1. In der DB gespeichert
    2. Analysiert (Sentiment, Keywords)
    3. Conversation-Status aktualisiert
    
    **Hinweis:** Der tatsächliche Versand über die Plattform muss 
    über einen separaten Service/Webhook erfolgen.
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        message = await add_message_to_conversation(
            db=db,
            user_id=user_id,
            conversation_id=conversation_id,
            direction="outbound",
            content=data.content,
            is_ai_generated=data.is_ai_generated,
        )
        
        return DMMessageResponse(
            success=True,
            message=DMMessage(**message),
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/receive-message", response_model=DMMessageResponse)
async def receive_inbound_message(
    conversation_id: str = Query(...),
    content: str = Query(...),
    platform_message_id: Optional[str] = Query(default=None),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Registriert eine eingehende Nachricht.
    
    Wird von Webhooks aufgerufen wenn eine Antwort eingeht.
    Triggert automatisch:
    - Status-Update (replied, needs_human_attention, etc.)
    - Intent-Analyse
    - Sequenz-Stopp (wenn nötig)
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        message = await add_message_to_conversation(
            db=db,
            user_id=user_id,
            conversation_id=conversation_id,
            direction="inbound",
            content=content,
        )
        
        return DMMessageResponse(
            success=True,
            message=DMMessage(**message),
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error receiving message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SEQUENCE ENDPOINTS
# ============================================================================


@router.post("/conversations/{conversation_id}/start-sequence")
async def start_sequence(
    conversation_id: str,
    data: StartSequenceRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Startet eine Follow-up Sequenz für eine Conversation.
    
    Die Sequenz führt automatisch durch die Phasen:
    - P1: Erstkontakt (manuell)
    - P2: Trust-Message (48h später)
    - P3: Clarity-Message (5 Tage später)
    - P4: Pivot-Message (12 Tage später)
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        result = await start_sequence_for_conversation(
            db=db,
            user_id=user_id,
            conversation_id=conversation_id,
            template_id=data.template_id,
        )
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "sequence_started": True,
            "current_phase": result.get("current_sequence_phase", 1),
            "next_action_at": result.get("next_sequence_action_at"),
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error starting sequence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-sequences")
async def process_sequences(
    limit: int = Query(default=20, ge=1, le=100),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Verarbeitet alle fälligen Sequenz-Aktionen.
    
    Sollte regelmäßig aufgerufen werden (z.B. alle 15 Minuten via Cron).
    
    Für jede fällige Conversation:
    1. Generiert die nächste Sequenz-Nachricht
    2. Setzt Status auf NEEDS_HUMAN_ATTENTION
    3. Berechnet nächsten Zeitpunkt
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        summary = await process_pending_sequence_actions(
            db=db,
            user_id=user_id,
            max_actions=limit,
        )
        
        return {
            "success": True,
            "summary": summary,
        }
        
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error processing sequences: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# AI DRAFT GENERATION
# ============================================================================


@router.post("/conversations/{conversation_id}/generate-draft", response_model=GenerateAIDraftResponse)
async def generate_ai_draft(
    conversation_id: str,
    data: GenerateAIDraftRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Generiert einen KI-Entwurf für eine Antwort.
    
    Analysiert:
    - Letzte Nachrichten der Conversation
    - Lead-Profil (falls verknüpft)
    - Plattform-spezifische Tonalität
    
    **Style-Matching:** Die KI passt sich dem Stil des Users an.
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        # Conversation und letzte Nachrichten laden
        conv = (
            db.table("dm_conversations")
            .select("*")
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not conv.data:
            raise HTTPException(status_code=404, detail="Conversation nicht gefunden")
        
        # Letzte Nachrichten für Kontext
        messages = (
            db.table("dm_messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("sent_at", desc=True)
            .limit(5)
            .execute()
        )
        
        # KI-Entwurf generieren
        draft = await generate_sequence_message(
            db=db,
            conversation_id=conversation_id,
            phase=0,  # 0 = kein Sequenz-Kontext
            template=None,
            ai_prompt=data.context or "Generiere eine passende Antwort basierend auf dem Gesprächsverlauf.",
        )
        
        return GenerateAIDraftResponse(
            success=True,
            draft_text=draft or "Konnte keinen Entwurf generieren.",
            detected_intent=conv.data.get("detected_intent"),
            confidence=0.8,
        )
        
    except HTTPException:
        raise
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error generating draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# BEST TIME TO CONTACT
# ============================================================================


@router.get("/conversations/{conversation_id}/best-time")
async def get_best_contact_time(
    conversation_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Berechnet die optimale Kontaktzeit für diese Conversation.
    
    Analysiert:
    - Wann wurden E-Mails/DMs geöffnet?
    - Wann kamen Antworten?
    - Wann war der Kontakt am aktivsten?
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        best_time = await get_best_time_to_contact(db, conversation_id)
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "best_time_to_contact": best_time or "Nicht genug Daten",
            "note": "Basiert auf historischen Interaktionsmustern",
        }
        
    except SupabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Error getting best time: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PLATFORM CONNECTIONS
# ============================================================================


@router.get("/connections")
async def list_platform_connections(
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Listet alle Plattform-Verbindungen des Users.
    
    Zeigt Status für:
    - Gmail
    - WhatsApp Business
    - LinkedIn
    - Instagram
    - Facebook
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        connections = await get_platform_connections(db, user_id)
        
        # Alle unterstützten Plattformen mit Status
        all_platforms = ["gmail", "whatsapp_business", "linkedin", "instagram", "facebook"]
        connected_platforms = {c["platform"]: c for c in connections}
        
        result = []
        for platform in all_platforms:
            if platform in connected_platforms:
                conn = connected_platforms[platform]
                result.append(PlatformConnectionStatus(
                    platform=platform,
                    is_connected=conn.get("is_connected", False),
                    account_name=conn.get("account_name"),
                    last_sync_at=conn.get("last_sync_at"),
                    has_errors=conn.get("error_count", 0) > 0,
                ))
            else:
                result.append(PlatformConnectionStatus(
                    platform=platform,
                    is_connected=False,
                ))
        
        return {
            "success": True,
            "connections": [c.model_dump() for c in result],
        }
        
    except SupabaseNotConfiguredError:
        return {"success": True, "connections": []}
    except Exception as e:
        logger.exception(f"Error getting connections: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ANALYTICS
# ============================================================================


@router.get("/analytics", response_model=IDPSAnalytics)
async def get_analytics(
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Holt IDPS-Analytik für das Dashboard.
    
    Enthält:
    - Gesamt-Conversations
    - Aktive Sequenzen
    - Needs Attention Count
    - Response Rate
    - Conversion Rate
    - Aufschlüsselung nach Plattform und Status
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        analytics = await get_idps_analytics(db, user_id)
        
        return IDPSAnalytics(**analytics)
        
    except SupabaseNotConfiguredError:
        return IDPSAnalytics()
    except Exception as e:
        logger.exception(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH CHECK
# ============================================================================


@router.get("/health")
async def idps_health():
    """Health-Check für das IDPS-System."""
    return {
        "status": "ok",
        "service": "idps",
        "version": "1.0.0",
        "features": [
            "unified_inbox",
            "dm_conversations",
            "follow_up_sequences",
            "ai_draft_generation",
            "best_time_to_contact",
            "platform_connections",
            "analytics",
        ],
    }


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = ["router"]


