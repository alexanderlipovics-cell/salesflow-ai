# backend/app/services/analytics/top_templates.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TOP TEMPLATES SERVICE                                                     ║
║  Ermittelt die bestperformenden Templates                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Berechnet:
- Quality Score (gewichteter Mix aus Response Rate, Conversion Rate, Usage)
- Trends (Verbesserung/Verschlechterung über Zeit)
- Empfehlungen für Template-Optimierung
"""

from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from supabase import Client

from ...api.schemas.learning import (
    TemplateCategory,
    TrendDirection,
    TemplatePerformanceStats,
)


class TopTemplatesService:
    """
    Service für Top-Template Ermittlung und Ranking.
    """
    
    # Gewichtung für Quality Score
    WEIGHTS = {
        "response_rate": 0.35,
        "conversion_rate": 0.40,
        "usage_frequency": 0.15,
        "recency": 0.10,
    }
    
    # Minimum Usage für Ranking
    MIN_USES_FOR_RANKING = 5
    
    def __init__(self, db: Client):
        self.db = db
    
    async def get_top_templates(
        self,
        company_id: str,
        category: Optional[TemplateCategory] = None,
        limit: int = 10,
        days: int = 30,
    ) -> List[TemplatePerformanceStats]:
        """
        Ermittelt die Top-Templates basierend auf Quality Score.
        
        Args:
            company_id: Company ID
            category: Optional Kategorie-Filter
            limit: Anzahl Templates
            days: Zeitraum für Berechnung
            
        Returns:
            Liste der Top-Templates mit Performance-Daten
        """
        since_date = (date.today() - timedelta(days=days)).isoformat()
        
        # Templates mit Performance laden
        query = self.db.table("templates").select(
            "id, name, category, template_performance(*)"
        ).eq("company_id", company_id).eq("is_active", True)
        
        if category:
            query = query.eq("category", category.value)
        
        result = query.execute()
        templates = result.data or []
        
        # Scores berechnen und sortieren
        scored_templates = []
        
        for t in templates:
            perf = t.get("template_performance", [])
            perf_data = perf[0] if perf else {}
            
            # Skip wenn zu wenig Nutzungen
            uses_30d = perf_data.get("uses_last_30d", 0)
            if uses_30d < self.MIN_USES_FOR_RANKING:
                continue
            
            # Quality Score berechnen
            quality_score = self._calculate_quality_score(perf_data)
            
            # Trend ermitteln
            trend = self._determine_trend(perf_data)
            
            scored_templates.append(TemplatePerformanceStats(
                template_id=t["id"],
                template_name=t["name"],
                category=TemplateCategory(t.get("category", "custom")),
                total_uses=perf_data.get("total_uses", 0),
                total_responses=perf_data.get("total_responses", 0),
                total_conversions=perf_data.get("total_conversions", 0),
                response_rate=perf_data.get("response_rate", 0),
                conversion_rate=perf_data.get("conversion_rate", 0),
                uses_last_30d=uses_30d,
                response_rate_30d=perf_data.get("response_rate_30d", 0),
                conversion_rate_30d=perf_data.get("conversion_rate_30d", 0),
                quality_score=quality_score,
                trend=trend,
            ))
        
        # Nach Quality Score sortieren
        scored_templates.sort(key=lambda t: t.quality_score, reverse=True)
        
        return scored_templates[:limit]
    
    async def get_worst_templates(
        self,
        company_id: str,
        limit: int = 5,
        days: int = 30,
    ) -> List[TemplatePerformanceStats]:
        """
        Ermittelt die schlechtesten Templates (Optimierungskandidaten).
        """
        top_templates = await self.get_top_templates(
            company_id=company_id,
            limit=100,  # Alle laden
            days=days,
        )
        
        # Von hinten nehmen (niedrigster Score)
        return list(reversed(top_templates))[:limit]
    
    async def get_template_comparison(
        self,
        company_id: str,
        template_ids: List[str],
    ) -> Dict[str, TemplatePerformanceStats]:
        """
        Vergleicht mehrere Templates miteinander.
        """
        comparison = {}
        
        for template_id in template_ids:
            result = self.db.table("templates").select(
                "id, name, category, template_performance(*)"
            ).eq("id", template_id).single().execute()
            
            if result.data:
                t = result.data
                perf = t.get("template_performance", [])
                perf_data = perf[0] if perf else {}
                
                comparison[template_id] = TemplatePerformanceStats(
                    template_id=t["id"],
                    template_name=t["name"],
                    category=TemplateCategory(t.get("category", "custom")),
                    total_uses=perf_data.get("total_uses", 0),
                    response_rate=perf_data.get("response_rate", 0),
                    conversion_rate=perf_data.get("conversion_rate", 0),
                    quality_score=self._calculate_quality_score(perf_data),
                    trend=self._determine_trend(perf_data),
                )
        
        return comparison
    
    async def update_template_scores(
        self,
        company_id: str,
    ) -> int:
        """
        Aktualisiert alle Template Quality Scores einer Company.
        
        Sollte regelmäßig via Cronjob aufgerufen werden.
        
        Returns:
            Anzahl aktualisierter Templates
        """
        updated = 0
        
        # Alle aktiven Templates laden
        result = self.db.table("templates").select(
            "id, template_performance(*)"
        ).eq("company_id", company_id).eq("is_active", True).execute()
        
        for t in (result.data or []):
            perf = t.get("template_performance", [])
            if not perf:
                continue
            
            perf_data = perf[0]
            
            # Neuen Score berechnen
            new_score = self._calculate_quality_score(perf_data)
            new_trend = self._determine_trend(perf_data)
            
            # Update wenn geändert
            old_score = perf_data.get("quality_score", 50)
            if abs(new_score - old_score) > 0.5:
                self.db.table("template_performance").update({
                    "quality_score": new_score,
                    "trend": new_trend.value,
                }).eq("template_id", t["id"]).execute()
                
                updated += 1
        
        return updated
    
    # ═══════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════
    
    def _calculate_quality_score(self, perf: dict) -> float:
        """
        Berechnet den Quality Score (0-100).
        
        Formel:
        Score = (Response Rate * 0.35 + 
                 Conversion Rate * 0.40 + 
                 Usage Score * 0.15 + 
                 Recency Score * 0.10) * 100
        """
        response_rate = min(perf.get("response_rate_30d", 0) / 100, 1.0)
        conversion_rate = min(perf.get("conversion_rate_30d", 0) / 100, 1.0)
        
        # Usage Score: 0-1 basierend auf Nutzungshäufigkeit
        uses = perf.get("uses_last_30d", 0)
        usage_score = min(uses / 50, 1.0)  # Max bei 50 Nutzungen
        
        # Recency Score: Wann zuletzt genutzt
        # TODO: Aus last_used_at berechnen
        recency_score = 0.8  # Placeholder
        
        # Gewichteter Score
        score = (
            response_rate * self.WEIGHTS["response_rate"] +
            conversion_rate * self.WEIGHTS["conversion_rate"] +
            usage_score * self.WEIGHTS["usage_frequency"] +
            recency_score * self.WEIGHTS["recency"]
        ) * 100
        
        return round(score, 2)
    
    def _determine_trend(self, perf: dict) -> TrendDirection:
        """
        Ermittelt den Trend basierend auf 30d vs. Lifetime Performance.
        """
        lifetime_response = perf.get("response_rate", 0)
        recent_response = perf.get("response_rate_30d", 0)
        
        lifetime_conversion = perf.get("conversion_rate", 0)
        recent_conversion = perf.get("conversion_rate_30d", 0)
        
        # Verbesserung wenn beide Raten > 10% besser als Lifetime
        response_improved = recent_response > lifetime_response * 1.1
        conversion_improved = recent_conversion > lifetime_conversion * 1.1
        
        # Verschlechterung wenn beide Raten > 10% schlechter
        response_declined = recent_response < lifetime_response * 0.9
        conversion_declined = recent_conversion < lifetime_conversion * 0.9
        
        if response_improved and conversion_improved:
            return TrendDirection.improving
        elif response_declined and conversion_declined:
            return TrendDirection.declining
        else:
            return TrendDirection.stable


# ═══════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════

_service_instance: Optional[TopTemplatesService] = None


def get_top_templates_service(db: Client) -> TopTemplatesService:
    """Factory für TopTemplatesService."""
    global _service_instance
    
    if _service_instance is None:
        _service_instance = TopTemplatesService(db)
    
    return _service_instance

