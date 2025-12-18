"""
Chat Import Router - API Endpoints für Chat-Import

Ermöglicht Networkern, Chat-Verläufe zu importieren und automatisch
Leads zu erstellen.
"""

from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field

from app.services.chat_import_service import (
    get_chat_import_service,
    ChatImportService,
    ChatPlatform,
    LeadSentiment,
    SuggestedAction,
    ExtractedLead,
)
from app.core.deps import get_supabase
from app.core.security import get_current_active_user

router = APIRouter(prefix="/import", tags=["Chat Import"])


# ============================================
# REQUEST/RESPONSE SCHEMAS
# ============================================

class ChatImportRequest(BaseModel):
    """Request zum Importieren eines Chat-Verlaufs"""
    raw_text: str = Field(
        ...,
        description="Der rohe Chat-Text (Copy-Paste)",
        min_length=1,
        max_length=500000  # 500KB max
    )
    my_name: Optional[str] = Field(
        None,
        description="Dein Name im Chat (um dich selbst auszuschließen)"
    )
    auto_create_leads: bool = Field(
        default=False,
        description="Leads automatisch erstellen?"
    )


class ExtractedLeadResponse(BaseModel):
    """Ein extrahierter Lead"""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    platform: str
    last_message: Optional[str] = None
    last_message_date: Optional[datetime] = None
    message_count: int = 0
    sentiment: str
    sentiment_label: str
    suggested_action: str
    suggested_action_label: str
    confidence_score: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Max Mustermann",
                "phone": "+49 151 12345678",
                "email": None,
                "platform": "whatsapp",
                "last_message": "Ja, das klingt interessant! Erzähl mehr.",
                "last_message_date": "2024-12-05T14:30:00",
                "message_count": 5,
                "sentiment": "hot",
                "sentiment_label": "🔥 Sehr interessiert",
                "suggested_action": "schedule_call",
                "suggested_action_label": "📞 Call anbieten",
                "confidence_score": 0.85
            }
        }


class ChatImportResponse(BaseModel):
    """Response nach Chat-Import"""
    success: bool
    platform_detected: str
    total_leads: int
    leads: List[ExtractedLeadResponse]
    summary: dict
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "platform_detected": "whatsapp",
                "total_leads": 5,
                "leads": [],
                "summary": {
                    "hot": 1,
                    "warm": 2,
                    "neutral": 1,
                    "cold": 1,
                    "ghost": 0
                }
            }
        }


class LeadCreateFromImportRequest(BaseModel):
    """Request zum Erstellen eines Leads aus Import-Daten"""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    platform: str = "unknown"
    sentiment: str = "neutral"
    notes: Optional[str] = None


class BulkLeadCreateRequest(BaseModel):
    """Request zum Erstellen mehrerer Leads"""
    leads: List[LeadCreateFromImportRequest]


# ============================================
# HELPER FUNCTIONS
# ============================================

SENTIMENT_LABELS = {
    LeadSentiment.HOT: "🔥 Sehr interessiert",
    LeadSentiment.WARM: "☀️ Offen/Neugierig",
    LeadSentiment.NEUTRAL: "😐 Unklar",
    LeadSentiment.COLD: "❄️ Desinteressiert",
    LeadSentiment.GHOST: "👻 Keine Antwort",
}

ACTION_LABELS = {
    SuggestedAction.IMMEDIATE_FOLLOWUP: "⚡ Sofort antworten",
    SuggestedAction.SEND_INFO: "📄 Mehr Infos senden",
    SuggestedAction.SCHEDULE_CALL: "📞 Call anbieten",
    SuggestedAction.WAIT_AND_SEE: "⏳ Abwarten",
    SuggestedAction.REACTIVATE: "🔄 Reaktivieren",
    SuggestedAction.ARCHIVE: "📁 Archivieren",
}


def convert_to_response(lead: ExtractedLead) -> ExtractedLeadResponse:
    """Konvertiert ExtractedLead zu Response-Schema"""
    return ExtractedLeadResponse(
        name=lead.name,
        phone=lead.phone,
        email=lead.email,
        platform=lead.platform.value,
        last_message=lead.last_message[:200] if lead.last_message else None,  # Truncate
        last_message_date=lead.last_message_date,
        message_count=lead.message_count,
        sentiment=lead.sentiment.value,
        sentiment_label=SENTIMENT_LABELS.get(lead.sentiment, "Unbekannt"),
        suggested_action=lead.suggested_action.value,
        suggested_action_label=ACTION_LABELS.get(lead.suggested_action, "Unbekannt"),
        confidence_score=round(lead.confidence_score, 2),
    )


# ============================================
# ENDPOINTS
# ============================================

