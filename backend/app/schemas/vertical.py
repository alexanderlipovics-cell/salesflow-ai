"""
Vertical Architecture - Pydantic Schemas

Definiert die JSON-Struktur für Vertical-Configs im Backend.
Spiegelt die TypeScript-Types aus src/types/vertical.ts.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class VerticalFeatures(BaseModel):
    """Feature-Flags für verschiedene Funktionsbereiche."""

    model_config = ConfigDict(protected_namespaces=())

    crm: bool = True
    finance: bool = True
    gamification: bool = True
    team: bool = True
    analytics: bool = True
    ai_coach: bool = True
    lead_hunter: bool = True
    follow_ups: bool = True
    templates: bool = True
    autopilot: bool = True
    cold_call: bool = True
    closing_coach: bool = True
    performance_insights: bool = True
    commission_tracker: bool = True
    genealogy: bool = True
    power_hour: bool = True
    churn_radar: bool = True
    roleplay_dojo: bool = True
    network_graph: bool = True
    field_ops: bool = False
    route_planner: bool = False


class VerticalTerminology(BaseModel):
    """Terminologie-Mapping für branchenspezifische Begriffe."""

    lead: str = "Lead"
    deal: str = "Deal"
    revenue: str = "Umsatz"
    commission: str = "Provision"
    prospect: str = "Interessent"
    customer: str = "Kunde"
    contact: str = "Kontakt"
    pipeline: str = "Pipeline"
    closing: str = "Abschluss"
    sales: str = "Verkauf"
    team: str = "Team"
    downline: str = "Downline"
    partner: str = "Partner"
    enrollment: str = "Einschreibung"
    signup: str = "Anmeldung"

    model_config = ConfigDict(
        extra="allow",  # Erlaubt zusätzliche benutzerdefinierte Begriffe
        protected_namespaces=(),  # Unterdrückt Warnungen für "model_" Felder
    )


class VerticalAIContext(BaseModel):
    """AI-Kontext für branchenspezifische Prompts."""

    model_config = ConfigDict(protected_namespaces=())

    persona: str = Field(
        ...,
        description="Beschreibung der AI-Persona",
    )
    focus_topics: List[str] = Field(
        default_factory=list,
        description="Themen, auf die sich die AI konzentrieren soll",
    )
    industry_terms: List[str] = Field(
        default_factory=list,
        description="Branchenspezifische Begriffe",
    )
    tone: str = Field(
        default="professionell",
        description="Kommunikationston (z.B. 'professionell', 'freundlich', 'motivierend')",
    )
    examples: List[str] = Field(
        default_factory=list,
        description="Beispiel-Interaktionen",
    )
    avoid_topics: List[str] = Field(
        default_factory=list,
        description="Themen, die vermieden werden sollen",
    )


class VerticalRoutes(BaseModel):
    """Route-Konfiguration."""

    model_config = ConfigDict(protected_namespaces=())

    hidden: List[str] = Field(
        default_factory=list,
        description="Routes, die ausgeblendet werden sollen",
    )
    priority: List[str] = Field(
        default_factory=list,
        description="Routes, die priorisiert werden sollen",
    )
    custom_labels: Optional[Dict[str, str]] = Field(
        default=None,
        description="Custom Labels für Routes",
    )


class VerticalConfig(BaseModel):
    """Vollständige Vertical-Config."""

    model_config = ConfigDict(protected_namespaces=())

    features: VerticalFeatures
    terminology: VerticalTerminology
    ai_context: VerticalAIContext
    routes: VerticalRoutes


class Vertical(BaseModel):
    """Vertical-Metadaten."""

    model_config = ConfigDict(protected_namespaces=())

    id: str
    key: str = Field(..., description="z.B. 'mlm', 'real_estate', 'finance'")
    name: str = Field(..., description="Anzeigename")
    description: Optional[str] = None
    config: VerticalConfig
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# Default MLM Config (Fallback)
DEFAULT_MLM_CONFIG = VerticalConfig(
    features=VerticalFeatures(
        crm=True,
        finance=True,
        gamification=True,
        team=True,
        analytics=True,
        ai_coach=True,
        lead_hunter=True,
        follow_ups=True,
        templates=True,
        autopilot=True,
        cold_call=True,
        closing_coach=True,
        performance_insights=True,
        commission_tracker=True,
        genealogy=True,
        power_hour=True,
        churn_radar=True,
        roleplay_dojo=True,
        network_graph=True,
        field_ops=False,
        route_planner=False,
    ),
    terminology=VerticalTerminology(
        lead="Lead",
        deal="Einschreiben",
        revenue="Umsatz",
        commission="Provision",
        prospect="Interessent",
        customer="Partner",
        contact="Kontakt",
        pipeline="Pipeline",
        closing="Abschluss",
        sales="Verkauf",
        team="Team",
        downline="Downline",
        partner="Partner",
        enrollment="Einschreibung",
        signup="Anmeldung",
    ),
    ai_context=VerticalAIContext(
        persona="Du bist ein erfahrener Network Marketing Coach, der motivierend und unterstützend kommuniziert.",
        focus_topics=[
            "Network Marketing",
            "Team-Aufbau",
            "Downline-Management",
            "Provisionen",
            "Motivation",
            "Einschreibungen",
        ],
        industry_terms=[
            "Einschreibung",
            "Downline",
            "Upline",
            "Provision",
            "PV",
            "GV",
            "Partner",
            "Team",
        ],
        tone="motivierend",
        examples=[
            "Wie kann ich mein Team besser motivieren?",
            "Was sind die besten Strategien für Einschreibungen?",
        ],
        avoid_topics=["Pyramid Scheme", "Betrug"],
    ),
    routes=VerticalRoutes(
        hidden=[],
        priority=["/dashboard", "/leads", "/team", "/genealogy"],
    ),
)

