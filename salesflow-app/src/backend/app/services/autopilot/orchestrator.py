"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AUTOPILOT ORCHESTRATOR                                                    ║
║  Koordiniert alle automatischen Aktionen                                   ║
╚════════════════════════════════════════════════════════════════════════════╝

Der Orchestrator:
- Koordiniert proaktive Aktionen (ohne eingehende Nachricht)
- Generiert Daily Briefings
- Managed Scheduled Follow-ups
- Überwacht Ghost Detection
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, time
from dataclasses import dataclass
import logging

from supabase import Client

from .engine import AutopilotEngine, ProcessingResult
from ...config.prompts.chief_autopilot import (
    AutonomyLevel,
    AutopilotSettings,
    AutopilotAction,
    LeadTemperature,
    build_orchestrator_prompt
)

logger = logging.getLogger(__name__)


@dataclass
class DailyBriefing:
    """Das Morning Briefing für den User."""
    date: str
    overnight_messages: int
    auto_replied: int
    drafts_pending: int
    human_needed: int
    auto_booked_appointments: int
    new_hot_leads: int
    ready_to_close: int
    estimated_pipeline_value: float
    today_tasks: List[Dict[str, Any]]
    estimated_user_time_minutes: int
    greeting_message: str


@dataclass
class EveningSummary:
    """Das Evening Summary für den User."""
    date: str
    total_messages_sent: int
    auto_replies: int
    followups_sent: int
    user_approved: int
    new_replies_received: int
    appointments_booked: int
    deals_closed: int
    revenue: float
    user_time_minutes: int
    estimated_manual_time_minutes: int
    time_saved_minutes: int
    tomorrow_preview: Dict[str, Any]


@dataclass
class GhostLead:
    """Ein Lead der zum Ghost geworden ist."""
    lead_id: str
    lead_name: str
    days_since_response: int
    last_message_from_us: str
    ghost_type: str  # soft, hard
    recommended_action: str
    reengagement_message: Optional[str]


