"""
╔════════════════════════════════════════════════════════════════════════════╗
║  COACH ANALYTICS SERVICE                                                   ║
║  Generiert personalisierte Coach-Tipps basierend auf Patterns              ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Mood Distribution Analysis
    - Decision Tendency Analysis
    - Personalisierte Coach-Tipps
    - Vertical-spezifische Empfehlungen
"""

from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from supabase import Client

from ...config.verticals import get_vertical_config


@dataclass
class CoachTip:
    """Ein Coach-Tipp."""
    
    id: str
    title: str
    description: str
    priority: str  # high, medium, low
    action_type: str  # info, script_change, follow_up, training
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert zu Dictionary."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "action_type": self.action_type
        }


@dataclass
class CoachInsights:
    """Vollständige Coach-Insights für einen User."""
    
    user_id: str
    company_id: str
    vertical: Optional[str]
    days: int
    sessions_analyzed: int
    moods: List[Dict[str, Any]]
    decisions: List[Dict[str, Any]]
    tips: List[CoachTip]
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert zu Dictionary."""
        return {
            "user_id": self.user_id,
            "company_id": self.company_id,
            "vertical": self.vertical,
            "days": self.days,
            "sessions_analyzed": self.sessions_analyzed,
            "moods": self.moods,
            "decisions": self.decisions,
            "tips": [t.to_dict() for t in self.tips]
        }


class CoachAnalyticsService:
    """
    Service für Coach Analytics und Tipp-Generierung.
    """
    
    def __init__(self, db: Client):
        """
        Initialisiert den Service.
        
        Args:
            db: Supabase Client
        """
        self.db = db
    
    def get_coach_insights(
        self,
        user_id: str,
        company_id: str,
        days: int = 30
    ) -> CoachInsights:
        """
        Holt Coach-Insights für einen User.
        
        Args:
            user_id: User ID
            company_id: Company ID
            days: Analyse-Zeitraum in Tagen
            
        Returns:
            CoachInsights Objekt
        """
        # Company Info holen
        company = self.db.table("companies").select(
            "name, vertical"
        ).eq("id", company_id).single().execute()
        
        vertical = company.data.get("vertical") if company.data else None
        
        # Mood Distribution
        moods = self._get_mood_distribution(user_id, company_id, days)
        
        # Decision Distribution
        decisions = self._get_decision_distribution(user_id, company_id, days)
        
        # Sessions Count
        sessions_count = self._get_sessions_count(user_id, company_id, days)
        
        # Tipps generieren
        tips = self._generate_tips(moods, decisions, vertical)
        
        return CoachInsights(
            user_id=user_id,
            company_id=company_id,
            vertical=vertical,
            days=days,
            sessions_analyzed=sessions_count,
            moods=moods,
            decisions=decisions,
            tips=tips
        )
    
    def _get_mood_distribution(
        self, 
        user_id: str, 
        company_id: str, 
        days: int
    ) -> List[Dict[str, Any]]:
        """
        Holt Mood-Verteilung.
        """
        try:
            # Direkte SQL-Abfrage über RPC oder View
            result = self.db.rpc("la_get_coach_insights", {
                "p_user_id": user_id,
                "p_company_id": company_id,
                "p_days": days
            }).execute()
            
            if result.data:
                return result.data.get("moods", [])
            
            # Fallback: Direkte Query
            query_result = self.db.table("la_queries").select(
                "contact_mood, session_id"
            ).not_.is_("contact_mood", "null").execute()
            
            # Manuell aggregieren (vereinfacht)
            mood_counts: Dict[str, int] = {}
            for q in query_result.data or []:
                mood = q.get("contact_mood")
                if mood:
                    mood_counts[mood] = mood_counts.get(mood, 0) + 1
            
            return [
                {"mood": mood, "count": count}
                for mood, count in mood_counts.items()
            ]
            
        except Exception as e:
            print(f"Mood distribution error: {e}")
            return []
    
    def _get_decision_distribution(
        self, 
        user_id: str, 
        company_id: str, 
        days: int
    ) -> List[Dict[str, Any]]:
        """
        Holt Decision-Verteilung.
        """
        try:
            result = self.db.rpc("la_get_coach_insights", {
                "p_user_id": user_id,
                "p_company_id": company_id,
                "p_days": days
            }).execute()
            
            if result.data:
                return result.data.get("decisions", [])
            
            return []
            
        except Exception as e:
            print(f"Decision distribution error: {e}")
            return []
    
    def _get_sessions_count(
        self, 
        user_id: str, 
        company_id: str, 
        days: int
    ) -> int:
        """
        Zählt analysierte Sessions.
        """
        try:
            result = self.db.table("la_sessions").select(
                "id", count="exact"
            ).eq("user_id", user_id).eq("company_id", company_id).execute()
            
            return result.count or 0
            
        except Exception as e:
            print(f"Sessions count error: {e}")
            return 0
    
    def _generate_tips(
        self,
        moods: List[Dict[str, Any]],
        decisions: List[Dict[str, Any]],
        vertical: Optional[str]
    ) -> List[CoachTip]:
        """
        Generiert Coach-Tipps basierend auf Patterns.
        """
        tips = []
        
        # Berechne Shares
        total_moods = sum(m.get("count", 0) for m in moods) or 1
        total_decisions = sum(d.get("count", 0) for d in decisions) or 1
        
        def get_share(items: List[Dict], key_name: str, key_value: str) -> float:
            for item in items:
                if item.get("mood") == key_value or item.get("tendency") == key_value:
                    return (item.get("count", 0) / total_moods * 100)
            return 0.0
        
        # 1. Gestresste Kontakte
        stress_share = get_share(moods, "mood", "gestresst")
        if stress_share >= 40:
            tips.append(CoachTip(
                id="high_stress",
                title="Viele gestresste Kontakte – Intro anpassen",
                description=f"Etwa {round(stress_share)}% deiner Kontakte wirken gestresst. "
                           f"Teste kürzere, entlastende Einstiege wie: "
                           f"'Ich weiß, du hast viel um die Ohren – ich halt's kurz.'",
                priority="high",
                action_type="script_change"
            ))
        
        # 2. Hohe Skepsis
        skeptic_share = get_share(moods, "mood", "skeptisch")
        if skeptic_share >= 30:
            tips.append(CoachTip(
                id="high_skepticism",
                title="Viele skeptische Kontakte – mehr Beweise",
                description=f"Etwa {round(skeptic_share)}% deiner Kontakte sind skeptisch. "
                           f"Nutze mehr evidenzbasierte Antworten (Tests, Studien, Testimonials) "
                           f"und weniger 'Hype'.",
                priority="high",
                action_type="script_change"
            ))
        
        # 3. Viele "on hold"
        on_hold_share = get_share(decisions, "tendency", "on_hold")
        if on_hold_share >= 35:
            tips.append(CoachTip(
                id="high_on_hold",
                title="Viele Deals bleiben auf 'mal schauen'",
                description=f"Rund {round(on_hold_share)}% deiner Kontakte landen auf 'ich überlege noch'. "
                           f"Vereinbare konkrete nächste Schritte statt 'meld dich einfach'.",
                priority="medium",
                action_type="follow_up"
            ))
        
        # 4. Close-to-yes Potential
        close_yes_share = get_share(decisions, "tendency", "close_to_yes")
        if close_yes_share >= 30 and on_hold_share >= 25:
            tips.append(CoachTip(
                id="closing_opportunity",
                title="Viele Interessenten kurz vor Ja – aktiver closen",
                description="Du hast viele Interessenten kurz vor Ja, die dann doch zögern. "
                           "Baue früher klare nächste Schritte ein.",
                priority="high",
                action_type="training"
            ))
        
        # 5. Vertical-spezifisch: Network Marketing
        if vertical == "network_marketing" and skeptic_share >= 25:
            tips.append(CoachTip(
                id="mlm_skepticism",
                title="MLM-Skepsis aktiv adressieren",
                description="Viele deiner Kontakte sind skeptisch gegenüber dem Geschäftsmodell. "
                           "Trenne früh Produkt-Nutzen von Business-Opportunity.",
                priority="high",
                action_type="training"
            ))
        
        # 6. Vertical-spezifisch: Real Estate
        if vertical == "real_estate" and close_yes_share >= 30:
            tips.append(CoachTip(
                id="re_closing",
                title="Immobilien: Concrete Next Steps",
                description="Bei Immobilien sind konkrete Schritte wichtig: "
                           "Zweitbesichtigung, Bankunterlagen, Notartermin.",
                priority="high",
                action_type="training"
            ))
        
        # 7. Health & Wellness
        if vertical == "health_wellness" and skeptic_share >= 20:
            tips.append(CoachTip(
                id="hw_evidence",
                title="Mehr wissenschaftliche Beweise nutzen",
                description="Im Health-Bereich ist Evidenz entscheidend. "
                           "Nutze Studien, Tests und messbare Ergebnisse stärker.",
                priority="high",
                action_type="script_change"
            ))
        
        # 8. Positives Momentum
        positive_share = get_share(moods, "mood", "positiv")
        if positive_share >= 50:
            tips.append(CoachTip(
                id="positive_momentum",
                title="Positives Momentum – nutze es!",
                description=f"{round(positive_share)}% deiner Kontakte sind positiv gestimmt. "
                           f"Das ist super! Nutze direkteren Ton und schnellere Abschlüsse.",
                priority="medium",
                action_type="info"
            ))
        
        # Sortiere nach Priorität
        priority_order = {"high": 0, "medium": 1, "low": 2}
        tips.sort(key=lambda t: priority_order.get(t.priority, 3))
        
        return tips
    
    def get_performance_metrics(
        self,
        user_id: str,
        company_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Holt Performance-Metriken.
        
        Args:
            user_id: User ID
            company_id: Company ID
            days: Analyse-Zeitraum
            
        Returns:
            Metriken Dictionary
        """
        try:
            # Sessions
            sessions = self.db.table("la_sessions").select(
                "id, queries_count, duration_seconds, avg_response_time_ms, session_outcome"
            ).eq("user_id", user_id).eq("company_id", company_id).execute()
            
            if not sessions.data:
                return {
                    "total_sessions": 0,
                    "total_queries": 0,
                    "avg_session_duration": 0,
                    "avg_response_time_ms": 0,
                    "outcomes": {}
                }
            
            total_sessions = len(sessions.data)
            total_queries = sum(s.get("queries_count", 0) or 0 for s in sessions.data)
            avg_duration = sum(s.get("duration_seconds", 0) or 0 for s in sessions.data) / total_sessions
            
            response_times = [s.get("avg_response_time_ms") for s in sessions.data if s.get("avg_response_time_ms")]
            avg_response = sum(response_times) / len(response_times) if response_times else 0
            
            # Outcomes
            outcomes: Dict[str, int] = {}
            for s in sessions.data:
                outcome = s.get("session_outcome") or "unknown"
                outcomes[outcome] = outcomes.get(outcome, 0) + 1
            
            return {
                "total_sessions": total_sessions,
                "total_queries": total_queries,
                "avg_session_duration": round(avg_duration),
                "avg_response_time_ms": round(avg_response),
                "outcomes": outcomes,
                "queries_per_session": round(total_queries / total_sessions, 1) if total_sessions else 0
            }
            
        except Exception as e:
            print(f"Performance metrics error: {e}")
            return {}
    
    def get_objection_analytics(
        self,
        company_id: str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Holt Einwand-Analytics für eine Company.
        
        Args:
            company_id: Company ID
            days: Analyse-Zeitraum
            
        Returns:
            Liste von Einwand-Statistiken
        """
        try:
            result = self.db.table("la_queries").select(
                "detected_objection_type, was_helpful"
            ).eq("detected_intent", "objection").not_.is_(
                "detected_objection_type", "null"
            ).execute()
            
            # Aggregieren
            stats: Dict[str, Dict[str, int]] = {}
            for q in result.data or []:
                obj_type = q.get("detected_objection_type")
                if obj_type:
                    if obj_type not in stats:
                        stats[obj_type] = {"count": 0, "helpful": 0}
                    stats[obj_type]["count"] += 1
                    if q.get("was_helpful"):
                        stats[obj_type]["helpful"] += 1
            
            # Format
            return [
                {
                    "objection_type": obj_type,
                    "count": data["count"],
                    "helpful_rate": round(data["helpful"] / data["count"] * 100, 1) if data["count"] else 0
                }
                for obj_type, data in sorted(stats.items(), key=lambda x: -x[1]["count"])
            ]
            
        except Exception as e:
            print(f"Objection analytics error: {e}")
            return []


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "CoachTip",
    "CoachInsights",
    "CoachAnalyticsService",
]

