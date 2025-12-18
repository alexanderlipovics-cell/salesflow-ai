import logging
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


STATUS_FLOW: Dict[str, Dict[str, Any]] = {
    "new": {"next": "contacted", "action": "first_contact"},
    "contacted": {"next": "no_response_1", "wait_days": 3},
    "no_response_1": {"next": "no_response_2", "wait_days": 3, "action": "follow_up"},
    "no_response_2": {"next": "no_response_3", "wait_days": 3, "action": "follow_up"},
    "no_response_3": {"next": "no_response_4", "wait_days": 5, "action": "follow_up"},
    "no_response_4": {"next": "no_response_5", "wait_days": 7, "action": "follow_up"},
    "no_response_5": {"next": "cold", "wait_days": 14, "action": "last_chance"},
    "responded": {"next": "qualified", "action": "user_decision"},
    "won": {"next": None, "action": "celebrate"},
    "lost": {"next": "reactivation", "wait_days": 75, "action": "schedule_reactivation"},
    "reactivation": {"next": "contacted", "action": "soft_reactivation"},
    "cold": {"next": None, "action": "archive"},
}


class SequenceEngine:
    def __init__(self, db):
        self.db = db

    # Public API -----------------------------------------------------
    async def process_lead_response(self, lead_id: str, responded: bool) -> dict:
        """Mark lead as responded or advance sequence on no-response."""
        try:
            if responded:
                self.db.table("leads").update(
                    {"sequence_status": "responded", "next_follow_up_at": None}
                ).eq("id", lead_id).execute()
                return {"success": True, "message": "Lead als 'responded' markiert"}
            return await self.advance_sequence(lead_id)
        except Exception as exc:  # noqa: BLE001
            logger.error("process_lead_response failed: %s", exc, exc_info=True)
            return {"success": False, "error": str(exc)}

    async def advance_sequence(self, lead_id: str) -> dict:
        """Advance a lead to the next sequence step and schedule follow-up if needed."""
        try:
            lead = (
                self.db.table("leads")
                .select("id, user_id, name, sequence_status, follow_up_count")
                .eq("id", lead_id)
                .single()
                .execute()
            )
            if not lead or not lead.data:
                return {"success": False, "error": "Lead nicht gefunden"}

            lead_data = lead.data
            current_status = lead_data.get("sequence_status") or "new"
            flow = STATUS_FLOW.get(current_status)
            if not flow:
                return {"success": False, "error": f"Unbekannter Sequenz-Status: {current_status}"}

            next_status = flow.get("next")
            action = flow.get("action")
            wait_days = flow.get("wait_days", 0)

            now = datetime.now(timezone.utc)
            next_follow_up_at: Optional[str] = None
            if wait_days:
                next_follow_up_at = (now + timedelta(days=wait_days)).isoformat()

            follow_up_count = (lead_data.get("follow_up_count") or 0) + 1

            update_payload = {
                "sequence_status": next_status or current_status,
                "follow_up_count": follow_up_count,
                "next_follow_up_at": next_follow_up_at,
                "updated_at": now.isoformat(),
            }

            self.db.table("leads").update(update_payload).eq("id", lead_id).execute()

            # Perform action
            if action == "follow_up":
                await self._create_follow_up_task(lead_data, current_status, follow_up_count)
            elif action == "schedule_reactivation":
                await self._schedule_reactivation(lead_id, lead_data.get("user_id"))

            return {
                "success": True,
                "message": f"Sequenz fortgeschritten: {current_status} -> {next_status or current_status}",
                "next_status": next_status,
            }
        except Exception as exc:  # noqa: BLE001
            logger.error("advance_sequence failed: %s", exc, exc_info=True)
            return {"success": False, "error": str(exc)}

    async def get_due_follow_ups(self, user_id: str) -> List[dict]:
        """Return leads whose next follow-up is due."""
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            result = (
                self.db.table("leads")
                .select("id, user_id, name, sequence_status, next_follow_up_at, follow_up_count")
                .eq("user_id", user_id)
                .lte("next_follow_up_at", now_iso)
                .not_.in_("sequence_status", ["won", "cold"])
                .execute()
            )
            return result.data or []
        except Exception as exc:  # noqa: BLE001
            logger.error("get_due_follow_ups failed: %s", exc, exc_info=True)
            return []

    async def mark_lead_won(self, lead_id: str) -> dict:
        try:
            self.db.table("leads").update(
                {"sequence_status": "won", "next_follow_up_at": None}
            ).eq("id", lead_id).execute()
            return {"success": True, "message": "Lead als gewonnen markiert"}
        except Exception as exc:  # noqa: BLE001
            logger.error("mark_lead_won failed: %s", exc, exc_info=True)
            return {"success": False, "error": str(exc)}

    async def mark_lead_lost(self, lead_id: str) -> dict:
        try:
            lead = (
                self.db.table("leads")
                .select("user_id")
                .eq("id", lead_id)
                .single()
                .execute()
            )
            user_id = lead.data["user_id"] if lead and lead.data else None

            self.db.table("leads").update(
                {"sequence_status": "lost", "next_follow_up_at": None}
            ).eq("id", lead_id).execute()

            if user_id:
                await self._schedule_reactivation(lead_id, user_id)

            return {"success": True, "message": "Lead als verloren markiert, Reaktivierung geplant"}
        except Exception as exc:  # noqa: BLE001
            logger.error("mark_lead_lost failed: %s", exc, exc_info=True)
            return {"success": False, "error": str(exc)}

    # Internal helpers ------------------------------------------------
    async def _create_follow_up_task(self, lead: dict, status: str, step: int):
        """Create follow-up task based on sequence step template."""
        try:
            template_result = (
                self.db.table("follow_up_sequence_steps")
                .select("template_key, template_message")
                .eq("status", status)
                .limit(1)
                .execute()
            )
            template = template_result.data[0] if template_result and template_result.data else None

            first_name = (lead.get("name") or "").split(" ")[0] if lead.get("name") else "Lead"
            message = template.get("template_message") if template else "Follow-up Nachricht"
            message = message.replace("{{name}}", first_name)

            due_at = datetime.now(timezone.utc)
            payload = {
                "id": str(uuid.uuid4()),
                "lead_id": lead.get("id"),
                "user_id": lead.get("user_id"),
                "flow": lead.get("flow") or lead.get("sequence_status") or status or "SEQUENCE_ENGINE",
                "stage": step or 0,
                "template_key": template.get("template_key") if template else status,
                "channel": (lead.get("preferred_channel") or "WHATSAPP").upper(),
                "suggested_message": message,
                "reason": template.get("template_message") if template else f"Sequence step {status}",
                "due_at": due_at.isoformat(),
                "status": "pending",
                "title": f"Follow-up {lead.get('name') or ''}".strip(),
                "priority": lead.get("priority") or "medium",
                "task_type": "follow_up",
                "source": "sequence_engine",
                "created_at": datetime.utcnow().isoformat(),
                "created_by": lead.get("user_id"),
            }

            self.db.table("followup_suggestions").insert(payload).execute()
        except Exception as exc:  # noqa: BLE001
            logger.error("_create_follow_up_task failed: %s", exc, exc_info=True)

    async def _schedule_reactivation(self, lead_id: str, user_id: str):
        """Schedule a reactivation between 60-90 days in the future."""
        try:
            days = random.randint(60, 90)
            scheduled_for = datetime.now(timezone.utc) + timedelta(days=days)
            payload = {
                "lead_id": lead_id,
                "user_id": user_id,
                "scheduled_for": scheduled_for.isoformat(),
                "status": "pending",
            }
            self.db.table("reactivation_queue").insert(payload).execute()
        except Exception as exc:  # noqa: BLE001
            logger.error("_schedule_reactivation failed: %s", exc, exc_info=True)

