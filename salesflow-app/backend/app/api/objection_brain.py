"""
Sales Flow AI - Objection Brain API
Einwandbehandlung Endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.auth import get_current_user, User
from app.services.ai_service import ai_service

router = APIRouter()


# ===========================================
# MODELS
# ===========================================

class ObjectionRequest(BaseModel):
    objection: str = Field(..., min_length=3, max_length=500)
    vertical: str = Field(default="network", description="Branche: network, real_estate, finance")
    channel: str = Field(default="whatsapp", description="Kanal: whatsapp, instagram, phone, email")
    disc_type: Optional[str] = Field(None, description="DISG-Typ: D, I, S, G")
    language: str = Field(default="de")


class ObjectionVariant(BaseModel):
    label: str
    message: str
    summary: Optional[str] = None


class ObjectionResponse(BaseModel):
    variants: List[ObjectionVariant]
    tokens_used: int = 0


# ===========================================
# ENDPOINTS
# ===========================================

@router.post("/generate", response_model=ObjectionResponse)
async def generate_response(
    request: ObjectionRequest,
    user: Optional[User] = Depends(get_current_user)
):
    """
    Generiert Antworten auf Kundeneinwände.
    
    Gibt 3 Varianten zurück:
    - Logisch (Fakten, ROI)
    - Emotional (Werte, Story)
    - Provokativ (Gegenfrage)
    """
    try:
        result = await ai_service.handle_objection(
            objection=request.objection,
            vertical=request.vertical,
            channel=request.channel,
            disc_type=request.disc_type
        )
        
        variants = [
            ObjectionVariant(**v) for v in result.get("variants", [])
        ]
        
        return ObjectionResponse(
            variants=variants,
            tokens_used=result.get("tokens_used", 0)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def get_categories():
    """
    Verfügbare Einwand-Kategorien.
    """
    return {
        "categories": [
            {"key": "price", "label": "💰 Preis", "examples": ["Zu teuer", "Kein Budget"]},
            {"key": "time", "label": "⏰ Zeit", "examples": ["Keine Zeit", "Später"]},
            {"key": "trust", "label": "🤝 Vertrauen", "examples": ["Kenne ich nicht", "Unsicher"]},
            {"key": "mlm", "label": "🔺 MLM-Skepsis", "examples": ["Schneeballsystem", "Pyramide"]},
            {"key": "product", "label": "📦 Produkt", "examples": ["Funktioniert nicht", "Brauche ich nicht"]},
            {"key": "authority", "label": "👨‍⚕️ Autorität", "examples": ["Arzt sagt nein", "Partner dagegen"]},
            {"key": "stall", "label": "⏳ Verzögerung", "examples": ["Muss überlegen", "Ruf zurück"]},
        ]
    }


@router.get("/verticals")
async def get_verticals():
    """
    Verfügbare Branchen.
    """
    return {
        "verticals": [
            {"key": "network", "label": "🌐 Network Marketing", "color": "#8b5cf6"},
            {"key": "real_estate", "label": "🏠 Immobilien", "color": "#10b981"},
            {"key": "finance", "label": "💰 Finanzvertrieb", "color": "#f59e0b"},
        ]
    }


@router.get("/channels")
async def get_channels():
    """
    Verfügbare Kommunikationskanäle.
    """
    return {
        "channels": [
            {"key": "whatsapp", "label": "💬 WhatsApp"},
            {"key": "instagram", "label": "📸 Instagram"},
            {"key": "phone", "label": "📞 Telefon"},
            {"key": "email", "label": "📧 E-Mail"},
            {"key": "linkedin", "label": "💼 LinkedIn"},
        ]
    }

