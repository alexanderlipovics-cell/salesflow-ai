# backend/app/services/analytics/chief_insights.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF TEMPLATE INSIGHTS SERVICE                                           ║
║  Generiert Template-Insights für CHIEF Context                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Liefert:
- Empfehlungen welche Templates nutzen
- Warnungen bei schlechter Performance
- Weekly Summary für Coaching
"""

from datetime import date, timedelta
from typing import Optional, List
from supabase import Client

from ...api.schemas.learning import (
    TemplateCategory,
    TrendDirection,
    TemplateInsight,
    ChiefTemplateInsightsResponse,
    TemplatePerformanceStats,
)
from .top_templates import TopTemplatesService


class ChiefTemplateInsightsService:
    """
    Service für CHIEF Template-Insights.
    
    Generiert kontextbezogene Empfehlungen für den AI Coach.
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.top_templates_service = TopTemplatesService(db)
    
    async def get_insights(
        self,
        company_id: str,
        user_id: Optional[str] = None,
        context: Optional[dict] = None,
    ) -> ChiefTemplateInsightsResponse:
        """
        Generiert Template-Insights für CHIEF.
        
        Args:
            company_id: Company ID
            user_id: Optional User ID für personalisierte Insights
            context: Optional zusätzlicher Kontext (z.B. aktueller Lead)
            
        Returns:
            ChiefTemplateInsightsResponse mit Insights
        """
        insights: List[TemplateInsight] = []
        
        # Top Template laden
        top_templates = await self.top_templates_service.get_top_templates(
            company_id=company_id,
            limit=1,
        )
        top_template = top_templates[0] if top_templates else None
        
        # Worst Template laden
        worst_templates = await self.top_templates_service.get_worst_templates(
            company_id=company_id,
            limit=1,
        )
        worst_template = worst_templates[0] if worst_templates else None
        
        # Insight 1: Top Template Empfehlung
        if top_template and top_template.quality_score > 60:
            insights.append(TemplateInsight(
                type="recommendation",
                message=f"Dein bestes Template '{top_template.template_name}' hat eine Conversion Rate von {top_template.conversion_rate:.0f}% – nutze es öfter!",
                template_id=top_template.template_id,
                template_name=top_template.template_name,
                metric_name="conversion_rate",
                metric_value=top_template.conversion_rate,
                action_suggestion="Verwende dieses Template für wichtige Leads.",
            ))
        
        # Insight 2: Warnung bei schlechtem Template
        if worst_template and worst_template.quality_score < 30 and worst_template.total_uses > 10:
            insights.append(TemplateInsight(
                type="warning",
                message=f"'{worst_template.template_name}' performt unter Durchschnitt ({worst_template.conversion_rate:.0f}% Conversion). Zeit für ein Update?",
                template_id=worst_template.template_id,
                template_name=worst_template.template_name,
                metric_name="conversion_rate",
                metric_value=worst_template.conversion_rate,
                action_suggestion="Überarbeite den Text oder teste eine Alternative.",
            ))
        
        # Insight 3: Trend-basierte Insights
        if top_template and top_template.trend == TrendDirection.improving:
            insights.append(TemplateInsight(
                type="tip",
                message=f"'{top_template.template_name}' wird immer besser! Du bist auf dem richtigen Weg. 🔥",
                template_id=top_template.template_id,
                template_name=top_template.template_name,
            ))
        
        # Insight 4: Kategorie-spezifische Empfehlung basierend auf Kontext
        if context and context.get("lead_temperature"):
            temp = context.get("lead_temperature")
            category = self._get_category_for_temperature(temp)
            
            category_templates = await self.top_templates_service.get_top_templates(
                company_id=company_id,
                category=category,
                limit=1,
            )
            
            if category_templates:
                best_for_category = category_templates[0]
                insights.append(TemplateInsight(
                    type="recommendation",
                    message=f"Für {temp} Leads: Nutze '{best_for_category.template_name}' – {best_for_category.response_rate:.0f}% Antwortrate!",
                    template_id=best_for_category.template_id,
                    template_name=best_for_category.template_name,
                    action_suggestion=f"Perfekt für {temp} Leads.",
                ))
        
        # Improvement Opportunity
        improvement_opportunity = None
        if worst_template and worst_template.uses_last_30d > 5:
            potential_gain = (top_template.conversion_rate - worst_template.conversion_rate) if top_template else 10
            if potential_gain > 5:
                improvement_opportunity = f"Wenn du '{worst_template.template_name}' optimierst, könntest du bis zu {potential_gain:.0f}% mehr Conversions erreichen."
        
        # Weekly Summary
        weekly_summary = await self._generate_weekly_summary(company_id, user_id)
        
        return ChiefTemplateInsightsResponse(
            insights=insights,
            top_template=top_template,
            worst_template=worst_template,
            improvement_opportunity=improvement_opportunity,
            weekly_summary=weekly_summary,
        )
    
    async def get_context_for_chief(
        self,
        company_id: str,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Generiert einen formatierten String für den CHIEF System Prompt.
        
        Kann direkt in den Context Builder eingebunden werden.
        """
        insights = await self.get_insights(company_id, user_id)
        
        if not insights.insights and not insights.top_template:
            return ""
        
        parts = ["## Template Performance Insights"]
        
        if insights.top_template:
            t = insights.top_template
            parts.append(f"- Top Template: {t.template_name} ({t.conversion_rate:.0f}% Conversion)")
        
        if insights.worst_template and insights.worst_template.quality_score < 40:
            t = insights.worst_template
            parts.append(f"- Optimierungskandidat: {t.template_name} ({t.conversion_rate:.0f}% Conversion)")
        
        if insights.improvement_opportunity:
            parts.append(f"- {insights.improvement_opportunity}")
        
        for insight in insights.insights[:3]:
            if insight.type == "warning":
                parts.append(f"⚠️ {insight.message}")
            elif insight.type == "tip":
                parts.append(f"💡 {insight.message}")
        
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════
    
    def _get_category_for_temperature(self, temperature: str) -> TemplateCategory:
        """Mappt Lead-Temperatur zu Template-Kategorie."""
        mapping = {
            "cold": TemplateCategory.reactivation,
            "warm": TemplateCategory.follow_up,
            "hot": TemplateCategory.closing,
        }
        return mapping.get(temperature, TemplateCategory.follow_up)
    
    async def _generate_weekly_summary(
        self,
        company_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[str]:
        """
        Generiert eine wöchentliche Zusammenfassung.
        """
        # Events der letzten Woche laden
        week_ago = (date.today() - timedelta(days=7)).isoformat()
        
        query = self.db.table("learning_events").select(
            "event_type, response_received, converted_to_next_stage"
        ).eq("company_id", company_id).gte("created_at", week_ago)
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        result = query.execute()
        events = result.data or []
        
        if not events:
            return None
        
        total = len(events)
        responses = sum(1 for e in events if e.get("response_received"))
        conversions = sum(1 for e in events if e.get("converted_to_next_stage"))
        
        response_rate = (responses / total * 100) if total > 0 else 0
        conversion_rate = (conversions / total * 100) if total > 0 else 0
        
        # Bewertung
        if response_rate > 30 and conversion_rate > 10:
            assessment = "Starke Woche! 💪"
        elif response_rate > 20:
            assessment = "Solide Performance."
        else:
            assessment = "Da geht noch mehr!"
        
        return f"Diese Woche: {total} Nachrichten, {response_rate:.0f}% Antworten, {conversion_rate:.0f}% Conversions. {assessment}"


# ═══════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════

_service_instance: Optional[ChiefTemplateInsightsService] = None


def get_chief_insights_service(db: Client) -> ChiefTemplateInsightsService:
    """Factory für ChiefTemplateInsightsService."""
    global _service_instance
    
    if _service_instance is None:
        _service_instance = ChiefTemplateInsightsService(db)
    
    return _service_instance

