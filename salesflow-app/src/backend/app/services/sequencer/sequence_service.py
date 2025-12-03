"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SEQUENCE SERVICE                                                          ║
║  CRUD Operations für Sequences und Steps                                   ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
import logging

logger = logging.getLogger(__name__)


class SequenceService:
    """Service für Sequence-Management."""
    
    def __init__(self, supabase):
        self.supabase = supabase
    
    # =========================================================================
    # SEQUENCES
    # =========================================================================
    
    async def create_sequence(
        self,
        user_id: str,
        name: str,
        description: str = None,
        settings: Dict = None,
        tags: List[str] = None,
        company_id: str = None,
    ) -> Dict:
        """Erstellt eine neue Sequence."""
        data = {
            "user_id": user_id,
            "name": name,
            "description": description,
            "status": "draft",
            "tags": tags or [],
        }
        
        if settings:
            data["settings"] = settings
        if company_id:
            data["company_id"] = company_id
        
        result = self.supabase.table("sequences").insert(data).execute()
        
        if result.data:
            logger.info(f"Sequence created: {result.data[0]['id']}")
            return result.data[0]
        
        raise Exception("Failed to create sequence")
    
    async def get_sequence(self, sequence_id: str, user_id: str) -> Optional[Dict]:
        """Lädt eine Sequence mit allen Steps."""
        # Sequence laden
        result = self.supabase.table("sequences").select("*").eq(
            "id", sequence_id
        ).eq("user_id", user_id).single().execute()
        
        if not result.data:
            return None
        
        sequence = result.data
        
        # Steps laden
        steps_result = self.supabase.table("sequence_steps").select("*").eq(
            "sequence_id", sequence_id
        ).order("step_order").execute()
        
        sequence["steps"] = steps_result.data or []
        
        return sequence
    
    async def list_sequences(
        self,
        user_id: str,
        status: str = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict]:
        """Listet alle Sequences eines Users."""
        query = self.supabase.table("sequences").select(
            "*, sequence_steps(count)"
        ).eq("user_id", user_id)
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).range(
            offset, offset + limit - 1
        ).execute()
        
        return result.data or []
    
    async def update_sequence(
        self,
        sequence_id: str,
        user_id: str,
        updates: Dict,
    ) -> Optional[Dict]:
        """Aktualisiert eine Sequence."""
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        result = self.supabase.table("sequences").update(updates).eq(
            "id", sequence_id
        ).eq("user_id", user_id).execute()
        
        return result.data[0] if result.data else None
    
    async def delete_sequence(self, sequence_id: str, user_id: str) -> bool:
        """Löscht eine Sequence (cascade löscht Steps, Enrollments, etc.)."""
        result = self.supabase.table("sequences").delete().eq(
            "id", sequence_id
        ).eq("user_id", user_id).execute()
        
        return len(result.data) > 0 if result.data else False
    
    async def activate_sequence(self, sequence_id: str, user_id: str) -> Optional[Dict]:
        """Aktiviert eine Sequence."""
        return await self.update_sequence(
            sequence_id, 
            user_id, 
            {
                "status": "active",
                "activated_at": datetime.utcnow().isoformat(),
            }
        )
    
    async def pause_sequence(self, sequence_id: str, user_id: str) -> Optional[Dict]:
        """Pausiert eine Sequence."""
        return await self.update_sequence(
            sequence_id, 
            user_id, 
            {"status": "paused"}
        )
    
    async def duplicate_sequence(self, sequence_id: str, user_id: str) -> Optional[Dict]:
        """Dupliziert eine Sequence mit allen Steps."""
        # Original laden
        original = await self.get_sequence(sequence_id, user_id)
        if not original:
            return None
        
        # Neue Sequence erstellen
        new_sequence = await self.create_sequence(
            user_id=user_id,
            name=f"{original['name']} (Kopie)",
            description=original.get("description"),
            settings=original.get("settings"),
            tags=original.get("tags"),
            company_id=original.get("company_id"),
        )
        
        # Steps kopieren
        for step in original.get("steps", []):
            await self.add_step(
                sequence_id=new_sequence["id"],
                step_type=step["step_type"],
                step_order=step["step_order"],
                delay_days=step.get("delay_days", 0),
                delay_hours=step.get("delay_hours", 0),
                delay_minutes=step.get("delay_minutes", 0),
                subject=step.get("subject"),
                content=step.get("content"),
                content_html=step.get("content_html"),
                platform_settings=step.get("platform_settings"),
            )
        
        return await self.get_sequence(new_sequence["id"], user_id)
    
    # =========================================================================
    # STEPS
    # =========================================================================
    
    async def add_step(
        self,
        sequence_id: str,
        step_type: str,
        step_order: int,
        delay_days: int = 0,
        delay_hours: int = 0,
        delay_minutes: int = 0,
        subject: str = None,
        content: str = None,
        content_html: str = None,
        ab_variant: str = None,
        condition_type: str = None,
        condition_step_id: str = None,
        platform_settings: Dict = None,
    ) -> Dict:
        """Fügt einen Step zur Sequence hinzu."""
        data = {
            "sequence_id": sequence_id,
            "step_type": step_type,
            "step_order": step_order,
            "delay_days": delay_days,
            "delay_hours": delay_hours,
            "delay_minutes": delay_minutes,
            "is_active": True,
        }
        
        if subject:
            data["subject"] = subject
        if content:
            data["content"] = content
        if content_html:
            data["content_html"] = content_html
        if ab_variant:
            data["ab_variant"] = ab_variant
        if condition_type:
            data["condition_type"] = condition_type
        if condition_step_id:
            data["condition_step_id"] = condition_step_id
        if platform_settings:
            data["platform_settings"] = platform_settings
        
        result = self.supabase.table("sequence_steps").insert(data).execute()
        
        if result.data:
            return result.data[0]
        
        raise Exception("Failed to add step")
    
    async def update_step(
        self,
        step_id: str,
        sequence_id: str,
        updates: Dict,
    ) -> Optional[Dict]:
        """Aktualisiert einen Step."""
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        result = self.supabase.table("sequence_steps").update(updates).eq(
            "id", step_id
        ).eq("sequence_id", sequence_id).execute()
        
        return result.data[0] if result.data else None
    
    async def delete_step(self, step_id: str, sequence_id: str) -> bool:
        """Löscht einen Step."""
        result = self.supabase.table("sequence_steps").delete().eq(
            "id", step_id
        ).eq("sequence_id", sequence_id).execute()
        
        return len(result.data) > 0 if result.data else False
    
    async def reorder_steps(
        self, 
        sequence_id: str, 
        step_order_map: Dict[str, int]
    ) -> bool:
        """Sortiert Steps neu."""
        for step_id, new_order in step_order_map.items():
            self.supabase.table("sequence_steps").update({
                "step_order": new_order
            }).eq("id", step_id).eq("sequence_id", sequence_id).execute()
        
        return True
    
    # =========================================================================
    # STATS
    # =========================================================================
    
    async def get_sequence_stats(self, sequence_id: str, user_id: str) -> Dict:
        """Lädt aggregierte Stats einer Sequence."""
        # Sequence laden (enthält stats JSONB)
        result = self.supabase.table("sequences").select(
            "id, name, status, stats, created_at, activated_at"
        ).eq("id", sequence_id).eq("user_id", user_id).single().execute()
        
        if not result.data:
            return {}
        
        sequence = result.data
        
        # Daily Stats der letzten 30 Tage
        daily_stats = self.supabase.table("sequence_daily_stats").select("*").eq(
            "sequence_id", sequence_id
        ).order("stat_date", desc=True).limit(30).execute()
        
        return {
            "sequence": sequence,
            "daily_stats": daily_stats.data or [],
        }
    
    async def update_sequence_stats(self, sequence_id: str) -> None:
        """Aktualisiert die aggregierten Stats einer Sequence."""
        # Zähle Enrollments nach Status
        enrollments = self.supabase.table("sequence_enrollments").select(
            "status", count="exact"
        ).eq("sequence_id", sequence_id).execute()
        
        # Aggregiere
        stats = {
            "enrolled": 0,
            "active": 0,
            "completed": 0,
            "replied": 0,
            "bounced": 0,
            "unsubscribed": 0,
        }
        
        # Diese Abfrage könnte besser sein mit GROUP BY...
        for status in stats.keys():
            result = self.supabase.table("sequence_enrollments").select(
                "id", count="exact"
            ).eq("sequence_id", sequence_id).eq("status", status).execute()
            stats[status] = result.count or 0
        
        stats["enrolled"] = sum(stats.values())
        
        # Update Sequence
        self.supabase.table("sequences").update({
            "stats": stats,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", sequence_id).execute()