@router.post("/chat-paste", response_model=ChatImportResponse)
async def import_chat_paste(
    request: ChatImportRequest,
    service: ChatImportService = Depends(get_chat_import_service),
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
):
    """
    Importiert einen kopierten Chat-Verlauf und extrahiert Leads.
    
    **Unterstützte Formate:**
    - WhatsApp Chat Export
    - Instagram DM Copy
    - Telegram Export
    - Einfache Kontakt-Listen (Name, Telefon)
    
    **Beispiel WhatsApp:**
    ```
    [05.12.24, 14:30:00] Max: Hey, das klingt interessant!
    [05.12.24, 14:35:00] Du: Super, wann hast du Zeit für einen Call?
    ```
    
    **Beispiel Liste:**
    ```
    Max Mustermann, +49 151 12345678
    Lisa Schmidt, +49 152 87654321
    ```
    """
    try:
        # User ID extrahieren
        user_id = None
        if hasattr(current_user, 'id'):
            user_id = current_user.id
        elif isinstance(current_user, dict):
            user_id = current_user.get('id') or current_user.get('user_id')
        
        # Service mit User-Kontext initialisieren
        if user_id:
            service.db = db
            service.user_id = user_id
        
        # Leads extrahieren
        extracted_leads = service.import_chat(
            raw_text=request.raw_text,
            my_name=request.my_name
        )
        
        # Platform erkennen
        platform = service.detect_platform(request.raw_text)
        
        # Summary erstellen
        summary = {
            "hot": sum(1 for l in extracted_leads if l.sentiment == LeadSentiment.HOT),
            "warm": sum(1 for l in extracted_leads if l.sentiment == LeadSentiment.WARM),
            "neutral": sum(1 for l in extracted_leads if l.sentiment == LeadSentiment.NEUTRAL),
            "cold": sum(1 for l in extracted_leads if l.sentiment == LeadSentiment.COLD),
            "ghost": sum(1 for l in extracted_leads if l.sentiment == LeadSentiment.GHOST),
        }
        
        # Response erstellen
        return ChatImportResponse(
            success=True,
            platform_detected=platform.value,
            total_leads=len(extracted_leads),
            leads=[convert_to_response(l) for l in extracted_leads],
            summary=summary,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fehler beim Parsen: {str(e)}"
        )


@router.post("/preview", response_model=ChatImportResponse)
async def preview_import(
    request: ChatImportRequest,
    service: ChatImportService = Depends(get_chat_import_service),
):
    """
    Vorschau des Imports ohne Leads zu erstellen.
    
    Identisch zu /chat-paste, aber garantiert keine Datenbank-Änderungen.
    """
    return await import_chat_paste(request, service)


@router.get("/platforms")
async def get_supported_platforms():
    """
    Gibt alle unterstützten Chat-Plattformen zurück.
    """
    return {
        "platforms": [
            {
                "id": "whatsapp",
                "name": "WhatsApp",
                "icon": "📱",
                "instructions": "Chat öffnen → ⋮ Menu → Mehr → Chat exportieren → Ohne Medien"
            },
            {
                "id": "instagram",
                "name": "Instagram DM",
                "icon": "📸",
                "instructions": "DM öffnen → Text markieren → Kopieren"
            },
            {
                "id": "telegram",
                "name": "Telegram",
                "icon": "✈️",
                "instructions": "Chat öffnen → ⋮ Menu → Export chat history"
            },
            {
                "id": "list",
                "name": "Kontakt-Liste",
                "icon": "📋",
                "instructions": "Name und Telefon pro Zeile, getrennt durch Komma"
            },
        ]
    }


@router.get("/sentiments")
async def get_sentiment_labels():
    """
    Gibt alle Sentiment-Labels mit Beschreibungen zurück.
    """
    return {
        "sentiments": [
            {"id": "hot", "label": SENTIMENT_LABELS[LeadSentiment.HOT], "color": "#ef4444"},
            {"id": "warm", "label": SENTIMENT_LABELS[LeadSentiment.WARM], "color": "#f59e0b"},
            {"id": "neutral", "label": SENTIMENT_LABELS[LeadSentiment.NEUTRAL], "color": "#6b7280"},
            {"id": "cold", "label": SENTIMENT_LABELS[LeadSentiment.COLD], "color": "#3b82f6"},
            {"id": "ghost", "label": SENTIMENT_LABELS[LeadSentiment.GHOST], "color": "#8b5cf6"},
        ]
    }


@router.get("/actions")
async def get_action_suggestions():
    """
    Gibt alle möglichen Aktions-Vorschläge zurück.
    """
    return {
        "actions": [
            {"id": "immediate_followup", "label": ACTION_LABELS[SuggestedAction.IMMEDIATE_FOLLOWUP], "priority": 1},
            {"id": "send_info", "label": ACTION_LABELS[SuggestedAction.SEND_INFO], "priority": 2},
            {"id": "schedule_call", "label": ACTION_LABELS[SuggestedAction.SCHEDULE_CALL], "priority": 3},
            {"id": "reactivate", "label": ACTION_LABELS[SuggestedAction.REACTIVATE], "priority": 4},
            {"id": "wait_and_see", "label": ACTION_LABELS[SuggestedAction.WAIT_AND_SEE], "priority": 5},
            {"id": "archive", "label": ACTION_LABELS[SuggestedAction.ARCHIVE], "priority": 6},
        ]
    }


# Export router
__all__ = ["router"]

