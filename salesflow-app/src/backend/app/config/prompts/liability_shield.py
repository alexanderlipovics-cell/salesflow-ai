"""
================================================================================
LIABILITY SHIELD™ - COMPLIANCE FILTER
================================================================================

Erkennt und umschreibt rechtlich problematische Aussagen:
    - Heilversprechen (Health)
    - Garantien (alle Branchen)
    - Absolute Aussagen
    - Unzulässige Finanzberatung

================================================================================
"""

import re
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


# =============================================================================
# COMPLIANCE CATEGORIES
# =============================================================================

class ComplianceCategory(Enum):
    HEALTH_CLAIM = "health_claim"       # Heilversprechen
    GUARANTEE = "guarantee"              # Garantien
    ABSOLUTE_CLAIM = "absolute_claim"   # Absolute Aussagen
    FINANCIAL_ADVICE = "financial_advice"  # Finanzberatung
    LEGAL_CLAIM = "legal_claim"          # Rechtsberatung
    COMPARATIVE_CLAIM = "comparative"    # Vergleichende Werbung


@dataclass
class ComplianceIssue:
    """Ein erkanntes Compliance-Problem."""
    
    original_text: str
    category: ComplianceCategory
    severity: str  # low, medium, high
    suggested_replacement: str
    explanation: str


# =============================================================================
# DETECTION PATTERNS
# =============================================================================

HEALTH_CLAIM_PATTERNS = [
    # Heilversprechen
    (r"\b(heilt|heilen|geheilt|heilung)\b", "health_claim", "high"),
    (r"\b(kuriert|kur|kurieren)\b", "health_claim", "high"),
    (r"\b(behebt|behoben|beheben)\s+(krankheit|erkrankung|beschwerden)", "health_claim", "high"),
    (r"\b(beseitigt|entfernt)\s+(schmerzen|symptome|beschwerden)", "health_claim", "high"),
    (r"\b(garantiert|sicher|definitiv)\s+(gesund|gesünder|fit)", "health_claim", "high"),
    
    # Medizinische Behauptungen
    (r"\b(senkt|reduziert)\s+(krebs|tumor|blutdruck|cholesterin)risiko\b", "health_claim", "high"),
    (r"\b(verhindert|schützt vor)\s+(krebs|diabetes|alzheimer|parkinson)", "health_claim", "high"),
    (r"\b(stärkt|verbessert)\s+(immunsystem|abwehrkräfte)\s+garantiert", "health_claim", "medium"),
    
    # Wundermittel-Sprache
    (r"\b(wundermittel|wunderwaffe|allheilmittel)\b", "health_claim", "high"),
    (r"\b(revolutionär|bahnbrechend)\s+für\s+(gesundheit|heilung)", "health_claim", "medium"),
    (r"\b(100%|hundert\s*prozent)\s+(wirksam|effektiv|wirkung)", "health_claim", "high"),
]

GUARANTEE_PATTERNS = [
    # Absolute Garantien
    (r"\b(garantiert|garantie)\s+(ergebnis|erfolg|wirkung)", "guarantee", "high"),
    (r"\b(100%|hundert\s*prozent)\s+(garantie|sicher|gewiss)", "guarantee", "high"),
    (r"\b(geld\s*zurück|rückerstattung)\s+garantie", "guarantee", "medium"),
    
    # Versprechen
    (r"\b(verspreche|versprochen|versprechen)\b", "guarantee", "medium"),
    (r"\b(wirst du|werden sie)\s+definitiv", "guarantee", "medium"),
    (r"\b(auf jeden fall|ganz sicher|todsicher)\b", "guarantee", "medium"),
]

FINANCIAL_ADVICE_PATTERNS = [
    # Investmentberatung
    (r"\b(solltest|sollten sie)\s+(investieren|anlegen|kaufen)\b", "financial_advice", "high"),
    (r"\b(garantierte|sichere)\s+(rendite|gewinn|ertrag)", "financial_advice", "high"),
    (r"\b(wird|werden)\s+(steigen|fallen|sich verdoppeln)", "financial_advice", "high"),
    (r"\b(risikofrei|ohne risiko)\s+(anlage|investment)", "financial_advice", "high"),
    
    # Steuerberatung
    (r"\b(spar\w*)\s+(steuern|steuer)", "financial_advice", "medium"),
    (r"\b(steuerlich\s+absetzbar|absetzen)", "financial_advice", "medium"),
]

