"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MLM SCRIPT SERVICE                                                        ║
║  Service für MLM-spezifische Script-Verwaltung                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Verwaltet MLM-unternehmensspezifische Scripts (z.B. Zinzino, doTERRA, etc.)
"""

from typing import Dict, List, Optional, Any
import re

from ...config.knowledge.mlm_scripts import (
    BASE_SCRIPTS,
    ZINZINO_SCRIPTS,
    ZINZINO_COMPLIANCE,
    HERBALIFE_SCRIPTS,
    HERBALIFE_COMPLIANCE,
    get_compliance_rules,
    check_compliance,
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
        "base": BASE_SCRIPTS,
        "zinzino": ZINZINO_SCRIPTS,
        "herbalife": HERBALIFE_SCRIPTS,
        # Weitere MLM-Unternehmen können hier hinzugefügt werden
    }
    
    COMPANY_COMPLIANCE = {
        "zinzino": ZINZINO_COMPLIANCE,
        "herbalife": HERBALIFE_COMPLIANCE,
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
    
    def get_einwand_response(
        self,
        mlm: str,
        einwand: str
    ) -> Optional[Dict[str, Any]]:
        """
        Findet eine passende Antwort auf einen Einwand.
        
        Args:
            mlm: MLM-Unternehmen (z.B. "zinzino")
            einwand: Der Einwand (z.B. "zu teuer")
            
        Returns:
            Script-Dictionary mit Antwort oder None
        """
        scripts = self.get_scripts_for_company(mlm, category="einwand_handling")
        einwand_lower = einwand.lower()
        
        for script_id, script_data in scripts.items():
            script_einwand = script_data.get("einwand", "").lower()
            if einwand_lower in script_einwand or script_einwand in einwand_lower:
                return {
                    "category": "einwand_handling",
                    "script_id": script_id,
                    **script_data
                }
        
        return None
    
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
        return check_compliance(company, text)
    
    # =========================================================================
    # SCRIPT SUGGESTION
    # =========================================================================
    
    def suggest_script(
        self,
        mlm: str,
        situation: str,
        contact: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Schlägt ein passendes Script basierend auf Situation und Kontakt vor.
        
        Args:
            mlm: MLM-Unternehmen
            situation: Beschreibung der Situation
            contact: Optional - Kontakt-Informationen (DISG, Beziehung, etc.)
            
        Returns:
            Passendes Script oder None
        """
        # Nutze bestehende Methode mit Mapping
        channel = contact.get("channel") if contact else None
        situation_type = contact.get("type") if contact else None
        
        return self._suggest_script_internal(mlm, situation, channel, situation_type)
    
    def _suggest_script_internal(
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
    
    def get_scripts(
        self,
        mlm_company: str
    ) -> Dict[str, Any]:
        """
        Gibt alle Scripts für ein MLM-Unternehmen zurück.
        
        Args:
            mlm_company: Company-Slug
            
        Returns:
            Dictionary mit allen Scripts
        """
        return self.get_scripts_for_company(mlm_company)
    
    def get_script_by_category(
        self,
        mlm: str,
        category: str
    ) -> List[Dict[str, Any]]:
        """
        Holt Scripts einer spezifischen Kategorie.
        
        Args:
            mlm: MLM-Unternehmen
            category: Kategorie (pitches, einwand_handling, etc.)
            
        Returns:
            Liste von Scripts
        """
        scripts = self.get_scripts_for_company(mlm, category=category)
        
        if isinstance(scripts, dict):
            result = []
            for script_id, script_data in scripts.items():
                result.append({
                    "category": category,
                    "script_id": script_id,
                    **script_data
                })
            return result
        
        return []
    
    def check_mlm_compliance(
        self,
        mlm: str,
        text: str
    ) -> Dict[str, Any]:
        """
        Prüft einen Text auf MLM-spezifische Compliance.
        
        Args:
            mlm: MLM-Unternehmen
            text: Zu prüfender Text
            
        Returns:
            Compliance-Ergebnis
        """
        return self.check_compliance(mlm, text)
    
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

