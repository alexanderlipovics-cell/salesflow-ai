"""
Approval Inbox Service
Manages AI-generated message drafts waiting for user approval
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import logging

from ..ai_client import get_embedding

logger = logging.getLogger(__name__)
_ = get_embedding  # silence unused import until AI generation added


class InboxService:
    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id = user_id

    async def generate_drafts_for_due_tasks(self) -> int:
        """Generate message drafts for all due follow-up tasks."""
        try:
            tasks = (
                self.db.table("followup_suggestions")
                .select("*, leads(*)")
                .eq("user_id", self.user_id)
                .eq("status", "pending")
                .lte("due_at", datetime.now(timezone.utc).isoformat())
                .execute()
            )
        except Exception as e:
            logger.error(f"Failed to fetch due tasks: {e}")
            return 0

        count = 0
        for task in (tasks.data or []):
            try:
                existing = (
                    self.db.table("message_queue")
                    .select("id")
                    .eq("task_id", task["id"])
                    .eq("status", "pending")
                    .execute()
                )
            except Exception as e:
                logger.warning(f"Could not check existing drafts for task {task.get('id')}: {e}")
                continue

            if existing.data:
                continue

            await self._generate_draft(task)
            count += 1

        return count

    async def _generate_draft(self, task: dict) -> Optional[str]:
        """Generate a single message draft."""
        lead = task.get("leads") or {}

        similar = await self._find_similar_successes(
            vertical=lead.get("vertical", "network"),
            step=lead.get("follow_up_count", 1),
        )

        message = await self._build_message(task, lead, similar)
        priority = self._calculate_priority(task, lead)

        try:
            result = (
                self.db.table("message_queue")
                .insert(
                    {
                        "user_id": self.user_id,
                        "lead_id": task.get("lead_id"),
                        "task_id": task["id"],
                        "channel": task.get("channel") or task.get("template_key") or "WHATSAPP",
                        "message": message,
                        "status": "pending",
                        "priority": priority,
                        "ai_model": "template",  # or "gpt-4o-mini" when using AI
                        "similar_success_ids": [s["id"] for s in similar] if similar else None,
                    }
                )
                .execute()
            )
            return result.data[0]["id"] if result.data else None
        except Exception as e:
            logger.error(f"Failed to insert message draft for task {task.get('id')}: {e}")
            return None

    async def _find_similar_successes(self, vertical: str, step: int, limit: int = 3) -> list:
        """Find similar successful messages."""
        try:
            result = (
                self.db.table("message_outcomes")
                .select("id, message_template, outcome_score")
                .eq("vertical", vertical)
                .gte("outcome_score", 5)
                .order("outcome_score", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.warning(f"Could not fetch similar successes: {e}")
            return []

    async def _build_message(self, task: dict, lead: dict, similar: list) -> str:
        """Build personalized message."""
        if similar and similar[0].get("message_template"):
            template = similar[0]["message_template"]
        else:
            templates = {
                1: "Hey {{name}}, ich wollte kurz nachhören ob du Zeit hattest, dir das anzuschauen? 🙂",
                2: "Hi {{name}}, kurze Erinnerung - hast du noch Fragen?",
                3: "{{name}}, ich melde mich ein letztes Mal. Falls kein Interesse, kein Problem! 👍",
            }
            step = lead.get("follow_up_count", 1)
            template = templates.get(step, templates[1])

        name = lead.get("name", "").split()[0] if lead.get("name") else ""
        message = template.replace("{{name}}", name)
        return message

    def _calculate_priority(self, task: dict, lead: dict) -> int:
        """Calculate message priority (0-100)."""
        priority = 50

        if lead.get("temperature") == "hot":
            priority += 30
        elif lead.get("temperature") == "warm":
            priority += 15

        if task.get("due_at"):
            try:
                due = datetime.fromisoformat(task["due_at"].replace("Z", "+00:00"))
                days_overdue = (datetime.now(timezone.utc) - due).days
                priority += min(days_overdue * 5, 20)
            except Exception as e:
                logger.warning(f"Could not parse due_at for task {task.get('id')}: {e}")

        return min(priority, 100)

    async def get_pending_messages(self, limit: int = 20) -> List[dict]:
        """Get pending messages for approval, highest priority first."""
        try:
            result = (
                self.db.table("message_queue")
                .select("*, leads(*)")
                .eq("user_id", self.user_id)
                .eq("status", "pending")
                .order("priority", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to fetch pending messages: {e}")
            return []

    async def approve_and_send(self, message_id: str, edited_message: str = None) -> dict:
        """Approve message and generate send link."""
        try:
            msg = (
                self.db.table("message_queue")
                .select("*, leads(*)")
                .eq("id", message_id)
                .single()
                .execute()
            )
        except Exception as e:
            logger.error(f"Failed to load message {message_id}: {e}")
            return {"success": False, "error": "Message not found"}

        if not msg.data:
            return {"success": False, "error": "Message not found"}

        message_data = msg.data
        lead = message_data.get("leads") or {}
        final_message = edited_message or message_data["message"]

        deep_link = self._generate_deep_link(
            channel=message_data.get("channel"),
            message=final_message,
            phone=lead.get("phone"),
            email=lead.get("email"),
        )

        try:
            self.db.table("message_queue").update(
                {
                    "status": "approved",
                    "message": final_message,
                    "approved_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("id", message_id).execute()
        except Exception as e:
            logger.error(f"Failed to update message {message_id} after approval: {e}")

        if message_data.get("task_id"):
            try:
                self.db.table("followup_suggestions").update(
                    {
                        "status": "sent",
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                        "suggested_message": final_message,
                    }
                ).eq("id", message_data["task_id"]).execute()
            except Exception as e:
                logger.warning(f"Failed to mark task {message_data.get('task_id')} as done: {e}")

        return {
            "success": True,
            "deep_link": deep_link,
            "channel": message_data.get("channel"),
            "lead_name": lead.get("name"),
        }

    async def skip_message(self, message_id: str) -> dict:
        """Skip/dismiss a message."""
        try:
            self.db.table("message_queue").update({"status": "skipped"}).eq("id", message_id).execute()
        except Exception as e:
            logger.error(f"Failed to skip message {message_id}: {e}")
            return {"success": False, "error": "Could not skip message"}

        return {"success": True}

    def _generate_deep_link(self, channel: str, message: str, phone: str = None, email: str = None) -> str:
        """Generate deep link for sending."""
        import urllib.parse

        encoded = urllib.parse.quote(message)

        if channel == "whatsapp" and phone:
            clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
            return f"https://wa.me/{clean_phone}?text={encoded}"
        elif channel == "email" and email:
            return f"mailto:{email}?body={encoded}"
        else:
            return f"https://wa.me/?text={encoded}"

    async def get_stats(self) -> dict:
        """Get inbox statistics."""
        try:
            pending = (
                self.db.table("message_queue")
                .select("id", count="exact")
                .eq("user_id", self.user_id)
                .eq("status", "pending")
                .execute()
            )
        except Exception as e:
            logger.error(f"Failed to fetch pending stats: {e}")
            pending = type("obj", (), {"count": 0})()

        try:
            sent_today = (
                self.db.table("message_queue")
                .select("id", count="exact")
                .eq("user_id", self.user_id)
                .eq("status", "approved")
                .gte("approved_at", datetime.now(timezone.utc).replace(hour=0, minute=0).isoformat())
                .execute()
            )
        except Exception as e:
            logger.error(f"Failed to fetch sent_today stats: {e}")
            sent_today = type("obj", (), {"count": 0})()

        return {
            "pending": pending.count or 0,
            "sent_today": sent_today.count or 0,
        }


__all__ = ["InboxService"]

