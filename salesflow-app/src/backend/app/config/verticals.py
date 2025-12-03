"""
╔════════════════════════════════════════════════════════════════════════════╗
║  VERTICAL CONFIGURATION                                                    ║
║  Branchenspezifische Einstellungen für CHIEF                               ║
╚════════════════════════════════════════════════════════════════════════════╝

5 Branchen vorkonfiguriert:
    - Network Marketing
    - Real Estate (Immobilien)
    - Health & Wellness
    - Financial Services
    - Coaching & Training
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class VerticalConfig:
    """Konfiguration für eine Branche."""
    
    id: str
    display_name: str
    default_tone: str
    compliance_level: str  # low, medium, high, very_high
    common_moods: List[str]
    key_objections: List[str]
    coach_priorities: Dict[str, bool]
    special_rules: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert zu Dictionary."""
        return {
            "id": self.id,
            "display_name": self.display_name,
            "default_tone": self.default_tone,
            "compliance_level": self.compliance_level,
            "common_moods": self.common_moods,
            "key_objections": self.key_objections,
            "coach_priorities": self.coach_priorities,
            "special_rules": self.special_rules
        }


# =============================================================================
# VERTICAL CONFIGURATIONS
# =============================================================================

VERTICAL_CONFIGS: Dict[str, VerticalConfig] = {
    
    "network_marketing": VerticalConfig(
        id="network_marketing",
        display_name="Network Marketing",
        default_tone="direct",
        compliance_level="high",
        common_moods=["skeptisch", "gestresst", "positiv"],
        key_objections=["price", "trust", "time", "need"],
        coach_priorities={
            "high_skepticism": True,
            "mlm_specific": True,
            "on_hold_followup": True,
            "trust_building": True
        },
        special_rules=[
            "Keine Einkommensversprechen - immer 'abhängig von individuellem Einsatz'",
            "MLM-Skepsis proaktiv adressieren - nicht defensiv werden",
            "Produkt-Nutzen vor Business-Opportunity betonen",
            "Social Proof nutzen: echte Testimonials, messbare Ergebnisse",
            "Keine 'schnell reich' Rhetorik",
            "Bei Pyramiden-Vorwurf: sachlich Unterschied erklären"
        ]
    ),
    
    "real_estate": VerticalConfig(
        id="real_estate",
        display_name="Immobilien",
        default_tone="value_focused",
        compliance_level="medium",
        common_moods=["neutral", "skeptisch", "positiv"],
        key_objections=["price", "location", "timing", "financing"],
        coach_priorities={
            "closing_opportunity": True,
            "follow_up_banking": True,
            "value_argumentation": True,
            "urgency_creation": True
        },
        special_rules=[
            "Wert/Lage betonen, nicht Preis verteidigen",
            "Konkrete nächste Schritte anbieten (Besichtigung, Bank, Notar)",
            "Emotionale Entscheidung + rationale Rechtfertigung",
            "Zeitdruck nur wenn real (andere Interessenten, Marktlage)",
            "Finanzierungsoptionen proaktiv ansprechen",
            "Bei Unsicherheit: Zweitbesichtigung mit Partner vorschlagen"
        ]
    ),
    
    "health_wellness": VerticalConfig(
        id="health_wellness",
        display_name="Health & Wellness",
        default_tone="evidence_based",
        compliance_level="very_high",
        common_moods=["skeptisch", "interessiert", "vorsichtig"],
        key_objections=["efficacy", "price", "trust", "alternatives"],
        coach_priorities={
            "evidence_usage": True,
            "compliance_check": True,
            "trust_building": True,
            "alternative_comparison": True
        },
        special_rules=[
            "NIEMALS Heilversprechen ('heilt', 'kuriert', 'garantiert')",
            "Immer 'kann unterstützen', 'kann beitragen zu'",
            "Bei medizinischen Fragen: Arzt empfehlen",
            "Studien/Tests als Beweis nutzen, wenn vorhanden",
            "Vorsichtige Formulierungen: 'Studien zeigen...', 'Daten deuten darauf hin...'",
            "Keine konkreten Krankheiten versprechen zu behandeln",
            "Nahrungsergänzung ≠ Medikament - klar kommunizieren"
        ]
    ),
    
    "financial_services": VerticalConfig(
        id="financial_services",
        display_name="Finanzdienstleistungen",
        default_tone="neutral",
        compliance_level="very_high",
        common_moods=["vorsichtig", "skeptisch", "interessiert"],
        key_objections=["risk", "trust", "returns", "complexity"],
        coach_priorities={
            "compliance_strict": True,
            "risk_disclosure": True,
            "trust_building": True,
            "simplification": True
        },
        special_rules=[
            "KEINE Renditeversprechen - immer 'historische Entwicklung, keine Garantie'",
            "Risiken IMMER erwähnen, auch ungefragt",
            "Regulatorische Hinweise einhalten (BaFin, MiFID II)",
            "Keine Anlageberatung ohne Lizenz",
            "Komplexe Produkte einfach erklären, aber nicht verharmlosen",
            "Bei Unsicherheit: auf Berater/Experten verweisen",
            "Schriftliche Risikoaufklärung vor Abschluss"
        ]
    ),
    
    "coaching_training": VerticalConfig(
        id="coaching_training",
        display_name="Coaching & Training",
        default_tone="direct",
        compliance_level="low",
        common_moods=["interessiert", "skeptisch", "motiviert"],
        key_objections=["price", "time", "effectiveness", "self_doubt"],
        coach_priorities={
            "transformation_focus": True,
            "testimonial_usage": True,
            "urgency_creation": True,
            "self_doubt_handling": True
        },
        special_rules=[
            "Transformation und Ergebnisse betonen",
            "Testimonials und Case Studies aktiv nutzen",
            "Persönliche Verbindung aufbauen - echtes Interesse zeigen",
            "Selbstzweifel ernst nehmen, nicht kleinreden",
            "ROI-Argumentation: Was kostet es, NICHT zu handeln?",
            "Garantien nur wenn tatsächlich angeboten",
            "Keine übertriebenen 'Life-changing' Versprechen"
        ]
    ),
    
    "insurance": VerticalConfig(
        id="insurance",
        display_name="Versicherungen",
        default_tone="neutral",
        compliance_level="high",
        common_moods=["vorsichtig", "skeptisch", "neutral"],
        key_objections=["price", "need", "trust", "complexity"],
        coach_priorities={
            "risk_awareness": True,
            "trust_building": True,
            "simplification": True,
            "comparison_handling": True
        },
        special_rules=[
            "Bedarf wecken durch Risiko-Szenarien (ohne Angstmache)",
            "Komplexe Produkte einfach erklären",
            "Deckungslücken aufzeigen",
            "Keine Panik-Verkäufe",
            "Bei Vergleichen: fair und sachlich bleiben",
            "Regulatorische Hinweise einhalten"
        ]
    ),
    
    "software_saas": VerticalConfig(
        id="software_saas",
        display_name="Software & SaaS",
        default_tone="direct",
        compliance_level="low",
        common_moods=["interessiert", "skeptisch", "neutral"],
        key_objections=["price", "integration", "time", "competition"],
        coach_priorities={
            "demo_focus": True,
            "roi_calculation": True,
            "integration_concerns": True,
            "trial_offering": True
        },
        special_rules=[
            "Live-Demo oder Trial anbieten",
            "ROI-Rechnung aufmachen: Was spart die Lösung?",
            "Integration/Onboarding proaktiv adressieren",
            "Support und Schulung betonen",
            "Bei Konkurrenzvergleich: Features, nicht Negativität",
            "Skalierbarkeit hervorheben"
        ]
    )
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_vertical_config(vertical: str) -> VerticalConfig:
    """
    Holt die Vertical-spezifische Konfiguration.
    
    Args:
        vertical: Vertical ID (z.B. 'network_marketing')
        
    Returns:
        VerticalConfig für das Vertical
    """
    return VERTICAL_CONFIGS.get(vertical, VERTICAL_CONFIGS["network_marketing"])


def get_all_verticals() -> List[Dict[str, Any]]:
    """
    Gibt alle verfügbaren Verticals zurück.
    
    Returns:
        Liste aller Vertical-Konfigurationen
    """
    return [config.to_dict() for config in VERTICAL_CONFIGS.values()]


def get_vertical_compliance_rules(vertical: str) -> List[str]:
    """
    Holt Compliance-Regeln für ein Vertical.
    
    Args:
        vertical: Vertical ID
        
    Returns:
        Liste der Special Rules
    """
    config = get_vertical_config(vertical)
    return config.special_rules


def get_vertical_default_tone(vertical: str) -> str:
    """
    Holt den Default-Ton für ein Vertical.
    
    Args:
        vertical: Vertical ID
        
    Returns:
        Ton-Hinweis
    """
    config = get_vertical_config(vertical)
    return config.default_tone


def is_high_compliance_vertical(vertical: str) -> bool:
    """
    Prüft ob das Vertical strenge Compliance erfordert.
    
    Args:
        vertical: Vertical ID
        
    Returns:
        True wenn high oder very_high Compliance
    """
    config = get_vertical_config(vertical)
    return config.compliance_level in ("high", "very_high")


def get_vertical_prompt_additions(vertical: str) -> str:
    """
    Generiert Prompt-Zusätze für ein Vertical.
    
    Args:
        vertical: Vertical ID
        
    Returns:
        Formatierter Prompt-Zusatz
    """
    config = get_vertical_config(vertical)
    
    rules_text = "\n".join([f"• {rule}" for rule in config.special_rules])
    
    compliance_warnings = {
        "very_high": "⚠️ SEHR STRENGE COMPLIANCE - Jede Aussage muss regelkonform sein!",
        "high": "⚠️ STRIKTE COMPLIANCE - Vorsicht bei Versprechen und Garantien!",
        "medium": "Normale Compliance-Standards beachten.",
        "low": "Flexible Kommunikation möglich."
    }
    
    compliance_note = compliance_warnings.get(config.compliance_level, "")
    
    return f"""
╔════════════════════════════════════════════════════════════════════════════╗
║  VERTICAL: {config.display_name.upper()}                                             
╚════════════════════════════════════════════════════════════════════════════╝

{compliance_note}

BRANCHENSPEZIFISCHE REGELN:
{rules_text}

TYPISCHE EINWÄNDE: {', '.join(config.key_objections)}
DEFAULT TON: {config.default_tone}
"""


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "VerticalConfig",
    "VERTICAL_CONFIGS",
    "get_vertical_config",
    "get_all_verticals",
    "get_vertical_compliance_rules",
    "get_vertical_default_tone",
    "is_high_compliance_vertical",
    "get_vertical_prompt_additions",
]

