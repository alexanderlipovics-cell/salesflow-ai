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
    CHIEF_OUTREACH_SCRIPTS,
    CHIEF_OBJECTION_HANDLING,
    CHIEF_DEAL_MEDIC,
    CHIEF_CEO_MODULE,
    get_outreach_script,
    get_objection_response,
    get_deal_medic_plan,
    get_ceo_insight,
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
                "count": len(CHIEF_OBJECTION_HANDLING),
                "types": self.get_available_objections(),
            },
            "deal_medic": {
                "count": len(CHIEF_DEAL_MEDIC),
                "situations": self.get_available_deal_situations(),
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
                "ceo_insights",
                "script_library",
                "advanced_analytics",
            ],
        }

