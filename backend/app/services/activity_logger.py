from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class ActivityLogger:
    """Loggt alle User-Aktionen damit CHIEF Kontext hat."""

    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id = user_id

    async def log(
        self,
        action_type: str,
        entity_type: str,
        entity_id: str,
        entity_name: Optional[str] = None,
        details: Optional[dict] = None,
        source: str = "ui",  # "ui" oder "chief"
    ):
        """
        Loggt eine Aktivität.

        action_type: created, updated, deleted, viewed, contacted, completed
        entity_type: lead, follow_up, deal, task, interaction
        source: ui (User hat's gemacht) oder chief (CHIEF hat's gemacht)
        """
        try:
            self.db.table("user_activity_log").insert(
                {
                    "user_id": self.user_id,
                    "action_type": action_type,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "entity_name": entity_name,
                    "details": details or {},
                    "source": source,
                    "created_at": datetime.utcnow().isoformat(),
                }
            ).execute()
        except Exception as e:  # pragma: no cover - defensive
            logger.warning(f"Activity logging failed: {e}")
            return

        if action_type in ("completed", "converted", "won") and entity_type in ("lead", "deal", "follow_up"):
            try:
                from app.services.collective_intelligence_engine import CollectiveIntelligenceEngine

                cie = CollectiveIntelligenceEngine(self.db)
                await cie.record_success_pattern(
                    user_id=self.user_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    details=details,
                )
            except Exception as e:  # pragma: no cover - defensive
                logger.warning(f"CIE learning trigger failed: {e}")

    async def get_recent(self, limit: int = 20) -> list:
        """Holt letzte Aktivitäten für CHIEF Kontext."""
        result = (
            self.db.table("user_activity_log")
            .select("*")
            .eq("user_id", self.user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data if result else []


