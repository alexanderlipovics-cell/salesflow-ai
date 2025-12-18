from __future__ import annotations

import logging
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.webhook_security import (
    verify_facebook_signature,
    enforce_rate_limit,
    enforce_ip_whitelist,
)

# Import Lead models
from app.db.repositories.leads import Lead  # type: ignore

# Stub models for lead processing (will be replaced when proper models exist)
class LeadIntent:
    def __init__(self, lead_id, source, p_score, i_score, e_score, message, created_at):
        self.lead_id = lead_id
        self.source = source
        self.p_score = p_score
        self.i_score = i_score
        self.e_score = e_score
        self.message = message
        self.created_at = created_at

class LeadEnrichment:
    def __init__(self, lead_id, company, job_title, industry, raw, created_at):
        self.lead_id = lead_id
        self.company = company
        self.job_title = job_title
        self.industry = industry
        self.raw = raw
        self.created_at = created_at

class LeadVerification:
    def __init__(self, lead_id, email, phone, email_verified, phone_verified, created_at):
        self.lead_id = lead_id
        self.email = email
        self.phone = phone
        self.email_verified = email_verified
        self.phone_verified = phone_verified
        self.created_at = created_at

logger = logging.getLogger(__name__)

LeadSource = Literal["facebook", "linkedin", "instagram"]

class IngestedLead(BaseModel):
    source: LeadSource
    external_id: str
    campaign_name: Optional[str] = None
    form_name: Optional[str] = None
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    message: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    industry: Optional[str] = None
    raw_payload: dict
    received_at: datetime

class NotificationService:
    """
    Platzhalter-Notification-System.
    Später via E-Mail, Slack, In-App Notifications erweiterbar.
    """

    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__ + ".notifications")

    def notify_new_lead(
        self,
        lead: Lead,
        p_score: int,
        i_score: int,
        e_score: int,
    ) -> None:
        self.logger.info(
            "New lead created id=%s source=%s P/I/E=%s/%s/%s",
            getattr(lead, "id", None),
            getattr(lead, "source", None),
            p_score,
            i_score,
            e_score,
        )

    def notify_duplicate_lead(
        self,
        lead: Lead,
        p_score: int,
        i_score: int,
        e_score: int,
    ) -> None:
        self.logger.info(
            "Duplicate lead updated id=%s source=%s P/I/E=%s/%s/%s",
            getattr(lead, "id", None),
            getattr(lead, "source", None),
            p_score,
            i_score,
            e_score,
        )

