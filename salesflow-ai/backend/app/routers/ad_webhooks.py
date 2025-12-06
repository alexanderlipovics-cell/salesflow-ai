"""
Ad Platform Webhooks Router für SalesFlow AI

Empfängt Leads von:
- Facebook Lead Ads
- LinkedIn Lead Gen Forms
- Instagram Lead Ads (via Meta)
- TikTok Lead Ads (vorbereitet)

@author SalesFlow AI
@version 1.0.0
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Request, Response, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field

from ..supabase_client import get_supabase_client
from ..services.facebook_leads_service import (
    create_facebook_leads_service,
    FacebookLeadsService,
    ProcessedLead as FacebookProcessedLead,
)
from ..services.linkedin_leads_service import (
    create_linkedin_leads_service,
    LinkedInLeadsService,
    ProcessedLinkedInLead,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/ads", tags=["Ad Platform Webhooks"])


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════


class WebhookResponse(BaseModel):
    """Standard Webhook Response"""
    success: bool
    message: str
    leads_processed: int = 0
    lead_ids: list = Field(default_factory=list)


class LeadCreatedResponse(BaseModel):
    """Response wenn Lead erstellt wurde"""
    success: bool
    lead_id: str
    source: str
    name: str
    email: Optional[str] = None
    created_at: str


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════


async def save_lead_to_database(
    lead_data: Dict,
    source: str,
    user_id: Optional[str] = None,
) -> Optional[str]:
    """
    Speichert einen Lead in der Supabase Datenbank.
    
    Args:
        lead_data: Lead-Daten Dictionary
        source: Quelle des Leads (facebook_lead_ads, linkedin_lead_gen, etc.)
        user_id: Optional - User dem der Lead zugewiesen werden soll
        
    Returns:
        Lead ID oder None bei Fehler
    """
    try:
        db = get_supabase_client()
        
        # Lead-Daten für DB vorbereiten
        lead_record = {
            "id": str(uuid4()),
            "name": lead_data.get("name", "Unbekannt"),
            "email": lead_data.get("email"),
            "phone": lead_data.get("phone"),
            "company": lead_data.get("company"),
            "status": "NEW",
            "source": source,
            "temperature": 80,  # Hot Lead von Ads
            "needs_action": True,
            "notes": f"Lead von {source}. Kampagne: {lead_data.get('campaign_name', 'N/A')}",
            "created_at": datetime.utcnow().isoformat(),
            "metadata": {
                "source_lead_id": lead_data.get("source_lead_id"),
                "source_form_id": lead_data.get("source_form_id"),
                "campaign": lead_data.get("campaign_name") or lead_data.get("ad_campaign"),
                "job_title": lead_data.get("job_title"),
                "location": lead_data.get("location"),
                "linkedin_url": lead_data.get("linkedin_url"),
                "raw_data": lead_data.get("raw_data", {}),
            }
        }
        
        # Wenn user_id vorhanden, zuweisen
        if user_id:
            lead_record["owner_id"] = user_id
        
        # In DB speichern
        result = db.table("leads").insert(lead_record).execute()
        
        if result.data:
            lead_id = result.data[0]["id"]
            logger.info(f"Lead saved to database: {lead_id} from {source}")
            return lead_id
        
        return None
        
    except Exception as e:
        logger.exception(f"Error saving lead to database: {e}")
        return None


async def trigger_lead_processing(lead_id: str):
    """
    Triggert weitere Lead-Verarbeitung (P-Score, Autopilot, etc.)
    
    Args:
        lead_id: ID des neuen Leads
    """
    try:
        db = get_supabase_client()
        
        # TODO: P-Score berechnen
        # TODO: Autopilot-Sequenz starten wenn aktiviert
        # TODO: Notification an User senden
        
        logger.info(f"Lead processing triggered for: {lead_id}")
        
    except Exception as e:
        logger.error(f"Error triggering lead processing: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# FACEBOOK WEBHOOKS
# ═══════════════════════════════════════════════════════════════════════════════


@router.get(
    "/facebook",
    summary="Facebook Webhook Verification",
    description="Endpoint für Facebook Webhook Verification Challenge",
)
async def facebook_webhook_verify(
    request: Request,
):
    """
    Facebook ruft diesen Endpoint auf um den Webhook zu verifizieren.
    
    Query Parameters:
    - hub.mode: "subscribe"
    - hub.verify_token: Dein Verify Token
    - hub.challenge: Challenge String zum Zurückgeben
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    service = create_facebook_leads_service()
    
    result = service.verify_webhook_challenge(mode, token, challenge)
    
    if result:
        return Response(content=result, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post(
    "/facebook",
    response_model=WebhookResponse,
    summary="Facebook Lead Ads Webhook",
    description="""
    Empfängt neue Leads von Facebook Lead Ads.
    
    **So funktioniert es:**
    1. User füllt Lead Form auf Facebook aus
    2. Facebook sendet Webhook an diesen Endpoint
    3. SalesFlow speichert Lead und startet Verarbeitung
    
    **Konfiguration:**
    1. Meta App erstellen
    2. Webhooks aktivieren
    3. "leadgen" Event abonnieren
    4. Diese URL als Webhook URL eintragen
    """,
)
async def facebook_webhook_receive(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """Empfängt Facebook Lead Ads Webhooks."""
    
    # Raw Body für Signatur-Validierung
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    
    service = create_facebook_leads_service()
    
    # Signatur validieren (wenn App Secret konfiguriert)
    if service.app_secret and not service.verify_webhook_signature(body, signature):
        logger.warning("Invalid Facebook webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        # Payload parsen
        payload = await request.json()
        
        # Leads verarbeiten
        processed_leads = await service.process_webhook_event(payload)
        
        lead_ids = []
        for lead in processed_leads:
            # In DB speichern
            lead_id = await save_lead_to_database(
                lead_data=lead.dict(),
                source="facebook_lead_ads",
            )
            
            if lead_id:
                lead_ids.append(lead_id)
                # Weitere Verarbeitung im Hintergrund
                background_tasks.add_task(trigger_lead_processing, lead_id)
        
        return WebhookResponse(
            success=True,
            message=f"Processed {len(lead_ids)} leads from Facebook",
            leads_processed=len(lead_ids),
            lead_ids=lead_ids,
        )
        
    except Exception as e:
        logger.exception(f"Error processing Facebook webhook: {e}")
        # Trotzdem 200 zurückgeben damit Facebook nicht retry'd
        return WebhookResponse(
            success=False,
            message=f"Error: {str(e)}",
            leads_processed=0,
        )


@router.get(
    "/facebook/forms",
    summary="Facebook Lead Forms abrufen",
    description="Ruft alle Lead Forms einer Facebook Page ab",
)
async def get_facebook_forms():
    """Ruft alle konfigurierten Facebook Lead Forms ab."""
    service = create_facebook_leads_service()
    
    if not service.page_id:
        raise HTTPException(
            status_code=400,
            detail="FACEBOOK_PAGE_ID nicht konfiguriert"
        )
    
    forms = await service.get_page_forms()
    return {"forms": forms}


@router.get(
    "/facebook/forms/{form_id}/leads",
    summary="Leads eines Facebook Forms abrufen",
    description="Ruft alle Leads eines spezifischen Facebook Lead Forms ab",
)
async def get_facebook_form_leads(
    form_id: str,
    limit: int = Query(50, ge=1, le=500),
):
    """Ruft Leads eines Facebook Forms ab."""
    service = create_facebook_leads_service()
    leads = await service.get_form_leads(form_id, limit)
    
    return {
        "form_id": form_id,
        "count": len(leads),
        "leads": [lead.dict() for lead in leads],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LINKEDIN WEBHOOKS
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/linkedin",
    response_model=WebhookResponse,
    summary="LinkedIn Lead Gen Forms Webhook",
    description="""
    Empfängt neue Leads von LinkedIn Lead Gen Forms.
    
    **So funktioniert es:**
    1. User füllt Lead Gen Form auf LinkedIn aus
    2. LinkedIn sendet Webhook an diesen Endpoint
    3. SalesFlow speichert Lead und startet Verarbeitung
    
    **Konfiguration:**
    1. LinkedIn Marketing Solutions Account
    2. App erstellen mit Lead Gen API Zugang
    3. Webhook URL konfigurieren
    """,
)
async def linkedin_webhook_receive(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """Empfängt LinkedIn Lead Gen Webhooks."""
    
    body = await request.body()
    signature = request.headers.get("X-LI-Signature", "")
    
    service = create_linkedin_leads_service()
    
    # Signatur validieren
    if not service.verify_webhook_signature(body, signature):
        logger.warning("Invalid LinkedIn webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        payload = await request.json()
        
        # Lead verarbeiten
        processed_lead = await service.process_webhook_payload(payload)
        
        if processed_lead:
            # In DB speichern
            lead_id = await save_lead_to_database(
                lead_data=processed_lead.dict(),
                source="linkedin_lead_gen",
            )
            
            if lead_id:
                background_tasks.add_task(trigger_lead_processing, lead_id)
                
                return WebhookResponse(
                    success=True,
                    message="LinkedIn lead processed successfully",
                    leads_processed=1,
                    lead_ids=[lead_id],
                )
        
        return WebhookResponse(
            success=False,
            message="Could not process LinkedIn lead",
            leads_processed=0,
        )
        
    except Exception as e:
        logger.exception(f"Error processing LinkedIn webhook: {e}")
        return WebhookResponse(
            success=False,
            message=f"Error: {str(e)}",
            leads_processed=0,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# INSTAGRAM WEBHOOKS (via Meta/Facebook)
# ═══════════════════════════════════════════════════════════════════════════════


@router.get(
    "/instagram",
    summary="Instagram Webhook Verification",
    description="Endpoint für Instagram/Meta Webhook Verification",
)
async def instagram_webhook_verify(request: Request):
    """
    Instagram nutzt das gleiche System wie Facebook.
    Webhook Verification funktioniert identisch.
    """
    # Nutzt den gleichen Verify Token wie Facebook
    return await facebook_webhook_verify(request)


@router.post(
    "/instagram",
    response_model=WebhookResponse,
    summary="Instagram Lead Ads Webhook",
    description="""
    Empfängt neue Leads von Instagram Lead Ads.
    
    **Hinweis:** Instagram Lead Ads nutzen die Meta/Facebook Infrastruktur.
    Die Webhooks sind identisch zu Facebook Lead Ads.
    
    **Konfiguration:**
    1. Meta Business Suite Account
    2. Instagram Business Account verbinden
    3. Lead Ads über Meta Ads Manager schalten
    """,
)
async def instagram_webhook_receive(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Empfängt Instagram Lead Ads Webhooks.
    Nutzt intern den Facebook Service da Meta die gleiche API verwendet.
    """
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    
    service = create_facebook_leads_service()
    
    if service.app_secret and not service.verify_webhook_signature(body, signature):
        logger.warning("Invalid Instagram webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        payload = await request.json()
        
        # Instagram Leads werden wie Facebook Leads verarbeitet
        processed_leads = await service.process_webhook_event(payload)
        
        lead_ids = []
        for lead in processed_leads:
            lead_data = lead.dict()
            lead_data["source"] = "instagram_lead_ads"  # Override source
            
            lead_id = await save_lead_to_database(
                lead_data=lead_data,
                source="instagram_lead_ads",
            )
            
            if lead_id:
                lead_ids.append(lead_id)
                background_tasks.add_task(trigger_lead_processing, lead_id)
        
        return WebhookResponse(
            success=True,
            message=f"Processed {len(lead_ids)} leads from Instagram",
            leads_processed=len(lead_ids),
            lead_ids=lead_ids,
        )
        
    except Exception as e:
        logger.exception(f"Error processing Instagram webhook: {e}")
        return WebhookResponse(
            success=False,
            message=f"Error: {str(e)}",
            leads_processed=0,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TIKTOK WEBHOOKS (Vorbereitet)
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/tiktok",
    response_model=WebhookResponse,
    summary="TikTok Lead Ads Webhook (Coming Soon)",
    description="""
    **Coming Soon!**
    
    TikTok Lead Ads Integration wird vorbereitet.
    
    Benötigt:
    - TikTok for Business Account
    - TikTok Marketing API Zugang
    """,
)
async def tiktok_webhook_receive(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """TikTok Lead Ads Webhook - Coming Soon."""
    
    logger.info("TikTok webhook received - not yet implemented")
    
    return WebhookResponse(
        success=False,
        message="TikTok integration coming soon",
        leads_processed=0,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# WEB FORM WEBHOOK
# ═══════════════════════════════════════════════════════════════════════════════


class WebFormSubmission(BaseModel):
    """Web Form Submission Payload"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    message: Optional[str] = None
    source_url: Optional[str] = None
    form_id: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


@router.post(
    "/webform",
    response_model=LeadCreatedResponse,
    summary="Web Form Lead Webhook",
    description="""
    Empfängt Leads von eigenen Web-Formularen.
    
    **Embed-Code für deine Website:**
    ```html
    <form action="https://your-backend.com/api/webhooks/ads/webform" method="POST">
        <input type="text" name="name" required />
        <input type="email" name="email" required />
        <input type="tel" name="phone" />
        <button type="submit">Absenden</button>
    </form>
    ```
    
    **Oder via JavaScript:**
    ```javascript
    fetch('https://your-backend.com/api/webhooks/ads/webform', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            name: 'Max Mustermann',
            email: 'max@example.com',
            phone: '+49123456789'
        })
    });
    ```
    """,
)
async def webform_webhook_receive(
    submission: WebFormSubmission,
    background_tasks: BackgroundTasks,
):
    """Empfängt Leads von Web-Formularen."""
    
    try:
        # Lead-Daten vorbereiten
        lead_data = {
            "name": submission.name,
            "email": submission.email,
            "phone": submission.phone,
            "company": submission.company,
            "source_lead_id": submission.form_id or str(uuid4()),
            "source_form_id": submission.form_id,
            "campaign_name": submission.utm_campaign,
            "raw_data": {
                "message": submission.message,
                "source_url": submission.source_url,
                "utm_source": submission.utm_source,
                "utm_medium": submission.utm_medium,
                "utm_campaign": submission.utm_campaign,
                "custom_fields": submission.custom_fields,
            }
        }
        
        lead_id = await save_lead_to_database(
            lead_data=lead_data,
            source="web_form",
        )
        
        if lead_id:
            background_tasks.add_task(trigger_lead_processing, lead_id)
            
            return LeadCreatedResponse(
                success=True,
                lead_id=lead_id,
                source="web_form",
                name=submission.name,
                email=submission.email,
                created_at=datetime.utcnow().isoformat(),
            )
        
        raise HTTPException(status_code=500, detail="Could not save lead")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error processing web form: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# STATUS & HEALTH
# ═══════════════════════════════════════════════════════════════════════════════


@router.get(
    "/status",
    summary="Webhook Status",
    description="Zeigt den Status aller konfigurierten Webhooks",
)
async def get_webhook_status():
    """Gibt den Status aller Webhook-Integrationen zurück."""
    import os
    
    return {
        "webhooks": {
            "facebook": {
                "configured": bool(os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")),
                "page_id": os.getenv("FACEBOOK_PAGE_ID", "Not configured"),
                "webhook_url": "/api/webhooks/ads/facebook",
            },
            "linkedin": {
                "configured": bool(os.getenv("LINKEDIN_ACCESS_TOKEN")),
                "webhook_url": "/api/webhooks/ads/linkedin",
            },
            "instagram": {
                "configured": bool(os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")),
                "webhook_url": "/api/webhooks/ads/instagram",
                "note": "Uses same credentials as Facebook",
            },
            "tiktok": {
                "configured": False,
                "webhook_url": "/api/webhooks/ads/tiktok",
                "status": "Coming Soon",
            },
            "webform": {
                "configured": True,
                "webhook_url": "/api/webhooks/ads/webform",
            },
        },
        "total_configured": sum([
            bool(os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")),
            bool(os.getenv("LINKEDIN_ACCESS_TOKEN")),
            True,  # webform always available
        ]),
    }


__all__ = ["router"]

