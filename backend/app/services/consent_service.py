# backend/app/services/consent_service.py

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy.orm import Session

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None  # type: ignore

from app.core.config import settings
from app.models.consent import ConsentRecord, CookieCategory
from app.services.notification_service import NotificationService  # stub/real

logger = structlog.get_logger()

class ConsentService:
    """
    AI-powered consent management service.

    Features:
    - Automatic cookie classification
    - Consent tracking and auditing
    - Privacy preference management
    - GDPR-compliant data handling
    """

    def __init__(self, db: Session):
        self.db = db
        api_key = getattr(settings, "OPENAI_API_KEY", None) or getattr(
            settings, "openai_api_key", None
        )
        self.openai_client = AsyncOpenAI(api_key=api_key) if (AsyncOpenAI and api_key) else None
        self.notification_service = NotificationService()

    # ==================== CONSENT MANAGEMENT ====================

    async def record_consent(
        self,
        user_id: str,
        consent_data: Dict[str, Any],
        ip_address: str,
        user_agent: str,
    ) -> ConsentRecord:
        """
        Record user consent with full audit trail.
        """
        consent_hash = self._create_consent_hash(consent_data)

        consent_record = ConsentRecord(
            user_id=user_id,
            consent_data=consent_data,
            consent_hash=consent_hash,
            ip_address=ip_address,
            user_agent=user_agent,
            consent_version=getattr(settings, "privacy_policy_version", "1.0"),
            created_at=datetime.utcnow(),
        )

        self.db.add(consent_record)
        self.db.commit()
        self.db.refresh(consent_record)

        logger.info(
            "Consent recorded",
            user_id=user_id,
            consent_hash=consent_hash[:8],
            categories=list(consent_data.keys()),
        )

        return consent_record

    async def get_user_consent(self, user_id: str) -> Optional[ConsentRecord]:
        """Get latest consent record for user."""
        return (
            self.db.query(ConsentRecord)
            .filter(ConsentRecord.user_id == user_id)
            .order_by(ConsentRecord.created_at.desc())
            .first()
        )

    async def update_consent(
        self,
        user_id: str,
        consent_data: Dict[str, Any],
        ip_address: str,
        user_agent: str,
    ) -> ConsentRecord:
        """Update user consent preferences."""
        current = await self.get_user_consent(user_id)
        if current and current.consent_data == consent_data:
            return current
        return await self.record_consent(user_id, consent_data, ip_address, user_agent)

    async def withdraw_consent(self, user_id: str, categories: List[str]) -> bool:
        """Withdraw consent for specific categories."""
        current = await self.get_user_consent(user_id)
        if not current:
            return False

        consent_data = current.consent_data.copy()
        for category in categories:
            consent_data[category] = False

        await self.update_consent(
            user_id=user_id,
            consent_data=consent_data,
            ip_address="system",
            user_agent="consent_withdrawal",
        )

        await self._handle_consent_withdrawal(user_id, categories)

        logger.info("Consent withdrawn", user_id=user_id, categories=categories)
        return True

    # ==================== COOKIE CLASSIFICATION ====================

    async def classify_cookies(
        self, cookie_list: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """AI-powered cookie classification into GDPR categories."""
        if not self.openai_client:
            return self._rule_based_classification(cookie_list)

        classifications: Dict[str, List[Dict[str, Any]]] = {}

        for cookie in cookie_list:
            category = await self._classify_single_cookie(cookie)
            classifications.setdefault(category, []).append(cookie)

        return classifications

    async def _classify_single_cookie(self, cookie: Dict[str, Any]) -> str:
        prompt = f"""
        Classify this cookie according to GDPR cookie categories:

        Cookie Name: {cookie.get('name', 'Unknown')}
        Domain: {cookie.get('domain', 'Unknown')}
        Purpose: {cookie.get('purpose', 'Unknown')}
        Data Collected: {cookie.get('data', 'Unknown')}

        Categories:
        - strictly_necessary
        - functional
        - analytics
        - marketing
        - preferences
        - social_media
        - unclassified

        Return only the category name.
        """

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a GDPR compliance expert."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=20,
                temperature=0,
            )
            category = (response.choices[0].message.content or "").strip().lower()

            valid_categories = {
                "strictly_necessary",
                "functional",
                "analytics",
                "marketing",
                "preferences",
                "social_media",
                "unclassified",
            }
            return category if category in valid_categories else "unclassified"

        except Exception as e:
            logger.warning(
                "AI cookie classification failed",
                error=str(e),
                cookie=cookie.get("name"),
            )
            return "unclassified"

    def _rule_based_classification(
        self, cookie_list: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        classifications: Dict[str, List[Dict[str, Any]]] = {
            "strictly_necessary": [],
            "functional": [],
            "analytics": [],
            "marketing": [],
            "unclassified": [],
        }

        for cookie in cookie_list:
            name = (cookie.get("name") or "").lower()
            domain = (cookie.get("domain") or "").lower()

            if any(k in name for k in ["session", "csrf", "auth", "token"]):
                classifications["strictly_necessary"].append(cookie)
            elif any(k in name for k in ["_ga", "_gid", "analytics", "tracking"]):
                classifications["analytics"].append(cookie)
            elif any(k in domain for k in ["facebook", "google", "twitter"]):
                classifications["marketing"].append(cookie)
            elif any(k in name for k in ["theme", "lang", "pref"]):
                classifications["functional"].append(cookie)
            else:
                classifications["unclassified"].append(cookie)

        return classifications

    # ==================== PRIVACY OPERATIONS ====================

    async def request_data_export(self, user_id: str) -> Dict[str, Any]:
        """GDPR Art. 15 – Data access."""
        user_data = await self._collect_user_data(user_id)
        consent_history = await self._get_consent_history(user_id)

        export_data = {
            "user_id": user_id,
            "export_date": datetime.utcnow().isoformat(),
            "personal_data": user_data,
            "consent_history": consent_history,
            "data_sources": ["user_profile", "consent_records"],
        }

        logger.info(
            "Data export prepared",
            user_id=user_id,
            data_points=sum(len(v) for v in user_data.values()),
        )
        return export_data

    async def request_data_deletion(self, user_id: str) -> bool:
        """GDPR Art. 17 – Right to erasure (mit Grace-Periode)."""
        try:
            deletion_record = {
                "user_id": user_id,
                "requested_at": datetime.utcnow().isoformat(),
                "status": "pending",
                "retention_period_days": 30,
            }
            # TODO: persist deletion_record in DB

            await self.notification_service.send_notification(
                user_id,
                "data_deletion_scheduled",
                {
                    "deletion_date": (
                        datetime.utcnow() + timedelta(days=30)
                    ).isoformat()
                },
            )

            logger.info("Data deletion requested", user_id=user_id)
            return True
        except Exception as e:
            logger.error("Data deletion request failed", user_id=user_id, error=str(e))
            return False

    async def restrict_processing(self, user_id: str) -> bool:
        """GDPR Art. 18 – Restriction of processing."""
        # TODO: Flag in User-Profile setzen & in relevanten Services beachten
        logger.info("Processing restricted", user_id=user_id)
        return True

    # ==================== COMPLIANCE MONITORING ====================

    async def check_compliance_status(self, user_id: str) -> Dict[str, Any]:
        consent = await self.get_user_consent(user_id)
        current_version = getattr(settings, "privacy_policy_version", "1.0")

        status = {
            "has_consent": consent is not None,
            "consent_version": consent.consent_version if consent else None,
            "latest_consent_date": consent.created_at.isoformat()
            if consent
            else None,
            "consent_categories": list(consent.consent_data.keys()) if consent else [],
            "is_latest_version": consent.consent_version == current_version if consent else False,
            "needs_reconsent": not (
                consent and consent.consent_version == current_version
            ),
        }

        if status["needs_reconsent"]:
            await self.notification_service.send_notification(
                user_id,
                "reconsent_required",
                {"current_version": current_version},
            )

        return status

    async def audit_consent_changes(self, days: int = 30) -> List[Dict[str, Any]]:
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        records = (
            self.db.query(ConsentRecord)
            .filter(ConsentRecord.created_at >= cutoff_date)
            .order_by(ConsentRecord.created_at.desc())
            .all()
        )

        audit_log: List[Dict[str, Any]] = []
        for record in records:
            audit_log.append(
                {
                    "user_id": record.user_id,
                    "timestamp": record.created_at.isoformat(),
                    "consent_hash": record.consent_hash[:8],
                    "categories": list(record.consent_data.keys()),
                    "ip_address": str(record.ip_address),
                    "consent_version": record.consent_version,
                }
            )

        return audit_log

    # ==================== HELPER METHODS ====================

    def _create_consent_hash(self, consent_data: Dict[str, Any]) -> str:
        consent_str = json.dumps(consent_data, sort_keys=True)
        return hashlib.sha256(consent_str.encode()).hexdigest()

    async def _collect_user_data(self, user_id: str) -> Dict[str, Any]:
        # TODO: wirkliche Datenquellen einbauen (User/Lead/Chat/etc.)
        return {
            "profile": {"id": user_id},
            "consent_records": await self._get_consent_history(user_id),
        }

    async def _get_consent_history(self, user_id: str) -> List[Dict[str, Any]]:
        records = (
            self.db.query(ConsentRecord)
            .filter(ConsentRecord.user_id == user_id)
            .order_by(ConsentRecord.created_at.desc())
            .all()
        )
        return [
            {
                "timestamp": r.created_at.isoformat(),
                "consent_data": r.consent_data,
                "consent_version": r.consent_version,
                "ip_address": str(r.ip_address),
            }
            for r in records
        ]

    async def _handle_consent_withdrawal(self, user_id: str, categories: List[str]) -> None:
        # TODO: Kategorie-spezifische Lösch-/Deaktivierungslogik (Analytics, Marketing, etc.)
        logger.info("Consent withdrawal handled", user_id=user_id, categories=categories)
