"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MLM SCRIPT SERVICE                                                        ║
║  Service für MLM-spezifische Script-Verwaltung                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Verwaltet MLM-unternehmensspezifische Scripts (z.B. Zinzino, doTERRA, etc.)
"""

from typing import Dict, List, Optional, Any
import re

from ...config.knowledge.zinzino_scripts import (
    ZINZINO_SCRIPTS,
    ZINZINO_COMPLIANCE,
    get_scripts_for_category,
    get_script,
    get_all_categories,
    check_compliance as zinzino_check_compliance,
)


# =============================================================================
# MLM SCRIPT SERVICE
# =============================================================================

class MLMScriptService:
    """
    Service für MLM-spezifische Scripts.
    
    Unterstützt:
    - Zinzino
    - doTERRA (zukünftig)
    - Herbalife (zukünftig)
    - etc.
    """
    
    # Mapping von Company-Slugs zu Script-Libraries
    COMPANY_SCRIPTS = {
        "zinzino": ZINZINO_SCRIPTS,
        # Weitere MLM-Unternehmen können hier hinzugefügt werden
    }
    
    COMPANY_COMPLIANCE = {
        "zinzino": ZINZINO_COMPLIANCE,
        # Weitere Compliance-Regeln können hier hinzugefügt werden
    }
    
    def __init__(self):
        """Initialisiert den Service."""
        pass
    
    # =========================================================================
    # SCRIPT RETRIEVAL
    # =========================================================================
    
    def get_scripts_for_company(
        self,
        company: str,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Gibt alle Scripts für ein MLM-Unternehmen zurück.
        
        Args:
            company: Company-Slug (z.B. "zinzino")
            category: Optional - spezifische Kategorie (z.B. "pitches", "einwand_handling")
            
        Returns:
            Dictionary mit Scripts oder leeres Dict, falls nicht gefunden
        """
        company_lower = company.lower()
        
        if company_lower not in self.COMPANY_SCRIPTS:
            return {}
        
        scripts = self.COMPANY_SCRIPTS[company_lower]
        
        if category:
            return scripts.get(category, {})
        
        return scripts
    
    def get_script_by_situation(
        self,
        company: str,
        situation: str
    ) -> List[Dict[str, Any]]:
        """
        Findet passende Scripts basierend auf einer Situation.
        
        Args:
            company: Company-Slug (z.B. "zinzino")
            situation: Beschreibung der Situation (z.B. "einwand_zu_teuer", "ghosted")
            
        Returns:
            Liste von passenden Scripts
        """
        company_lower = company.lower()
        
        if company_lower not in self.COMPANY_SCRIPTS:
            return []
        
        scripts = self.COMPANY_SCRIPTS[company_lower]
        situation_lower = situation.lower()
        results = []
        
        # Durchsuche alle Kategorien
        for category, category_scripts in scripts.items():
            for script_id, script_data in category_scripts.items():
                # Prüfe Name, Tags, Einwand-Text
                name = script_data.get("name", "").lower()
                tags = [t.lower() for t in script_data.get("tags", [])]
                einwand = script_data.get("einwand", "").lower()
                
                # Keyword-Matching
                if (situation_lower in name or
                    any(situation_lower in tag for tag in tags) or
                    situation_lower in einwand):
                    results.append({
                        "category": category,
                        "script_id": script_id,
                        **script_data
                    })
        
        return results
    
    def get_script_by_id(
        self,
        company: str,
        category: str,
        script_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Holt ein einzelnes Script per ID.
        
        Args:
            company: Company-Slug
            category: Kategorie (z.B. "pitches")
            script_id: Script-ID (z.B. "testen_statt_raten")
            
        Returns:
            Script-Dictionary oder None
        """
        company_lower = company.lower()
        
        if company_lower not in self.COMPANY_SCRIPTS:
            return None
        
        scripts = self.COMPANY_SCRIPTS[company_lower]
        category_scripts = scripts.get(category, {})
        
        return category_scripts.get(script_id)
    
    # =========================================================================
    # COMPLIANCE CHECKING
    # =========================================================================
    
    def check_compliance(
        self,
        company: str,
        text: str
    ) -> Dict[str, Any]:
        """
        Prüft einen Text auf MLM-spezifische Compliance-Verstöße.
        
        Args:
            company: Company-Slug (z.B. "zinzino")
            text: Zu prüfender Text
            
        Returns:
            {
                "is_compliant": bool,
                "violations": List[str],
                "suggestions": List[str],
                "risk_score": float (0-100)
            }
        """
        company_lower = company.lower()
        
        if company_lower not in self.COMPANY_COMPLIANCE:
            # Fallback: Generische Prüfung
            return {
                "is_compliant": True,
                "violations": [],
                "suggestions": [],
                "risk_score": 0.0,
                "message": "Keine spezifischen Compliance-Regeln für diese Company"
            }
        
        # Company-spezifische Prüfung
        if company_lower == "zinzino":
            result = zinzino_check_compliance(text)
            risk_score = len(result["violations"]) * 30.0  # Jeder Verstoß = 30 Punkte
            risk_score = min(risk_score, 100.0)
            
            return {
                "is_compliant": result["is_compliant"],
                "violations": result["violations"],
                "suggestions": result["suggestions"],
                "risk_score": risk_score
            }
        
        # Weitere Companies können hier hinzugefügt werden
        return {
            "is_compliant": True,
            "violations": [],
            "suggestions": [],
            "risk_score": 0.0
        }
    
    # =========================================================================
    # SCRIPT SUGGESTION
    # =========================================================================
    
    def suggest_script(
        self,
        company: str,
        context: str,
        channel: Optional[str] = None,
        situation_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Schlägt ein passendes Script basierend auf Kontext vor.
        
        Args:
            company: Company-Slug
            context: Beschreibung der Situation
            channel: Optional - Kanal (whatsapp, instagram, linkedin)
            situation_type: Optional - Typ (cold, warm, etc.)
            
        Returns:
            Passendes Script oder None
        """
        context_lower = context.lower()
        
        # Keyword-basierte Kategorien-Erkennung
        category_mapping = {
            "einwand": "einwand_handling",
            "objection": "einwand_handling",
            "zu teuer": "einwand_handling",
            "ghost": "ghostbuster",
            "ghosted": "ghostbuster",
            "follow": "follow_up",
            "nachfass": "follow_up",
            "closing": "closing",
            "abschluss": "closing",
            "pitch": "pitches",
            "eröffnung": "pitches",
            "wert": "wert_fragen",
        }
        
        # Finde passende Kategorie
        category = None
        for keyword, cat in category_mapping.items():
            if keyword in context_lower:
                category = cat
                break
        
        if not category:
            # Fallback: Durchsuche alle
            scripts = self.get_scripts_for_company(company)
            for cat, cat_scripts in scripts.items():
                for script_id, script_data in cat_scripts.items():
                    if context_lower in script_data.get("name", "").lower():
                        return {
                            "category": cat,
                            "script_id": script_id,
                            **script_data
                        }
            return None
        
        # Hole Scripts aus der Kategorie
        category_scripts = self.get_scripts_for_company(company, category)
        
        # Filtere nach Channel und Type, falls angegeben
        for script_id, script_data in category_scripts.items():
            if channel and channel not in script_data.get("channel", []):
                continue
            if situation_type and script_data.get("type") != situation_type:
                continue
            
            # Prüfe ob Context zu Script passt
            name = script_data.get("name", "").lower()
            tags = [t.lower() for t in script_data.get("tags", [])]
            
            if (context_lower in name or
                any(context_lower in tag for tag in tags)):
                return {
                    "category": category,
                    "script_id": script_id,
                    **script_data
                }
        
        # Fallback: Erstes Script der Kategorie
        if category_scripts:
            first_script_id = list(category_scripts.keys())[0]
            return {
                "category": category,
                "script_id": first_script_id,
                **category_scripts[first_script_id]
            }
        
        return None
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def get_available_companies(self) -> List[str]:
        """Gibt alle verfügbaren MLM-Unternehmen zurück."""
        return list(self.COMPANY_SCRIPTS.keys())
    
    def get_categories_for_company(self, company: str) -> List[str]:
        """Gibt alle Kategorien für ein Unternehmen zurück."""
        scripts = self.get_scripts_for_company(company)
        return list(scripts.keys())
    
    def replace_variables(
        self,
        script_text: str,
        variables: Dict[str, str]
    ) -> str:
        """
        Ersetzt Variablen in einem Script-Text.
        
        Args:
            script_text: Script-Text mit Variablen (z.B. "[Name]")
            variables: Dictionary mit Variablen-Werten (z.B. {"Name": "Max"})
            
        Returns:
            Text mit ersetzten Variablen
        """
        result = script_text
        
        for key, value in variables.items():
            # Ersetze [Key] und [KEY]
            result = result.replace(f"[{key}]", value)
            result = result.replace(f"[{key.upper()}]", value)
        
        return result


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = ["MLMScriptService"]

