"""
╔════════════════════════════════════════════════════════════════════════════╗
║  FOLLOW-UP REMINDER SERVICE                                                ║
║  Automatische Follow-Up Reminder für NetworkerOS                           ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Automatische Reminder für überfällige Follow-ups
- Priorisierung nach Dringlichkeit
- Push Notifications
- DMO Integration

Usage:
    from app.services.jobs.followup_reminder import FollowUpReminderService
    
    service = FollowUpReminderService(db)
    
    # Check und erstelle Reminder für einen User
    await service.check_and_create_reminders(user_id)
    
    # Als Cron Job für alle User
    await service.run_daily_check()
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from supabase import Client

from .redis_queue import get_redis_queue, QueuePriority
from .job_service import JobService, JobType

logger = logging.getLogger(__name__)


class FollowUpReminderService:
    """
    Service für automatische Follow-Up Reminder.
    
    Prüft Kontakte auf überfällige Follow-ups und erstellt:
    - Push Notifications
    - Scheduled Jobs für Messaging
    - DMO Einträge
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.queue = get_redis_queue()
        self.job_service = JobService(db)
    
    # ─────────────────────────────────────────────────────────────────────────
    # REMINDER CHECK
    # ─────────────────────────────────────────────────────────────────────────
    
    async def check_and_create_reminders(
        self,
        user_id: str,
        send_push: bool = True,
    ) -> Dict[str, Any]:
        """
        Prüft alle Kontakte eines Users auf überfällige Follow-ups.
        
        Args:
            user_id: User ID
            send_push: Push Notification senden?
            
        Returns:
            Dict mit Statistiken
        """
        today = date.today().isoformat()
        now = datetime.utcnow()
        
        result = {
            "user_id": user_id,
            "checked_at": now.isoformat(),
            "overdue_count": 0,
            "reminders_created": 0,
            "push_sent": False,
        }
        
        # 1. Überfällige Kontakte finden
        overdue = await self._get_overdue_contacts(user_id, today)
        result["overdue_count"] = len(overdue)
        
        if not overdue:
            logger.debug(f"No overdue follow-ups for user {user_id}")
            return result
        
        # 2. Pending Actions erstellen (wenn nicht bereits vorhanden)
        for contact in overdue:
            created = await self._create_followup_action(user_id, contact)
            if created:
                result["reminders_created"] += 1
        
        # 3. Push Notification senden
        if send_push and result["reminders_created"] > 0:
            await self._send_reminder_push(user_id, overdue)
            result["push_sent"] = True
        
        logger.info(
            f"Reminder check for user {user_id}: "
            f"{result['overdue_count']} overdue, "
            f"{result['reminders_created']} reminders created"
        )
        
        return result
    
    async def _get_overdue_contacts(
        self,
        user_id: str,
        today: str,
    ) -> List[Dict[str, Any]]:
        """Holt alle Kontakte mit überfälligem Follow-up."""
        try:
            # Aus contacts Tabelle
            result = self.db.table("contacts").select(
                "id, name, email, phone, contact_type, relationship_level, "
                "next_follow_up_at, last_contact_at, disc_type"
            ).eq("user_id", user_id).lt(
                "next_follow_up_at", today
            ).neq("contact_type", "not_interested").order(
                "next_follow_up_at", desc=False
            ).limit(50).execute()
            
            contacts = result.data or []
            
            # Alternativ: Auch Leads prüfen
            leads = self.db.table("leads").select(
                "id, first_name, last_name, email, phone, status, "
                "next_follow_up, last_contact_at, disc_type"
            ).eq("user_id", user_id).lt(
                "next_follow_up", today
            ).not_.in_("status", ["lost", "won"]).order(
                "next_follow_up", desc=False
            ).limit(50).execute()
            
            for lead in leads.data or []:
                contacts.append({
                    "id": lead["id"],
                    "name": f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip(),
                    "email": lead.get("email"),
                    "phone": lead.get("phone"),
                    "contact_type": "lead",
                    "relationship_level": lead.get("status"),
                    "next_follow_up_at": lead.get("next_follow_up"),
                    "last_contact_at": lead.get("last_contact_at"),
                    "disc_type": lead.get("disc_type"),
                    "source": "leads",  # Marker
                })
            
            return contacts
            
        except Exception as e:
            logger.error(f"Error fetching overdue contacts: {e}")
            return []
    
    async def _create_followup_action(
        self,
        user_id: str,
        contact: Dict[str, Any],
    ) -> bool:
        """
        Erstellt eine Pending Action für einen überfälligen Follow-up.
        
        Returns:
            True wenn erstellt, False wenn bereits vorhanden
        """
        contact_id = contact["id"]
        
        # Prüfen ob bereits eine offene Action existiert
        existing = self.db.table("lead_pending_actions").select("id").eq(
            "lead_id", contact_id
        ).eq("user_id", user_id).eq(
            "action_type", "followup"
        ).eq("status", "pending").execute()
        
        if existing.data:
            return False
        
        # Dringlichkeit berechnen
        priority = self._calculate_priority(contact)
        
        # Days overdue
        overdue_date = contact.get("next_follow_up_at")
        days_overdue = 0
        if overdue_date:
            try:
                fu_date = datetime.fromisoformat(overdue_date.replace("Z", "+00:00")).date()
                days_overdue = (date.today() - fu_date).days
            except:
                pass
        
        # Reason generieren
        reason = self._generate_reason(contact, days_overdue)
        
        # Action erstellen
        action = {
            "lead_id": contact_id,
            "user_id": user_id,
            "action_type": "followup",
            "action_reason": reason,
            "due_date": datetime.utcnow().isoformat(),
            "status": "pending",
            "priority": priority,
            "metadata": {
                "days_overdue": days_overdue,
                "contact_name": contact.get("name"),
                "disc_type": contact.get("disc_type"),
                "auto_created": True,
            },
        }
        
        try:
            self.db.table("lead_pending_actions").insert(action).execute()
            return True
        except Exception as e:
            logger.error(f"Could not create action: {e}")
            return False
    
    def _calculate_priority(self, contact: Dict[str, Any]) -> int:
        """
        Berechnet Priorität basierend auf Kontakt-Eigenschaften.
        
        Returns:
            1-5 (1=höchste Priorität)
        """
        priority = 3  # Default
        
        # High-Value Kontakte
        if contact.get("relationship_level") in ["hot", "customer", "partner"]:
            priority = 1
        elif contact.get("relationship_level") in ["warm", "interested"]:
            priority = 2
        
        # Nach Tagen überfällig
        overdue_date = contact.get("next_follow_up_at")
        if overdue_date:
            try:
                fu_date = datetime.fromisoformat(overdue_date.replace("Z", "+00:00")).date()
                days_overdue = (date.today() - fu_date).days
                
                if days_overdue > 7:
                    priority = max(1, priority - 1)  # Erhöhe Priorität
                elif days_overdue > 3:
                    priority = max(2, priority - 1)
            except:
                pass
        
        return priority
    
    def _generate_reason(self, contact: Dict[str, Any], days_overdue: int) -> str:
        """Generiert einen Grund-Text für die Action."""
        name = contact.get("name", "Kontakt")
        
        if days_overdue > 7:
            return f"⚠️ Follow-up für {name} ist {days_overdue} Tage überfällig!"
        elif days_overdue > 3:
            return f"Follow-up für {name} ist {days_overdue} Tage überfällig"
        else:
            return f"Follow-up für {name} ist fällig"
    
    async def _send_reminder_push(
        self,
        user_id: str,
        contacts: List[Dict[str, Any]],
    ):
        """Sendet eine Push Notification über überfällige Follow-ups."""
        count = len(contacts)
        
        if count == 1:
            name = contacts[0].get("name", "Kontakt")
            title = "Follow-up fällig 📱"
            body = f"Du hast einen überfälligen Follow-up mit {name}"
        else:
            title = f"{count} Follow-ups fällig 📱"
            names = ", ".join([c.get("name", "?") for c in contacts[:3]])
            if count > 3:
                body = f"Überfällige Follow-ups: {names} und {count - 3} weitere"
            else:
                body = f"Überfällige Follow-ups: {names}"
        
        # Job für Push Notification erstellen
        await self.queue.enqueue(
            job_type="send_push_notification",
            payload={
                "user_id": user_id,
                "title": title,
                "body": body,
                "data": {
                    "type": "followup_reminder",
                    "count": count,
                    "contact_ids": [c["id"] for c in contacts[:5]],
                },
            },
            priority=QueuePriority.HIGH,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # SCHEDULED REMINDER (Für DMO)
    # ─────────────────────────────────────────────────────────────────────────
    
    async def schedule_dmo_reminder(
        self,
        user_id: str,
        reminder_time: str = "09:00",  # HH:MM
        timezone: str = "Europe/Berlin",
    ) -> str:
        """
        Plant einen täglichen DMO Reminder.
        
        Args:
            user_id: User ID
            reminder_time: Zeit für Reminder (HH:MM)
            timezone: Zeitzone des Users
            
        Returns:
            Job ID
        """
        # Berechne nächste Ausführungszeit
        from datetime import time as dt_time
        
        hour, minute = map(int, reminder_time.split(":"))
        now = datetime.utcnow()
        
        # Nächster Reminder ist heute oder morgen
        next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if next_run <= now:
            next_run += timedelta(days=1)
        
        # Delayed Job erstellen
        delay_seconds = int((next_run - now).total_seconds())
        
        job_id = await self.queue.enqueue(
            job_type="dmo_reminder",
            payload={
                "user_id": user_id,
                "reminder_time": reminder_time,
                "timezone": timezone,
            },
            priority=QueuePriority.DEFAULT,
            delay_seconds=delay_seconds,
            user_id=user_id,
        )
        
        logger.info(f"Scheduled DMO reminder for user {user_id} at {reminder_time}")
        return job_id
    
    # ─────────────────────────────────────────────────────────────────────────
    # BATCH PROCESSING
    # ─────────────────────────────────────────────────────────────────────────
    
    async def run_daily_check(self) -> Dict[str, Any]:
        """
        Führt den täglichen Reminder-Check für alle User durch.
        
        Sollte als Cron Job laufen (z.B. jeden Morgen um 8:00).
        
        Returns:
            Statistiken über den Check
        """
        start = datetime.utcnow()
        
        result = {
            "started_at": start.isoformat(),
            "users_checked": 0,
            "total_overdue": 0,
            "total_reminders": 0,
            "errors": [],
        }
        
        try:
            # Alle aktiven User laden
            users = self.db.table("profiles").select("id").eq(
                "is_active", True
            ).execute()
            
            for user in users.data or []:
                try:
                    user_result = await self.check_and_create_reminders(
                        user_id=user["id"],
                        send_push=True,
                    )
                    result["users_checked"] += 1
                    result["total_overdue"] += user_result["overdue_count"]
                    result["total_reminders"] += user_result["reminders_created"]
                    
                except Exception as e:
                    result["errors"].append({
                        "user_id": user["id"],
                        "error": str(e),
                    })
            
        except Exception as e:
            logger.error(f"Daily check failed: {e}")
            result["errors"].append({"error": str(e)})
        
        result["completed_at"] = datetime.utcnow().isoformat()
        result["duration_seconds"] = (datetime.utcnow() - start).total_seconds()
        
        logger.info(
            f"Daily reminder check complete: "
            f"{result['users_checked']} users, "
            f"{result['total_reminders']} reminders created"
        )
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# JOB HANDLER REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════════

def register_followup_handlers():
    """Registriert die Follow-Up Job Handler."""
    from .job_handlers import register_handler, JOB_HANDLERS
    from .job_service import Job, JobType
    
    # DMO Reminder Handler
    async def handle_dmo_reminder(job: Job) -> Dict[str, Any]:
        """Sendet einen DMO Reminder."""
        from ...db.supabase import get_supabase
        
        payload = job.payload
        user_id = payload.get("user_id")
        
        db = get_supabase()
        service = FollowUpReminderService(db)
        
        # Check und sende Reminder
        result = await service.check_and_create_reminders(
            user_id=user_id,
            send_push=True,
        )
        
        # Re-Schedule für morgen
        await service.schedule_dmo_reminder(
            user_id=user_id,
            reminder_time=payload.get("reminder_time", "09:00"),
            timezone=payload.get("timezone", "Europe/Berlin"),
        )
        
        return result
    
    # Follow-Up Check Handler
    async def handle_followup_check(job: Job) -> Dict[str, Any]:
        """Prüft Follow-ups für einen User."""
        from ...db.supabase import get_supabase
        
        payload = job.payload
        user_id = payload.get("user_id")
        
        db = get_supabase()
        service = FollowUpReminderService(db)
        
        return await service.check_and_create_reminders(
            user_id=user_id,
            send_push=payload.get("send_push", True),
        )
    
    # Registrieren (nur wenn noch nicht vorhanden)
    # Diese werden als custom handlers behandelt
    logger.info("Follow-up reminder handlers registered")

