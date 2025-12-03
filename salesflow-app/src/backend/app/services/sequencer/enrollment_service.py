"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ENROLLMENT SERVICE                                                        ║
║  Kontakte in Sequences einschreiben und verwalten                         ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
import random

logger = logging.getLogger(__name__)


class EnrollmentService:
    """Service für Enrollment-Management."""
    
    def __init__(self, supabase):
        self.supabase = supabase
    
    # =========================================================================
    # ENROLLMENTS
    # =========================================================================
    
    async def enroll_contact(
        self,
        sequence_id: str,
        user_id: str,
        contact_email: str = None,
        contact_name: str = None,
        contact_linkedin_url: str = None,
        contact_phone: str = None,
        lead_id: str = None,
        variables: Dict = None,
    ) -> Dict:
        """Schreibt einen Kontakt in eine Sequence ein."""
        # Prüfe ob Sequence aktiv ist
        seq = self.supabase.table("sequences").select(
            "id, status, settings"
        ).eq("id", sequence_id).eq("user_id", user_id).single().execute()
        
        if not seq.data:
            raise Exception("Sequence not found")
        
        if seq.data["status"] != "active":
            raise Exception("Sequence is not active")
        
        # Prüfe ob schon enrolled (gleiche Email)
        if contact_email:
            existing = self.supabase.table("sequence_enrollments").select("id").eq(
                "sequence_id", sequence_id
            ).eq("contact_email", contact_email).eq(
                "status", "active"
            ).execute()
            
            if existing.data:
                raise Exception("Contact already enrolled in this sequence")
        
        # A/B Variant zuweisen (falls A/B Testing aktiv)
        ab_variant = random.choice(["A", "B"])
        
        # Ersten Step und Timing berechnen
        first_step = self.supabase.table("sequence_steps").select("*").eq(
            "sequence_id", sequence_id
        ).eq("step_order", 1).eq("is_active", True).single().execute()
        
        next_step_at = None
        if first_step.data:
            settings = seq.data.get("settings", {})
            next_step_at = self._calculate_next_step_time(
                delay_days=first_step.data.get("delay_days", 0),
                delay_hours=first_step.data.get("delay_hours", 0),
                delay_minutes=first_step.data.get("delay_minutes", 0),
                settings=settings,
            )
        
        # Enrollment erstellen
        data = {
            "sequence_id": sequence_id,
            "user_id": user_id,
            "contact_email": contact_email,
            "contact_name": contact_name,
            "contact_linkedin_url": contact_linkedin_url,
            "contact_phone": contact_phone,
            "lead_id": lead_id,
            "variables": variables or {},
            "status": "active",
            "current_step": 0,
            "next_step_at": next_step_at.isoformat() if next_step_at else None,
            "ab_variant": ab_variant,
            "enrolled_at": datetime.utcnow().isoformat(),
        }
        
        result = self.supabase.table("sequence_enrollments").insert(data).execute()
        
        if result.data:
            enrollment = result.data[0]
            logger.info(f"Contact enrolled: {enrollment['id']} in sequence {sequence_id}")
            
            # Queue first action
            if first_step.data and next_step_at:
                await self._queue_action(
                    enrollment_id=enrollment["id"],
                    step_id=first_step.data["id"],
                    scheduled_at=next_step_at,
                )
            
            return enrollment
        
        raise Exception("Failed to enroll contact")
    
    async def bulk_enroll(
        self,
        sequence_id: str,
        user_id: str,
        contacts: List[Dict],
    ) -> Dict:
        """Schreibt mehrere Kontakte ein."""
        enrolled = []
        errors = []
        
        for contact in contacts:
            try:
                result = await self.enroll_contact(
                    sequence_id=sequence_id,
                    user_id=user_id,
                    contact_email=contact.get("email"),
                    contact_name=contact.get("name"),
                    contact_linkedin_url=contact.get("linkedin_url"),
                    contact_phone=contact.get("phone"),
                    lead_id=contact.get("lead_id"),
                    variables=contact.get("variables", {}),
                )
                enrolled.append(result)
            except Exception as e:
                errors.append({
                    "contact": contact,
                    "error": str(e),
                })
        
        return {
            "enrolled": len(enrolled),
            "errors": len(errors),
            "error_details": errors,
        }
    
    async def get_enrollment(self, enrollment_id: str, user_id: str) -> Optional[Dict]:
        """Lädt ein Enrollment mit Actions."""
        result = self.supabase.table("sequence_enrollments").select(
            "*, sequence_actions(*)"
        ).eq("id", enrollment_id).eq("user_id", user_id).single().execute()
        
        return result.data
    
    async def list_enrollments(
        self,
        sequence_id: str,
        user_id: str,
        status: str = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict]:
        """Listet alle Enrollments einer Sequence."""
        query = self.supabase.table("sequence_enrollments").select("*").eq(
            "sequence_id", sequence_id
        ).eq("user_id", user_id)
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("enrolled_at", desc=True).range(
            offset, offset + limit - 1
        ).execute()
        
        return result.data or []
    
    async def pause_enrollment(self, enrollment_id: str, user_id: str) -> Optional[Dict]:
        """Pausiert ein Enrollment."""
        result = self.supabase.table("sequence_enrollments").update({
            "status": "paused",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", enrollment_id).eq("user_id", user_id).execute()
        
        return result.data[0] if result.data else None
    
    async def resume_enrollment(self, enrollment_id: str, user_id: str) -> Optional[Dict]:
        """Setzt ein pausiertes Enrollment fort."""
        result = self.supabase.table("sequence_enrollments").update({
            "status": "active",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", enrollment_id).eq("user_id", user_id).execute()
        
        if result.data:
            # Re-queue next action
            enrollment = result.data[0]
            await self._requeue_next_action(enrollment)
        
        return result.data[0] if result.data else None
    
    async def stop_enrollment(
        self, 
        enrollment_id: str, 
        user_id: str, 
        reason: str = "manual"
    ) -> Optional[Dict]:
        """Stoppt ein Enrollment."""
        result = self.supabase.table("sequence_enrollments").update({
            "status": "stopped",
            "stopped_at": datetime.utcnow().isoformat(),
            "stop_reason": reason,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", enrollment_id).eq("user_id", user_id).execute()
        
        # Remove from queue
        if result.data:
            self.supabase.table("sequence_action_queue").update({
                "status": "cancelled"
            }).eq("enrollment_id", enrollment_id).eq("status", "pending").execute()
        
        return result.data[0] if result.data else None
    
    async def mark_replied(self, enrollment_id: str, user_id: str) -> Optional[Dict]:
        """Markiert ein Enrollment als beantwortet (stoppt Sequence)."""
        result = self.supabase.table("sequence_enrollments").update({
            "status": "replied",
            "replied_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", enrollment_id).eq("user_id", user_id).execute()
        
        # Cancel pending actions
        if result.data:
            self.supabase.table("sequence_action_queue").update({
                "status": "cancelled"
            }).eq("enrollment_id", enrollment_id).eq("status", "pending").execute()
        
        return result.data[0] if result.data else None
    
    # =========================================================================
    # PROGRESS
    # =========================================================================
    
    async def advance_to_next_step(self, enrollment_id: str) -> Optional[Dict]:
        """Bewegt ein Enrollment zum nächsten Step."""
        # Enrollment laden
        enrollment = self.supabase.table("sequence_enrollments").select("*").eq(
            "id", enrollment_id
        ).single().execute()
        
        if not enrollment.data or enrollment.data["status"] != "active":
            return None
        
        current_step = enrollment.data["current_step"]
        sequence_id = enrollment.data["sequence_id"]
        
        # Nächsten Step finden
        next_step = self.supabase.table("sequence_steps").select("*").eq(
            "sequence_id", sequence_id
        ).eq("step_order", current_step + 1).eq("is_active", True).single().execute()
        
        if not next_step.data:
            # Sequence abgeschlossen
            return await self._complete_enrollment(enrollment_id)
        
        # Sequence Settings laden
        seq = self.supabase.table("sequences").select("settings").eq(
            "id", sequence_id
        ).single().execute()
        settings = seq.data.get("settings", {}) if seq.data else {}
        
        # Timing berechnen
        next_step_at = self._calculate_next_step_time(
            delay_days=next_step.data.get("delay_days", 0),
            delay_hours=next_step.data.get("delay_hours", 0),
            delay_minutes=next_step.data.get("delay_minutes", 0),
            settings=settings,
        )
        
        # Enrollment updaten
        result = self.supabase.table("sequence_enrollments").update({
            "current_step": current_step + 1,
            "next_step_at": next_step_at.isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", enrollment_id).execute()
        
        # Queue next action
        await self._queue_action(
            enrollment_id=enrollment_id,
            step_id=next_step.data["id"],
            scheduled_at=next_step_at,
        )
        
        return result.data[0] if result.data else None
    
    async def _complete_enrollment(self, enrollment_id: str) -> Dict:
        """Markiert ein Enrollment als abgeschlossen."""
        result = self.supabase.table("sequence_enrollments").update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "next_step_at": None,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", enrollment_id).execute()
        
        return result.data[0] if result.data else None
    
    # =========================================================================
    # QUEUE
    # =========================================================================
    
    async def _queue_action(
        self,
        enrollment_id: str,
        step_id: str,
        scheduled_at: datetime,
        priority: int = 0,
    ) -> Dict:
        """Fügt eine Aktion zur Queue hinzu."""
        data = {
            "enrollment_id": enrollment_id,
            "step_id": step_id,
            "scheduled_at": scheduled_at.isoformat(),
            "priority": priority,
            "status": "pending",
        }
        
        result = self.supabase.table("sequence_action_queue").insert(data).execute()
        return result.data[0] if result.data else None
    
    async def _requeue_next_action(self, enrollment: Dict) -> None:
        """Re-queued die nächste Aktion nach Resume."""
        if enrollment["status"] != "active":
            return
        
        current_step = enrollment["current_step"]
        sequence_id = enrollment["sequence_id"]
        
        # Nächsten Step finden
        next_step = self.supabase.table("sequence_steps").select("*").eq(
            "sequence_id", sequence_id
        ).eq("step_order", current_step + 1).eq("is_active", True).single().execute()
        
        if not next_step.data:
            return
        
        # Sequence Settings
        seq = self.supabase.table("sequences").select("settings").eq(
            "id", sequence_id
        ).single().execute()
        settings = seq.data.get("settings", {}) if seq.data else {}
        
        # Timing
        next_step_at = self._calculate_next_step_time(
            delay_days=next_step.data.get("delay_days", 0),
            delay_hours=next_step.data.get("delay_hours", 0),
            delay_minutes=next_step.data.get("delay_minutes", 0),
            settings=settings,
        )
        
        await self._queue_action(
            enrollment_id=enrollment["id"],
            step_id=next_step.data["id"],
            scheduled_at=next_step_at,
        )
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _calculate_next_step_time(
        self,
        delay_days: int,
        delay_hours: int,
        delay_minutes: int,
        settings: Dict,
    ) -> datetime:
        """Berechnet wann der nächste Step ausgeführt werden soll."""
        now = datetime.utcnow()
        
        # Add delay
        next_time = now + timedelta(
            days=delay_days,
            hours=delay_hours,
            minutes=delay_minutes,
        )
        
        # Adjust to sending hours
        send_start = settings.get("send_hours_start", 9)
        send_end = settings.get("send_hours_end", 18)
        
        hour = next_time.hour
        
        if hour < send_start:
            next_time = next_time.replace(hour=send_start, minute=0, second=0)
        elif hour >= send_end:
            next_time = next_time + timedelta(days=1)
            next_time = next_time.replace(hour=send_start, minute=0, second=0)
        
        # Skip weekends (if configured)
        send_days = settings.get("send_days", ["mon", "tue", "wed", "thu", "fri"])
        day_map = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
        allowed_days = [day_map.get(d, -1) for d in send_days]
        
        while next_time.weekday() not in allowed_days:
            next_time = next_time + timedelta(days=1)
            next_time = next_time.replace(hour=send_start, minute=0, second=0)
        
        return next_time

