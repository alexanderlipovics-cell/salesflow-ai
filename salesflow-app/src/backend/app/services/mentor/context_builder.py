"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MENTOR CONTEXT BUILDER                                                    ║
║  Baut den Kontext für MENTOR AI Calls                                      ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import date, datetime
from supabase import Client


@dataclass
class MentorContext:
    """Vollständiger Kontext für einen MENTOR AI Call."""
    
    # User Info
    user_id: str
    user_name: str
    user_role: Optional[str] = None
    experience_level: Optional[str] = None  # starter, intermediate, expert
    
    # Company/Vertical
    company_id: Optional[str] = None
    vertical: str = "network_marketing"
    vertical_label: str = "Network Marketing"
    
    # Daily Flow Status
    daily_flow: Optional[Dict[str, Any]] = None
    remaining_today: Optional[Dict[str, int]] = None
    
    # Leads
    suggested_leads: Optional[List[Dict[str, Any]]] = None
    
    # Goals
    current_goal: Optional[Dict[str, Any]] = None
    
    # DMO Stats
    dmo_today: Optional[Dict[str, Any]] = None
    streak_days: int = 0
    
    # Additional Context
    objection_context: Optional[Dict[str, Any]] = None
    recent_wins: Optional[List[str]] = None
    
    def to_text(self) -> str:
        """Formatiert den Kontext als Text für den LLM Prompt."""
        parts = []
        
        # User Profil
        parts.append("USER PROFIL:")
        parts.append(f"- Name: {self.user_name}")
        if self.user_role:
            parts.append(f"- Rolle: {self.user_role}")
        if self.experience_level:
            parts.append(f"- Erfahrung: {self.experience_level}")
        parts.append("")
        
        # Vertical
        parts.append("VERTICAL:")
        parts.append(f"- Branche: {self.vertical}")
        parts.append(f"- Label: {self.vertical_label}")
        parts.append("")
        
        # Daily Flow
        if self.daily_flow:
            parts.append("DAILY FLOW STATUS (heute):")
            parts.append(f"- Status Level: {self.daily_flow.get('status', 'unknown')}")
            parts.append(f"- Zielerreichung: {self.daily_flow.get('overall_percent', 0):.0f}%")
            
            if "new_contacts" in self.daily_flow:
                nc = self.daily_flow["new_contacts"]
                parts.append(f"- Neue Kontakte: {nc.get('done', 0)}/{nc.get('target', 0)}")
            
            if "followups" in self.daily_flow:
                fu = self.daily_flow["followups"]
                parts.append(f"- Follow-ups: {fu.get('done', 0)}/{fu.get('target', 0)}")
            
            if "reactivations" in self.daily_flow:
                ra = self.daily_flow["reactivations"]
                parts.append(f"- Reaktivierungen: {ra.get('done', 0)}/{ra.get('target', 0)}")
            parts.append("")
        
        # Remaining
        if self.remaining_today:
            parts.append("NOCH NÖTIG HEUTE:")
            if self.remaining_today.get("new_contacts", 0) > 0:
                parts.append(f"- {self.remaining_today['new_contacts']} neue Kontakte")
            if self.remaining_today.get("followups", 0) > 0:
                parts.append(f"- {self.remaining_today['followups']} Follow-ups")
            if self.remaining_today.get("reactivations", 0) > 0:
                parts.append(f"- {self.remaining_today['reactivations']} Reaktivierungen")
            parts.append("")
        
        # Current Goal
        if self.current_goal:
            parts.append("AKTUELLES ZIEL:")
            parts.append(f"- Ziel: {self.current_goal.get('title', 'Nicht definiert')}")
            parts.append(f"- Fortschritt: {self.current_goal.get('progress', 0):.0f}%")
            if self.current_goal.get("deadline"):
                parts.append(f"- Deadline: {self.current_goal['deadline']}")
            parts.append("")
        
        # Suggested Leads
        if self.suggested_leads:
            parts.append("VORGESCHLAGENE LEADS FÜR NÄCHSTE AKTIONEN:")
            for lead in self.suggested_leads[:5]:  # Max 5
                name = lead.get("name", "Unbekannt")
                priority = lead.get("priority", "medium")
                reason = lead.get("reason", "")
                parts.append(f"  • {name} ({priority}) - {reason}")
            parts.append("")
        
        # Streak
        if self.streak_days > 0:
            parts.append(f"STREAK: {self.streak_days} Tage in Folge aktiv 🔥")
            parts.append("")
        
        # Recent Wins
        if self.recent_wins:
            parts.append("LETZTE ERFOLGE:")
            for win in self.recent_wins[:3]:
                parts.append(f"  ✅ {win}")
            parts.append("")
        
        return "\n".join(parts)


