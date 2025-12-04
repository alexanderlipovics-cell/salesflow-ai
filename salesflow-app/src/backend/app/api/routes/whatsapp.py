"""
╔════════════════════════════════════════════════════════════════════════════╗
║  WHATSAPP API                                                             ║
║  WhatsApp Integration Endpoints                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from ...db.supabase import get_supabase
from ...db.deps import get_current_user, CurrentUser
from ...services.whatsapp import WhatsAppService

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


# =============================================================================
# SCHEMAS
# =============================================================================

class GenerateLinkRequest(BaseModel):
    """Request für wa.me Link Generation."""
    phone: str
    message: Optional[str] = ""


class GenerateLinkResponse(BaseModel):
    """Response mit wa.me Link."""
    link: str
    phone: str
    message: Optional[str] = ""


class SendMessageRequest(BaseModel):
    """Request für WhatsApp-Nachricht (für später: WhatsApp Business API)."""
    to_number: str
    message: str
    lead_id: Optional[str] = None


class SendMessageResponse(BaseModel):
    """Response für gesendete Nachricht."""
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/generate-link", response_model=GenerateLinkResponse)
async def generate_whatsapp_link(
    request: GenerateLinkRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    💬 Generiert einen wa.me Link mit vorausgefüllter Nachricht.
    
    Öffnet WhatsApp Web/App mit vorausgefüllter Nachricht.
    
    Args:
        request: GenerateLinkRequest mit phone und optional message
        
    Returns:
        GenerateLinkResponse mit wa.me Link
        
    Example:
        POST /api/v2/whatsapp/generate-link
        {
            "phone": "+491234567890",
            "message": "Hallo Max! Wie geht's?"
        }
        
        Response:
        {
            "link": "https://wa.me/491234567890?text=Hallo%20Max%21%20Wie%20geht%27s%3F",
            "phone": "491234567890",
            "message": "Hallo Max! Wie geht's?"
        }
    """
    try:
        service = WhatsAppService(supabase)
        link = service.generate_whatsapp_link(
            phone=request.phone,
            message=request.message or "",
        )
        
        # Normalisierte Nummer für Response
        normalized_phone = service.normalize_phone_number(request.phone)
        
        return GenerateLinkResponse(
            link=link,
            phone=normalized_phone,
            message=request.message,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Generieren des Links: {str(e)}")


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    supabase = Depends(get_supabase)
):
    """
    🔔 WhatsApp Webhook Endpoint (für später: WhatsApp Business API).
    
    Empfängt:
    - Eingehende Nachrichten
    - Delivery Status Updates
    - Read Receipts
    
    TODO: Implementierung für WhatsApp Business API
    
    Konfigurieren in WhatsApp Business API:
    - Webhook URL: https://your-domain.com/api/v2/whatsapp/webhook
    - Verify Token: (wird später konfiguriert)
    """
    # TODO: Webhook-Verarbeitung für WhatsApp Business API
    data = await request.json()
    
    service = WhatsAppService(supabase)
    result = await service.handle_webhook(data)
    
    return result


@router.post("/send", response_model=SendMessageResponse)
async def send_whatsapp_message(
    request: SendMessageRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    📱 Sendet eine WhatsApp-Nachricht via WhatsApp Business API.
    
    TODO: Implementierung für WhatsApp Business API
    
    Für jetzt: Nutze /generate-link um wa.me Link zu erhalten.
    
    Args:
        request: SendMessageRequest mit to_number, message, optional lead_id
        
    Returns:
        SendMessageResponse mit success, message_id, etc.
    """
    service = WhatsAppService(supabase)
    result = await service.send_message(
        to_number=request.to_number,
        message=request.message,
        user_id=current_user.id,
        lead_id=request.lead_id,
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return SendMessageResponse(
        success=result.get("success"),
        message_id=result.get("message_id"),
        error=result.get("error"),
    )

