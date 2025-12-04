"""
╔════════════════════════════════════════════════════════════════════════════╗
║  REFERRAL REMINDER SERVICE                                                 ║
║  Automatische Referral Reminder nach Sales                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Automatische Reminder 3 Tage nach Kauf
- Push Notifications
- Integration mit ReferralService

Usage:
    from referral_reminder import ReferralReminderService
    
    service = ReferralReminderService(db)
    await service.check_and_send_reminders(user_id)
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from supabase import Client

from .referral_service import ReferralService

logger = logging.getLogger(__name__)


class ReferralReminderService:
    """
    Service für automatische Referral Reminder.
    
    Prüft Kontakte auf Referral-Opportunities und sendet:
    - Push Notifications nach 3 Tagen nach Kauf
    - Erinnerungen für pending Referrals
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.referral_service = ReferralService(db)
    
    async def check_and_send_reminders(
        self,
        user_id: str,
        send_push: bool = True,
    ) -> Dict[str, Any]:
        """
        Prüft alle Kontakte eines Users auf Referral-Opportunities.
        
        Args:
            user_id: User ID
            send_push: Push Notification senden?
            
        Returns:
            Dict mit Statistiken
        """
        now = datetime.utcnow()
        
        result = {
            "user_id": user_id,
            "checked_at": now.isoformat(),
            "referral_ready_count": 0,
            "reminders_sent": 0,
            "push_sent": False,
        }
        
        # Hole Kontakte die für Referral in Frage kommen
        pending = self.referral_service.get_pending_referrals(user_id, limit=50)
        result["referral_ready_count"] = len(pending)
        
        if not pending:
            logger.debug(f"No pending referrals for user {user_id}")
            return result
        
        # Filtere Kontakte die 3 Tage nach Kauf sind
        three_days_ago = date.today() - timedelta(days=3)
        ready_for_reminder = []
        
        for contact in pending:
            last_purchase = contact.get("last_purchase_date")
            if last_purchase:
                if isinstance(last_purchase, str):
                    last_purchase = datetime.fromisoformat(last_purchase).date()
                
                # Genau 3 Tage nach Kauf = Reminder senden
                if (date.today() - last_purchase).days == 3:
                    ready_for_reminder.append(contact)
        
        if not ready_for_reminder:
            return result
        
        # Sende Push Notifications
        if send_push:
            for contact in ready_for_reminder:
                sent = await self._send_referral_push(user_id, contact)
                if sent:
                    result["reminders_sent"] += 1
        
        result["push_sent"] = result["reminders_sent"] > 0
        
        logger.info(
            f"Referral reminders sent for user {user_id}: "
            f"{result['reminders_sent']}/{len(ready_for_reminder)}"
        )
        
        return result
    
    async def _send_referral_push(
        self,
        user_id: str,
        contact: Dict[str, Any]
    ) -> bool:
        """
        Sendet Push Notification für Referral-Reminder.
        
        Args:
            user_id: User ID
            contact: Kontakt-Daten
            
        Returns:
            True wenn erfolgreich gesendet
        """
        try:
            contact_name = contact.get("first_name") or contact.get("name", "Kontakt")
            
            # Erstelle Push Notification
            notification_data = {
                "user_id": user_id,
                "type": "referral_reminder",
                "title": f"💎 Frag {contact_name} nach Empfehlungen!",
                "body": (
                    f"{contact_name} hat vor 3 Tagen gekauft - "
                    "perfekter Zeitpunkt für eine Empfehlung!"
                ),
                "data": {
                    "contact_id": contact.get("id"),
                    "contact_name": contact_name,
                    "action": "open_referral",
                    "screen": "MentorChat",
                    "params": {
                        "contactId": contact.get("id"),
                    },
                },
                "priority": "high",
                "created_at": datetime.utcnow().isoformat(),
            }
            
            # Speichere Notification
            self.db.table("notifications").insert(notification_data).execute()
            
            # TODO: Sende tatsächliche Push Notification über Push Service
            # await push_service.send_notification(user_id, notification_data)
            
            logger.info(f"Referral reminder notification created for contact {contact.get('id')}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending referral push: {e}")
            return False
    
    async def run_daily_check(self) -> Dict[str, Any]:
        """
        Führt tägliche Prüfung für alle User durch.
        
        Sollte als Cron Job laufen (z.B. täglich um 9:00 Uhr).
        
        Returns:
            Dict mit Gesamtstatistiken
        """
        try:
            # Hole alle aktiven User
            result = self.db.table("users").select("id").eq("active", True).execute()
            users = result.data if result.data else []
            
            total_stats = {
                "checked_users": 0,
                "total_referral_ready": 0,
                "total_reminders_sent": 0,
                "errors": [],
            }
            
            for user in users:
                try:
                    stats = await self.check_and_send_reminders(
                        user_id=user["id"],
                        send_push=True,
                    )
                    
                    total_stats["checked_users"] += 1
                    total_stats["total_referral_ready"] += stats["referral_ready_count"]
                    total_stats["total_reminders_sent"] += stats["reminders_sent"]
                    
                except Exception as e:
                    logger.error(f"Error checking referrals for user {user['id']}: {e}")
                    total_stats["errors"].append({
                        "user_id": user["id"],
                        "error": str(e),
                    })
            
            logger.info(
                f"Daily referral check completed: "
                f"{total_stats['total_reminders_sent']} reminders sent "
                f"for {total_stats['checked_users']} users"
            )
            
            return total_stats
            
        except Exception as e:
            logger.error(f"Error in daily referral check: {e}")
            return {
                "checked_users": 0,
                "total_referral_ready": 0,
                "total_reminders_sent": 0,
                "errors": [{"error": str(e)}],
            }


# ═══════════════════════════════════════════════════════════════════════════
# EXPORT
# ═══════════════════════════════════════════════════════════════════════════

__all__ = [
    "ReferralReminderService",
]