class MentorContextBuilder:
    """
    Builder für Mentor Context.
    
    Usage:
        builder = MentorContextBuilder(db)
        context = await builder.build(user_id, company_id)
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    async def build(
        self,
        user_id: str,
        company_id: Optional[str] = None,
        user_name: Optional[str] = None,
        include_leads: bool = True,
        include_daily_flow: bool = True,
        include_goals: bool = True,
        include_dmo: bool = True,
    ) -> MentorContext:
        """
        Baut den kompletten Kontext für einen User.
        
        Args:
            user_id: User ID
            company_id: Company ID (optional)
            user_name: User Name (override)
            include_leads: Leads laden?
            include_daily_flow: Daily Flow laden?
            include_goals: Goals laden?
            include_dmo: DMO laden?
            
        Returns:
            MentorContext Objekt
        """
        # Base context
        context = MentorContext(
            user_id=user_id,
            user_name=user_name or "User",
            company_id=company_id,
        )
        
        # User Profile laden
        await self._load_user_profile(context)
        
        # Vertical laden
        await self._load_vertical(context)
        
        # Daily Flow
        if include_daily_flow:
            await self._load_daily_flow(context)
        
        # Suggested Leads
        if include_leads:
            await self._load_suggested_leads(context)
        
        # Goals
        if include_goals:
            await self._load_current_goal(context)
        
        # DMO
        if include_dmo:
            await self._load_dmo(context)
        
        return context
    
    async def _load_user_profile(self, context: MentorContext):
        """Lädt User Profile aus Supabase."""
        try:
            result = self.db.table("profiles").select(
                "first_name, last_name, role, skill_level, company_id, vertical"
            ).eq("id", context.user_id).single().execute()
            
            if result.data:
                profile = result.data
                
                # Name zusammenbauen
                first = profile.get("first_name", "")
                last = profile.get("last_name", "")
                if first or last:
                    context.user_name = f"{first} {last}".strip()
                
                context.user_role = profile.get("role")
                context.experience_level = profile.get("skill_level")
                
                if not context.company_id:
                    context.company_id = profile.get("company_id")
                
                if profile.get("vertical"):
                    context.vertical = profile["vertical"]
                    
        except Exception as e:
            print(f"Warning: Could not load user profile: {e}")
    
    async def _load_vertical(self, context: MentorContext):
        """Lädt Vertical Details."""
        vertical_labels = {
            "network_marketing": "Network Marketing",
            "real_estate": "Immobilien",
            "finance": "Finanzvertrieb",
            "coaching": "Coaching",
            "insurance": "Versicherung",
        }
        context.vertical_label = vertical_labels.get(
            context.vertical, context.vertical.replace("_", " ").title()
        )
    
    async def _load_daily_flow(self, context: MentorContext):
        """Lädt Daily Flow Status."""
        try:
            today = date.today().isoformat()
            
            result = self.db.table("daily_flow_status").select("*").eq(
                "user_id", context.user_id
            ).eq("date", today).single().execute()
            
            if result.data:
                data = result.data
                
                context.daily_flow = {
                    "status": data.get("status_level", "on_track"),
                    "overall_percent": data.get("overall_percent", 0),
                    "new_contacts": {
                        "target": data.get("target_new_contacts", 5),
                        "done": data.get("done_new_contacts", 0),
                    },
                    "followups": {
                        "target": data.get("target_followups", 10),
                        "done": data.get("done_followups", 0),
                    },
                    "reactivations": {
                        "target": data.get("target_reactivations", 2),
                        "done": data.get("done_reactivations", 0),
                    },
                }
                
                # Remaining berechnen
                context.remaining_today = {
                    "new_contacts": max(0, data.get("target_new_contacts", 5) - data.get("done_new_contacts", 0)),
                    "followups": max(0, data.get("target_followups", 10) - data.get("done_followups", 0)),
                    "reactivations": max(0, data.get("target_reactivations", 2) - data.get("done_reactivations", 0)),
                }
                
                context.streak_days = data.get("streak_days", 0)
                
        except Exception as e:
            print(f"Warning: Could not load daily flow: {e}")
    
    async def _load_suggested_leads(self, context: MentorContext):
        """Lädt vorgeschlagene Leads für Follow-ups etc."""
        try:
            # Leads die Follow-up brauchen
            result = self.db.table("leads").select(
                "id, first_name, last_name, status, priority, next_follow_up"
            ).eq("user_id", context.user_id).eq(
                "status", "active"
            ).order("priority", desc=True).limit(5).execute()
            
            if result.data:
                context.suggested_leads = []
                for lead in result.data:
                    name = f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip()
                    context.suggested_leads.append({
                        "id": lead["id"],
                        "name": name or "Unbekannt",
                        "priority": lead.get("priority", "medium"),
                        "status": lead.get("status"),
                        "reason": self._get_lead_reason(lead),
                    })
                    
        except Exception as e:
            print(f"Warning: Could not load leads: {e}")
    
    def _get_lead_reason(self, lead: dict) -> str:
        """Generiert einen Grund für den Lead-Vorschlag."""
        next_fu = lead.get("next_follow_up")
        if next_fu:
            try:
                fu_date = datetime.fromisoformat(next_fu.replace("Z", "+00:00"))
                if fu_date.date() <= date.today():
                    return "Follow-up überfällig"
                return "Follow-up geplant"
            except:
                pass
        
        priority = lead.get("priority", "medium")
        if priority == "high":
            return "Hohe Priorität"
        
        return "Aktiver Lead"
    
    async def _load_current_goal(self, context: MentorContext):
        """Lädt das aktuelle Hauptziel."""
        try:
            result = self.db.table("goals").select(
                "id, title, target_value, current_value, deadline"
            ).eq("user_id", context.user_id).eq(
                "is_active", True
            ).order("created_at", desc=True).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                goal = result.data[0]
                target = goal.get("target_value", 1)
                current = goal.get("current_value", 0)
                progress = (current / target * 100) if target > 0 else 0
                
                context.current_goal = {
                    "id": goal["id"],
                    "title": goal.get("title", "Ziel"),
                    "progress": progress,
                    "current": current,
                    "target": target,
                    "deadline": goal.get("deadline"),
                }
                
        except Exception as e:
            print(f"Warning: Could not load goal: {e}")
    
    async def _load_dmo(self, context: MentorContext):
        """Lädt DMO (Daily Method of Operation) Stats."""
        try:
            today = date.today().isoformat()
            
            result = self.db.table("dmo_entries").select("*").eq(
                "user_id", context.user_id
            ).eq("entry_date", today).single().execute()
            
            if result.data:
                context.dmo_today = result.data
                
        except Exception as e:
            # DMO table might not exist yet
            pass

