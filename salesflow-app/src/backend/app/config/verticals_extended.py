"""
╔════════════════════════════════════════════════════════════════════════════╗
║  VERTICAL ENGINE - EXTENDED CONFIGURATION                                  ║
║  Branchenspezifische Playbooks, KPIs & Pipelines                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Erweitert verticals.py um:
- Pipeline Stages pro Vertical
- KPI Definitionen
- Follow-Up Zyklen
- Playbook Templates
- Empfohlene Kanäle

Usage:
    from app.config.verticals_extended import (
        get_vertical_pipeline,
        get_vertical_kpis,
        get_vertical_playbooks,
    )
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# EXTENDED VERTICAL CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PipelineStage:
    """Definition einer Pipeline-Stage."""
    id: str
    name: str
    order: int
    color: str  # Hex color
    description: str
    typical_duration_days: int
    next_actions: List[str]
    is_terminal: bool = False


@dataclass
class KPIDefinition:
    """Definition einer KPI."""
    id: str
    name: str
    description: str
    unit: str  # "count", "percent", "currency", "ratio"
    target_direction: str  # "higher", "lower", "target"
    default_target: Optional[float] = None
    calculation_formula: Optional[str] = None


@dataclass
class FollowUpCycle:
    """Follow-Up Zyklus Empfehlung."""
    after_first_contact: int  # Tage
    after_no_response: int
    after_interest_shown: int
    after_proposal: int
    reactivation_threshold: int


@dataclass
class PlaybookStep:
    """Schritt in einem Playbook."""
    order: int
    action: str
    description: str
    ai_skill: Optional[str] = None
    template_key: Optional[str] = None
    condition: Optional[str] = None


@dataclass
class Playbook:
    """Playbook für eine Situation."""
    id: str
    name: str
    description: str
    trigger: str  # Wann wird das Playbook ausgelöst?
    steps: List[PlaybookStep]
    vertical: str
    success_metric: Optional[str] = None


@dataclass
class VerticalExtendedConfig:
    """Erweiterte Vertical-Konfiguration."""
    id: str
    display_name: str
    
    # Pipeline
    pipeline_stages: List[PipelineStage]
    
    # KPIs
    kpis: List[KPIDefinition]
    
    # Follow-Up
    followup_cycle: FollowUpCycle
    
    # Channels
    primary_channels: List[str]
    secondary_channels: List[str]
    
    # Playbooks
    playbooks: List[Playbook]
    
    # Typical objections
    common_objections: List[Dict[str, str]]
    
    # Success patterns
    success_patterns: List[str]


# ═══════════════════════════════════════════════════════════════════════════════
# NETWORK MARKETING VERTICAL
# ═══════════════════════════════════════════════════════════════════════════════

NETWORK_MARKETING_CONFIG = VerticalExtendedConfig(
    id="network_marketing",
    display_name="Network Marketing",
    
    pipeline_stages=[
        PipelineStage(
            id="cold",
            name="Kaltkontakt",
            order=1,
            color="#94a3b8",
            description="Erster Kontakt, noch keine Reaktion",
            typical_duration_days=3,
            next_actions=["follow_up", "send_info"],
        ),
        PipelineStage(
            id="interested",
            name="Interessiert",
            order=2,
            color="#3b82f6",
            description="Hat Interesse gezeigt, will mehr wissen",
            typical_duration_days=7,
            next_actions=["schedule_call", "send_presentation"],
        ),
        PipelineStage(
            id="presentation",
            name="Präsentation",
            order=3,
            color="#8b5cf6",
            description="Hat Präsentation gesehen/geplant",
            typical_duration_days=5,
            next_actions=["follow_up", "handle_objections"],
        ),
        PipelineStage(
            id="decision",
            name="Entscheidung",
            order=4,
            color="#f59e0b",
            description="Überlegt, braucht finalen Push",
            typical_duration_days=3,
            next_actions=["close", "overcome_objection"],
        ),
        PipelineStage(
            id="customer",
            name="Kunde",
            order=5,
            color="#22c55e",
            description="Hat gekauft",
            typical_duration_days=0,
            next_actions=["onboard", "upsell"],
            is_terminal=True,
        ),
        PipelineStage(
            id="partner",
            name="Partner",
            order=6,
            color="#06b6d4",
            description="Ist Partner geworden",
            typical_duration_days=0,
            next_actions=["train", "support"],
            is_terminal=True,
        ),
        PipelineStage(
            id="lost",
            name="Verloren",
            order=99,
            color="#ef4444",
            description="Deal verloren",
            typical_duration_days=0,
            next_actions=["archive", "reactivate_later"],
            is_terminal=True,
        ),
    ],
    
    kpis=[
        KPIDefinition(
            id="new_contacts",
            name="Neukontakte",
            description="Anzahl neuer Kontakte pro Tag/Woche",
            unit="count",
            target_direction="higher",
            default_target=5,
        ),
        KPIDefinition(
            id="presentations",
            name="Präsentationen",
            description="Anzahl gegebener Präsentationen",
            unit="count",
            target_direction="higher",
            default_target=10,
        ),
        KPIDefinition(
            id="close_rate",
            name="Abschlussquote",
            description="Präsentationen zu Kunden/Partner",
            unit="percent",
            target_direction="higher",
            default_target=25,
        ),
        KPIDefinition(
            id="team_growth",
            name="Team-Wachstum",
            description="Neue Partner pro Monat",
            unit="count",
            target_direction="higher",
            default_target=2,
        ),
        KPIDefinition(
            id="customer_retention",
            name="Kundenbindung",
            description="Kunden die nach 3 Monaten noch aktiv sind",
            unit="percent",
            target_direction="higher",
            default_target=80,
        ),
    ],
    
    followup_cycle=FollowUpCycle(
        after_first_contact=2,
        after_no_response=3,
        after_interest_shown=1,
        after_proposal=2,
        reactivation_threshold=30,
    ),
    
    primary_channels=["whatsapp", "instagram_dm", "facebook_messenger"],
    secondary_channels=["phone", "email", "linkedin"],
    
    playbooks=[
        Playbook(
            id="new_contact_warmup",
            name="Neukontakt Aufwärmen",
            description="Erstkontakt zu warmem Lead entwickeln",
            trigger="new_lead_created",
            vertical="network_marketing",
            steps=[
                PlaybookStep(1, "intro_message", "Personalisierte Erstnachricht senden", "generate_followup", "intro"),
                PlaybookStep(2, "wait", "48h warten", None, None, "no_response"),
                PlaybookStep(3, "follow_up_1", "Erste Follow-Up Nachricht", "generate_followup", "followup_1"),
                PlaybookStep(4, "wait", "72h warten", None, None, "no_response"),
                PlaybookStep(5, "value_share", "Mehrwert teilen (Testimonial/Info)", None, "value"),
                PlaybookStep(6, "cta", "Call-to-Action für Gespräch", None, "cta"),
            ],
            success_metric="response_rate",
        ),
        Playbook(
            id="objection_price",
            name="Preis-Einwand Behandlung",
            description="Wenn Lead 'zu teuer' sagt",
            trigger="objection_detected_price",
            vertical="network_marketing",
            steps=[
                PlaybookStep(1, "acknowledge", "Einwand anerkennen", None, None),
                PlaybookStep(2, "analyze", "Einwand analysieren (echt vs. Vorwand)", "analyze_objection", None),
                PlaybookStep(3, "reframe", "Wert-Perspektive aufzeigen", None, "reframe_price"),
                PlaybookStep(4, "testimonial", "Erfolgsgeschichte teilen", None, "testimonial_roi"),
                PlaybookStep(5, "alternative", "Einstiegsoptionen anbieten", None, "starter_options"),
            ],
            success_metric="objection_overcome_rate",
        ),
        Playbook(
            id="ghost_reactivation",
            name="Ghost Lead Reaktivierung",
            description="Inaktiven Lead reaktivieren",
            trigger="lead_inactive_30_days",
            vertical="network_marketing",
            steps=[
                PlaybookStep(1, "curiosity", "Neugier-Nachricht senden", "generate_reactivation", "curiosity"),
                PlaybookStep(2, "wait", "5 Tage warten", None, None),
                PlaybookStep(3, "value_bomb", "Neuen Mehrwert/News teilen", None, "news"),
                PlaybookStep(4, "wait", "7 Tage warten", None, None),
                PlaybookStep(5, "last_chance", "Letzte Chance Nachricht", None, "last_chance"),
                PlaybookStep(6, "archive", "Bei keiner Antwort archivieren", None, None),
            ],
            success_metric="reactivation_rate",
        ),
    ],
    
    common_objections=[
        {"objection": "Ist das nicht ein Schneeballsystem?", "type": "trust", "severity": "high"},
        {"objection": "Ich kenne niemanden", "type": "capability", "severity": "medium"},
        {"objection": "Ich habe keine Zeit", "type": "time", "severity": "medium"},
        {"objection": "Ich muss noch überlegen", "type": "stall", "severity": "low"},
        {"objection": "Das ist mir zu teuer", "type": "price", "severity": "medium"},
        {"objection": "Ich glaube nicht an sowas", "type": "skepticism", "severity": "high"},
    ],
    
    success_patterns=[
        "Produkt zuerst - Interesse für Business entwickelt sich daraus",
        "Social Proof durch persönliche Erfahrung ist stärker als Zahlen",
        "Langfristige Beziehung vor schnellem Abschluss",
        "Duplikation: Was du tust, macht dein Team nach",
    ],
)


# ═══════════════════════════════════════════════════════════════════════════════
# REAL ESTATE VERTICAL
# ═══════════════════════════════════════════════════════════════════════════════

REAL_ESTATE_CONFIG = VerticalExtendedConfig(
    id="real_estate",
    display_name="Immobilien",
    
    pipeline_stages=[
        PipelineStage(
            id="lead",
            name="Lead",
            order=1,
            color="#94a3b8",
            description="Neue Anfrage",
            typical_duration_days=2,
            next_actions=["qualify", "call"],
        ),
        PipelineStage(
            id="qualified",
            name="Qualifiziert",
            order=2,
            color="#3b82f6",
            description="Budget und Bedarf geklärt",
            typical_duration_days=7,
            next_actions=["schedule_viewing", "send_exposee"],
        ),
        PipelineStage(
            id="viewing",
            name="Besichtigung",
            order=3,
            color="#8b5cf6",
            description="Besichtigung geplant/durchgeführt",
            typical_duration_days=5,
            next_actions=["follow_up", "second_viewing"],
        ),
        PipelineStage(
            id="negotiation",
            name="Verhandlung",
            order=4,
            color="#f59e0b",
            description="Preisverhandlung läuft",
            typical_duration_days=14,
            next_actions=["negotiate", "involve_bank"],
        ),
        PipelineStage(
            id="contract",
            name="Vertrag",
            order=5,
            color="#22c55e",
            description="Beim Notar",
            typical_duration_days=7,
            next_actions=["prepare_contract", "coordinate_notary"],
            is_terminal=False,
        ),
        PipelineStage(
            id="closed",
            name="Abgeschlossen",
            order=6,
            color="#10b981",
            description="Deal abgeschlossen",
            typical_duration_days=0,
            next_actions=["handover", "ask_referral"],
            is_terminal=True,
        ),
    ],
    
    kpis=[
        KPIDefinition(
            id="leads_per_week",
            name="Leads pro Woche",
            description="Neue qualifizierte Anfragen",
            unit="count",
            target_direction="higher",
            default_target=10,
        ),
        KPIDefinition(
            id="viewings",
            name="Besichtigungen",
            description="Durchgeführte Besichtigungen",
            unit="count",
            target_direction="higher",
            default_target=5,
        ),
        KPIDefinition(
            id="viewing_to_offer",
            name="Besichtigung zu Angebot",
            description="Rate von Besichtigung zu ernstem Interesse",
            unit="percent",
            target_direction="higher",
            default_target=30,
        ),
        KPIDefinition(
            id="avg_deal_value",
            name="Ø Provision",
            description="Durchschnittliche Provision pro Deal",
            unit="currency",
            target_direction="higher",
            default_target=5000,
        ),
    ],
    
    followup_cycle=FollowUpCycle(
        after_first_contact=1,
        after_no_response=2,
        after_interest_shown=1,
        after_proposal=3,
        reactivation_threshold=60,
    ),
    
    primary_channels=["phone", "email", "whatsapp"],
    secondary_channels=["portal_message", "sms"],
    
    playbooks=[
        Playbook(
            id="new_inquiry",
            name="Neue Anfrage Qualifizierung",
            description="Schnelle Qualifizierung neuer Anfragen",
            trigger="new_lead_created",
            vertical="real_estate",
            steps=[
                PlaybookStep(1, "quick_response", "Schnelle Erstantwort (< 5 Min)", None, "quick_response"),
                PlaybookStep(2, "qualify_call", "Telefonat zur Qualifizierung", None, None),
                PlaybookStep(3, "send_exposee", "Passende Objekte senden", None, "exposee"),
                PlaybookStep(4, "schedule_viewing", "Besichtigung vereinbaren", None, None),
            ],
            success_metric="response_to_viewing_rate",
        ),
    ],
    
    common_objections=[
        {"objection": "Der Preis ist zu hoch", "type": "price", "severity": "medium"},
        {"objection": "Ich muss noch andere Objekte sehen", "type": "comparison", "severity": "low"},
        {"objection": "Die Lage passt nicht ganz", "type": "feature", "severity": "high"},
        {"objection": "Ich warte auf die Finanzierungszusage", "type": "financing", "severity": "medium"},
    ],
    
    success_patterns=[
        "Schnelle Erstreaktion ist entscheidend",
        "Emotionen wecken - es ist ein Zuhause, nicht nur ein Objekt",
        "Finanzierung früh klären spart Zeit",
        "Zweitbesichtigung mit Partner ist oft Kaufentscheidung",
    ],
)


# ═══════════════════════════════════════════════════════════════════════════════
# COACHING VERTICAL
# ═══════════════════════════════════════════════════════════════════════════════

COACHING_CONFIG = VerticalExtendedConfig(
    id="coaching",
    display_name="Coaching & Training",
    
    pipeline_stages=[
        PipelineStage(
            id="awareness",
            name="Awareness",
            order=1,
            color="#94a3b8",
            description="Hat von dir gehört",
            typical_duration_days=7,
            next_actions=["nurture", "content"],
        ),
        PipelineStage(
            id="consideration",
            name="Consideration",
            order=2,
            color="#3b82f6",
            description="Überlegt Coaching",
            typical_duration_days=14,
            next_actions=["discovery_call", "send_case_study"],
        ),
        PipelineStage(
            id="discovery",
            name="Discovery Call",
            order=3,
            color="#8b5cf6",
            description="Erstgespräch geplant/durchgeführt",
            typical_duration_days=5,
            next_actions=["send_proposal", "handle_objections"],
        ),
        PipelineStage(
            id="proposal",
            name="Angebot",
            order=4,
            color="#f59e0b",
            description="Angebot unterbreitet",
            typical_duration_days=7,
            next_actions=["follow_up", "close"],
        ),
        PipelineStage(
            id="client",
            name="Klient",
            order=5,
            color="#22c55e",
            description="Aktiver Klient",
            typical_duration_days=0,
            next_actions=["onboard", "deliver"],
            is_terminal=True,
        ),
    ],
    
    kpis=[
        KPIDefinition(
            id="discovery_calls",
            name="Discovery Calls",
            description="Anzahl Erstgespräche",
            unit="count",
            target_direction="higher",
            default_target=8,
        ),
        KPIDefinition(
            id="conversion_rate",
            name="Conversion Rate",
            description="Discovery zu Klient",
            unit="percent",
            target_direction="higher",
            default_target=30,
        ),
        KPIDefinition(
            id="avg_client_value",
            name="Ø Klientenwert",
            description="Durchschnittlicher Umsatz pro Klient",
            unit="currency",
            target_direction="higher",
            default_target=3000,
        ),
        KPIDefinition(
            id="referral_rate",
            name="Empfehlungsrate",
            description="Klienten die weiterempfehlen",
            unit="percent",
            target_direction="higher",
            default_target=40,
        ),
    ],
    
    followup_cycle=FollowUpCycle(
        after_first_contact=2,
        after_no_response=4,
        after_interest_shown=1,
        after_proposal=3,
        reactivation_threshold=45,
    ),
    
    primary_channels=["email", "phone", "linkedin"],
    secondary_channels=["instagram_dm", "whatsapp"],
    
    playbooks=[
        Playbook(
            id="discovery_prep",
            name="Discovery Call Vorbereitung",
            description="Lead auf Discovery Call vorbereiten",
            trigger="discovery_call_scheduled",
            vertical="coaching",
            steps=[
                PlaybookStep(1, "confirm", "Termin bestätigen", None, "confirmation"),
                PlaybookStep(2, "questionnaire", "Vorab-Fragebogen senden", None, "questionnaire"),
                PlaybookStep(3, "reminder_24h", "24h vorher erinnern", None, "reminder"),
                PlaybookStep(4, "reminder_1h", "1h vorher erinnern", None, "reminder_short"),
            ],
            success_metric="show_up_rate",
        ),
    ],
    
    common_objections=[
        {"objection": "Ich bin noch nicht bereit", "type": "timing", "severity": "medium"},
        {"objection": "Das ist mir zu teuer", "type": "price", "severity": "medium"},
        {"objection": "Ich weiß nicht ob das bei mir funktioniert", "type": "self_doubt", "severity": "high"},
        {"objection": "Ich muss meinen Partner fragen", "type": "authority", "severity": "low"},
    ],
    
    success_patterns=[
        "Transformation verkaufen, nicht Stunden",
        "ROI-Rechnung: Was kostet es, NICHT zu handeln?",
        "Testimonials von ähnlichen Klienten zeigen",
        "Selbstzweifel ernst nehmen und adressieren",
    ],
)


# ═══════════════════════════════════════════════════════════════════════════════
# ALL VERTICALS REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

VERTICAL_CONFIGS_EXTENDED: Dict[str, VerticalExtendedConfig] = {
    "network_marketing": NETWORK_MARKETING_CONFIG,
    "real_estate": REAL_ESTATE_CONFIG,
    "coaching": COACHING_CONFIG,
    # Add more verticals as needed...
}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_vertical_config_extended(vertical: str) -> VerticalExtendedConfig:
    """Get extended configuration for a vertical."""
    return VERTICAL_CONFIGS_EXTENDED.get(vertical, NETWORK_MARKETING_CONFIG)


def get_vertical_pipeline(vertical: str) -> List[Dict[str, Any]]:
    """Get pipeline stages for a vertical."""
    config = get_vertical_config_extended(vertical)
    return [
        {
            "id": stage.id,
            "name": stage.name,
            "order": stage.order,
            "color": stage.color,
            "description": stage.description,
            "typical_duration_days": stage.typical_duration_days,
            "next_actions": stage.next_actions,
            "is_terminal": stage.is_terminal,
        }
        for stage in config.pipeline_stages
    ]


def get_vertical_kpis(vertical: str) -> List[Dict[str, Any]]:
    """Get KPI definitions for a vertical."""
    config = get_vertical_config_extended(vertical)
    return [
        {
            "id": kpi.id,
            "name": kpi.name,
            "description": kpi.description,
            "unit": kpi.unit,
            "target_direction": kpi.target_direction,
            "default_target": kpi.default_target,
        }
        for kpi in config.kpis
    ]


def get_vertical_playbooks(vertical: str) -> List[Dict[str, Any]]:
    """Get playbooks for a vertical."""
    config = get_vertical_config_extended(vertical)
    return [
        {
            "id": pb.id,
            "name": pb.name,
            "description": pb.description,
            "trigger": pb.trigger,
            "steps_count": len(pb.steps),
            "success_metric": pb.success_metric,
        }
        for pb in config.playbooks
    ]


def get_playbook_details(vertical: str, playbook_id: str) -> Optional[Dict[str, Any]]:
    """Get detailed playbook including steps."""
    config = get_vertical_config_extended(vertical)
    
    for pb in config.playbooks:
        if pb.id == playbook_id:
            return {
                "id": pb.id,
                "name": pb.name,
                "description": pb.description,
                "trigger": pb.trigger,
                "success_metric": pb.success_metric,
                "steps": [
                    {
                        "order": step.order,
                        "action": step.action,
                        "description": step.description,
                        "ai_skill": step.ai_skill,
                        "template_key": step.template_key,
                        "condition": step.condition,
                    }
                    for step in pb.steps
                ],
            }
    
    return None


def get_vertical_followup_cycle(vertical: str) -> Dict[str, int]:
    """Get follow-up timing recommendations."""
    config = get_vertical_config_extended(vertical)
    cycle = config.followup_cycle
    
    return {
        "after_first_contact": cycle.after_first_contact,
        "after_no_response": cycle.after_no_response,
        "after_interest_shown": cycle.after_interest_shown,
        "after_proposal": cycle.after_proposal,
        "reactivation_threshold": cycle.reactivation_threshold,
    }


def get_vertical_channels(vertical: str) -> Dict[str, List[str]]:
    """Get recommended communication channels."""
    config = get_vertical_config_extended(vertical)
    
    return {
        "primary": config.primary_channels,
        "secondary": config.secondary_channels,
    }


def get_common_objections(vertical: str) -> List[Dict[str, str]]:
    """Get common objections for a vertical."""
    config = get_vertical_config_extended(vertical)
    return config.common_objections


def get_success_patterns(vertical: str) -> List[str]:
    """Get success patterns for a vertical."""
    config = get_vertical_config_extended(vertical)
    return config.success_patterns


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Classes
    "VerticalExtendedConfig",
    "PipelineStage",
    "KPIDefinition",
    "FollowUpCycle",
    "Playbook",
    "PlaybookStep",
    
    # Configs
    "VERTICAL_CONFIGS_EXTENDED",
    "NETWORK_MARKETING_CONFIG",
    "REAL_ESTATE_CONFIG",
    "COACHING_CONFIG",
    
    # Functions
    "get_vertical_config_extended",
    "get_vertical_pipeline",
    "get_vertical_kpis",
    "get_vertical_playbooks",
    "get_playbook_details",
    "get_vertical_followup_cycle",
    "get_vertical_channels",
    "get_common_objections",
    "get_success_patterns",
]

