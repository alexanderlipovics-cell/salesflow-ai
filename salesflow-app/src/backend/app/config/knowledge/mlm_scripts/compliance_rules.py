"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MLM COMPLIANCE RULES                                                       ║
║  Zentrale Compliance-Regeln für alle MLM-Unternehmen                         ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Dict, List, Any, Optional
from .zinzino_scripts import ZINZINO_COMPLIANCE
from .herbalife_scripts import HERBALIFE_COMPLIANCE

# =============================================================================
# MLM COMPLIANCE RULES - Mapping
# =============================================================================

MLM_COMPLIANCE_RULES = {
    "zinzino": ZINZINO_COMPLIANCE,
    "herbalife": HERBALIFE_COMPLIANCE,
    # Weitere MLM-Unternehmen können hier hinzugefügt werden
}

# =============================================================================
# ALLGEMEINE COMPLIANCE-REGELN
# =============================================================================

GENERAL_COMPLIANCE_RULES = {
    "verboten_allgemein": [
        "heilt",
        "kuriert",
        "behandelt Krankheiten",
        "verhindert [Krankheit]",
        "garantiert [Ergebnis]",
        "ersetzt Medikamente",
        "wird von Ärzten verschrieben",
        "medizinisch getestet",
        "klinisch bewiesen (ohne Studie)",
    ],
    
    "erlaubt_allgemein": [
        "unterstützt",
        "trägt bei",
        "kann helfen",
        "ergänzt",
        "fördert",
        "unterstützt normale Körperfunktionen",
    ],
    
    "mlm_verboten": [
        "garantiertes Einkommen",
        "schnell reich werden",
        "passives Einkommen garantiert",
        "jeder kann es schaffen",
        "keine Arbeit nötig",
    ],
    
    "mlm_erlaubt": [
        "Möglichkeit, Einkommen zu generieren",
        "flexibles Geschäftsmodell",
        "Produkt steht im Vordergrund",
        "transparentes Geschäftsmodell",
    ],
    
    "dach_spezifisch": {
        "hwg": [
            "Keine Heilversprechen",
            "Keine Krankheitsnamen",
            "Nur Wellness- und Lifestyle-Claims",
        ],
        "uwg": [
            "Keine falschen Versprechen",
            "Keine übertriebenen Behauptungen",
            "Transparenz über Geschäftsmodell",
        ],
        "dsgvo": [
            "Datenschutz-konform",
            "Vertrauliche Behandlung",
            "DSGVO-konform",
        ],
    },
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_compliance_rules(mlm_company: str) -> Dict[str, Any]:
    """
    Holt die Compliance-Regeln für ein MLM-Unternehmen.
    
    Args:
        mlm_company: Company-Slug (z.B. "zinzino", "herbalife")
        
    Returns:
        Dictionary mit Compliance-Regeln oder allgemeine Regeln
    """
    company_lower = mlm_company.lower()
    
    if company_lower in MLM_COMPLIANCE_RULES:
        return MLM_COMPLIANCE_RULES[company_lower]
    
    # Fallback: Allgemeine Regeln
    return {
        "verboten": GENERAL_COMPLIANCE_RULES["verboten_allgemein"],
        "erlaubt": GENERAL_COMPLIANCE_RULES["erlaubt_allgemein"],
        "health_claims": [],
        "mlm_spezifisch": GENERAL_COMPLIANCE_RULES["mlm_erlaubt"],
    }


def check_compliance(
    mlm_company: str,
    text: str
) -> Dict[str, Any]:
    """
    Prüft einen Text auf Compliance-Verstöße.
    
    Args:
        mlm_company: Company-Slug
        text: Zu prüfender Text
        
    Returns:
        {
            "is_compliant": bool,
            "violations": List[str],
            "suggestions": List[str],
            "risk_score": float (0-100)
        }
    """
    violations = []
    suggestions = []
    text_lower = text.lower()
    
    # Hole spezifische Regeln
    rules = get_compliance_rules(mlm_company)
    
    # Prüfe auf verbotene Wörter
    verboten = rules.get("verboten", [])
    for word in verboten:
        if word.lower() in text_lower:
            violations.append(f"Verbotenes Wort gefunden: '{word}'")
            erlaubt = rules.get("erlaubt", [])
            if erlaubt:
                suggestions.append(f"Ersetze durch: '{erlaubt[0]}'")
    
    # Prüfe auf allgemeine verbotene Wörter
    for word in GENERAL_COMPLIANCE_RULES["verboten_allgemein"]:
        if word.lower() in text_lower:
            violations.append(f"Allgemein verbotenes Wort: '{word}'")
            suggestions.append(f"Entferne oder ersetze durch erlaubte Formulierung")
    
    # Prüfe auf MLM-spezifische Verstöße
    for word in GENERAL_COMPLIANCE_RULES["mlm_verboten"]:
        if word.lower() in text_lower:
            violations.append(f"MLM-Verstoß: '{word}'")
            suggestions.append("Entferne Einkommensversprechen")
    
    # Berechne Risk Score
    risk_score = min(len(violations) * 30.0, 100.0)
    
    return {
        "is_compliant": len(violations) == 0,
        "violations": violations,
        "suggestions": suggestions,
        "risk_score": risk_score,
        "company": mlm_company,
    }


def get_allowed_health_claims(mlm_company: str) -> List[str]:
    """
    Gibt alle erlaubten Health Claims für ein MLM-Unternehmen zurück.
    
    Args:
        mlm_company: Company-Slug
        
    Returns:
        Liste von erlaubten Health Claims
    """
    rules = get_compliance_rules(mlm_company)
    return rules.get("health_claims", [])


def suggest_compliant_text(
    mlm_company: str,
    original_text: str
) -> Dict[str, Any]:
    """
    Schlägt eine compliance-konforme Version eines Textes vor.
    
    Args:
        mlm_company: Company-Slug
        original_text: Original-Text
        
    Returns:
        {
            "original": str,
            "suggested": str,
            "changes": List[str],
            "is_compliant": bool
        }
    """
    rules = get_compliance_rules(mlm_company)
    verboten = rules.get("verboten", [])
    erlaubt = rules.get("erlaubt", [])
    
    suggested_text = original_text
    changes = []
    
    text_lower = original_text.lower()
    
    # Ersetze verbotene Wörter
    for word in verboten:
        if word.lower() in text_lower:
            replacement = erlaubt[0] if erlaubt else "[erlaubte Formulierung]"
            suggested_text = suggested_text.replace(word, replacement)
            changes.append(f"'{word}' → '{replacement}'")
    
    # Prüfe Compliance
    compliance_check = check_compliance(mlm_company, suggested_text)
    
    return {
        "original": original_text,
        "suggested": suggested_text,
        "changes": changes,
        "is_compliant": compliance_check["is_compliant"],
        "violations": compliance_check["violations"],
    }

# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "MLM_COMPLIANCE_RULES",
    "GENERAL_COMPLIANCE_RULES",
    "get_compliance_rules",
    "check_compliance",
    "get_allowed_health_claims",
    "suggest_compliant_text",
]

