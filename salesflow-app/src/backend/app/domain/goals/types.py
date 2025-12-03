"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - GOAL DOMAIN TYPES                                        ║
║  Zentrale Type-Definitionen für Goal-Berechnung                           ║
╚════════════════════════════════════════════════════════════════════════════╝

Diese Types sind synchron mit dem TypeScript-Frontend:
  → src/types/verticalAdapter.ts
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


# ═══════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════

class VerticalId(str, Enum):
    """Unterstützte Branchen / Verticals."""
    NETWORK_MARKETING = "network_marketing"
    REAL_ESTATE = "real_estate"
    COACHING = "coaching"
    FINANCE = "finance"
    INSURANCE = "insurance"
    SOLAR = "solar"
    CUSTOM = "custom"


class GoalKind(str, Enum):
    """Art des Ziels."""
    INCOME = "income"       # Ziel-Einkommen (€/Monat)
    RANK = "rank"           # Rang erreichen
    VOLUME = "volume"       # Volumen-Ziel (Credits/PV)
    CUSTOMERS = "customers" # Anzahl Kunden
    PARTNERS = "partners"   # Anzahl Partner
    DEALS = "deals"         # Abschlüsse (Immobilien, Solar)


# ═══════════════════════════════════════════════════════════════════════════
# INPUT TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class GoalInput:
    """
    Eingabe für Goal-Berechnung.
    
    Beispiel:
        GoalInput(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.INCOME,
            target_value=2000,  # 2.000€/Monat
            timeframe_months=6,
            vertical_meta={"comp_plan_id": "zinzino"}
        )
    """
    vertical_id: VerticalId
    goal_kind: GoalKind
    target_value: float
    timeframe_months: int
    current_value: float = 0.0
    vertical_meta: dict[str, Any] = field(default_factory=dict)


@dataclass
class DailyFlowConfig:
    """
    Konfiguration für Daily Flow Berechnungen.
    
    Enthält Conversion-Rates und Arbeitszeit-Annahmen.
    """
    working_days_per_week: int = 5
    contact_to_primary_unit: float = 0.20    # 20% Kontakte → Kunden
    contact_to_secondary_unit: float = 0.05  # 5% Kontakte → Partner
    followups_per_primary: int = 3           # Ø Follow-ups pro Kunde
    followups_per_secondary: int = 5         # Ø Follow-ups pro Partner
    reactivation_share: float = 0.20         # 20% alte Kontakte reaktivieren


# ═══════════════════════════════════════════════════════════════════════════
# OUTPUT TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class GoalBreakdown:
    """
    Ergebnis der Goal-Berechnung.
    
    Enthält alle berechneten Werte für Dashboard, Daily Flow, etc.
    """
    vertical_id: VerticalId
    goal_kind: GoalKind
    timeframe_months: int
    
    # Primäre & sekundäre Einheiten (Kunden/Partner, Deals/Referrals, etc.)
    primary_units: float
    secondary_units: float
    
    # Volumen-Aufschlüsselung
    required_volume: float
    per_month_volume: float
    per_week_volume: float
    per_day_volume: float
    
    # Vertical-spezifische Details
    vertical_details: dict[str, Any] = field(default_factory=dict)
    
    # Notizen/Erklärung
    notes: str = ""


@dataclass
class DailyFlowTargets:
    """Tägliche Aktivitäts-Ziele."""
    new_contacts: int
    followups: int
    reactivations: int


@dataclass
class WeeklyFlowTargets:
    """Wöchentliche Aktivitäts-Ziele."""
    new_contacts: int
    followups: int
    reactivations: int
    primary_units: float   # z.B. neue Kunden
    secondary_units: float # z.B. neue Partner


# ═══════════════════════════════════════════════════════════════════════════
# KPI DEFINITION
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class KpiDefinition:
    """
    Definition eines KPIs für das Dashboard.
    
    Beispiel:
        KpiDefinition(
            id="new_contacts",
            label="Neue Kontakte",
            description="Erstkontakte mit neuen Interessenten",
            unit="per_day",
            icon="UserPlus",
            color="blue"
        )
    """
    id: str
    label: str
    description: str
    unit: str        # "per_day", "per_week", "per_month", "total"
    icon: str        # Lucide Icon Name
    color: str       # Tailwind Color Name


# ═══════════════════════════════════════════════════════════════════════════
# COMPENSATION PLAN TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class RankRequirement:
    """Anforderungen für einen Rang."""
    min_personal_volume: float = 0
    min_group_volume: float = 0
    min_legs: int = 0
    leg_volume_per_leg: float = 0


@dataclass
class RankDefinition:
    """Definition eines Rangs im Compensation Plan."""
    id: str
    name: str
    order: int
    required_volume: float
    avg_income: float
    requirements: Optional[RankRequirement] = None


@dataclass
class CompensationPlan:
    """Compensation Plan einer MLM-Firma."""
    id: str
    display_name: str
    company_id: str
    region: str
    unit_label: str
    currency: str
    
    ranks: list[RankDefinition]
    
    # Durchschnittswerte für Berechnungen
    avg_volume_per_customer: float = 60.0
    avg_volume_per_partner: float = 100.0
    customer_to_partner_ratio: float = 5.0  # 5 Kunden = 1 Partner typisch

