"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TEAM BROADCAST SERVICE                                                    ║
║  Best Practices vom Leader zum Team                                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Was passiert:
1. System erkennt: "Deine Sprachnachrichten haben 65% Antwortrate"
2. System fragt: "Als Best Practice fürs Team speichern?"
3. Leader approved
4. Team sieht es im Morning Briefing

Das skaliert Exzellenz - die besten Techniken eines Top-Performers
werden automatisch für alle verfügbar.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json

from supabase import Client


class BroadcastService:
    """
    Verwaltet Team Broadcasts - Best Practices die geteilt werden.
    
    Ermöglicht es Leaders, erfolgreiche Strategien im Team zu skalieren.
    """
    
    # Thresholds für automatische Suggestions
    MIN_SEND_COUNT = 30
    MIN_REPLY_RATE = 0.4
    MIN_IMPROVEMENT = 0.15  # 15% besser als Durchschnitt
    
    def __init__(self, db: Client):
        self.db = db
    
    def detect_broadcast_candidates(
        self,
        user_id: str,
        team_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Findet Templates/Strategien die gut genug fürs Team sind.
        
        Sucht nach:
        - Templates mit überdurchschnittlicher Performance
        - Muster die signifikant besser funktionieren
        - Strategien mit hoher Reply-Rate
        """
        candidates = []
        
        try:
            # Get user's average performance
            avg_result = self.db.table("template_performance").select(
                "response_rate_30d"
            ).execute()
            
            if avg_result.data:
                avg_rates = [r.get("response_rate_30d", 0) for r in avg_result.data if r.get("response_rate_30d")]
                avg_reply_rate = sum(avg_rates) / len(avg_rates) if avg_rates else 0.3
            else:
                avg_reply_rate = 0.3
            
            # Find templates significantly above average
            result = self.db.table("templates").select(
                "id, name, content, category, template_performance(uses_last_30d, response_rate_30d)"
            ).eq("created_by", user_id).eq("is_active", True).execute()
            
            for template in (result.data or []):
                perf = template.get("template_performance")
                if not perf:
                    continue
                
                # Handle nested list from join
                if isinstance(perf, list) and perf:
                    perf = perf[0]
                
                uses = perf.get("uses_last_30d", 0)
                rate = perf.get("response_rate_30d", 0) or 0
                
                if uses >= self.MIN_SEND_COUNT and rate >= self.MIN_REPLY_RATE:
                    improvement = (rate - avg_reply_rate) / avg_reply_rate if avg_reply_rate > 0 else 0
                    
                    if improvement >= self.MIN_IMPROVEMENT:
                        candidates.append({
                            "template_id": template["id"],
                            "template_name": template["name"],
                            "category": template.get("category"),
                            "content": template.get("content", "")[:200] + "...",
                            "send_count": uses,
                            "reply_rate": rate,
                            "improvement": improvement,
                            "improvement_percent": f"+{improvement * 100:.0f}%",
                        })
            
            # Sort by improvement
            candidates.sort(key=lambda x: x["improvement"], reverse=True)
            
        except Exception as e:
            print(f"Error detecting broadcast candidates: {e}")
        
        return candidates[:5]  # Top 5 candidates
    
    def create_broadcast_suggestion(
        self,
        creator_user_id: str,
        team_id: str,
        company_id: Optional[str],
        broadcast_type: str,
        source_id: str,
        title: str,
        description: str,
        content: Dict[str, Any],
        performance_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Erstellt einen Broadcast-Vorschlag"""
        
        broadcast_data = {
            "creator_user_id": creator_user_id,
            "team_id": team_id,
            "company_id": company_id,
            "broadcast_type": broadcast_type,
            "source_type": "auto_detected",
            "source_id": source_id,
            "title": title,
            "description": description,
            "content": content,
            "performance_data": performance_data,
            "status": "suggested",
        }
        
        result = self.db.table("team_broadcasts").insert(broadcast_data).execute()
        
        if result.data:
            return result.data[0]
        
        raise Exception("Failed to create broadcast suggestion")
    
    def approve_broadcast(
        self,
        broadcast_id: str,
        approver_id: str,
        show_in_morning_briefing: bool = True,
    ) -> Dict[str, Any]:
        """Leader genehmigt Broadcast fürs Team"""
        
        result = self.db.table("team_broadcasts").update({
            "status": "team_active",
            "approved_by": approver_id,
            "approved_at": datetime.utcnow().isoformat(),
            "show_in_morning_briefing": show_in_morning_briefing,
        }).eq("id", broadcast_id).execute()
        
        if result.data:
            return result.data[0]
        
        raise Exception("Failed to approve broadcast")
    
    def reject_broadcast(
        self,
        broadcast_id: str,
        reason: str,
    ):
        """Leader lehnt Broadcast ab"""
        
        self.db.table("team_broadcasts").update({
            "status": "team_archived",
            "rejection_reason": reason,
        }).eq("id", broadcast_id).execute()
    
    def get_team_broadcasts(
        self,
        team_id: str,
        status: Optional[str] = None,
        broadcast_type: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Holt alle Broadcasts für ein Team"""
        
        query = self.db.table("team_broadcasts").select(
            "*, profiles:creator_user_id(full_name)"
        ).eq("team_id", team_id)
        
        if status:
            query = query.eq("status", status)
        
        if broadcast_type:
            query = query.eq("broadcast_type", broadcast_type)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        # Flatten creator name
        broadcasts = []
        for b in (result.data or []):
            if b.get("profiles"):
                b["creator_name"] = b["profiles"].get("full_name", "Unbekannt")
            else:
                b["creator_name"] = "Unbekannt"
            if "profiles" in b:
                del b["profiles"]
            broadcasts.append(b)
        
        return broadcasts
    
    def get_pending_broadcasts(
        self,
        team_id: str,
    ) -> List[Dict[str, Any]]:
        """Holt ausstehende Broadcasts zur Genehmigung (für Leader)"""
        return self.get_team_broadcasts(team_id, status="suggested")
    
    def get_morning_briefing_broadcasts(
        self,
        team_id: str,
    ) -> List[Dict[str, Any]]:
        """Holt Broadcasts für Morning Briefing"""
        
        result = self.db.table("team_broadcasts").select("*").eq(
            "team_id", team_id
        ).eq("status", "team_active").eq(
            "show_in_morning_briefing", True
        ).order("approved_at", desc=True).limit(3).execute()
        
        return result.data or []
    
    def track_adoption(
        self,
        broadcast_id: str,
        user_id: str,
    ):
        """Trackt wenn ein Team-Mitglied einen Broadcast nutzt"""
        
        # Increment adoption count
        current = self.db.table("team_broadcasts").select(
            "team_adoption_count"
        ).eq("id", broadcast_id).execute()
        
        if current.data:
            current_count = current.data[0].get("team_adoption_count", 0)
            self.db.table("team_broadcasts").update({
                "team_adoption_count": current_count + 1,
            }).eq("id", broadcast_id).execute()
    
    def create_leader_broadcast(
        self,
        creator_user_id: str,
        team_id: str,
        company_id: Optional[str],
        broadcast_type: str,
        title: str,
        description: str,
        content: Dict[str, Any],
        show_in_morning_briefing: bool = True,
    ) -> Dict[str, Any]:
        """
        Leader erstellt manuell einen Broadcast (sofort aktiv).
        
        Für wenn der Leader selbst eine Best Practice teilen möchte.
        """
        
        broadcast_data = {
            "creator_user_id": creator_user_id,
            "team_id": team_id,
            "company_id": company_id,
            "broadcast_type": broadcast_type,
            "source_type": "leader_created",
            "title": title,
            "description": description,
            "content": content,
            "status": "team_active",
            "approved_by": creator_user_id,
            "approved_at": datetime.utcnow().isoformat(),
            "show_in_morning_briefing": show_in_morning_briefing,
        }
        
        result = self.db.table("team_broadcasts").insert(broadcast_data).execute()
        
        if result.data:
            return result.data[0]
        
        raise Exception("Failed to create leader broadcast")
    
    def format_broadcasts_for_prompt(
        self,
        broadcasts: List[Dict[str, Any]],
    ) -> str:
        """Formatiert Broadcasts für CHIEF System Prompt"""
        if not broadcasts:
            return "Keine Team Best Practices verfügbar."
        
        lines = []
        for bc in broadcasts[:3]:  # Max 3 broadcasts
            perf = bc.get("performance_data", {})
            reply_rate = perf.get("reply_rate", 0)
            improvement = perf.get("improvement_vs_average", "")
            
            title = bc.get("title", "Unbekannt")
            desc = bc.get("description", "")
            
            lines.append(
                f"📣 **{title}**\n"
                f"   {desc}\n"
                f"   Performance: {reply_rate * 100:.0f}% Antwortrate {improvement}"
            )
        
        return "\n\n".join(lines)
    
    def get_user_teams(self, user_id: str) -> List[Dict[str, Any]]:
        """Holt alle Teams eines Users"""
        
        result = self.db.table("team_members").select(
            "team_id, role, teams(id, name, leader_id)"
        ).eq("user_id", user_id).execute()
        
        teams = []
        for tm in (result.data or []):
            if tm.get("teams"):
                team = tm["teams"]
                team["role"] = tm.get("role", "member")
                team["is_leader"] = team.get("leader_id") == user_id or tm.get("role") == "leader"
                teams.append(team)
        
        return teams

