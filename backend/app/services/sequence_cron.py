import logging
from datetime import datetime, timezone

from .sequence_engine import SequenceEngine

logger = logging.getLogger(__name__)


async def run_sequence_cron(db) -> dict:
    """Run periodic sequence advancement and reactivation scheduling."""
    stats = {
        "follow_ups_created": 0,
        "reactivations_triggered": 0,
        "errors": [],
    }

    try:
        profiles = db.table("profiles").select("id").execute()
        users = profiles.data if profiles and profiles.data else []
    except Exception as exc:  # noqa: BLE001
        logger.error("Could not load users for sequence cron: %s", exc, exc_info=True)
        stats["errors"].append(str(exc))
        return stats

    for user in users:
        user_id = user.get("id")
        engine = SequenceEngine(db)

        # Process due follow-ups
        try:
            due_leads = await engine.get_due_follow_ups(user_id)
            for lead in due_leads:
                result = await engine.advance_sequence(lead.get("id"))
                if result.get("success"):
                    stats["follow_ups_created"] += 1
                else:
                    stats["errors"].append(result.get("error"))
        except Exception as exc:  # noqa: BLE001
            logger.error("advance_sequence failed in cron for user %s: %s", user_id, exc, exc_info=True)
            stats["errors"].append(str(exc))

        # Process reactivations
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            reactivations = (
                db.table("reactivation_queue")
                .select("id, lead_id")
                .eq("user_id", user_id)
                .eq("status", "pending")
                .lte("scheduled_for", now_iso)
                .execute()
            )
            for row in reactivations.data or []:
                lead_id = row.get("lead_id")
                result = await engine.advance_sequence(lead_id)
                if result.get("success"):
                    stats["reactivations_triggered"] += 1
                    db.table("reactivation_queue").update(
                        {"status": "processed", "processed_at": now_iso}
                    ).eq("id", row.get("id")).execute()
                else:
                    stats["errors"].append(result.get("error"))
        except Exception as exc:  # noqa: BLE001
            logger.error("reactivation processing failed in cron for user %s: %s", user_id, exc, exc_info=True)
            stats["errors"].append(str(exc))

    return stats

