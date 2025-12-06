"""
Facebook Lead Ads Integration Service für SalesFlow AI

Empfängt Leads von Facebook Lead Ads über Webhooks und verarbeitet sie.

Setup-Anleitung:
1. Facebook Business Account erstellen
2. Meta App erstellen (developers.facebook.com)
3. Webhooks konfigurieren
4. Lead Access anfordern

@author SalesFlow AI
@version 1.0.0
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════


class FacebookLeadField(BaseModel):
    """Ein Feld aus dem Facebook Lead Formular"""
    name: str
    values: List[str]


class FacebookLeadData(BaseModel):
    """Strukturierte Lead-Daten von Facebook"""
    lead_id: str
    form_id: str
    page_id: str
    created_time: str
    ad_id: Optional[str] = None
    ad_name: Optional[str] = None
    adset_id: Optional[str] = None
    adset_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    
    # Extrahierte Felder
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    
    # Custom Fields
    custom_fields: Dict[str, str] = Field(default_factory=dict)
    
    # Raw Data
    raw_field_data: List[Dict] = Field(default_factory=list)


class FacebookWebhookEvent(BaseModel):
    """Facebook Webhook Event Struktur"""
    object: str
    entry: List[Dict[str, Any]]


class ProcessedLead(BaseModel):
    """Verarbeiteter Lead für SalesFlow"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    source: str = "facebook_lead_ads"
    source_lead_id: str
    source_form_id: str
    source_campaign: Optional[str] = None
    
    # Kontaktdaten
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    
    # Tracking
    ad_campaign: Optional[str] = None
    ad_set: Optional[str] = None
    ad_name: Optional[str] = None
    
    # Meta
    created_at: datetime = Field(default_factory=datetime.utcnow)
    raw_data: Dict = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════
# SERVICE
# ═══════════════════════════════════════════════════════════════════════════════


