# backend/app/services/phoenix/analytics.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  🔥 PHOENIX ANALYTICS                                                       ║
║  Performance-Tracking & Insights für Außendienst                           ║
╚════════════════════════════════════════════════════════════════════════════╝

WARUM DIESE VERBESSERUNG?
========================
1. Messbarer Erfolg: ROI des Phoenix-Features zeigen
2. Optimierung: Lerne welche Zeiten/Gebiete am besten sind
3. Gamification: Vergleiche mit anderen Usern
4. Prognose: Vorhersage der besten Tage für Außendienst

FEATURES:
- Besuche pro Tag/Woche/Monat
- Conversion Rate: Besuche → Abschlüsse
- Beste Zeiten & Gebiete
- Heatmaps
- Leaderboards
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from dataclasses import dataclass
from collections import defaultdict

from supabase import Client


@dataclass
class VisitStats:
    """Besuchs-Statistiken"""
    total_visits: int
    successful_visits: int
    conversion_rate: float
    avg_visits_per_day: float
    total_distance_km: float
    total_time_minutes: int


@dataclass
class TimeSlotPerformance:
    """Performance nach Tageszeit"""
    time_slot: str  # "morning", "afternoon", "evening"
    visit_count: int
    success_rate: float
    avg_visit_duration_minutes: float


@dataclass
class TerritoryPerformance:
    """Performance nach Gebiet"""
    territory_id: str
    territory_name: str
    visit_count: int
    success_rate: float
    lead_density: float  # Leads pro km²
    last_sweep_date: Optional[date]


@dataclass
class PhoenixInsight:
    """Ein Insight/Empfehlung"""
    type: str  # "tip", "warning", "achievement"
    title: str
    message: str
    icon: str
    priority: int  # 1-10


