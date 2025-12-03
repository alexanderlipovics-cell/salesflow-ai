"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PUSH CONTENT GENERATOR                                                    ║
║  Generiert motivierende, personalisierte Push-Inhalte                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Morning Briefing Content
    - Evening Recap Content
    - Personalisierte Begrüßungen
    - Motivierende Nachrichten
    - Quick Wins
"""

from typing import Dict, Any, List, Optional
from datetime import date, datetime, timedelta
from uuid import UUID
import random

from supabase import Client


class PushContentGenerator:
    """
    Generiert personalisierte Push-Inhalte.
    
    Der Content wird für Push-Notifications UND für In-App-Anzeige verwendet.
    """
    
    # Wochentage auf Deutsch
    WEEKDAYS_DE = {
        0: "Montag",
        1: "Dienstag",
        2: "Mittwoch",
        3: "Donnerstag",
        4: "Freitag",
        5: "Samstag",
        6: "Sonntag",
    }
    
    # Monate auf Deutsch
    MONTHS_DE = {
        1: "Januar", 2: "Februar", 3: "März", 4: "April",
        5: "Mai", 6: "Juni", 7: "Juli", 8: "August",
        9: "September", 10: "Oktober", 11: "November", 12: "Dezember"
    }
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # MORNING BRIEFING
    # =========================================================================
    
    def generate_morning_briefing(self, user_id: str) -> Dict[str, Any]:
        """
        Generiert personalisiertes Morning Briefing.
        
        Returns:
            Dict mit push_title, push_body und full_content
        """
        
        user = self._get_user_data(user_id)
        stats = self._get_user_stats(user_id)
        targets = self._get_daily_targets(user_id)
        hot_leads = self._get_priority_leads(user_id)
        streak = self._get_streak(user_id)
        
        # Greeting basierend auf Tageszeit & Wochentag
        greeting = self._generate_morning_greeting(user["name"], streak)
        
        # Main message
        main_message = self._generate_morning_main(targets, hot_leads, streak)
        
        # Quick wins
        quick_wins = self._generate_quick_wins(hot_leads, targets)
        
        # Motivation
        motivation = self._select_motivation(streak, stats)
        
        # Date formatting
        today = date.today()
        date_str = self._format_date(today)
        
        return {
            "type": "morning_briefing",
            
            # Push Notification (kurz)
            "push_title": greeting["short"],
            "push_body": main_message["short"],
            
            # Full Content (wenn User öffnet)
            "full_content": {
                "greeting": greeting["full"],
                "date": date_str,
                
                "stats_preview": {
                    "streak": streak,
                    "total_deals_this_month": stats.get("deals_this_month", 0),
                },
                
                "targets": targets,
                "total_actions": sum(targets.values()),
                
                "priority_leads": hot_leads[:3],
                
                "quick_wins": quick_wins,
                
                "motivation": motivation,
                
                "cta": {
                    "text": "Los geht's! 🚀",
                    "action": "open_daily_flow",
                },
            },
        }
    
    def _generate_morning_greeting(
        self, 
        name: str, 
        streak: int,
    ) -> Dict[str, str]:
        """Generiert personalisierte Begrüßung."""
        
        today = date.today()
        weekday = self.WEEKDAYS_DE.get(today.weekday(), "Tag")
        
        greetings_by_day = {
            "Montag": [
                f"Guten Morgen, {name}! Neue Woche, neue Chancen! 💪",
                f"Hey {name}! Montag = Momentum. Let's go!",
                f"Moin {name}! Die Woche gehört dir! 🚀",
            ],
            "Freitag": [
                f"TGIF, {name}! Noch einmal Vollgas geben! 🔥",
                f"Freitag, {name}! Stark in die Woche raus!",
                f"Hey {name}! Endspurt diese Woche! 💪",
            ],
        }
        
        default_greetings = [
            f"Guten Morgen, {name}! ☀️",
            f"Hey {name}! Bereit für heute?",
            f"Morgen, {name}! Zeit, zu glänzen ✨",
            f"Hi {name}! Ein neuer Tag wartet!",
        ]
        
        # Streak-spezifische Greetings
        if streak >= 30:
            default_greetings.append(f"🔥 {streak} Tage Streak! Legendär, {name}!")
        elif streak >= 7:
            default_greetings.append(f"🔥 {streak} Tage Streak! Weiter so, {name}!")
        elif streak >= 3:
            default_greetings.append(f"Tag {streak} deiner Streak, {name}! 💪")
        
        options = greetings_by_day.get(weekday, default_greetings)
        full = random.choice(options)
        
        # Short version für Push
        if streak >= 7:
            short = f"🔥 {streak} Tage Streak!"
        else:
            short = f"Guten Morgen, {name}!"
        
        return {"full": full, "short": short}
    
    def _generate_morning_main(
        self, 
        targets: Dict[str, int],
        hot_leads: List[Dict],
        streak: int,
    ) -> Dict[str, str]:
        """Generiert Hauptnachricht."""
        
        total = sum(targets.values())
        
        messages = [
            f"{total} Aktionen auf dem Plan. Du schaffst das!",
            f"Heute: {total} Chancen auf Erfolg.",
            f"{total} Schritte näher an dein Ziel.",
            f"Dein Plan: {total} Aktionen. Los geht's!",
        ]
        
        if hot_leads:
            top_lead = hot_leads[0].get("name", "Ein Lead")
            messages.append(f"{top_lead} wartet auf dich! + {total-1} weitere Aktionen")
        
        full = random.choice(messages)
        
        # Short für Push
        if hot_leads:
            short = f"🎯 {hot_leads[0].get('name', 'Lead')} + {total-1} Aktionen"
        else:
            short = f"📋 {total} Aktionen heute"
        
        return {"full": full, "short": short}
    
    def _generate_quick_wins(
        self, 
        hot_leads: List[Dict],
        targets: Dict[str, int],
    ) -> List[Dict[str, str]]:
        """Generiert Quick Win Vorschläge."""
        
        wins = []
        
        if hot_leads:
            wins.append({
                "icon": "🎯",
                "text": f"Schreib {hot_leads[0].get('name', 'deinen Top-Lead')} – hot Lead!",
                "action": f"open_lead:{hot_leads[0].get('id', '')}",
            })
        
        if targets.get("followups", 0) > 0:
            wins.append({
                "icon": "🔄",
                "text": f"{targets['followups']} Follow-ups ausstehend",
                "action": "open_followups",
            })
        
        if targets.get("new_contacts", 0) > 0:
            wins.append({
                "icon": "📱",
                "text": f"{targets['new_contacts']} neue Kontakte finden",
                "action": "open_new_contacts",
            })
        
        if targets.get("reactivations", 0) > 0:
            wins.append({
                "icon": "♻️",
                "text": f"{targets['reactivations']} Kontakte reaktivieren",
                "action": "open_reactivations",
            })
        
        return wins[:3]
    
    def _select_motivation(self, streak: int, stats: Dict) -> str:
        """Wählt passende Motivation."""
        
        motivations = [
            "Jede Nachricht bringt dich näher an dein Ziel. 🎯",
            "Konsistenz schlägt Perfektion. Jeden Tag ein bisschen.",
            "Dein zukünftiges Ich wird dir danken. 💪",
            "Erfolg ist die Summe kleiner Anstrengungen.",
            "Du bist näher dran, als du denkst.",
            "Heute ist der perfekte Tag für einen Deal! 🤝",
            "Ein Gespräch kann alles ändern.",
        ]
        
        # Streak-spezifisch
        if streak >= 30:
            motivations.append("30+ Tage! Du bist eine Sales-Maschine! 🏆")
        elif streak >= 7:
            motivations.append(f"{streak} Tage – das nennt man Disziplin! 🔥")
        elif streak >= 3:
            motivations.append(f"Tag {streak} – bleib dran, es lohnt sich!")
        
        # Performance-spezifisch
        if stats.get("reply_rate", 0) > 30:
            motivations.append(f"{stats['reply_rate']:.0f}% Reply Rate – du machst das richtig! ✨")
        
        if stats.get("deals_this_month", 0) > 0:
            motivations.append(f"Schon {stats['deals_this_month']} Deal(s) diesen Monat! 🎉")
        
        return random.choice(motivations)
    
    # =========================================================================
    # EVENING RECAP
    # =========================================================================
    
    def generate_evening_recap(self, user_id: str) -> Dict[str, Any]:
        """
        Generiert personalisiertes Evening Recap.
        
        Returns:
            Dict mit push_title, push_body und full_content
        """
        
        user = self._get_user_data(user_id)
        targets = self._get_daily_targets(user_id)
        completed = self._get_today_completed(user_id)
        wins = self._get_today_wins(user_id)
        learnings = self._get_today_learnings(user_id)
        streak = self._get_streak(user_id)
        tomorrow = self._get_tomorrow_preview(user_id)
        
        # Calculate completion
        total_target = sum(targets.values())
        total_completed = sum(completed.values())
        completion_rate = (total_completed / total_target * 100) if total_target > 0 else 0
        
        # Greeting based on performance
        greeting = self._generate_evening_greeting(user["name"], completion_rate, streak)
        
        return {
            "type": "evening_recap",
            
            # Push Notification
            "push_title": greeting["short"],
            "push_body": f"📊 {completion_rate:.0f}% erreicht | {len(wins)} Wins",
            
            # Full Content
            "full_content": {
                "greeting": greeting["full"],
                
                "performance": {
                    "completed": completed,
                    "targets": targets,
                    "completion_rate": round(completion_rate, 1),
                    "total_completed": total_completed,
                    "total_target": total_target,
                },
                
                "wins": wins,
                "learnings": learnings,
                
                "streak": {
                    "current": streak,
                    "message": self._get_streak_message(streak, completion_rate > 0),
                },
                
                "tomorrow": tomorrow,
                
                "cta": {
                    "text": "Details ansehen",
                    "action": "open_analytics",
                },
            },
        }
    
    def _generate_evening_greeting(
        self, 
        name: str, 
        completion_rate: float,
        streak: int,
    ) -> Dict[str, str]:
        """Generiert Abend-Begrüßung basierend auf Performance."""
        
        if completion_rate >= 100:
            options = [
                f"Hammer Tag, {name}! 🏆",
                f"100%! Du hast es drauf, {name}!",
                f"Tagesziel erreicht! Stark, {name}! 💪",
                f"Perfekter Tag, {name}! 🎉",
            ]
            short = "🏆 Tagesziel erreicht!"
        elif completion_rate >= 70:
            options = [
                f"Guter Tag, {name}! 👍",
                f"Solide Arbeit heute, {name}!",
                f"Fast geschafft, {name}!",
            ]
            short = f"👍 {completion_rate:.0f}% geschafft!"
        elif completion_rate >= 30:
            options = [
                f"Jeder Schritt zählt, {name}.",
                f"Morgen wird besser, {name}!",
                f"Dranbleiben, {name}!",
            ]
            short = f"💪 {completion_rate:.0f}% - Morgen mehr!"
        else:
            options = [
                f"Morgen ist ein neuer Tag, {name}.",
                f"Nicht aufgeben, {name}!",
                f"Jeder fängt mal klein an.",
            ]
            short = "🌅 Morgen wird's besser!"
        
        return {
            "full": random.choice(options),
            "short": short,
        }
    
    def _get_streak_message(self, streak: int, was_active: bool) -> str:
        """Generiert Streak-Nachricht."""
        
        if not was_active:
            if streak > 0:
                return f"⚠️ Deine {streak}-Tage-Streak ist in Gefahr!"
            return "Starte morgen deine erste Streak!"
        
        if streak >= 30:
            return f"🔥 {streak} Tage! Du bist unstoppable!"
        elif streak >= 7:
            return f"🔥 {streak} Tage Streak! Weiter so!"
        elif streak >= 3:
            return f"⚡ {streak} Tage am Stück! Nicht aufhören!"
        else:
            return f"✨ Tag {streak} – Streak gestartet!"
    
    # =========================================================================
    # DATA HELPERS
    # =========================================================================
    
    def _get_user_data(self, user_id: str) -> Dict[str, Any]:
        """Holt User-Daten."""
        try:
            result = self.db.table("profiles") \
                .select("full_name, name, skill_level") \
                .eq("id", user_id) \
                .single() \
                .execute()
            
            if result.data:
                name = result.data.get("full_name") or result.data.get("name") or "du"
                # Nur Vorname
                if " " in name:
                    name = name.split()[0]
                return {
                    "name": name,
                    "skill_level": result.data.get("skill_level", "rookie"),
                }
        except Exception:
            pass
        
        return {"name": "du", "skill_level": "rookie"}
    
    def _get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Holt User-Statistiken."""
        stats = {
            "deals_this_month": 0,
            "reply_rate": 0,
        }
        
        try:
            # Deals this month
            today = date.today()
            month_start = today.replace(day=1)
            
            deals_result = self.db.table("learning_events") \
                .select("id") \
                .eq("user_id", user_id) \
                .eq("event_type", "deal_won") \
                .gte("created_at", month_start.isoformat()) \
                .execute()
            
            stats["deals_this_month"] = len(deals_result.data or [])
            
            # Reply rate (simple calculation)
            messages_result = self.db.table("learning_events") \
                .select("event_type") \
                .eq("user_id", user_id) \
                .in_("event_type", ["message_sent", "message_replied"]) \
                .execute()
            
            if messages_result.data:
                sent = sum(1 for e in messages_result.data if e.get("event_type") == "message_sent")
                replied = sum(1 for e in messages_result.data if e.get("event_type") == "message_replied")
                if sent > 0:
                    stats["reply_rate"] = (replied / sent) * 100
        
        except Exception as e:
            print(f"Error getting stats: {e}")
        
        return stats
    
    def _get_daily_targets(self, user_id: str) -> Dict[str, int]:
        """Holt oder generiert Tagesziele."""
        try:
            result = self.db.table("daily_plans") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("date", date.today().isoformat()) \
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
        
        return {"new_contacts": 5, "followups": 3, "reactivations": 2}
    
    def _get_priority_leads(self, user_id: str) -> List[Dict]:
        """Holt priorisierte Leads."""
        try:
            result = self.db.table("leads") \
                .select("id, name, status, channel") \
                .eq("user_id", user_id) \
                .in_("status", ["hot", "interested"]) \
                .order("updated_at", desc=True) \
                .limit(5) \
                .execute()
            
            return result.data or []
        except Exception:
            return []
    
    def _get_streak(self, user_id: str) -> int:
        """Holt aktuelle Streak."""
        try:
            result = self.db.table("user_streaks") \
                .select("current_streak") \
                .eq("user_id", user_id) \
                .single() \
                .execute()
            
            return result.data.get("current_streak", 0) if result.data else 0
        except Exception:
            return 0
    
    def _get_today_completed(self, user_id: str) -> Dict[str, int]:
        """Holt erledigte Aktivitäten für heute."""
        completed = {"new_contacts": 0, "followups": 0, "reactivations": 0}
        
        try:
            today = date.today()
            result = self.db.table("learning_events") \
                .select("metadata") \
                .eq("user_id", user_id) \
                .eq("event_type", "message_sent") \
                .gte("created_at", today.isoformat()) \
                .lt("created_at", (today + timedelta(days=1)).isoformat()) \
                .execute()
            
            for row in (result.data or []):
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
    
    def _get_today_wins(self, user_id: str) -> List[str]:
        """Generiert Win-Nachrichten für heute."""
        wins = []
        today = date.today()
        
        try:
            result = self.db.table("learning_events") \
                .select("event_type") \
                .eq("user_id", user_id) \
                .gte("created_at", today.isoformat()) \
                .lt("created_at", (today + timedelta(days=1)).isoformat()) \
                .execute()
            
            events = result.data or []
            
            # Deals
            deals = sum(1 for e in events if e.get("event_type") == "deal_won")
            if deals:
                wins.append(f"🎉 {deals} Deal(s) abgeschlossen!")
            
            # Replies
            replies = sum(1 for e in events if e.get("event_type") == "message_replied")
            if replies:
                wins.append(f"💬 {replies} Antwort(en) bekommen!")
            
            # Messages
            messages = sum(1 for e in events if e.get("event_type") == "message_sent")
            if messages >= 10:
                wins.append(f"✉️ {messages} Nachrichten gesendet!")
        
        except Exception:
            pass
        
        return wins
    
    def _get_today_learnings(self, user_id: str) -> List[str]:
        """Holt Learnings für heute."""
        learnings = []
        today = date.today()
        
        try:
            result = self.db.table("sales_brain_rules") \
                .select("id") \
                .eq("user_id", user_id) \
                .gte("created_at", today.isoformat()) \
                .lt("created_at", (today + timedelta(days=1)).isoformat()) \
                .execute()
            
            rules = len(result.data or [])
            if rules:
                learnings.append(f"🧠 {rules} neue Regel(n) gelernt")
        
        except Exception:
            pass
        
        return learnings
    
    def _get_tomorrow_preview(self, user_id: str) -> Dict[str, Any]:
        """Generiert Vorschau für morgen."""
        tomorrow = date.today() + timedelta(days=1)
        
        try:
            result = self.db.table("leads") \
                .select("id") \
                .eq("user_id", user_id) \
                .in_("status", ["interested", "thinking"]) \
                .lte("next_followup_date", tomorrow.isoformat()) \
                .execute()
            
            pending = len(result.data or [])
            
            return {
                "pending_followups": pending,
                "message": f"{pending} Follow-ups warten" if pending else "Saubere Inbox!",
            }
        
        except Exception:
            return {"pending_followups": 0, "message": "Morgen wird gut!"}
    
    def _format_date(self, d: date) -> str:
        """Formatiert Datum auf Deutsch."""
        weekday = self.WEEKDAYS_DE.get(d.weekday(), "Tag")
        month = self.MONTHS_DE.get(d.month, str(d.month))
        return f"{weekday}, {d.day}. {month} {d.year}"

