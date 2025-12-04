"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CONVERSATION API v2                                                        ║
║  /api/v2/contacts/{id}/timeline/* Endpoints                                ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET /timeline - Timeline aller Interaktionen
- POST /log - Manueller Eintrag
- POST /log-message-sent - Log outbound Nachricht
- POST /log-reply-received - Log inbound Antwort
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel, Field
from supabase import Client
import uuid

from ...db.deps import get_db, get_current_user, CurrentUser
from ...models.conversation import (
    ConversationEntryCreate,
    ConversationEntryResponse,
    ConversationTimelineResponse,
)


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/contacts/{contact_id}/timeline", tags=["conversation", "timeline"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class LogMessageSentRequest(BaseModel):
    """Request für Log Message Sent."""
    channel: str = Field(..., description="Kanal: email, whatsapp, sms, linkedin")
    subject: Optional[str] = Field(None, description="Betreff (für Email)")
    content: str = Field(..., description="Nachrichteninhalt")
    metadata: Optional[dict] = Field(default_factory=dict, description="Zusätzliche Metadaten")


class LogReplyReceivedRequest(BaseModel):
    """Request für Log Reply Received."""
    channel: str = Field(..., description="Kanal: email, whatsapp, sms, linkedin")
    subject: Optional[str] = Field(None, description="Betreff (für Email)")
    content: str = Field(..., description="Antwortinhalt")
    metadata: Optional[dict] = Field(default_factory=dict, description="Zusätzliche Metadaten")


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def _get_conversation_type(channel: str, direction: str) -> str:
    """Bestimmt Conversation Type basierend auf Channel und Direction."""
    if direction == "outbound":
        if channel == "email":
            return "email_sent"
        elif channel == "whatsapp":
            return "whatsapp_sent"
        elif channel == "sms":
            return "sms_sent"
        elif channel == "linkedin":
            return "linkedin_message"
        else:
            return "note"
    else:  # inbound
        if channel == "email":
            return "email_received"
        elif channel == "whatsapp":
            return "whatsapp_received"
        elif channel == "sms":
            return "sms_received"
        elif channel == "linkedin":
            return "linkedin_message"
        else:
            return "note"


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("", response_model=ConversationTimelineResponse)
async def get_timeline(
    contact_id: str = Path(..., description="Kontakt ID"),
    channel: Optional[str] = Query(None, description="Filter nach Kanal"),
    limit: int = Query(100, ge=1, le=500, description="Max. Anzahl Einträge"),
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt Timeline aller Interaktionen mit einem Kontakt zurück.
    
    ## Filter
    
    - `channel`: Filter nach Kanal (email, whatsapp, sms, linkedin, phone, in_person)
    - `limit`: Max. Anzahl Einträge (Standard: 100, Max: 500)
    
    ## Sortierung
    
    Einträge werden chronologisch sortiert (neueste zuerst).
    
    ## Beispiel Response
    
    ```json
    {
      "contact_id": "123",
      "entries": [
        {
          "id": "entry-1",
          "type": "email_sent",
          "channel": "email",
          "direction": "outbound",
          "subject": "Follow-up",
          "content": "Hallo...",
          "timestamp": "2024-12-01T10:00:00Z",
          "metadata": {"opened": true}
        }
      ],
      "total": 1,
      "channels": ["email", "whatsapp"]
    }
    ```
    """
    # Prüfe ob Kontakt existiert und gehört dem User
    try:
        contact_result = db.table("contacts").select("id").eq(
            "id", contact_id
        ).eq("user_id", current_user.id).single().execute()
        
        if not contact_result.data:
            raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    
    # Hole Timeline Einträge
    try:
        query = db.table("conversation_entries").select("*").eq(
            "contact_id", contact_id
        ).order("timestamp", desc=True).limit(limit)
        
        if channel:
            query = query.eq("channel", channel)
        
        result = query.execute()
        entries = result.data if result.data else []
        
        # Extrahiere verfügbare Kanäle
        channels = list(set([e.get("channel") for e in entries if e.get("channel")]))
        
        return ConversationTimelineResponse(
            contact_id=contact_id,
            entries=[ConversationEntryResponse(**entry) for entry in entries],
            total=len(entries),
            channels=channels,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Timeline: {str(e)}"
        )


@router.post("/log", response_model=ConversationEntryResponse, status_code=201)
async def log_conversation(
    contact_id: str = Path(..., description="Kontakt ID"),
    payload: ConversationEntryCreate = ...,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Erstellt einen manuellen Conversation Eintrag.
    
    ## Beispiel Request
    
    ```json
    {
      "type": "note",
      "channel": "in_person",
      "direction": "outbound",
      "content": "Gespräch über Produkt X",
      "metadata": {"duration_minutes": 30}
    }
    ```
    """
    # Prüfe ob Kontakt existiert und gehört dem User
    try:
        contact_result = db.table("contacts").select("id").eq(
            "id", contact_id
        ).eq("user_id", current_user.id).single().execute()
        
        if not contact_result.data:
            raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    
    # Erstelle Entry
    try:
        entry_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        entry_data = {
            "id": entry_id,
            "contact_id": contact_id,
            "user_id": current_user.id,
            "type": payload.type,
            "channel": payload.channel,
            "direction": payload.direction,
            "subject": payload.subject,
            "content": payload.content,
            "timestamp": payload.metadata.get("timestamp", now) if payload.metadata else now,
            "metadata": payload.metadata or {},
            "created_at": now,
            "updated_at": now,
        }
        
        result = db.table("conversation_entries").insert(entry_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Eintrag konnte nicht erstellt werden")
        
        return ConversationEntryResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Erstellen des Eintrags: {str(e)}"
        )


@router.post("/log-message-sent", response_model=ConversationEntryResponse, status_code=201)
async def log_message_sent(
    contact_id: str = Path(..., description="Kontakt ID"),
    payload: LogMessageSentRequest = ...,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Loggt eine ausgehende Nachricht (outbound).
    
    ## Beispiel Request
    
    ```json
    {
      "channel": "email",
      "subject": "Follow-up",
      "content": "Hallo, wie geht es dir?",
      "metadata": {"opened": false}
    }
    ```
    """
    # Prüfe ob Kontakt existiert
    try:
        contact_result = db.table("contacts").select("id").eq(
            "id", contact_id
        ).eq("user_id", current_user.id).single().execute()
        
        if not contact_result.data:
            raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    
    # Erstelle Entry
    try:
        entry_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        conv_type = _get_conversation_type(payload.channel, "outbound")
        
        entry_data = {
            "id": entry_id,
            "contact_id": contact_id,
            "user_id": current_user.id,
            "type": conv_type,
            "channel": payload.channel,
            "direction": "outbound",
            "subject": payload.subject,
            "content": payload.content,
            "timestamp": now,
            "metadata": payload.metadata or {},
            "created_at": now,
            "updated_at": now,
        }
        
        result = db.table("conversation_entries").insert(entry_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Eintrag konnte nicht erstellt werden")
        
        return ConversationEntryResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Erstellen des Eintrags: {str(e)}"
        )


@router.post("/log-reply-received", response_model=ConversationEntryResponse, status_code=201)
async def log_reply_received(
    contact_id: str = Path(..., description="Kontakt ID"),
    payload: LogReplyReceivedRequest = ...,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Loggt eine eingehende Antwort (inbound).
    
    ## Beispiel Request
    
    ```json
    {
      "channel": "whatsapp",
      "content": "Danke, klingt interessant!",
      "metadata": {}
    }
    ```
    """
    # Prüfe ob Kontakt existiert
    try:
        contact_result = db.table("contacts").select("id").eq(
            "id", contact_id
        ).eq("user_id", current_user.id).single().execute()
        
        if not contact_result.data:
            raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    
    # Erstelle Entry
    try:
        entry_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        conv_type = _get_conversation_type(payload.channel, "inbound")
        
        entry_data = {
            "id": entry_id,
            "contact_id": contact_id,
            "user_id": current_user.id,
            "type": conv_type,
            "channel": payload.channel,
            "direction": "inbound",
            "subject": payload.subject,
            "content": payload.content,
            "timestamp": now,
            "metadata": payload.metadata or {},
            "created_at": now,
            "updated_at": now,
        }
        
        result = db.table("conversation_entries").insert(entry_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Eintrag konnte nicht erstellt werden")
        
        return ConversationEntryResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Erstellen des Eintrags: {str(e)}"
        )

