"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GHOSTBUSTER API v2                                                       ║
║  /api/v2/ghostbuster/* Endpoints                                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /generate - Generiere Re-Engagement Nachricht für einen Kontakt
"""

from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.ghostbuster import (
    GhostbusterService,
    ReEngagementResult,
    TemplateType,
    get_ghostbuster_service,
)

# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/ghostbuster", tags=["ghostbuster", "re-engagement"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class GenerateRequest(BaseModel):
    """Request für Re-Engagement Generation."""
    contact_id: str = Field(..., description="ID des Kontakts")
    template_type: Optional[TemplateType] = Field(
        None,
        description="Template-Typ (auto, pattern_interrupt, value_first, social_proof, direct_question, breakup)"
    )


class MessageResponse(BaseModel):
    """Einzelne Nachricht."""
    type: str = Field(..., description="Template-Typ der Nachricht")
    subject: Optional[str] = Field(None, description="Email-Betreff (nur bei Email)")
    body: str = Field(..., description="Nachrichtentext")
    channel: str = Field(..., description="Empfohlener Kanal")


class GenerateResponse(BaseModel):
    """Response für Re-Engagement Generation."""
    messages: List[MessageResponse] = Field(..., description="Generierte Nachrichten")
    contact_name: str = Field(..., description="Name des Kontakts")
    days_inactive: int = Field(..., description="Tage seit letztem Kontakt")
    confidence: float = Field(..., description="Confidence-Score (0-1)")


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def _calculate_days_inactive(last_contact_date: Optional[str]) -> int:
    """Berechnet Tage seit letztem Kontakt."""
    if not last_contact_date:
        return 999  # Sehr alt
    
    try:
        if isinstance(last_contact_date, str):
            # Parse verschiedene Date-Formate
            for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"]:
                try:
                    last_contact = datetime.strptime(last_contact_date.split("T")[0], "%Y-%m-%d")
                    break
                except ValueError:
                    continue
            else:
                return 999
        else:
            return 999
        
        days = (datetime.now() - last_contact.replace(tzinfo=None)).days
        return max(0, days)
    except Exception:
        return 999


def _get_contact_info(db: Client, contact_id: str, user_id: str) -> dict:
    """Holt Kontakt-Informationen aus der DB."""
    try:
        result = db.table("contacts").select(
            "id, first_name, last_name, last_contact_date, notes, email, phone"
        ).eq("id", contact_id).eq("user_id", user_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
        
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Laden des Kontakts: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/generate", response_model=GenerateResponse)
async def generate_reengagement(
    request: GenerateRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    service: GhostbusterService = Depends(get_ghostbuster_service),
):
    """
    Generiert Re-Engagement Nachrichten für einen Kontakt.
    
    ## Template-Typen
    
    - `auto`: Automatische Auswahl basierend auf Tagen inaktiv
    - `pattern_interrupt`: Überraschende, auffällige Nachricht
    - `value_first`: Kostenlosen Mehrwert bieten
    - `social_proof`: Erfolgsgeschichte teilen
    - `direct_question`: Einfache Ja/Nein Frage
    - `breakup`: Letzte Chance Nachricht (würdevoll verabschieden)
    
    ## Beispiel Request
    
    ```json
    {
      "contact_id": "123",
      "template_type": "auto"
    }
    ```
    
    ## Beispiel Response
    
    ```json
    {
      "messages": [
        {
          "type": "value_first",
          "subject": null,
          "body": "Hey Max! Ich habe einen super Tipp für dich...",
          "channel": "whatsapp"
        }
      ],
      "contact_name": "Max Mustermann",
      "days_inactive": 15,
      "confidence": 0.75
    }
    ```
    """
    # Kontakt laden
    contact = _get_contact_info(db, request.contact_id, str(current_user.id))
    
    # Name zusammenbauen
    first_name = contact.get("first_name", "")
    last_name = contact.get("last_name", "")
    contact_name = f"{first_name} {last_name}".strip() or "Kontakt"
    
    # Tage inaktiv berechnen
    last_contact_date = contact.get("last_contact_date")
    days_inactive = _calculate_days_inactive(last_contact_date)
    
    # Letztes Thema
    last_topic = contact.get("notes") or "unser letztes Gespräch"
    
    # Template-Typ bestimmen
    template_type: TemplateType = request.template_type or "auto"
    
    # Re-Engagement Nachricht generieren
    try:
        result: ReEngagementResult = await service.generate_reengagement(
            contact_name=contact_name,
            days_inactive=days_inactive,
            last_topic=last_topic,
            template_type=template_type,
            additional_context={
                "email": contact.get("email"),
                "phone": contact.get("phone"),
            },
        )
        
        # Response bauen
        message = MessageResponse(
            type=result.template_type,
            subject=result.subject,
            body=result.body,
            channel=result.channel_suggestion,
        )
        
        return GenerateResponse(
            messages=[message],
            contact_name=contact_name,
            days_inactive=days_inactive,
            confidence=result.confidence,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei Re-Engagement Generation: {str(e)}"
        )