class PhoenixAnalytics:
    """
    📊 Phoenix Analytics Service
    
    Sammelt und analysiert Außendienst-Performance.
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # VISIT STATS
    # =========================================================================
    
    def get_visit_stats(
        self,
        user_id: str,
        days: int = 30,
    ) -> VisitStats:
        """
        Holt Besuchs-Statistiken der letzten X Tage.
        """
        
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        result = self.db.table("field_visits").select(
            "id, outcome, duration_minutes, started_at"
        ).eq("user_id", user_id).gte("started_at", since).execute()
        
        visits = result.data or []
        
        if not visits:
            return VisitStats(
                total_visits=0,
                successful_visits=0,
                conversion_rate=0,
                avg_visits_per_day=0,
                total_distance_km=0,
                total_time_minutes=0,
            )
        
        total = len(visits)
        successful = sum(1 for v in visits if v.get("outcome") == "successful")
        total_time = sum(v.get("duration_minutes", 0) or 0 for v in visits)
        
        return VisitStats(
            total_visits=total,
            successful_visits=successful,
            conversion_rate=round(successful / total * 100, 1) if total > 0 else 0,
            avg_visits_per_day=round(total / days, 1),
            total_distance_km=0,  # Würde aus Session-Daten kommen
            total_time_minutes=total_time,
        )
    
    # =========================================================================
    # TIME ANALYSIS
    # =========================================================================
    
    def get_best_times(
        self,
        user_id: str,
        days: int = 90,
    ) -> List[TimeSlotPerformance]:
        """
        Analysiert welche Tageszeiten am erfolgreichsten sind.
        
        WARUM?
        Manche Leads sind morgens besser erreichbar,
        andere nachmittags. Diese Analyse hilft bei der Planung.
        """
        
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        result = self.db.table("field_visits").select(
            "started_at, outcome, duration_minutes"
        ).eq("user_id", user_id).gte("started_at", since).execute()
        
        # Gruppiere nach Zeitslot
        slots = {
            "morning": {"visits": 0, "success": 0, "duration": 0},
            "afternoon": {"visits": 0, "success": 0, "duration": 0},
            "evening": {"visits": 0, "success": 0, "duration": 0},
        }
        
        for visit in result.data or []:
            started = visit.get("started_at", "")
            try:
                hour = datetime.fromisoformat(started.replace("Z", "+00:00")).hour
            except:
                continue
            
            if 6 <= hour < 12:
                slot = "morning"
            elif 12 <= hour < 17:
                slot = "afternoon"
            else:
                slot = "evening"
            
            slots[slot]["visits"] += 1
            if visit.get("outcome") == "successful":
                slots[slot]["success"] += 1
            slots[slot]["duration"] += visit.get("duration_minutes", 0) or 0
        
        return [
            TimeSlotPerformance(
                time_slot=slot,
                visit_count=data["visits"],
                success_rate=round(data["success"] / data["visits"] * 100, 1) if data["visits"] > 0 else 0,
                avg_visit_duration_minutes=round(data["duration"] / data["visits"], 1) if data["visits"] > 0 else 0,
            )
            for slot, data in slots.items()
        ]
    
    # =========================================================================
    # INSIGHTS
    # =========================================================================
    
    def generate_insights(
        self,
        user_id: str,
    ) -> List[PhoenixInsight]:
        """
        Generiert personalisierte Insights & Empfehlungen.
        """
        
        insights = []
        
        # Stats abrufen
        stats = self.get_visit_stats(user_id, days=7)
        best_times = self.get_best_times(user_id)
        
        # Insight 1: Conversion Rate
        if stats.conversion_rate > 50:
            insights.append(PhoenixInsight(
                type="achievement",
                title="🔥 Top Performer!",
                message=f"Deine Conversion Rate liegt bei {stats.conversion_rate}% - das ist überdurchschnittlich!",
                icon="trophy",
                priority=10,
            ))
        elif stats.conversion_rate < 20 and stats.total_visits > 5:
            insights.append(PhoenixInsight(
                type="tip",
                title="💡 Tipp zur Verbesserung",
                message="Versuche Leads vor dem Besuch kurz anzurufen. Das erhöht die Wahrscheinlichkeit sie anzutreffen.",
                icon="bulb",
                priority=8,
            ))
        
        # Insight 2: Beste Zeit
        best_slot = max(best_times, key=lambda t: t.success_rate, default=None)
        if best_slot and best_slot.success_rate > 40:
            time_labels = {
                "morning": "vormittags (6-12 Uhr)",
                "afternoon": "nachmittags (12-17 Uhr)",
                "evening": "abends (17-21 Uhr)",
            }
            insights.append(PhoenixInsight(
                type="tip",
                title="⏰ Deine beste Zeit",
                message=f"Du bist {time_labels.get(best_slot.time_slot, best_slot.time_slot)} am erfolgreichsten ({best_slot.success_rate}% Erfolg).",
                icon="time",
                priority=7,
            ))
        
        # Insight 3: Aktivität
        if stats.avg_visits_per_day < 1 and stats.total_visits > 0:
            insights.append(PhoenixInsight(
                type="warning",
                title="📉 Mehr Besuche = Mehr Erfolg",
                message="Letzte Woche nur wenige Besuche. Versuch 2-3 Besuche pro Tag einzuplanen!",
                icon="trending-up",
                priority=6,
            ))
        
        # Insight 4: Streak
        # Würde aus kontinuierlichen Tagen mit Besuchen berechnet
        insights.append(PhoenixInsight(
            type="tip",
            title="🎯 Reaktivierungs-Tipp",
            message="Leads die 60+ Tage nicht kontaktiert wurden haben oft vergessen warum sie gezögert haben. Perfekte Chance!",
            icon="refresh",
            priority=5,
        ))
        
        # Sortiere nach Priorität
        insights.sort(key=lambda i: i.priority, reverse=True)
        
        return insights[:5]
    
    # =========================================================================
    # LEADERBOARD
    # =========================================================================
    
    def get_team_leaderboard(
        self,
        team_id: str,
        days: int = 7,
    ) -> List[Dict[str, Any]]:
        """
        Holt Team-Leaderboard für Gamification.
        
        WARUM?
        Gesunder Wettbewerb motiviert. Leaderboards zeigen
        wer am aktivsten ist und spornen an.
        """
        
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Hole alle Team-Mitglieder (vereinfacht)
        result = self.db.table("field_visits").select(
            "user_id, outcome"
        ).gte("started_at", since).execute()
        
        # Aggregiere pro User
        user_stats: Dict[str, Dict[str, int]] = defaultdict(lambda: {"visits": 0, "success": 0})
        
        for visit in result.data or []:
            uid = visit.get("user_id")
            if uid:
                user_stats[uid]["visits"] += 1
                if visit.get("outcome") == "successful":
                    user_stats[uid]["success"] += 1
        
        # Sortiere nach Erfolgen
        leaderboard = [
            {
                "user_id": uid,
                "visits": stats["visits"],
                "successful": stats["success"],
                "conversion_rate": round(stats["success"] / stats["visits"] * 100, 1) if stats["visits"] > 0 else 0,
            }
            for uid, stats in user_stats.items()
        ]
        
        leaderboard.sort(key=lambda x: x["successful"], reverse=True)
        
        # Rang hinzufügen
        for i, entry in enumerate(leaderboard):
            entry["rank"] = i + 1
        
        return leaderboard[:10]
    
    # =========================================================================
    # HEATMAP DATA
    # =========================================================================
    
    def get_heatmap_data(
        self,
        user_id: str,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Generiert Heatmap-Daten für Karte.
        
        WARUM?
        Visualisiert wo der User am aktivsten war
        und wo noch Potenzial liegt.
        """
        
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        result = self.db.table("field_visits").select(
            "latitude, longitude, outcome"
        ).eq("user_id", user_id).gte("started_at", since).not_.is_(
            "latitude", "null"
        ).execute()
        
        return [
            {
                "lat": v.get("latitude"),
                "lon": v.get("longitude"),
                "weight": 1.5 if v.get("outcome") == "successful" else 1.0,
            }
            for v in result.data or []
            if v.get("latitude") and v.get("longitude")
        ]


# =============================================================================
# FACTORY
# =============================================================================

def get_phoenix_analytics(db: Client) -> PhoenixAnalytics:
    """Factory für PhoenixAnalytics"""
    return PhoenixAnalytics(db)

