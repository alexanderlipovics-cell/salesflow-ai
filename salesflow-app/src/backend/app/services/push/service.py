"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PUSH NOTIFICATION SERVICE                                                 ║
║  Morning Briefing & Evening Recap                                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Push Schedule Management
    - Morning Briefing Generation
    - Evening Recap Generation
    - Push Token Registration
    - Streak Tracking
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date, time, timedelta
import json
import os
import random

from supabase import Client
import anthropic

from app.api.schemas.brain import (
    PushScheduleUpdate, PushScheduleResponse,
    MorningBriefing, EveningRecap, TopLead,
)


class PushService:
    """
    Push Notification Service - Morning Briefing & Evening Recap.
    
    Generiert personalisierte tägliche Push-Benachrichtigungen
    für aktive Führung und Motivation.
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.anthropic = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    # =========================================================================
    # SCHEDULE MANAGEMENT
    # =========================================================================
    
    def get_schedule(self, user_id: str) -> PushScheduleResponse:
        """Holt Push-Schedule für User."""
        
        result = self.db.table("push_schedules") \
            .select("*") \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not result.data:
            # Create default schedule
            self.db.table("push_schedules") \
                .insert({"user_id": user_id}) \
                .execute()
            return self.get_schedule(user_id)
        
        data = result.data
        
        return PushScheduleResponse(
            morning_enabled=data.get("morning_enabled", True),
            morning_time=self._parse_time(data.get("morning_time", "08:00:00")),
            morning_days=data.get("morning_days", [1, 2, 3, 4, 5]),
            evening_enabled=data.get("evening_enabled", True),
            evening_time=self._parse_time(data.get("evening_time", "18:00:00")),
            evening_days=data.get("evening_days", [1, 2, 3, 4, 5]),
            timezone=data.get("timezone", "Europe/Vienna"),
            include_stats=data.get("include_stats", True),
            include_tips=data.get("include_tips", True),
            include_motivation=data.get("include_motivation", True),
            push_token_registered=bool(data.get("push_token")),
        )
    
    def update_schedule(
        self, 
        user_id: str, 
        update: PushScheduleUpdate,
    ) -> PushScheduleResponse:
        """Aktualisiert Push-Schedule."""
        
        data = {}
        
        if update.morning_enabled is not None:
            data["morning_enabled"] = update.morning_enabled
        if update.morning_time is not None:
            data["morning_time"] = update.morning_time.isoformat()
        if update.morning_days is not None:
            data["morning_days"] = update.morning_days
        if update.evening_enabled is not None:
            data["evening_enabled"] = update.evening_enabled
        if update.evening_time is not None:
            data["evening_time"] = update.evening_time.isoformat()
        if update.evening_days is not None:
            data["evening_days"] = update.evening_days
        if update.timezone is not None:
            data["timezone"] = update.timezone
        if update.include_stats is not None:
            data["include_stats"] = update.include_stats
        if update.include_tips is not None:
            data["include_tips"] = update.include_tips
        if update.include_motivation is not None:
            data["include_motivation"] = update.include_motivation
        
        if data:
            data["updated_at"] = datetime.utcnow().isoformat()
            
            self.db.table("push_schedules") \
                .update(data) \
                .eq("user_id", user_id) \
                .execute()
        
        return self.get_schedule(user_id)
    
    def register_push_token(
        self,
        user_id: str,
        token: str,
        platform: str,
    ):
        """Registriert Push Token."""
        
        # Ensure schedule exists
        self.get_schedule(user_id)
        
        self.db.table("push_schedules") \
            .update({
                "push_token": token,
                "push_platform": platform,
                "updated_at": datetime.utcnow().isoformat()
            }) \
            .eq("user_id", user_id) \
            .execute()
    
    # =========================================================================
    # MORNING BRIEFING
    # =========================================================================
    
    def generate_morning_briefing(self, user_id: str) -> MorningBriefing:
        """Generiert das Morning Briefing für einen User."""
        
        today = date.today()
        weekday = today.strftime("%A")
        
        # German weekday mapping
        weekday_de = {
            "Monday": "Montag",
            "Tuesday": "Dienstag",
            "Wednesday": "Mittwoch",
            "Thursday": "Donnerstag",
            "Friday": "Freitag",
            "Saturday": "Samstag",
            "Sunday": "Sonntag",
        }.get(weekday, weekday)
        
        # German month mapping
        month_de = {
            1: "Januar", 2: "Februar", 3: "März", 4: "April",
            5: "Mai", 6: "Juni", 7: "Juli", 8: "August",
            9: "September", 10: "Oktober", 11: "November", 12: "Dezember"
        }.get(today.month, str(today.month))
        
        date_str = f"{weekday_de}, {today.day}. {month_de} {today.year}"
        
        # Get user profile
        user_name = self._get_user_name(user_id)
        
        # Get daily targets from daily_plans or use defaults
        targets = self._get_daily_targets(user_id, today)
        
        # Get top leads for today
        top_leads = self._get_top_leads(user_id)
        
        # Get streak
        streak = self._calculate_streak(user_id)
        
        # Generate motivational message
        motivation = self._generate_motivation(user_name, weekday_de, streak, targets)
        
        # Quick actions
        quick_actions = []
        if targets.get("new_contacts", 0) > 0:
            quick_actions.append(f"📱 {targets['new_contacts']} neue Kontakte ansprechen")
        if targets.get("followups", 0) > 0:
            quick_actions.append(f"🔄 {targets['followups']} Follow-ups senden")
        if top_leads:
            quick_actions.append(f"🎯 {top_leads[0].name} kontaktieren")
        
        return MorningBriefing(
            greeting=f"Guten Morgen, {user_name}! ☀️",
            date=date_str,
            daily_targets=targets,
            top_leads=top_leads,
            streak_days=streak,
            motivational_message=motivation,
            quick_actions=quick_actions,
        )
    
    # =========================================================================
    # EVENING RECAP
    # =========================================================================
    
    def generate_evening_recap(self, user_id: str) -> EveningRecap:
        """Generiert den Evening Recap für einen User."""
        
        today = date.today()
        
        # Get user name
        user_name = self._get_user_name(user_id)
        
        # Get targets
        targets = self._get_daily_targets(user_id, today)
        
        # Get completed today
        completed = self._get_completed_today(user_id, today)
        
        # Calculate completion rate
        total_target = sum(targets.values())
        total_completed = sum(completed.values())
        completion_rate = (total_completed / total_target * 100) if total_target > 0 else 0
        
        # Get wins
        wins = self._generate_wins(completed, completion_rate)
        
        # Get lessons (new rules learned)
        new_rules = self._count_new_rules_today(user_id, today)
        
        lessons = []
        if new_rules > 0:
            lessons.append(f"📚 {new_rules} neue Regel(n) gelernt")
        
        # Tomorrow preview
        tomorrow = today + timedelta(days=1)
        pending_followups = self._count_pending_followups(user_id, tomorrow)
        
        tomorrow_preview = f"Morgen: {pending_followups} Follow-ups geplant" if pending_followups > 0 else "Morgen wird ein guter Tag!"
        
        # Greeting based on performance
        if completion_rate >= 100:
            greeting = f"Super Tag, {user_name}! 🏆"
        elif completion_rate >= 70:
            greeting = f"Guter Tag, {user_name}! 👍"
        else:
            greeting = f"Tag vorbei, {user_name}. Morgen wird besser! 💪"
        
        return EveningRecap(
            greeting=greeting,
            completed=completed,
            targets=targets,
            completion_rate=round(completion_rate, 1),
            wins=wins,
            lessons=lessons,
            new_rules_learned=new_rules,
            templates_improved=0,  # TODO: Track this
            tomorrow_preview=tomorrow_preview,
        )
    
    # =========================================================================
    # SEND PUSH (Integration)
    # =========================================================================
    
    async def send_push(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        push_type: str = "general",
    ) -> bool:
        """Sendet Push Notification (Expo/Firebase Integration)."""
        
        # Get push token
        result = self.db.table("push_schedules") \
            .select("push_token, push_platform") \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not result.data or not result.data.get("push_token"):
            return False
        
        # Log push
        self.db.table("push_history") \
            .insert({
                "user_id": user_id,
                "push_type": push_type,
                "title": title,
                "body": body,
                "data": data or {},
            }) \
            .execute()
        
        # TODO: Actual push sending via Expo/Firebase
        # For now, just log
        print(f"[PUSH] {user_id}: {title} - {body}")
        
        return True
    
    def log_push_opened(self, push_id: str, action_taken: Optional[str] = None):
        """Loggt dass eine Push-Notification geöffnet wurde."""
        
        self.db.table("push_history") \
            .update({
                "opened_at": datetime.utcnow().isoformat(),
                "action_taken": action_taken
            }) \
            .eq("id", push_id) \
            .execute()
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _parse_time(self, time_str: str) -> time:
        """Parst Time-String zu time-Objekt."""
        if isinstance(time_str, time):
            return time_str
        
        parts = time_str.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        second = int(parts[2].split(".")[0]) if len(parts) > 2 else 0
        
        return time(hour, minute, second)
    
    def _get_user_name(self, user_id: str) -> str:
        """Holt User-Namen."""
        try:
            result = self.db.table("profiles") \
                .select("full_name, name") \
                .eq("id", user_id) \
                .single() \
                .execute()
            
            if result.data:
                return result.data.get("full_name") or result.data.get("name") or "du"
        except Exception:
            pass
        
        return "du"
    
    def _get_daily_targets(self, user_id: str, for_date: date) -> Dict[str, int]:
        """Holt oder generiert Tagesziele."""
        
        try:
            result = self.db.table("daily_plans") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("date", for_date.isoformat()) \
                .single() \
                .execute()
            
            if result.data:
                return {
                    "new_contacts": result.data.get("new_contacts_target", 5),
                    "followups": result.data.get("followups_target", 3),
                    "reactivations": result.data.get("reactivations_target", 2),
                }
        except Exception:
            pass
        
        # Default targets
        return {
            "new_contacts": 5,
            "followups": 3,
            "reactivations": 2,
        }
    
    def _get_top_leads(self, user_id: str, limit: int = 3) -> List[TopLead]:
        """Holt Top-Leads für heute."""
        
        try:
            # Get leads sorted by priority
            result = self.db.table("leads") \
                .select("id, name, status, channel") \
                .eq("user_id", user_id) \
                .not_.in_("status", ["lost", "customer"]) \
                .order("created_at", desc=True) \
                .limit(limit) \
                .execute()
            
            if result.data:
                leads = []
                for lead in result.data:
                    priority = "high" if lead.get("status") == "hot" else "normal"
                    leads.append(TopLead(
                        id=UUID(lead["id"]) if lead.get("id") else None,
                        name=lead.get("name", "Unbekannt"),
                        status=lead.get("status", "new"),
                        channel=lead.get("channel"),
                        priority=priority,
                    ))
                return leads
        except Exception as e:
            print(f"Error getting top leads: {e}")
        
        return []
    
    def _calculate_streak(self, user_id: str) -> int:
        """Berechnet aktuelle Streak (Tage in Folge mit Activity)."""
        
        try:
            # Count consecutive days with learning_events
            result = self.db.table("learning_events") \
                .select("created_at") \
                .eq("user_id", user_id) \
                .eq("event_type", "message_sent") \
                .order("created_at", desc=True) \
                .limit(100) \
                .execute()
            
            if not result.data:
                return 0
            
            # Get unique dates
            dates = set()
            for row in result.data:
                created_at = row.get("created_at", "")
                if created_at:
                    d = datetime.fromisoformat(created_at.replace("Z", "+00:00")).date()
                    dates.add(d)
            
            # Count streak
            today = date.today()
            streak = 0
            current = today
            
            while current in dates:
                streak += 1
                current -= timedelta(days=1)
            
            return streak
            
        except Exception as e:
            print(f"Error calculating streak: {e}")
        
        return 0
    
    def _generate_motivation(
        self, 
        user_name: str, 
        weekday: str, 
        streak: int,
        targets: Dict[str, int],
    ) -> str:
        """Generiert motivierende Nachricht."""
        
        total = sum(targets.values())
        
        messages = [
            f"Heute stehen {total} Aktionen auf dem Plan. Du schaffst das! 💪",
            f"Jede Nachricht bringt dich näher an dein Ziel. Los geht's! 🚀",
            f"Fokus auf die wichtigsten Kontakte heute. Qualität vor Quantität! 🎯",
            f"Dein Team zählt auf dich. Zeig ihnen, wie es geht! 👊",
        ]
        
        if streak >= 7:
            messages.append(f"🔥 {streak} Tage in Folge aktiv! Nicht aufhören!")
        elif streak >= 3:
            messages.append(f"⚡ {streak}-Tage-Streak! Weiter so!")
        
        if weekday == "Montag":
            messages.append("Neuer Montag, neue Chancen! Diese Woche wird gut. 📈")
        elif weekday == "Freitag":
            messages.append("Freitag = Endspurt! Stark abschließen. 🏁")
        
        return random.choice(messages)
    
    def _get_completed_today(self, user_id: str, for_date: date) -> Dict[str, int]:
        """Holt erledigte Aktivitäten für heute."""
        
        completed = {
            "new_contacts": 0,
            "followups": 0,
            "reactivations": 0,
        }
        
        try:
            # Query learning_events for today
            start = datetime.combine(for_date, time.min).isoformat()
            end = datetime.combine(for_date, time.max).isoformat()
            
            result = self.db.table("learning_events") \
                .select("event_type, metadata") \
                .eq("user_id", user_id) \
                .eq("event_type", "message_sent") \
                .gte("created_at", start) \
                .lte("created_at", end) \
                .execute()
            
            if result.data:
                for row in result.data:
                    metadata = row.get("metadata", {}) or {}
                    message_type = metadata.get("message_type", "")
                    
                    if message_type == "first_contact":
                        completed["new_contacts"] += 1
                    elif message_type == "followup":
                        completed["followups"] += 1
                    elif message_type == "reactivation":
                        completed["reactivations"] += 1
                        
        except Exception as e:
            print(f"Error getting completed: {e}")
        
        return completed
    
    def _generate_wins(self, completed: Dict[str, int], completion_rate: float) -> List[str]:
        """Generiert Win-Nachrichten."""
        
        wins = []
        
        total_messages = sum(completed.values())
        if total_messages > 0:
            wins.append(f"✉️ {total_messages} Nachrichten gesendet")
        
        if completion_rate >= 100:
            wins.append("✅ Tagesziel erreicht!")
        elif completion_rate >= 80:
            wins.append("🎯 Fast am Ziel!")
        
        return wins
    
    def _count_new_rules_today(self, user_id: str, for_date: date) -> int:
        """Zählt heute gelernte Regeln."""
        
        try:
            start = datetime.combine(for_date, time.min).isoformat()
            end = datetime.combine(for_date, time.max).isoformat()
            
            result = self.db.table("sales_brain_rules") \
                .select("id", count="exact") \
                .eq("user_id", user_id) \
                .gte("created_at", start) \
                .lte("created_at", end) \
                .execute()
            
            return result.count or 0
            
        except Exception:
            pass
        
        return 0
    
    def _count_pending_followups(self, user_id: str, for_date: date) -> int:
        """Zählt ausstehende Follow-ups für ein Datum."""
        
        try:
            result = self.db.table("leads") \
                .select("id", count="exact") \
                .eq("user_id", user_id) \
                .in_("status", ["interested", "thinking"]) \
                .lte("next_followup_date", for_date.isoformat()) \
                .execute()
            
            return result.count or 0
            
        except Exception:
            pass
        
        return 0
    
    # =========================================================================
    # BATCH OPERATIONS (for Cronjob)
    # =========================================================================
    
    def get_users_for_morning_push(self, hour: int, minute: int = 0) -> List[Dict]:
        """Holt alle User die jetzt ihr Morning Briefing bekommen sollen."""
        
        try:
            result = self.db.rpc(
                "get_users_for_morning_push",
                {"p_hour": hour, "p_minute": minute}
            ).execute()
            
            return result.data or []
        except Exception as e:
            print(f"Error getting morning users: {e}")
            return []
    
    def get_users_for_evening_push(self, hour: int, minute: int = 0) -> List[Dict]:
        """Holt alle User die jetzt ihren Evening Recap bekommen sollen."""
        
        try:
            result = self.db.rpc(
                "get_users_for_evening_push",
                {"p_hour": hour, "p_minute": minute}
            ).execute()
            
            return result.data or []
        except Exception as e:
            print(f"Error getting evening users: {e}")
            return []

