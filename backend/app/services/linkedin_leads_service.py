"""
LinkedIn Lead Gen Forms Integration Service für SalesFlow AI

Empfängt Leads von LinkedIn Lead Gen Forms über Webhooks.

Setup-Anleitung:
1. LinkedIn Marketing Solutions Account
2. LinkedIn App erstellen (linkedin.com/developers)
3. Lead Gen Forms API Zugang beantragen
4. Webhook URL konfigurieren

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


class LinkedInLeadData(BaseModel):
    """Strukturierte Lead-Daten von LinkedIn"""
    lead_id: str
    form_id: str
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    creative_id: Optional[str] = None
    
    # Kontaktdaten
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    
    # Professional Info
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    seniority: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    
    # Location
    city: Optional[str] = None
    country: Optional[str] = None
    
    # LinkedIn Profile
    linkedin_url: Optional[str] = None
    linkedin_member_id: Optional[str] = None
    
    # Custom Fields
    custom_questions: Dict[str, str] = Field(default_factory=dict)
    
    # Timestamps
    submitted_at: Optional[str] = None
    
    # Raw Data
    raw_data: Dict = Field(default_factory=dict)


class LinkedInWebhookPayload(BaseModel):
    """LinkedIn Webhook Payload Struktur"""
    leadId: str
    formId: str
    formName: Optional[str] = None
    campaignId: Optional[str] = None
    campaignName: Optional[str] = None
    creativeId: Optional[str] = None
    submittedAt: Optional[int] = None  # Unix timestamp
    answers: List[Dict[str, Any]] = Field(default_factory=list)


class ProcessedLinkedInLead(BaseModel):
    """Verarbeiteter LinkedIn Lead für SalesFlow"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    source: str = "linkedin_lead_gen"
    source_lead_id: str
    source_form_id: str
    source_campaign: Optional[str] = None
    
    # Kontaktdaten
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    seniority: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    
    # Tracking
    campaign_name: Optional[str] = None
    form_name: Optional[str] = None
    
    # Meta
    created_at: datetime = Field(default_factory=datetime.utcnow)
    raw_data: Dict = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════
# SERVICE
# ═══════════════════════════════════════════════════════════════════════════════