ABSOLUTE_CLAIM_PATTERNS = [
    # Superlative ohne Beleg
    (r"\b(beste|bester|bestes)\s+(auf dem markt|der welt|überhaupt)", "absolute_claim", "medium"),
    (r"\b(einzige|einziger|einziges)\s+(lösung|produkt|anbieter)", "absolute_claim", "medium"),
    (r"\b(niemand sonst|nur wir|exklusiv nur)", "absolute_claim", "low"),
    
    # Unbelegte Vergleiche
    (r"\b(x\s*mal|x-mal|x\s*fach)\s+(besser|effektiver|schneller)\b", "absolute_claim", "medium"),
]


# =============================================================================
# REPLACEMENT SUGGESTIONS
# =============================================================================

COMPLIANT_REPLACEMENTS = {
    "heilt": "kann unterstützen bei",
    "heilen": "können unterstützend wirken bei",
    "garantiert": "oft", 
    "garantiert heilt": "kann unterstützen bei",
    "100% wirksam": "in Studien als wirksam gezeigt",
    "wundermittel": "wirksames Produkt",
    "definitiv": "in vielen Fällen",
    "auf jeden fall": "erfahrungsgemäß oft",
    "verhindert krebs": "kann laut Studien bestimmte Risikofaktoren beeinflussen",
    "senkt krebsrisiko": "kann laut Studien mit reduzierten Risikofaktoren verbunden sein",
    "stärkt immunsystem garantiert": "kann das Immunsystem unterstützen",
    "garantierte rendite": "historische Renditen (keine Garantie für die Zukunft)",
    "sichere anlage": "Anlage mit historisch geringerer Volatilität",
    "beste auf dem markt": "eines der führenden Produkte",
    "einzige lösung": "eine bewährte Lösung",
    "solltest investieren": "könntest in Betracht ziehen",
}


# =============================================================================
# DISCLAIMER TEMPLATES
# =============================================================================

DISCLAIMERS = {
    "health": """
*Hinweis: Diese Aussagen sind keine medizinischen Behauptungen. Nahrungsergänzungsmittel sind kein Ersatz für eine ausgewogene Ernährung und gesunde Lebensweise. Bei gesundheitlichen Fragen konsultiere bitte einen Arzt.*
""",
    "financial": """
*Hinweis: Dies ist keine Finanzberatung. Vergangene Wertentwicklungen sind kein verlässlicher Indikator für zukünftige Ergebnisse. Bitte konsultiere einen zugelassenen Finanzberater.*
""",
    "guarantee": """
*Hinweis: Ergebnisse können variieren. Die genannten Beispiele sind individuelle Erfahrungen und keine Garantie für zukünftige Ergebnisse.*
""",
}


# =============================================================================
# FILTER ENGINE
# =============================================================================