class LeadProcessingService:
    """
    Verantwortlich für:
    - Duplikat-Erkennung & Merging
    - Lead-Erstellung / Update
    - P/I/E-Scoring
    - Enrichment
    - Verifikations-Stubs
    - Auto-Assignment zu Owner
    - Notifications
    """

    def __init__(
        self,
        db: Session,
        owner_id: Optional[str] = None,
        notification_service: Optional[NotificationService] = None,
    ) -> None:
        self.db = db
        self._owner_id = owner_id
        self.notification_service = notification_service or NotificationService()

    # ---------- Public API ----------

    def process_ingested_lead(self, data: IngestedLead) -> Lead:
        logger.info(
            "Processing ingested lead: source=%s external_id=%s",
            data.source,
            data.external_id,
        )

        lead = self._find_existing_lead(data)
        is_new = False
        if lead is None:
            lead = self._create_new_lead(data)
            is_new = True
        else:
            lead = self._update_existing_lead(lead, data)

        p_score, i_score, e_score = self._calculate_scores(data, lead=lead)

        self._store_intent(lead, data, p_score, i_score, e_score)
        self._store_enrichment(lead, data)
        self._store_verification_stub(lead, data)

        self.db.commit()
        self.db.refresh(lead)

        # Notification-System
        if is_new:
            self.notification_service.notify_new_lead(lead, p_score, i_score, e_score)
        else:
            self.notification_service.notify_duplicate_lead(
                lead, p_score, i_score, e_score
            )

        return lead

    # ---------- Core Steps ----------

    def _resolve_owner_id(self, data: IngestedLead) -> Optional[str]:
        """
        Auto-Assignment:
        - Wenn ein owner_id extern übergeben wurde, nutze diese.
        - Sonst fallback auf DEFAULT_LEAD_OWNER_ID aus Settings.
        """
        if self._owner_id:
            return self._owner_id
        return settings.DEFAULT_LEAD_OWNER_ID

    def _find_existing_lead(self, data: IngestedLead) -> Optional[Lead]:
        query = self.db.query(Lead)

        if data.external_id:
            lead = query.filter(Lead.external_id == data.external_id).first()
            if lead:
                return lead

        if data.email:
            lead = query.filter(Lead.email == str(data.email)).first()
            if lead:
                return lead

        if data.phone:
            lead = query.filter(Lead.phone == data.phone).first()
            if lead:
                return lead

        return None

    def _create_new_lead(self, data: IngestedLead) -> Lead:
        logger.info("Creating new lead from %s", data.source)

        full_name = data.full_name or " ".join(
            [p for p in [data.first_name, data.last_name] if p]
        ).strip() or None

        owner_id = self._resolve_owner_id(data)

        lead = Lead(
            source=data.source,
            external_id=data.external_id,
            email=str(data.email) if data.email else None,
            phone=data.phone,
            full_name=full_name,
            company=data.company,
            job_title=data.job_title,
            industry=data.industry,
            owner_id=owner_id,
            created_at=data.received_at,
            updated_at=data.received_at,
            status="new",  # TODO: ggf. ans echte Enum anpassen
            last_activity_at=data.received_at,
            raw_payload=data.raw_payload,  # braucht JSON-Feld in Model
        )

        self.db.add(lead)
        return lead

    def _update_existing_lead(self, lead: Lead, data: IngestedLead) -> Lead:
        logger.info("Updating existing lead id=%s", getattr(lead, "id", None))

        if data.email and not lead.email:
            lead.email = str(data.email)

        if data.phone and not lead.phone:
            lead.phone = data.phone

        if data.full_name and not getattr(lead, "full_name", None):
            lead.full_name = data.full_name

        if data.company and not getattr(lead, "company", None):
            lead.company = data.company

        if data.job_title and not getattr(lead, "job_title", None):
            lead.job_title = data.job_title

        if data.industry and not getattr(lead, "industry", None):
            lead.industry = data.industry

        lead.last_activity_at = data.received_at
        lead.updated_at = data.received_at

        return lead

    # ---------- Scoring / Enrichment / Intent ----------

    def _calculate_scores(
        self,
        data: IngestedLead,
        lead: Lead,
    ) -> tuple[int, int, int]:
        """
        P-Score (Potential), I-Score (Intent), E-Score (Engagement).
        Heuristik – später durch ML/AI ersetzbar.
        """
        p_score = 50
        i_score = 30
        e_score = 20

        if data.company:
            p_score += 10

        if data.job_title:
            p_score += 10

        if data.source == "linkedin":
            i_score += 10

        if data.message:
            msg_lower = data.message.lower()
            if any(k in msg_lower for k in ["angebot", "preis", "kosten", "paket"]):
                i_score += 20
            if any(k in msg_lower for k in ["kein interesse", "keine zeit"]):
                i_score -= 10

        if data.source in ("instagram", "facebook"):
            e_score += 10

        return max(0, p_score), max(0, i_score), max(0, e_score)

    def _store_intent(
        self,
        lead: Lead,
        data: IngestedLead,
        p_score: int,
        i_score: int,
        e_score: int,
    ) -> None:
        intent = LeadIntent(
            lead_id=lead.id,
            source=data.source,
            p_score=p_score,
            i_score=i_score,
            e_score=e_score,
            message=data.message,
            created_at=data.received_at,
        )
        self.db.add(intent)

    def _store_enrichment(self, lead: Lead, data: IngestedLead) -> None:
        enrichment = LeadEnrichment(
            lead_id=lead.id,
            company=data.company,
            job_title=data.job_title,
            industry=data.industry,
            raw=data.raw_payload,
            created_at=data.received_at,
        )
        self.db.add(enrichment)

    def _store_verification_stub(self, lead: Lead, data: IngestedLead) -> None:
        if not data.email and not data.phone:
            return

        verification = LeadVerification(
            lead_id=lead.id,
            email=str(data.email) if data.email else None,
            phone=data.phone,
            email_verified=False,
            phone_verified=False,
            created_at=data.received_at,
        )
        self.db.add(verification)