class LinkedInLeadsService:
    """
    Service für LinkedIn Lead Gen Forms Integration.
    
    Features:
    - Webhook-Empfang & Validierung
    - Lead-Daten Parsing
    - Automatische Lead-Erstellung in SalesFlow
    - Form-Management
    """
    
    # LinkedIn Standard-Fragen zu Feld-Mapping
    STANDARD_QUESTIONS = {
        "firstName": "first_name",
        "lastName": "last_name",
        "emailAddress": "email",
        "phoneNumber": "phone",
        "companyName": "company_name",
        "jobTitle": "job_title",
        "city": "city",
        "country": "country",
        "linkedInUrl": "linkedin_url",
        "seniority": "seniority",
        "industry": "industry",
        "companySize": "company_size",
    }
    
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        access_token: str,
        webhook_secret: Optional[str] = None,
    ):
        """
        Initialisiert den LinkedIn Leads Service.
        
        Args:
            client_id: LinkedIn App Client ID
            client_secret: LinkedIn App Client Secret
            access_token: OAuth Access Token
            webhook_secret: Geheimer Schlüssel für Webhook-Validierung
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = access_token
        self.webhook_secret = webhook_secret
        self.api_version = "202401"
        self.base_url = "https://api.linkedin.com/rest"
        
        self._client = httpx.AsyncClient(timeout=30.0)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # WEBHOOK VALIDATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verifiziert die Webhook-Signatur von LinkedIn.
        
        Args:
            payload: Raw request body
            signature: X-LI-Signature Header
            
        Returns:
            True wenn Signatur gültig
        """
        if not self.webhook_secret or not signature:
            logger.warning("No webhook secret configured or no signature provided")
            return True  # Skip validation wenn kein Secret konfiguriert
        
        expected_signature = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LEAD PROCESSING
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def process_webhook_payload(
        self,
        payload: Dict,
    ) -> Optional[ProcessedLinkedInLead]:
        """
        Verarbeitet ein LinkedIn Lead Gen Webhook Payload.
        
        Args:
            payload: Raw webhook payload
            
        Returns:
            ProcessedLinkedInLead oder None bei Fehler
        """
        try:
            # Parse Webhook Payload
            webhook = LinkedInWebhookPayload(**payload)
            
            # Lead-Daten extrahieren
            lead_data = self._parse_answers(webhook.answers)
            lead_data.lead_id = webhook.leadId
            lead_data.form_id = webhook.formId
            lead_data.campaign_id = webhook.campaignId
            lead_data.campaign_name = webhook.campaignName
            lead_data.raw_data = payload
            
            if webhook.submittedAt:
                lead_data.submitted_at = datetime.fromtimestamp(
                    webhook.submittedAt / 1000
                ).isoformat()
            
            # Konvertieren zu SalesFlow Format
            processed = self._convert_to_salesflow_lead(lead_data, webhook.formName)
            
            logger.info(f"Processed LinkedIn lead: {webhook.leadId}")
            return processed
            
        except Exception as e:
            logger.exception(f"Error processing LinkedIn webhook: {e}")
            return None
    
    def _parse_answers(self, answers: List[Dict]) -> LinkedInLeadData:
        """Parsed die Antworten aus dem LinkedIn Formular."""
        lead = LinkedInLeadData(lead_id="", form_id="")
        
        for answer in answers:
            question_id = answer.get("questionId", "")
            question_type = answer.get("questionType", "")
            value = answer.get("answerDetails", {}).get("textAnswer", "")
            
            # Standard-Fragen mappen
            if question_id in self.STANDARD_QUESTIONS:
                field_name = self.STANDARD_QUESTIONS[question_id]
                setattr(lead, field_name, value)
            else:
                # Custom Questions
                question_text = answer.get("question", question_id)
                lead.custom_questions[question_text] = value
        
        # Full Name zusammensetzen
        if lead.first_name or lead.last_name:
            lead.full_name = f"{lead.first_name or ''} {lead.last_name or ''}".strip()
        
        return lead
    
    def _convert_to_salesflow_lead(
        self,
        li_lead: LinkedInLeadData,
        form_name: Optional[str] = None,
    ) -> ProcessedLinkedInLead:
        """Konvertiert LinkedIn Lead zu SalesFlow Lead Format."""
        
        # Location zusammenbauen
        location_parts = [li_lead.city, li_lead.country]
        location = ", ".join([p for p in location_parts if p])
        
        return ProcessedLinkedInLead(
            source="linkedin_lead_gen",
            source_lead_id=li_lead.lead_id,
            source_form_id=li_lead.form_id,
            source_campaign=li_lead.campaign_name,
            name=li_lead.full_name or f"{li_lead.first_name or ''} {li_lead.last_name or ''}".strip() or "LinkedIn Lead",
            email=li_lead.email,
            phone=li_lead.phone,
            company=li_lead.company_name,
            job_title=li_lead.job_title,
            seniority=li_lead.seniority,
            industry=li_lead.industry,
            location=location or None,
            linkedin_url=li_lead.linkedin_url,
            campaign_name=li_lead.campaign_name,
            form_name=form_name,
            raw_data={
                "linkedin_lead_id": li_lead.lead_id,
                "form_id": li_lead.form_id,
                "submitted_at": li_lead.submitted_at,
                "custom_questions": li_lead.custom_questions,
            }
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # API CALLS (für erweiterte Features)
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def get_lead_by_id(self, lead_id: str) -> Optional[LinkedInLeadData]:
        """
        Ruft Lead-Details von der LinkedIn API ab.
        
        Args:
            lead_id: LinkedIn Lead ID (URN format)
            
        Returns:
            LinkedInLeadData oder None bei Fehler
        """
        try:
            # URN Format: urn:li:leadGenResponse:123456
            if not lead_id.startswith("urn:"):
                lead_id = f"urn:li:leadGenResponse:{lead_id}"
            
            url = f"{self.base_url}/leadGenResponses/{lead_id}"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "LinkedIn-Version": self.api_version,
                "X-Restli-Protocol-Version": "2.0.0",
            }
            
            response = await self._client.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            return self._parse_api_response(data)
            
        except httpx.HTTPError as e:
            logger.error(f"Error fetching LinkedIn lead: {e}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            return None
    
    def _parse_api_response(self, data: Dict) -> LinkedInLeadData:
        """Parsed API Response in LinkedInLeadData."""
        lead = LinkedInLeadData(
            lead_id=data.get("id", ""),
            form_id=data.get("leadGenFormId", ""),
            submitted_at=data.get("submittedAt"),
            raw_data=data,
        )
        
        # Antworten parsen
        for answer in data.get("answers", []):
            question_id = answer.get("question", "")
            value = answer.get("answer", "")
            
            if question_id in self.STANDARD_QUESTIONS:
                field_name = self.STANDARD_QUESTIONS[question_id]
                setattr(lead, field_name, value)
            else:
                lead.custom_questions[question_id] = value
        
        if lead.first_name or lead.last_name:
            lead.full_name = f"{lead.first_name or ''} {lead.last_name or ''}".strip()
        
        return lead
    
    async def get_forms(self, account_id: str) -> List[Dict]:
        """
        Ruft alle Lead Gen Forms eines Accounts ab.
        
        Args:
            account_id: LinkedIn Ad Account ID
            
        Returns:
            Liste von Forms
        """
        try:
            url = f"{self.base_url}/adAccounts/{account_id}/leadGenForms"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "LinkedIn-Version": self.api_version,
                "X-Restli-Protocol-Version": "2.0.0",
            }
            
            response = await self._client.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            return data.get("elements", [])
            
        except Exception as e:
            logger.error(f"Error fetching LinkedIn forms: {e}")
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


def create_linkedin_leads_service(
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    access_token: Optional[str] = None,
    webhook_secret: Optional[str] = None,
) -> LinkedInLeadsService:
    """
    Factory für LinkedIn Leads Service.
    
    Lädt Credentials aus Environment wenn nicht angegeben.
    """
    import os
    
    return LinkedInLeadsService(
        client_id=client_id or os.getenv("LINKEDIN_CLIENT_ID", ""),
        client_secret=client_secret or os.getenv("LINKEDIN_CLIENT_SECRET", ""),
        access_token=access_token or os.getenv("LINKEDIN_ACCESS_TOKEN", ""),
        webhook_secret=webhook_secret or os.getenv("LINKEDIN_WEBHOOK_SECRET"),
    )


__all__ = [
    "LinkedInLeadsService",
    "create_linkedin_leads_service",
    "LinkedInLeadData",
    "ProcessedLinkedInLead",
    "LinkedInWebhookPayload",
]

