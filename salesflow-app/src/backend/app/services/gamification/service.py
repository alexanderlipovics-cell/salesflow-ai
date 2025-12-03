"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GAMIFICATION SERVICE                                                      ║
║  Streaks, Achievements & Motivation System                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Streak Tracking (Tage in Folge aktiv)
    - Achievement System (Bronze → Platinum)
    - Streak Freeze (einmal pro Woche)
    - Progress Tracking
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import date, datetime, timedelta

from supabase import Client


class GamificationService:
    """
    Gamification Service - Streaks & Achievements.
    
    Motiviert User durch:
    - Streak-System (konsekutive aktive Tage)
    - Achievement-Badges (Meilensteine)
    - Progress-Tracking
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # STREAKS
    # =========================================================================
    
    def get_streak(self, user_id: str) -> Dict[str, Any]:
        """
        Holt aktuelle Streak-Daten für einen User.
        
        Returns:
            Dict mit:
            - current: Aktuelle Streak-Länge
            - longest: Längste Streak aller Zeiten
            - last_active: Letztes Aktivitätsdatum
            - total_days: Gesamte aktive Tage
            - freeze_available: Streak-Freeze verfügbar?
            - status: 'active_today', 'at_risk', 'broken', 'inactive'
        """
        
        try:
            result = self.db.table("user_streaks") \
                .select("*") \
                .eq("user_id", user_id) \
                .single() \
                .execute()
            
            if not result.data:
                return {
                    "current": 0,
                    "longest": 0,
                    "last_active": None,
                    "total_days": 0,
                    "freeze_available": False,
                    "status": "inactive",
                }
            
            row = result.data
            last_activity = None
            if row.get("last_activity_date"):
                if isinstance(row["last_activity_date"], str):
                    last_activity = date.fromisoformat(row["last_activity_date"])
                else:
                    last_activity = row["last_activity_date"]
            
            # Determine streak status
            status = "inactive"
            current = row.get("current_streak", 0)
            
            if last_activity:
                today = date.today()
                days_since = (today - last_activity).days
                
                if days_since == 0:
                    status = "active_today"
                elif days_since == 1:
                    status = "at_risk"  # Noch nicht heute aktiv
                else:
                    status = "broken"
                    current = 0  # Streak ist gebrochen
            
            return {
                "current": current,
                "longest": row.get("longest_streak", 0),
                "last_active": last_activity.isoformat() if last_activity else None,
                "total_days": row.get("total_active_days", 0),
                "freeze_available": row.get("freeze_available", False),
                "status": status,
            }
        
        except Exception as e:
            print(f"Error getting streak: {e}")
            return {
                "current": 0,
                "longest": 0,
                "last_active": None,
                "total_days": 0,
                "freeze_available": False,
                "status": "inactive",
            }
    
    def record_activity(self, user_id: str) -> Dict[str, Any]:
        """
        Zeichnet Aktivität auf und aktualisiert Streak.
        
        Wird automatisch durch Trigger aufgerufen, kann aber auch
        manuell getriggert werden.
        
        Returns:
            Aktualisierte Streak-Daten
        """
        
        today = date.today()
        
        # Hole existierende Streak
        result = self.db.table("user_streaks") \
            .select("*") \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not result.data:
            # Erstelle neue Streak
            self.db.table("user_streaks").insert({
                "user_id": user_id,
                "current_streak": 1,
                "longest_streak": 1,
                "last_activity_date": today.isoformat(),
                "total_active_days": 1,
            }).execute()
        else:
            row = result.data
            last_date = None
            if row.get("last_activity_date"):
                last_date = date.fromisoformat(row["last_activity_date"]) \
                    if isinstance(row["last_activity_date"], str) \
                    else row["last_activity_date"]
            
            if last_date == today:
                # Bereits heute aktiv
                pass
            elif last_date == today - timedelta(days=1):
                # Streak fortsetzen
                new_streak = row.get("current_streak", 0) + 1
                self.db.table("user_streaks").update({
                    "current_streak": new_streak,
                    "longest_streak": max(row.get("longest_streak", 0), new_streak),
                    "last_activity_date": today.isoformat(),
                    "total_active_days": row.get("total_active_days", 0) + 1,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("user_id", user_id).execute()
            else:
                # Streak gebrochen, neu starten
                self.db.table("user_streaks").update({
                    "current_streak": 1,
                    "last_activity_date": today.isoformat(),
                    "total_active_days": row.get("total_active_days", 0) + 1,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("user_id", user_id).execute()
        
        return self.get_streak(user_id)
    
    def use_streak_freeze(self, user_id: str) -> Dict[str, Any]:
        """
        Nutzt Streak Freeze um verpassten Tag zu überbrücken.
        
        Returns:
            Dict mit:
            - success: Ob Freeze erfolgreich genutzt
            - message: Erklärung
            - streak: Aktuelle Streak-Daten
        """
        
        streak = self.get_streak(user_id)
        
        if not streak["freeze_available"]:
            return {
                "success": False,
                "message": "Kein Streak Freeze verfügbar. Du bekommst jeden Montag einen neuen.",
                "streak": streak,
            }
        
        if streak["status"] != "broken":
            return {
                "success": False,
                "message": "Deine Streak ist nicht gebrochen. Freeze nicht nötig!",
                "streak": streak,
            }
        
        # Apply freeze
        yesterday = date.today() - timedelta(days=1)
        
        try:
            self.db.table("user_streaks").update({
                "freeze_available": False,
                "freeze_used_at": date.today().isoformat(),
                "last_activity_date": yesterday.isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("user_id", user_id).execute()
            
            return {
                "success": True,
                "message": f"Streak gerettet! 🎉 Du hast jetzt {streak['current']} Tage Streak.",
                "streak": self.get_streak(user_id),
            }
        except Exception as e:
            print(f"Error using streak freeze: {e}")
            return {
                "success": False,
                "message": "Technischer Fehler beim Freeze",
                "streak": streak,
            }
    
    def reset_weekly_freeze(self) -> int:
        """
        Setzt Streak Freeze für alle User zurück (jeden Montag aufrufen).
        
        Returns:
            Anzahl aktualisierter User
        """
        
        try:
            result = self.db.table("user_streaks").update({
                "freeze_available": True,
                "updated_at": datetime.utcnow().isoformat(),
            }).neq("freeze_available", True).execute()
            
            return len(result.data) if result.data else 0
        except Exception as e:
            print(f"Error resetting freezes: {e}")
            return 0
    
    # =========================================================================
    # ACHIEVEMENTS
    # =========================================================================
    
    def get_achievements(self, user_id: str) -> Dict[str, Any]:
        """
        Holt alle Achievements eines Users.
        
        Returns:
            Dict mit:
            - total_unlocked: Anzahl freigeschalteter Achievements
            - unlocked: Liste freigeschalteter Achievements
            - in_progress: Liste noch nicht freigeschalteter Achievements
        """
        
        try:
            # Hole User-Achievements mit Definitionen
            result = self.db.table("user_achievements") \
                .select("*, achievement_definitions(emoji)") \
                .eq("user_id", user_id) \
                .order("unlocked", desc=True) \
                .order("progress_percent", desc=True) \
                .execute()
            
            achievements = []
            for row in (result.data or []):
                emoji = ""
                if row.get("achievement_definitions"):
                    emoji = row["achievement_definitions"].get("emoji", "")
                
                achievements.append({
                    "id": row.get("id"),
                    "type": row.get("achievement_type"),
                    "level": row.get("achievement_level"),
                    "name": row.get("achievement_name"),
                    "description": row.get("achievement_description"),
                    "emoji": emoji,
                    "current": row.get("current_value", 0),
                    "target": row.get("target_value", 1),
                    "progress": row.get("progress_percent", 0),
                    "unlocked": row.get("unlocked", False),
                    "unlocked_at": row.get("unlocked_at"),
                })
            
            unlocked = [a for a in achievements if a["unlocked"]]
            in_progress = [a for a in achievements if not a["unlocked"]]
            
            return {
                "total_unlocked": len(unlocked),
                "unlocked": unlocked,
                "in_progress": in_progress,
            }
        
        except Exception as e:
            print(f"Error getting achievements: {e}")
            return {
                "total_unlocked": 0,
                "unlocked": [],
                "in_progress": [],
            }
    
    def check_and_unlock_achievements(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Prüft und schaltet Achievements frei.
        
        Sollte nach relevanten Aktionen aufgerufen werden:
        - Nach Nachricht senden
        - Nach Regel erstellen
        - Nach Deal abschluss
        - etc.
        
        Returns:
            Liste neu freigeschalteter Achievements
        """
        
        newly_unlocked = []
        
        # Get current stats
        stats = self._get_achievement_stats(user_id)
        
        # Achievement checks
        achievement_checks = [
            ("streak", stats.get("current_streak", 0)),
            ("rules_created", stats.get("rules_created", 0)),
            ("messages_sent", stats.get("messages_sent", 0)),
            ("deals_closed", stats.get("deals_closed", 0)),
            ("daily_complete", stats.get("daily_complete_count", 0)),
            ("team_contributor", stats.get("team_rules_created", 0)),
        ]
        
        for achievement_type, current_value in achievement_checks:
            # Get next unlockable level
            try:
                result = self.db.rpc("get_next_unlockable_achievement", {
                    "p_user_id": user_id,
                    "p_achievement_type": achievement_type,
                }).execute()
                
                if result.data and len(result.data) > 0:
                    next_level = result.data[0]
                    
                    if current_value >= next_level.get("target_value", float('inf')):
                        # Unlock!
                        unlocked = self._unlock_achievement(
                            user_id=user_id,
                            achievement_type=achievement_type,
                            level=next_level["level"],
                            current_value=current_value,
                        )
                        
                        if unlocked:
                            newly_unlocked.append(unlocked)
            except Exception as e:
                # Fallback: Direkte Abfrage wenn RPC nicht existiert
                result = self.db.table("achievement_definitions") \
                    .select("*") \
                    .eq("achievement_type", achievement_type) \
                    .lte("target_value", current_value) \
                    .order("level", desc=True) \
                    .limit(1) \
                    .execute()
                
                if result.data:
                    target = result.data[0]
                    
                    # Prüfe ob bereits freigeschaltet
                    existing = self.db.table("user_achievements") \
                        .select("id") \
                        .eq("user_id", user_id) \
                        .eq("achievement_type", achievement_type) \
                        .eq("achievement_level", target["level"]) \
                        .eq("unlocked", True) \
                        .execute()
                    
                    if not existing.data:
                        unlocked = self._unlock_achievement(
                            user_id=user_id,
                            achievement_type=achievement_type,
                            level=target["level"],
                            current_value=current_value,
                        )
                        if unlocked:
                            newly_unlocked.append(unlocked)
        
        return newly_unlocked
    
    def _unlock_achievement(
        self,
        user_id: str,
        achievement_type: str,
        level: int,
        current_value: int,
    ) -> Optional[Dict[str, Any]]:
        """Schaltet ein Achievement frei."""
        
        try:
            # Get definition
            definition = self.db.table("achievement_definitions") \
                .select("*") \
                .eq("achievement_type", achievement_type) \
                .eq("level", level) \
                .single() \
                .execute()
            
            if not definition.data:
                return None
            
            defn = definition.data
            
            # Upsert achievement
            self.db.table("user_achievements").upsert({
                "user_id": user_id,
                "achievement_type": achievement_type,
                "achievement_level": level,
                "achievement_name": defn["name"],
                "achievement_description": defn["description"],
                "current_value": current_value,
                "target_value": defn["target_value"],
                "progress_percent": 100.0,
                "unlocked": True,
                "unlocked_at": datetime.utcnow().isoformat(),
                "notified": False,
            }, on_conflict="user_id,achievement_type,achievement_level").execute()
            
            return {
                "type": achievement_type,
                "level": level,
                "name": defn["name"],
                "emoji": defn["emoji"],
                "description": defn["description"],
            }
        
        except Exception as e:
            print(f"Error unlocking achievement: {e}")
            return None
    
    def _get_achievement_stats(self, user_id: str) -> Dict[str, int]:
        """Holt alle relevanten Stats für Achievement-Checks."""
        
        stats = {
            "current_streak": 0,
            "messages_sent": 0,
            "deals_closed": 0,
            "rules_created": 0,
            "team_rules_created": 0,
            "daily_complete_count": 0,
        }
        
        try:
            # Streak
            streak_result = self.db.table("user_streaks") \
                .select("current_streak") \
                .eq("user_id", user_id) \
                .single() \
                .execute()
            
            if streak_result.data:
                stats["current_streak"] = streak_result.data.get("current_streak", 0)
            
            # Learning events (messages, deals)
            events_result = self.db.table("learning_events") \
                .select("event_type") \
                .eq("user_id", user_id) \
                .in_("event_type", ["message_sent", "deal_won"]) \
                .execute()
            
            if events_result.data:
                for event in events_result.data:
                    if event.get("event_type") == "message_sent":
                        stats["messages_sent"] += 1
                    elif event.get("event_type") == "deal_won":
                        stats["deals_closed"] += 1
            
            # Rules
            rules_result = self.db.table("sales_brain_rules") \
                .select("scope") \
                .eq("user_id", user_id) \
                .eq("is_active", True) \
                .execute()
            
            if rules_result.data:
                for rule in rules_result.data:
                    stats["rules_created"] += 1
                    if rule.get("scope") == "team":
                        stats["team_rules_created"] += 1
            
            # Daily complete count
            daily_result = self.db.table("daily_plans") \
                .select("id") \
                .eq("user_id", user_id) \
                .not_.is_("completed_at", "null") \
                .execute()
            
            if daily_result.data:
                stats["daily_complete_count"] = len(daily_result.data)
        
        except Exception as e:
            print(f"Error getting achievement stats: {e}")
        
        return stats
    
    def update_achievement_progress(
        self,
        user_id: str,
        achievement_type: str,
        current_value: int,
    ):
        """
        Aktualisiert den Fortschritt für ein Achievement.
        
        Nützlich für Progress-Tracking ohne sofortiges Freischalten.
        """
        
        try:
            # Get all definitions for this type
            definitions = self.db.table("achievement_definitions") \
                .select("*") \
                .eq("achievement_type", achievement_type) \
                .order("level") \
                .execute()
            
            if not definitions.data:
                return
            
            for defn in definitions.data:
                target = defn["target_value"]
                progress = min(100.0, (current_value / target) * 100) if target > 0 else 0
                is_unlocked = current_value >= target
                
                self.db.table("user_achievements").upsert({
                    "user_id": user_id,
                    "achievement_type": achievement_type,
                    "achievement_level": defn["level"],
                    "achievement_name": defn["name"],
                    "achievement_description": defn["description"],
                    "current_value": min(current_value, target),
                    "target_value": target,
                    "progress_percent": round(progress, 2),
                    "unlocked": is_unlocked,
                    "unlocked_at": datetime.utcnow().isoformat() if is_unlocked else None,
                }, on_conflict="user_id,achievement_type,achievement_level").execute()
        
        except Exception as e:
            print(f"Error updating achievement progress: {e}")
    
    # =========================================================================
    # LEADERBOARD & STATS
    # =========================================================================
    
    def get_user_stats_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Holt zusammenfassende Gamification-Stats für einen User.
        
        Nützlich für Dashboard-Anzeige.
        """
        
        streak = self.get_streak(user_id)
        achievements = self.get_achievements(user_id)
        
        return {
            "streak": streak,
            "achievements_unlocked": achievements["total_unlocked"],
            "next_achievements": achievements["in_progress"][:3],  # Top 3 nächste
            "total_active_days": streak.get("total_days", 0),
        }