def detect_compliance_issues(text: str) -> List[ComplianceIssue]:
    """
    Erkennt Compliance-Probleme im Text.
    
    Args:
        text: Der zu prüfende Text
        
    Returns:
        Liste von erkannten Compliance-Problemen
    """
    issues = []
    text_lower = text.lower()
    
    all_patterns = [
        (HEALTH_CLAIM_PATTERNS, ComplianceCategory.HEALTH_CLAIM),
        (GUARANTEE_PATTERNS, ComplianceCategory.GUARANTEE),
        (FINANCIAL_ADVICE_PATTERNS, ComplianceCategory.FINANCIAL_ADVICE),
        (ABSOLUTE_CLAIM_PATTERNS, ComplianceCategory.ABSOLUTE_CLAIM),
    ]
    
    for patterns, category in all_patterns:
        for pattern, _, severity in patterns:
            matches = re.finditer(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                original = match.group()
                replacement = COMPLIANT_REPLACEMENTS.get(
                    original.lower(),
                    _get_generic_replacement(category)
                )
                
                issues.append(ComplianceIssue(
                    original_text=original,
                    category=category,
                    severity=severity,
                    suggested_replacement=replacement,
                    explanation=_get_explanation(category)
                ))
    
    return issues


def _get_generic_replacement(category: ComplianceCategory) -> str:
    """Generische Ersetzung pro Kategorie."""
    replacements = {
        ComplianceCategory.HEALTH_CLAIM: "kann unterstützend wirken",
        ComplianceCategory.GUARANTEE: "erfahrungsgemäß oft",
        ComplianceCategory.FINANCIAL_ADVICE: "könnte in Betracht gezogen werden",
        ComplianceCategory.ABSOLUTE_CLAIM: "gehört zu den führenden",
    }
    return replacements.get(category, "")


def _get_explanation(category: ComplianceCategory) -> str:
    """Erklärung pro Kategorie."""
    explanations = {
        ComplianceCategory.HEALTH_CLAIM: "Heilversprechen sind rechtlich unzulässig ohne klinische Belege.",
        ComplianceCategory.GUARANTEE: "Garantien können zu Haftung führen. Nutze vorsichtigere Formulierungen.",
        ComplianceCategory.FINANCIAL_ADVICE: "Finanzberatung erfordert eine Lizenz. Verweise auf Experten.",
        ComplianceCategory.ABSOLUTE_CLAIM: "Absolute Behauptungen müssen belegbar sein. Nutze relativierende Formulierungen.",
    }
    return explanations.get(category, "")


def apply_liability_shield(text: str, vertical: Optional[str] = None) -> Tuple[str, List[ComplianceIssue], Optional[str]]:
    """
    Wendet den Liability Shield auf einen Text an.
    
    Args:
        text: Der zu prüfende und ggf. zu korrigierende Text
        vertical: Optionale Branche für spezifische Regeln
        
    Returns:
        Tuple von (korrigierter_text, gefundene_issues, disclaimer)
    """
    issues = detect_compliance_issues(text)
    corrected_text = text
    
    # Ersetze problematische Stellen
    for issue in issues:
        if issue.severity == "high":
            corrected_text = re.sub(
                re.escape(issue.original_text),
                issue.suggested_replacement,
                corrected_text,
                flags=re.IGNORECASE
            )
    
    # Bestimme Disclaimer
    disclaimer = None
    categories = set(issue.category for issue in issues)
    
    if ComplianceCategory.HEALTH_CLAIM in categories:
        disclaimer = DISCLAIMERS["health"]
    elif ComplianceCategory.FINANCIAL_ADVICE in categories:
        disclaimer = DISCLAIMERS["financial"]
    elif ComplianceCategory.GUARANTEE in categories:
        disclaimer = DISCLAIMERS["guarantee"]
    
    return corrected_text, issues, disclaimer


def get_compliance_score(text: str) -> float:
    """
    Berechnet einen Compliance-Score (0-1).
    
    Args:
        text: Der zu prüfende Text
        
    Returns:
        Score von 0 (viele Probleme) bis 1 (compliant)
    """
    issues = detect_compliance_issues(text)
    
    if not issues:
        return 1.0
    
    # Gewichtete Punktzahl
    severity_weights = {"high": 0.3, "medium": 0.15, "low": 0.05}
    total_penalty = sum(severity_weights.get(i.severity, 0.1) for i in issues)
    
    return max(0.0, 1.0 - total_penalty)


# =============================================================================
# PROMPT INSTRUCTIONS
# =============================================================================

LIABILITY_SHIELD_INSTRUCTIONS = """
## ⚖️ LIABILITY SHIELD™ - COMPLIANCE LAYER

Du MUSST bei allen Aussagen rechtlich compliant sein.

### VERBOTEN (Automatisch umschreiben):

**Heilversprechen:**
❌ "Heilt Krankheit X"
❌ "Verhindert/schützt vor [Krankheit]"
❌ "Garantiert gesünder"
❌ "100% wirksam"

✅ STATTDESSEN:
- "Kann unterstützend wirken bei..."
- "Studien deuten darauf hin, dass..."
- "Kann dazu beitragen..."
- "In vielen Fällen berichten Anwender von..."

**Garantien:**
❌ "Garantiert Erfolg/Ergebnis"
❌ "100% sicher"
❌ "Du wirst definitiv..."

✅ STATTDESSEN:
- "Erfahrungsgemäß zeigen viele Kunden..."
- "In der Regel..."
- "Kann zu [Ergebnis] führen..."

**Finanzaussagen:**
❌ "Sichere Rendite"
❌ "Risikofrei"
❌ "Du solltest investieren"

✅ STATTDESSEN:
- "Historische Daten zeigen..."
- "Könnte in Betracht gezogen werden..."
- "Ein Finanzberater kann hier helfen..."

### VERTIKALE REGELN:

**Health/Wellness/Network Marketing:**
- IMMER relativieren: "kann", "oft", "viele berichten"
- Bei Gesundheitsthemen: "Frag deinen Arzt"
- Keine Diagnosen, keine Behandlungsempfehlungen

**Financial Services:**
- Keine konkreten Anlageempfehlungen
- Immer auf Risiken hinweisen
- "Vergangene Ergebnisse sind keine Garantie"

**Real Estate:**
- Keine Wertsteigerungsgarantien
- "Marktbedingungen können variieren"

### BEI UNSICHERHEIT:
Wenn du unsicher bist, ob eine Aussage compliant ist:
1. Formuliere vorsichtiger
2. Nutze "kann", "oft", "in vielen Fällen"
3. Verweise auf Experten (Arzt, Berater, etc.)
"""


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "ComplianceCategory",
    "ComplianceIssue",
    "detect_compliance_issues",
    "apply_liability_shield",
    "get_compliance_score",
    "LIABILITY_SHIELD_INSTRUCTIONS",
    "DISCLAIMERS",
]

