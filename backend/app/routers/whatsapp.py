"""
WhatsApp API Endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from ..services.whatsapp_service import whatsapp_service

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════

class SendMessageRequest(BaseModel):
    to: str  # Phone number in international format
    message: str


class SendTemplateRequest(BaseModel):
    to: str
    template_name: str
    language: str = "de"
    variables: List[str] = []


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/send")
async def send_whatsapp_message(request: SendMessageRequest):
    """Send a WhatsApp message"""
    
    try:
        result = await whatsapp_service.send_message(
            to=request.to,
            message=request.message
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to send WhatsApp message")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-template")
async def send_whatsapp_template(request: SendTemplateRequest):
    """Send a WhatsApp template message (360dialog only)"""
    
    try:
        result = await whatsapp_service.send_template(
            to=request.to,
            template_name=request.template_name,
            language=request.language,
            variables=request.variables
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to send WhatsApp template")
            )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_whatsapp_status():
    """Get WhatsApp integration status"""
    
    provider = whatsapp_service.provider
    configured = False
    
    if provider == "ultramsg":
        configured = bool(
            whatsapp_service.ultramsg_instance and 
            whatsapp_service.ultramsg_token
        )
    elif provider == "360dialog":
        configured = bool(whatsapp_service.dialog360_api_key)
    elif provider == "twilio":
        configured = bool(
            whatsapp_service.twilio_account_sid and 
            whatsapp_service.twilio_auth_token
        )
    
    return {
        "provider": provider,
        "configured": configured,
        "ready": configured
    }

