"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF SERVICE - Founder Version                                           ║
║  Alle Power-Features, keine API Limits, erweiterte Quick Actions           ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import logging
from typing import Optional, List, Dict, Any
from supabase import Client

from ...config.knowledge.chief_knowledge import (
    CHIEF_MODE_CONFIG,
    CHIEF_OUTREACH_SCRIPTS,
    EINWAND_HANDLING_SALESFLOW,
    CHIEF_OBJECTION_HANDLING,
    CHIEF_DEAL_MEDIC,
    CHIEF_BANT_ANALYSIS,
    CHIEF_PIPELINE_REVIEW,
    CHIEF_FOLLOWUP_STRATEGY,
    CHIEF_INVESTOR_BRIEF,
    CHIEF_CEO_MODULE,
    get_outreach_script,
    get_objection_response,
    get_deal_medic_plan,
    get_ceo_insight,
    get_bant_analysis_template,
    get_pipeline_review_questions,
    get_followup_strategy,
    get_investor_brief_template,
)

logger = logging.getLogger(__name__)

# =============================================================================
# CHIEF USER CHECK
# =============================================================================

# Gründer von AURA OS - hat Zugang zu CHIEF Mode
CHIEF_EMAILS = [
    'alexander.lipovics@gmail.com',
]

def is_chief_user(user_email: Optional[str]) -> bool:
    """
    Prüft, ob der User Zugang zu CHIEF Mode hat.
    
    CHIEF Mode = Founder Version mit allen Power-Features.
    """
    if not user_email:
        return False
    
    return user_email.lower() in [email.lower() for email in CHIEF_EMAILS]

async def check_chief_access(db: Client, user_id: str) -> bool:
    """
    Prüft CHIEF Access über Datenbank (Profile).
    
    Fallback falls Email nicht verfügbar.
    """
    try:
        result = db.table("profiles").select("email").eq("id", user_id).single().execute()
        
        if result.data:
            email = result.data.get("email")
            if email:
                return is_chief_user(email)
        
        return False
    except Exception as e:
        logger.warning(f"Error checking CHIEF access: {e}")
        return False

# =============================================================================
# CHIEF SERVICE
# =============================================================================

