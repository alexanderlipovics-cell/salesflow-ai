# backend/app/domain/verticals/types.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  VERTICAL PLAN ADAPTER - TYPE DEFINITIONS                                  ║
║  Zentrale Types für verticalübergreifende Zielberechnung                   ║
╚════════════════════════════════════════════════════════════════════════════╝

Diese Types ermöglichen es, Ziele aus verschiedenen Branchen (MLM, Immobilien,
Coaching, etc.) einheitlich zu berechnen und in Daily Flow Targets umzuwandeln.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════

class VerticalId(str, Enum):
    """Unterstützte Branchen / Verticals."""
    NETWORK_MARKETING = "network_marketing"
    REAL_ESTATE = "real_estate"
    INSURANCE = "insurance"
    COACHING = "coaching"
    B2B_SAAS = "b2b_saas"
    FINANCE = "finance"
    SOLAR = "solar"


class GoalKind(str, Enum):
    """Art des Ziels - was der User erreichen will."""
    INCOME = "income"       # Ziel-Einkommen (€/Monat)
    RANK = "rank"           # Rang erreichen (MLM)
    DEALS = "deals"         # Anzahl Abschlüsse
    VOLUME = "volume"       # Volumen-Ziel (Credits/PV)
    CUSTOMERS = "customers" # Anzahl Kunden
    PARTNERS = "partners"   # Anzahl Partner (MLM)
    REVENUE = "revenue"     # Umsatz-Ziel


# ═══════════════════════════════════════════════════════════════════════════
# INPUT TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class GoalInput:
    """
    Eingabe für die Ziel-Berechnung.
    
    Der Adapter nimmt diese Eingabe und berechnet daraus die
    konkreten Aktivitäts-Targets (Daily Flow).
    
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
    vertical_meta: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.vertical_meta is None:
            self.vertical_meta = {}


# ═══════════════════════════════════════════════════════════════════════════
# CONVERSION RATES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ConversionRates:
    """
    Conversion Rates für die Zielberechnung.
    
    Diese Werte sind branchenspezifisch und werden vom
    jeweiligen Vertical Adapter bereitgestellt.
    """
    contact_to_primary: float       # Kontakt → Kunde/Deal
    contact_to_secondary: float     # Kontakt → Partner/Referral
    followups_per_primary: int      # Follow-ups pro Kunde
    followups_per_secondary: int    # Follow-ups pro Partner
    reactivation_share: float       # Anteil Reaktivierungen


# ═══════════════════════════════════════════════════════════════════════════
# OUTPUT TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class UnitBreakdown:
    """
    Aufschlüsselung einer Einheit (Kunden, Partner, Deals, etc.)
    in verschiedene Zeiträume.
    """
    label: str          # z.B. "Kunden", "Abschlüsse", "Partner"
    total: int          # Gesamt im Zeitraum
    per_month: float    # Pro Monat
    per_week: float     # Pro Woche
    per_day: float      # Pro Arbeitstag


@dataclass
class ActivityTargets:
    """
    Tägliche Aktivitäts-Ziele für den Daily Flow.
    """
    new_contacts: float     # Neue Kontakte pro Tag
    followups: float        # Follow-ups pro Tag
    reactivations: float    # Reaktivierungen pro Tag
    meetings: Optional[float] = None  # Meetings pro Tag (optional)


@dataclass
class GoalBreakdown:
    """
    Vollständiges Ergebnis der Zielberechnung.
    
    Enthält alle berechneten Werte für Dashboard,
    Daily Flow und Reporting.
    """
    # Meta
    vertical_id: VerticalId
    goal_kind: GoalKind
    timeframe_months: int
    
    # Einheiten-Breakdown
    primary: UnitBreakdown                  # Haupteinheit (Kunden, Deals)
    secondary: Optional[UnitBreakdown]      # Sekundäreinheit (Partner, Referrals)
    volume: UnitBreakdown                   # Volumen (Credits, €, etc.)
    
    # Tägliche Aktivitäten
    activities_per_day: ActivityTargets
    
    # Vertical-spezifische Details
    vertical_details: Dict[str, Any] = field(default_factory=dict)
    
    # Confidence & Assumptions
    confidence: str = "medium"              # "high", "medium", "low"
    assumptions: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert zu Dictionary für JSON-Serialisierung."""
        return {
            "vertical_id": self.vertical_id.value,
            "goal_kind": self.goal_kind.value,
            "timeframe_months": self.timeframe_months,
            "primary": {
                "label": self.primary.label,
                "total": self.primary.total,
                "per_month": round(self.primary.per_month, 2),
                "per_week": round(self.primary.per_week, 2),
                "per_day": round(self.primary.per_day, 2),
            },
            "secondary": {
                "label": self.secondary.label,
                "total": self.secondary.total,
                "per_month": round(self.secondary.per_month, 2),
                "per_week": round(self.secondary.per_week, 2),
                "per_day": round(self.secondary.per_day, 2),
            } if self.secondary else None,
            "volume": {
                "label": self.volume.label,
                "total": self.volume.total,
                "per_month": round(self.volume.per_month, 2),
                "per_week": round(self.volume.per_week, 2),
                "per_day": round(self.volume.per_day, 2),
            },
            "activities_per_day": {
                "new_contacts": round(self.activities_per_day.new_contacts, 1),
                "followups": round(self.activities_per_day.followups, 1),
                "reactivations": round(self.activities_per_day.reactivations, 1),
                "meetings": round(self.activities_per_day.meetings, 1) if self.activities_per_day.meetings else None,
            },
            "vertical_details": self.vertical_details,
            "confidence": self.confidence,
            "assumptions": self.assumptions,
        }