class AutopilotOrchestrator:
    """
    Der Dirigent des Autopilot-Systems.
    
    Koordiniert:
    - Scheduled Actions (Follow-ups, Reminders)
    - Proactive Outreach
    - Ghost Detection
    - Daily Reports
    """
    
    def __init__(
        self,
        supabase: Client,
        autopilot_engine: AutopilotEngine,
        push_service=None
    ):
        """
        Args:
            supabase: Supabase Client
            autopilot_engine: Die Autopilot Engine
            push_service: Service für Push Notifications
        """
        self.supabase = supabase
        self.engine = autopilot_engine
        self.push_service = push_service
    
    # ═══════════════════════════════════════════════════════════════════════
    # DAILY BRIEFINGS
    # ═══════════════════════════════════════════════════════════════════════
    
    async def generate_morning_briefing(
        self,
        user_id: str
    ) -> DailyBriefing:
        """
        Generiert das Morning Briefing.
        
        Wird jeden Tag um 07:00 getriggert.
        """
        today = datetime.utcnow().date()
        yesterday_night = datetime.combine(today, time(20, 0)) - timedelta(days=1)
        
        # Stats laden
        overnight_stats = await self._get_overnight_stats(user_id, yesterday_night)
        pipeline_stats = await self._get_pipeline_stats(user_id)
        today_tasks = await self._get_today_tasks(user_id)
        
        # Geschätzte User-Zeit berechnen
        estimated_time = self._estimate_user_time(
            drafts=overnight_stats["drafts_pending"],
            human_needed=overnight_stats["human_needed"],
            calls=pipeline_stats["calls_scheduled"]
        )
        
        # Greeting generieren
        greeting = self._generate_greeting(
            overnight_stats,
            pipeline_stats
        )
        
        briefing = DailyBriefing(
            date=today.isoformat(),
            overnight_messages=overnight_stats["total_inbound"],
            auto_replied=overnight_stats["auto_replied"],
            drafts_pending=overnight_stats["drafts_pending"],
            human_needed=overnight_stats["human_needed"],
            auto_booked_appointments=overnight_stats["auto_booked"],
            new_hot_leads=pipeline_stats["new_hot_leads"],
            ready_to_close=pipeline_stats["ready_to_close"],
            estimated_pipeline_value=pipeline_stats["estimated_value"],
            today_tasks=today_tasks,
            estimated_user_time_minutes=estimated_time,
            greeting_message=greeting
        )
        
        # Push Notification senden
        if self.push_service:
            await self.push_service.send_notification(
                user_id=user_id,
                title="☀️ Guten Morgen!",
                body=f"📥 {overnight_stats['total_inbound']} neue Nachrichten, "
                     f"✅ {overnight_stats['auto_replied']} automatisch beantwortet",
                data={"type": "morning_briefing", "date": today.isoformat()}
            )
        
        return briefing
    
    async def generate_evening_summary(
        self,
        user_id: str
    ) -> EveningSummary:
        """
        Generiert das Evening Summary.
        
        Wird jeden Tag um 19:00 getriggert.
        """
        today = datetime.utcnow().date()
        day_start = datetime.combine(today, time(0, 0))
        
        # Tagesstatistiken laden
        day_stats = await self._get_day_stats(user_id, day_start)
        
        # User-Zeit berechnen
        user_time = await self._calculate_user_time(user_id, day_start)
        
        # Geschätzte manuelle Zeit (ohne Autopilot)
        estimated_manual = self._estimate_manual_time(day_stats)
        
        # Tomorrow Preview
        tomorrow_preview = await self._get_tomorrow_preview(user_id)
        
        summary = EveningSummary(
            date=today.isoformat(),
            total_messages_sent=day_stats["total_sent"],
            auto_replies=day_stats["auto_replies"],
            followups_sent=day_stats["followups"],
            user_approved=day_stats["user_approved"],
            new_replies_received=day_stats["new_replies"],
            appointments_booked=day_stats["appointments"],
            deals_closed=day_stats["deals_closed"],
            revenue=day_stats["revenue"],
            user_time_minutes=user_time,
            estimated_manual_time_minutes=estimated_manual,
            time_saved_minutes=max(0, estimated_manual - user_time),
            tomorrow_preview=tomorrow_preview
        )
        
        # Push Notification
        if self.push_service:
            time_saved_hours = summary.time_saved_minutes // 60
            await self.push_service.send_notification(
                user_id=user_id,
                title="🌙 Tagesabschluss",
                body=f"📤 {day_stats['total_sent']} Nachrichten, "
                     f"⏱️ {time_saved_hours}+ Stunden gespart!",
                data={"type": "evening_summary", "date": today.isoformat()}
            )
        
        return summary
    
    # ═══════════════════════════════════════════════════════════════════════
    # SCHEDULED ACTIONS
    # ═══════════════════════════════════════════════════════════════════════
    
    async def process_scheduled_followups(
        self,
        user_id: str
    ) -> List[ProcessingResult]:
        """
        Verarbeitet alle geplanten Follow-ups für heute.
        
        Wird täglich um 09:00 ausgeführt.
        """
        today = datetime.utcnow().date()
        
        # Pending Follow-ups laden
        result = self.supabase.table("follow_up_tasks").select(
            "*, leads(*)"
        ).eq(
            "leads.user_id", user_id
        ).eq(
            "status", "pending"
        ).lte(
            "scheduled_for", today.isoformat()
        ).execute()
        
        followups = result.data if result.data else []
        results = []
        
        for followup in followups:
            lead = followup.get("leads", {})
            
            try:
                # Follow-up Message generieren
                message = await self._generate_followup_message(
                    lead=lead,
                    followup_reason=followup.get("reason", "")
                )
                
                # Settings laden
                settings = await self.engine._load_settings(user_id)
                
                # Confidence Check
                if settings.auto_followups:
                    # Auto-Send wenn erlaubt
                    sent = await self.engine._send_message(
                        lead=lead,
                        channel=lead.get("channel", "manual"),
                        content=message
                    )
                    
                    if sent:
                        # Task als erledigt markieren
                        self.supabase.table("follow_up_tasks").update({
                            "status": "completed",
                            "completed_at": datetime.utcnow().isoformat()
                        }).eq("id", followup["id"]).execute()
                else:
                    # Als Draft speichern
                    await self.engine._save_draft(
                        user_id=user_id,
                        lead_id=lead["id"],
                        content=message,
                        intent="scheduled_followup"
                    )
                
                logger.info(f"Processed follow-up for lead {lead['id']}")
                
            except Exception as e:
                logger.error(f"Failed to process follow-up: {e}")
        
        return results
    
    async def detect_ghost_leads(
        self,
        user_id: str,
        days_threshold: int = 5
    ) -> List[GhostLead]:
        """
        Erkennt Leads die zu Ghosts geworden sind.
        
        Ein Ghost ist ein Lead der:
        - Auf unsere letzte Nachricht nicht geantwortet hat
        - Länger als X Tage keine Reaktion zeigt
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_threshold)
        
        # Leads mit ausstehender Antwort finden
        result = self.supabase.rpc(
            "get_ghost_leads",
            {
                "p_user_id": user_id,
                "p_cutoff_date": cutoff_date.isoformat()
            }
        ).execute()
        
        ghosts = []
        
        for row in (result.data or []):
            days_since = (datetime.utcnow() - datetime.fromisoformat(
                row["last_outbound_at"].replace("Z", "+00:00")
            ).replace(tzinfo=None)).days
            
            # Ghost-Typ bestimmen
            ghost_type = "soft" if days_since < 10 else "hard"
            
            # Re-Engagement Message generieren
            reengagement = self._generate_reengagement_message(
                lead_name=row["lead_name"],
                last_topic=row.get("last_topic", ""),
                ghost_type=ghost_type
            )
            
            ghosts.append(GhostLead(
                lead_id=row["lead_id"],
                lead_name=row["lead_name"],
                days_since_response=days_since,
                last_message_from_us=row["last_outbound_content"],
                ghost_type=ghost_type,
                recommended_action="re_engage" if ghost_type == "soft" else "archive_or_last_try",
                reengagement_message=reengagement
            ))
        
        return ghosts
    
    async def process_ghost_leads(
        self,
        user_id: str,
        ghosts: List[GhostLead]
    ) -> Dict[str, int]:
        """
        Verarbeitet erkannte Ghost Leads.
        
        Ghost-Handling ist IMMER Draft Review (nie Auto-Send).
        """
        stats = {
            "drafts_created": 0,
            "archived": 0
        }
        
        settings = await self.engine._load_settings(user_id)
        
        for ghost in ghosts:
            if ghost.ghost_type == "soft" and ghost.reengagement_message:
                # Draft erstellen für Re-Engagement
                await self.engine._save_draft(
                    user_id=user_id,
                    lead_id=ghost.lead_id,
                    content=ghost.reengagement_message,
                    intent="ghost_reengagement"
                )
                stats["drafts_created"] += 1
                
            elif ghost.ghost_type == "hard":
                # Bei Hard Ghosts: Letzte Chance oder Archivieren
                if ghost.days_since_response > 30:
                    # Archivieren nach 30 Tagen
                    await self.engine._archive_lead(ghost.lead_id)
                    stats["archived"] += 1
                else:
                    # Letzte Chance Message
                    last_chance = self._generate_last_chance_message(ghost.lead_name)
                    await self.engine._save_draft(
                        user_id=user_id,
                        lead_id=ghost.lead_id,
                        content=last_chance,
                        intent="ghost_last_chance"
                    )
                    stats["drafts_created"] += 1
        
        # User benachrichtigen wenn Drafts erstellt wurden
        if stats["drafts_created"] > 0 and self.push_service:
            await self.push_service.send_notification(
                user_id=user_id,
                title="👻 Ghost Detection",
                body=f"{stats['drafts_created']} Leads brauchen einen Nudge",
                data={"type": "ghost_detection"}
            )
        
        return stats
    
    # ═══════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════
    
    async def _get_overnight_stats(
        self,
        user_id: str,
        since: datetime
    ) -> Dict[str, int]:
        """Lädt Statistiken der letzten Nacht."""
        
        # Actions seit gestern Abend
        result = self.supabase.table("autopilot_actions").select(
            "action, response_sent"
        ).eq(
            "user_id", user_id
        ).gte(
            "created_at", since.isoformat()
        ).execute()
        
        actions = result.data or []
        
        return {
            "total_inbound": len(actions),
            "auto_replied": sum(1 for a in actions if a.get("response_sent")),
            "drafts_pending": sum(1 for a in actions if a["action"] == "draft_review"),
            "human_needed": sum(1 for a in actions if a["action"] == "human_needed"),
            "auto_booked": 0  # TODO: Implement
        }
    
    async def _get_pipeline_stats(
        self,
        user_id: str
    ) -> Dict[str, Any]:
        """Lädt Pipeline-Statistiken."""
        
        # Hot Leads
        hot_result = self.supabase.table("leads").select(
            "id, estimated_value"
        ).eq(
            "user_id", user_id
        ).eq(
            "temperature", "hot"
        ).eq(
            "status", "active"
        ).execute()
        
        hot_leads = hot_result.data or []
        
        return {
            "new_hot_leads": len(hot_leads),
            "ready_to_close": sum(1 for l in hot_leads if l.get("estimated_value", 0) > 0),
            "estimated_value": sum(l.get("estimated_value", 0) for l in hot_leads),
            "calls_scheduled": 0  # TODO: Implement
        }
    
    async def _get_today_tasks(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Lädt die Tasks für heute."""
        
        tasks = []
        
        # Pending Drafts
        drafts = self.supabase.table("autopilot_drafts").select(
            "id, lead_id, intent"
        ).eq(
            "user_id", user_id
        ).eq(
            "status", "pending"
        ).execute()
        
        for draft in (drafts.data or []):
            tasks.append({
                "type": "draft_review",
                "priority": "medium",
                "description": f"Entwurf prüfen ({draft['intent']})"
            })
        
        # Human Needed
        human_needed = self.supabase.table("autopilot_actions").select(
            "lead_id"
        ).eq(
            "user_id", user_id
        ).eq(
            "action", "human_needed"
        ).gte(
            "created_at", datetime.utcnow().date().isoformat()
        ).execute()
        
        for action in (human_needed.data or []):
            tasks.append({
                "type": "human_needed",
                "priority": "high",
                "description": "Lead braucht persönliche Antwort"
            })
        
        return tasks
    
    def _estimate_user_time(
        self,
        drafts: int,
        human_needed: int,
        calls: int
    ) -> int:
        """Schätzt die benötigte User-Zeit in Minuten."""
        
        # 2 Min pro Draft, 5 Min pro Human-Needed, 15 Min pro Call
        return (drafts * 2) + (human_needed * 5) + (calls * 15)
    
    def _estimate_manual_time(
        self,
        day_stats: Dict[str, int]
    ) -> int:
        """Schätzt wie lange es manuell gedauert hätte."""
        
        # 3 Min pro Nachricht manuell
        return day_stats.get("total_sent", 0) * 3
    
    async def _get_day_stats(
        self,
        user_id: str,
        since: datetime
    ) -> Dict[str, Any]:
        """Lädt Tagesstatistiken."""
        
        result = self.supabase.table("autopilot_actions").select("*").eq(
            "user_id", user_id
        ).gte(
            "created_at", since.isoformat()
        ).execute()
        
        actions = result.data or []
        
        return {
            "total_sent": sum(1 for a in actions if a.get("response_sent")),
            "auto_replies": sum(1 for a in actions if a["action"] == "auto_send"),
            "followups": 0,  # TODO
            "user_approved": sum(1 for a in actions if a["action"] == "draft_review" and a.get("response_sent")),
            "new_replies": 0,  # TODO
            "appointments": 0,  # TODO
            "deals_closed": 0,  # TODO
            "revenue": 0  # TODO
        }
    
    async def _calculate_user_time(
        self,
        user_id: str,
        since: datetime
    ) -> int:
        """Berechnet tatsächliche User-Zeit."""
        
        # TODO: Aus Activity Tracking berechnen
        return 60  # Placeholder
    
    async def _get_tomorrow_preview(
        self,
        user_id: str
    ) -> Dict[str, Any]:
        """Generiert Preview für morgen."""
        
        tomorrow = datetime.utcnow().date() + timedelta(days=1)
        
        # Geplante Follow-ups
        followups = self.supabase.table("follow_up_tasks").select(
            "id"
        ).eq(
            "status", "pending"
        ).lte(
            "scheduled_for", tomorrow.isoformat()
        ).execute()
        
        return {
            "scheduled_followups": len(followups.data or []),
            "scheduled_calls": 0  # TODO
        }
    
    def _generate_greeting(
        self,
        overnight: Dict[str, int],
        pipeline: Dict[str, Any]
    ) -> str:
        """Generiert das Morning Greeting."""
        
        if overnight["auto_replied"] > 5:
            return "☀️ Guten Morgen! Ich war fleißig letzte Nacht..."
        elif pipeline["new_hot_leads"] > 0:
            return f"☀️ Guten Morgen! 🔥 {pipeline['new_hot_leads']} heiße Leads warten!"
        else:
            return "☀️ Guten Morgen! Hier ist dein Briefing..."
    
    async def _generate_followup_message(
        self,
        lead: Dict[str, Any],
        followup_reason: str
    ) -> str:
        """Generiert eine Follow-up Nachricht."""
        
        name = lead.get("name", "")
        
        templates = [
            f"Hey{' ' + name if name else ''}! 👋 Wollte mal nachhaken - hast du dir das schon angeschaut?",
            f"Hi{' ' + name if name else ''}! Kurz gecheckt ob du noch Fragen hast? 😊",
            f"Hey{' ' + name if name else ''}! Ist bei dir alles klar oder kann ich irgendwo helfen?"
        ]
        
        # Rotieren basierend auf Lead-ID Hash
        index = hash(lead.get("id", "")) % len(templates)
        return templates[index]
    
    def _generate_reengagement_message(
        self,
        lead_name: str,
        last_topic: str,
        ghost_type: str
    ) -> str:
        """Generiert eine Re-Engagement Nachricht für Ghosts."""
        
        name_part = f" {lead_name}" if lead_name and not lead_name.startswith("Lead ") else ""
        
        if ghost_type == "soft":
            return (
                f"Hey{name_part}! 👋\n\n"
                "Lange nichts gehört - alles okay bei dir?\n"
                "Falls du noch Fragen hast, melde dich gerne!"
            )
        else:
            return (
                f"Hi{name_part}!\n\n"
                "Ich räume gerade meine Liste auf. 🧹\n"
                "Ist das Thema für dich noch aktuell oder soll ich dich rausnehmen?"
            )
    
    def _generate_last_chance_message(self, lead_name: str) -> str:
        """Generiert eine 'Letzte Chance' Nachricht."""
        
        name_part = f" {lead_name}" if lead_name and not lead_name.startswith("Lead ") else ""
        
        return (
            f"Hey{name_part}! 👋\n\n"
            "Letzte Nachricht von mir - ich nehme dich sonst von der Liste.\n"
            "Falls du doch noch Interesse hast, lass es mich wissen! 😊"
        )