class ChiefService:
    """
    CHIEF Service - Founder Version mit allen Power-Features.
    
    Features:
    - Alle 50+ Outreach Skripte verfügbar
    - Keine API Limits
    - Erweiterte Quick Actions
    - Deal-Medic Prompts
    - CEO Module
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    async def get_outreach_scripts(
        self,
        industry: str,
        script_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Gibt alle verfügbaren Outreach-Skripte zurück.
        
        Args:
            industry: Branche (zinzino, b2b, immobilien, hotel)
            script_type: Optional - spezifischer Script-Typ
            
        Returns:
            Dictionary mit Scripts
        """
        scripts = CHIEF_OUTREACH_SCRIPTS.get(industry, {})
        
        if script_type:
            return {
                "industry": industry,
                "script_type": script_type,
                "script": scripts.get(script_type, ""),
            }
        
        return {
            "industry": industry,
            "scripts": scripts,
            "available_types": list(scripts.keys()),
        }
    
    async def generate_personalized_outreach(
        self,
        industry: str,
        script_type: str,
        variables: Dict[str, str],
    ) -> str:
        """
        Generiert personalisiertes Outreach-Skript.
        
        Args:
            industry: Branche
            script_type: Script-Typ
            variables: Variablen für Template (name, company, etc.)
            
        Returns:
            Personalisierter Script-Text
        """
        script = get_outreach_script(industry, script_type, variables)
        return script
    
    async def handle_objection(
        self,
        objection_type: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Gibt Einwandbehandlung zurück.
        
        Args:
            objection_type: Typ des Einwands (price_too_high, no_time, etc.)
            context: Kontext-Informationen
            
        Returns:
            Dictionary mit Framework, Responses, Closing Questions
        """
        return get_objection_response(objection_type, context)
    
    async def get_deal_medic_plan(
        self,
        situation: str,
    ) -> Dict[str, Any]:
        """
        Gibt Deal-Medic Action Plan zurück.
        
        Args:
            situation: Situation (stalled_deal, price_objection, ghosted)
            
        Returns:
            Dictionary mit Diagnosis, Action Plan, Templates
        """
        return get_deal_medic_plan(situation)
    
    async def get_ceo_insights(
        self,
        insight_type: Optional[str] = None,
    ) -> Any:
        """
        Gibt CEO Module Insights zurück.
        
        Args:
            insight_type: Optional - spezifischer Insight-Typ
            
        Returns:
            CEO Insights
        """
        if insight_type:
            return get_ceo_insight(insight_type)
        
        return CHIEF_CEO_MODULE
    
    def get_available_industries(self) -> List[str]:
        """Gibt alle verfügbaren Branchen zurück."""
        return list(CHIEF_OUTREACH_SCRIPTS.keys())
    
    def get_available_objections(self) -> List[str]:
        """Gibt alle verfügbaren Einwand-Typen zurück."""
        return list(CHIEF_OBJECTION_HANDLING.keys())
    
    def get_available_deal_situations(self) -> List[str]:
        """Gibt alle verfügbaren Deal-Situationen zurück."""
        return list(CHIEF_DEAL_MEDIC.keys())
    
    def is_chief_user(self, email: str) -> bool:
        """
        Prüft, ob User Zugang zu CHIEF Mode hat.
        
        Args:
            email: User Email
            
        Returns:
            True wenn CHIEF User, False sonst
        """
        return is_chief_user(email)
    
    async def get_outreach_script(
        self,
        target: str,
        channel: str,
        situation: str,
        variables: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Gibt Outreach-Script zurück.
        
        Args:
            target: Zielgruppe (zinzino, b2b, immobilien, hotel)
            channel: Kanal (linkedin, whatsapp, email, etc.)
            situation: Situation (cold, warm, follow_up, etc.)
            variables: Optional - Variablen für Template
            
        Returns:
            Formatierter Script-Text
        """
        script_type = f"{situation}_{channel}" if situation else channel
        scripts = CHIEF_OUTREACH_SCRIPTS.get(target, {})
        template = scripts.get(script_type, "")
        
        if not template:
            # Fallback: Suche nach ähnlichen Scripts
            for key in scripts.keys():
                if channel in key:
                    template = scripts[key]
                    break
        
        if not template:
            return ""
        
        if variables:
            try:
                return template.format(**variables)
            except KeyError:
                return template
        
        return template
    
    async def handle_objection(
        self,
        objection_type: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Gibt Einwandbehandlung zurück.
        
        Args:
            objection_type: Typ des Einwands
            context: Optional - Kontext-Informationen
            
        Returns:
            Einwandbehandlung als String
        """
        # Zuerst SalesFlow-spezifische Einwände prüfen
        salesflow_objection = EINWAND_HANDLING_SALESFLOW.get(objection_type)
        
        if salesflow_objection:
            responses = salesflow_objection.get("responses", [])
            if responses:
                # Erste Response zurückgeben (kann später erweitert werden)
                response = responses[0]
                
                # Variablen ersetzen falls Context vorhanden
                if context:
                    try:
                        return response.format(**context)
                    except KeyError:
                        return response
                
                return response
        
        # Fallback auf allgemeine Einwandbehandlung
        objection = get_objection_response(objection_type, context or {})
        responses = objection.get("responses", [])
        
        if responses:
            return responses[0]
        
        return "Einwandbehandlung für diesen Typ noch nicht verfügbar."
    
    async def analyze_deal(self, deal_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analysiert einen Deal mit BANT-Analyse.
        
        Args:
            deal_info: Deal-Informationen
            
        Returns:
            Dictionary mit BANT-Analyse
        """
        # BANT Scores berechnen
        budget_score = deal_info.get("budget_score", 0)
        authority_score = deal_info.get("authority_score", 0)
        need_score = deal_info.get("need_score", 0)
        timeline_score = deal_info.get("timeline_score", 0)
        
        total_score = budget_score + authority_score + need_score + timeline_score
        
        # Priorität bestimmen
        if total_score >= 75:
            priority = "HIGH"
        elif total_score >= 50:
            priority = "MEDIUM"
        else:
            priority = "LOW"
        
        # Analyse generieren
        analysis_text = get_bant_analysis_template({
            "contact_name": deal_info.get("contact_name", "Kontakt"),
            "company_name": deal_info.get("company_name", "Firma"),
            "budget": deal_info.get("budget", "Nicht bekannt"),
            "budget_approval": deal_info.get("budget_approval", "Nicht geklärt"),
            "financial_situation": deal_info.get("financial_situation", "Nicht bekannt"),
            "alternative_investments": deal_info.get("alternative_investments", "Keine"),
            "budget_score": budget_score,
            "authority_level": deal_info.get("authority_level", "Unbekannt"),
            "decision_process": deal_info.get("decision_process", "Unbekannt"),
            "decision_maker": deal_info.get("decision_maker", "Unbekannt"),
            "influencers": deal_info.get("influencers", "Keine"),
            "authority_score": authority_score,
            "main_pain_point": deal_info.get("main_pain_point", "Nicht identifiziert"),
            "current_solution": deal_info.get("current_solution", "Keine"),
            "pain_intensity": deal_info.get("pain_intensity", "Unbekannt"),
            "business_impact": deal_info.get("business_impact", "Unbekannt"),
            "need_score": need_score,
            "decision_date": deal_info.get("decision_date", "Unbekannt"),
            "start_date": deal_info.get("start_date", "Unbekannt"),
            "urgency_level": deal_info.get("urgency_level", "Normal"),
            "trigger_events": deal_info.get("trigger_events", "Keine"),
            "timeline_score": timeline_score,
            "total_score": total_score,
            "priority_level": priority,
            "next_step": deal_info.get("next_step", "BANT-Analyse vervollständigen"),
            "risks": deal_info.get("risks", "Keine identifiziert"),
        })
        
        return {
            "bant_scores": {
                "budget": budget_score,
                "authority": authority_score,
                "need": need_score,
                "timeline": timeline_score,
                "total": total_score,
            },
            "priority": priority,
            "analysis": analysis_text,
            "recommendations": self._get_deal_recommendations(total_score, deal_info),
        }
    
    def _get_deal_recommendations(
        self,
        total_score: int,
        deal_info: Dict[str, Any],
    ) -> List[str]:
        """Generiert Empfehlungen basierend auf BANT-Score."""
        recommendations = []
        
        if total_score < 50:
            recommendations.append("Deal noch nicht qualifiziert - BANT vervollständigen")
            recommendations.append("Fokus auf Need und Timeline verstärken")
        elif total_score < 75:
            recommendations.append("Deal ist qualifiziert - Fokus auf Closing")
            recommendations.append("Urgency erzeugen für Timeline")
        else:
            recommendations.append("Deal ist stark qualifiziert - Priorität setzen")
            recommendations.append("Schneller Close anstreben")
        
        return recommendations
    
    async def generate_investor_brief(self, metrics: Dict[str, Any]) -> str:
        """
        Generiert Investor Brief.
        
        Args:
            metrics: Business-Metriken
            
        Returns:
            Formatierter Investor Brief
        """
        return get_investor_brief_template({
            "company_name": metrics.get("company_name", "Company"),
            "date": metrics.get("date", "Aktuelles Datum"),
            "executive_summary": metrics.get("executive_summary", "Executive Summary"),
            "mrr": metrics.get("mrr", "0"),
            "arr": metrics.get("arr", "0"),
            "cac": metrics.get("cac", "0"),
            "ltv": metrics.get("ltv", "0"),
            "ltv_cac_ratio": metrics.get("ltv_cac_ratio", "0"),
            "growth_rate": metrics.get("growth_rate", "0"),
            "churn_rate": metrics.get("churn_rate", "0"),
            "active_customers": metrics.get("active_customers", "0"),
            "trend_analysis": metrics.get("trend_analysis", "Trend-Analyse"),
            "growth_plan": metrics.get("growth_plan", "Wachstums-Plan"),
            "financial_forecast": metrics.get("financial_forecast", "Finanzielle Prognose"),
        })
    
    def get_chief_features(self) -> Dict[str, Any]:
        """
        Gibt Liste aller CHIEF Features zurück.
        
        Für Frontend-Display.
        """
        return {
            "outreach_scripts": {
                "count": sum(len(scripts) for scripts in CHIEF_OUTREACH_SCRIPTS.values()),
                "industries": self.get_available_industries(),
            },
            "objection_handling": {
                "count": len(CHIEF_OBJECTION_HANDLING) + len(EINWAND_HANDLING_SALESFLOW),
                "types": list(CHIEF_OBJECTION_HANDLING.keys()) + list(EINWAND_HANDLING_SALESFLOW.keys()),
            },
            "deal_medic": {
                "count": len(CHIEF_DEAL_MEDIC),
                "situations": self.get_available_deal_situations(),
            },
            "bant_analysis": {
                "available": True,
            },
            "pipeline_review": {
                "available": True,
            },
            "investor_briefs": {
                "available": True,
            },
            "ceo_module": {
                "available": True,
                "frameworks": list(CHIEF_CEO_MODULE.get("growth_frameworks", {}).keys()),
            },
            "api_limits": {
                "enabled": False,  # Keine Limits für CHIEF
                "rate_limit": None,
            },
            "quick_actions": [
                "outreach_generator",
                "objection_handler",
                "deal_medic",
                "bant_analysis",
                "pipeline_review",
                "cfo_check",
                "investor_brief",
                "ceo_insights",
                "script_library",
                "advanced_analytics",
                "lead_hunter",
            ],
        }