class FacebookLeadsService:
    """
    Service für Facebook Lead Ads Integration.
    
    Features:
    - Webhook-Verifizierung
    - Lead-Daten abrufen
    - Lead-Parsing & Normalisierung
    - Automatische Lead-Erstellung in SalesFlow
    """
    
    # Standard-Feld-Mapping von Facebook zu SalesFlow
    FIELD_MAPPING = {
        "email": "email",
        "phone_number": "phone",
        "full_name": "full_name",
        "first_name": "first_name",
        "last_name": "last_name",
        "company_name": "company_name",
        "job_title": "job_title",
        "city": "city",
        "state": "state",
        "country": "country",
        "zip_code": "zip_code",
        "street_address": "address",
    }
    
    def __init__(
        self,
        app_secret: str,
        access_token: str,
        verify_token: str,
        page_id: Optional[str] = None,
    ):
        """
        Initialisiert den Facebook Leads Service.
        
        Args:
            app_secret: Facebook App Secret (für Webhook-Verifizierung)
            access_token: Page Access Token (für Lead-Daten abrufen)
            verify_token: Dein selbst gewähltes Verify Token
            page_id: Optional - Facebook Page ID
        """
        self.app_secret = app_secret
        self.access_token = access_token
        self.verify_token = verify_token
        self.page_id = page_id
        self.api_version = "v18.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        
        self._client = httpx.AsyncClient(timeout=30.0)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # WEBHOOK VERIFICATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verifiziert die Webhook-Signatur von Facebook.
        
        Args:
            payload: Raw request body
            signature: X-Hub-Signature-256 Header
            
        Returns:
            True wenn Signatur gültig
        """
        if not signature or not signature.startswith("sha256="):
            return False
        
        expected_signature = hmac.new(
            self.app_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        received_signature = signature[7:]  # Remove "sha256=" prefix
        
        return hmac.compare_digest(expected_signature, received_signature)
    
    def verify_webhook_challenge(
        self,
        mode: str,
        token: str,
        challenge: str,
    ) -> Optional[str]:
        """
        Verifiziert den Webhook-Challenge von Facebook.
        
        Args:
            mode: hub.mode Parameter
            token: hub.verify_token Parameter
            challenge: hub.challenge Parameter
            
        Returns:
            Challenge string wenn erfolgreich, None sonst
        """
        if mode == "subscribe" and token == self.verify_token:
            logger.info("Facebook webhook verification successful")
            return challenge
        
        logger.warning(f"Facebook webhook verification failed: mode={mode}")
        return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LEAD DATA RETRIEVAL
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def get_lead_data(self, lead_id: str) -> Optional[FacebookLeadData]:
        """
        Ruft vollständige Lead-Daten von der Facebook Graph API ab.
        
        Args:
            lead_id: Facebook Lead ID
            
        Returns:
            FacebookLeadData oder None bei Fehler
        """
        try:
            url = f"{self.base_url}/{lead_id}"
            params = {
                "access_token": self.access_token,
                "fields": "id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id"
            }
            
            response = await self._client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            return self._parse_lead_data(data)
            
        except httpx.HTTPError as e:
            logger.error(f"Error fetching lead data: {e}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error fetching lead: {e}")
            return None
    
    def _parse_lead_data(self, raw_data: Dict) -> FacebookLeadData:
        """Parsed rohe Facebook-Daten in strukturiertes Format."""
        lead = FacebookLeadData(
            lead_id=raw_data.get("id", ""),
            form_id=raw_data.get("form_id", ""),
            page_id=self.page_id or "",
            created_time=raw_data.get("created_time", ""),
            ad_id=raw_data.get("ad_id"),
            ad_name=raw_data.get("ad_name"),
            adset_id=raw_data.get("adset_id"),
            adset_name=raw_data.get("adset_name"),
            campaign_id=raw_data.get("campaign_id"),
            campaign_name=raw_data.get("campaign_name"),
            raw_field_data=raw_data.get("field_data", []),
        )
        
        # Parse field_data
        for field in raw_data.get("field_data", []):
            name = field.get("name", "").lower()
            values = field.get("values", [])
            value = values[0] if values else ""
            
            # Standard-Felder mappen
            if name in self.FIELD_MAPPING:
                mapped_name = self.FIELD_MAPPING[name]
                setattr(lead, mapped_name, value)
            else:
                # Custom Fields
                lead.custom_fields[name] = value
        
        # Full name aus first/last zusammensetzen falls nötig
        if not lead.full_name and (lead.first_name or lead.last_name):
            lead.full_name = f"{lead.first_name or ''} {lead.last_name or ''}".strip()
        
        return lead
    
    # ═══════════════════════════════════════════════════════════════════════════
    # WEBHOOK EVENT PROCESSING
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def process_webhook_event(
        self,
        event_data: Dict,
    ) -> List[ProcessedLead]:
        """
        Verarbeitet ein Facebook Webhook Event.
        
        Args:
            event_data: Raw webhook payload
            
        Returns:
            Liste von verarbeiteten Leads
        """
        processed_leads = []
        
        try:
            # Validiere Event-Struktur
            if event_data.get("object") != "page":
                logger.debug(f"Ignoring non-page event: {event_data.get('object')}")
                return []
            
            entries = event_data.get("entry", [])
            
            for entry in entries:
                changes = entry.get("changes", [])
                
                for change in changes:
                    if change.get("field") == "leadgen":
                        lead_data = change.get("value", {})
                        lead_id = lead_data.get("leadgen_id")
                        
                        if lead_id:
                            # Vollständige Lead-Daten abrufen
                            full_lead = await self.get_lead_data(lead_id)
                            
                            if full_lead:
                                processed = self._convert_to_salesflow_lead(full_lead)
                                processed_leads.append(processed)
                                logger.info(f"Processed Facebook lead: {lead_id}")
            
            return processed_leads
            
        except Exception as e:
            logger.exception(f"Error processing webhook event: {e}")
            return []
    
    def _convert_to_salesflow_lead(self, fb_lead: FacebookLeadData) -> ProcessedLead:
        """Konvertiert Facebook Lead zu SalesFlow Lead Format."""
        
        # Location zusammenbauen
        location_parts = [
            fb_lead.city,
            fb_lead.state,
            fb_lead.country,
        ]
        location = ", ".join([p for p in location_parts if p])
        
        return ProcessedLead(
            source="facebook_lead_ads",
            source_lead_id=fb_lead.lead_id,
            source_form_id=fb_lead.form_id,
            source_campaign=fb_lead.campaign_name,
            name=fb_lead.full_name or f"{fb_lead.first_name or ''} {fb_lead.last_name or ''}".strip() or "Unbekannt",
            email=fb_lead.email,
            phone=fb_lead.phone,
            company=fb_lead.company_name,
            job_title=fb_lead.job_title,
            location=location or None,
            ad_campaign=fb_lead.campaign_name,
            ad_set=fb_lead.adset_name,
            ad_name=fb_lead.ad_name,
            raw_data={
                "facebook_lead_id": fb_lead.lead_id,
                "form_id": fb_lead.form_id,
                "created_time": fb_lead.created_time,
                "custom_fields": fb_lead.custom_fields,
            }
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FORM MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def get_page_forms(self) -> List[Dict]:
        """
        Ruft alle Lead Forms einer Page ab.
        
        Returns:
            Liste von Forms mit ID und Name
        """
        if not self.page_id:
            logger.warning("No page_id configured")
            return []
        
        try:
            url = f"{self.base_url}/{self.page_id}/leadgen_forms"
            params = {
                "access_token": self.access_token,
                "fields": "id,name,status,created_time"
            }
            
            response = await self._client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            return data.get("data", [])
            
        except Exception as e:
            logger.error(f"Error fetching page forms: {e}")
            return []
    
    async def get_form_leads(
        self,
        form_id: str,
        limit: int = 50,
    ) -> List[FacebookLeadData]:
        """
        Ruft alle Leads eines Formulars ab.
        
        Args:
            form_id: Facebook Form ID
            limit: Max. Anzahl Leads
            
        Returns:
            Liste von Leads
        """
        try:
            url = f"{self.base_url}/{form_id}/leads"
            params = {
                "access_token": self.access_token,
                "limit": limit,
            }
            
            response = await self._client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            leads = []
            
            for lead_data in data.get("data", []):
                lead = self._parse_lead_data(lead_data)
                lead.form_id = form_id
                leads.append(lead)
            
            return leads
            
        except Exception as e:
            logger.error(f"Error fetching form leads: {e}")
            return []
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLEANUP
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def close(self):
        """Schließt den HTTP Client."""
        await self._client.aclose()


# ═══════════════════════════════════════════════════════════════════════════════
# FACTORY FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════


def create_facebook_leads_service(
    app_secret: Optional[str] = None,
    access_token: Optional[str] = None,
    verify_token: Optional[str] = None,
    page_id: Optional[str] = None,
) -> FacebookLeadsService:
    """
    Factory für Facebook Leads Service.
    
    Lädt Credentials aus Environment wenn nicht angegeben.
    """
    import os
    
    return FacebookLeadsService(
        app_secret=app_secret or os.getenv("FACEBOOK_APP_SECRET", ""),
        access_token=access_token or os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", ""),
        verify_token=verify_token or os.getenv("FACEBOOK_WEBHOOK_VERIFY_TOKEN", "salesflow_fb_verify"),
        page_id=page_id or os.getenv("FACEBOOK_PAGE_ID"),
    )


__all__ = [
    "FacebookLeadsService",
    "create_facebook_leads_service",
    "FacebookLeadData",
    "ProcessedLead",
    "FacebookWebhookEvent",
]

