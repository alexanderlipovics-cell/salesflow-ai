"""
╔════════════════════════════════════════════════════════════════════════════╗
║  REFERRAL API v2                                                            ║
║  /api/v2/referral/* Endpoints                                               ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET /pending - Kontakte wo Referral ansteht
- POST /generate-script - Generiert Referral-Skript
- POST /track - Trackt Referral-Request
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.referral import ReferralService


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/referral", tags=["referral", "recommendations"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class GenerateScriptRequest(BaseModel):
    """Request für Script-Generierung."""
    contact_id: str = Field(..., description="Kontakt ID")
    product: Optional[str] = Field(None, description="Produktname")
    script_type: Optional[str] = Field(
        None, 
        description="Script-Typ: after_sale, follow_up, specific_ask, soft_ask"
    )


class ReferralScriptResponse(BaseModel):
    """Response mit generiertem Script."""
    script: str
    script_type: str
    timing_suggestion: str
    follow_up_days: int
    confidence_score: float
    reasoning: Optional[str] = None


class TrackReferralRequest(BaseModel):
    """Request für Referral-Tracking."""
    contact_id: str = Field(..., description="Kontakt ID")
    asked: bool = Field(..., description="Wurde gefragt?")
    result: Optional[str] = Field(
        None,
        description="Ergebnis: yes, no, maybe, later"
    )
    script_type: Optional[str] = Field(None, description="Verwendetes Script")


class TrackReferralResponse(BaseModel):
    """Response für Tracking."""
    success: bool
    message: str


class PendingReferralContact(BaseModel):
    """Kontakt mit Referral-Status."""
    id: str
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    last_purchase_date: Optional[str] = None
    satisfaction_score: Optional[float] = None
    referral_priority: float = 0.0
    referral_ready: bool = True


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/pending", response_model=List[PendingReferralContact])
async def get_pending_referrals(
    limit: int = 20,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt Kontakte zurück, wo Referral-Frage ansteht.
    
    ## Kriterien für Pending Referrals
    
    - Kürzlich gekauft (innerhalb 30 Tagen)
    - Status "won" oder "customer"
    - Noch nicht gefragt (oder > 90 Tage her)
    - Zufriedenheit vorhanden (falls erfasst)
    
    ## Sortierung
    
    Kontakte werden nach Priority Score sortiert:
    - Kürzlich gekauft = höhere Priority
    - Hohe Zufriedenheit = höhere Priority
    - Aktiv = höhere Priority
    
    ## Beispiel Response
    
    ```json
    [
      {
        "id": "123",
        "name": "Max Mustermann",
        "last_purchase_date": "2024-12-01",
        "satisfaction_score": 5.0,
        "referral_priority": 150.0,
        "referral_ready": true
      }
    ]
    ```
    """
    service = ReferralService(db)
    
    try:
        pending = service.get_pending_referrals(
            user_id=current_user.id,
            limit=limit
        )
        
        return [
            PendingReferralContact(**contact) 
            for contact in pending
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Pending Referrals: {str(e)}"
        )


@router.post("/generate-script", response_model=ReferralScriptResponse)
async def generate_referral_script(
    payload: GenerateScriptRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generiert ein Referral-Skript für einen Kontakt.
    
    ## Script-Typen
    
    - `after_sale`: Direkt nach Kauf (3-7 Tage)
    - `follow_up`: Follow-up nach 7-30 Tagen
    - `specific_ask`: Wenn spezifischer Name erwähnt wurde
    - `soft_ask`: Sanfte Anfrage (Standard)
    
    ## Beispiel Request
    
    ```json
    {
      "contact_id": "123",
      "product": "doTERRA Öle",
      "script_type": "after_sale"
    }
    ```
    
    ## Beispiel Response
    
    ```json
    {
      "script": "Hey Max! ...",
      "script_type": "after_sale",
      "timing_suggestion": "Optimal: Jetzt (3-7 Tage nach Kauf)",
      "follow_up_days": 7,
      "confidence_score": 0.85,
      "reasoning": "Kauf vor 5 Tagen | Zufriedenheit: 5/5"
    }
    ```
    """
    service = ReferralService(db)
    
    # Hole Kontakt
    try:
        result = db.table("contacts").select("*").eq(
            "id", payload.contact_id
        ).eq("user_id", current_user.id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
        
        contact = result.data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden des Kontakts: {str(e)}"
        )
    
    # Hole User-Name für Script
    user_name = current_user.name or "Dein Name"
    
    # Generiere Script
    try:
        script = service.generate_referral_script(
            contact=contact,
            product=payload.product,
            script_type=payload.script_type,
            user_name=user_name,
        )
        
        return ReferralScriptResponse(
            script=script.script,
            script_type=script.script_type,
            timing_suggestion=script.timing_suggestion,
            follow_up_days=script.follow_up_days,
            confidence_score=script.confidence_score,
            reasoning=script.reasoning,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei Script-Generierung: {str(e)}"
        )


@router.post("/track", response_model=TrackReferralResponse)
async def track_referral(
    payload: TrackReferralRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Trackt ob nach Referral gefragt wurde und Ergebnis.
    
    ## Ergebnis-Optionen
    
    - `yes`: Hat Referral gegeben
    - `no`: Kein Referral
    - `maybe`: Vielleicht später
    - `later`: Später fragen
    
    ## Beispiel Request
    
    ```json
    {
      "contact_id": "123",
      "asked": true,
      "result": "yes",
      "script_type": "after_sale"
    }
    ```
    """
    service = ReferralService(db)
    
    # Validiere dass Kontakt zum User gehört
    try:
        result = db.table("contacts").select("id").eq(
            "id", payload.contact_id
        ).eq("user_id", current_user.id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Validieren des Kontakts: {str(e)}"
        )
    
    # Track Referral
    try:
        success = service.track_referral_request(
            contact_id=payload.contact_id,
            asked=payload.asked,
            result=payload.result,
            script_type=payload.script_type,
        )
        
        if success:
            return TrackReferralResponse(
                success=True,
                message="Referral-Request erfolgreich getrackt"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Fehler beim Speichern des Referral-Requests"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Tracking: {str(e)}"
        )

