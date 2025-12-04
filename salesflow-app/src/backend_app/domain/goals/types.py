"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - GOAL ENGINE TYPES                                        ║
║  Zentrale Typdefinitionen für das Goal-System                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Diese Types bilden die Grundlage für:
- Goal-Eingaben (Einkommen, Rang, Deals, Volumen)
- Goal-Berechnungen (Breakdown in konkrete Zahlen)
- Daily Flow Integration (Tägliche Aktivitäts-Targets)
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Literal
from datetime import date


# ═══════════════════════════════════════════════════════════════════════════
# VERTICAL ID
# ═══════════════════════════════════════════════════════════════════════════

class VerticalId(str, Enum):
    """Unterstützte Branchen/Verticals"""
    NETWORK_MARKETING = "network_marketing"
    REAL_ESTATE = "real_estate"
    COACHING = "coaching"
    FINANCE = "finance"
    INSURANCE = "insurance"
    SOLAR = "solar"
    CUSTOM = "custom"


# ═══════════════════════════════════════════════════════════════════════════
# GOAL TYPE
# ═══════════════════════════════════════════════════════════════════════════

class GoalType(str, Enum):
    """Arten von Zielen, die der User setzen kann"""
    INCOME = "income"           # Ziel-Einkommen pro Monat
    RANK = "rank"               # Bestimmten Rang erreichen (MLM)
    DEALS = "deals"             # Anzahl Abschlüsse
    VOLUME = "volume"           # Umsatz-/Volumen-Ziel
    CUSTOMERS = "customers"     # Kunden-Anzahl
    PARTNERS = "partners"       # Partner-Anzahl (MLM)


# ═══════════════════════════════════════════════════════════════════════════
# GOAL INPUT
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class GoalInput:
    """
    User-Eingabe für ein Ziel.
    
    Je nach goal_type sind unterschiedliche Felder relevant:
    - income: target_value = €/Monat
    - rank: target_rank_id = ID des Ziel-Rangs
    - deals: target_value = Anzahl Abschlüsse
    - volume: target_value = Umsatz in €
    """
    vertical_id: VerticalId
    goal_type: GoalType
    timeframe_months: int
    
    # Zielwert (je nach goal_type)
    target_value: Optional[float] = None
    target_rank_id: Optional[str] = None
    
    # Optionale Zusatzinfos
    company_id: Optional[str] = None          # Für MLM: Welche Company
    current_value: Optional[float] = None     # Aktueller Stand
    current_rank_id: Optional[str] = None     # Aktueller Rang
    
    # Metadaten
    start_date: Optional[date] = None
    user_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# GOAL BREAKDOWN
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class GoalBreakdown:
    """
    Ergebnis der Ziel-Berechnung.
    
    Wandelt das abstrakte Ziel in konkrete, messbare Werte um.
    """
    # Identifikation
    vertical_id: VerticalId
    goal_type: GoalType
    timeframe_months: int
    
    # Primäre Einheit (was gezählt wird)
    primary_unit_label: str          # z.B. "Kunden", "Abschlüsse", "Volumen"
    primary_units: float             # Gesamt benötigt
    primary_units_per_month: float   # Pro Monat
    primary_units_per_week: float    # Pro Woche
    
    # Sekundäre Einheiten (falls relevant)
    secondary_units: Optional[dict] = None  # z.B. {"partners": 5, "team_volume": 5000}
    
    # Ziel-Details
    target_rank_name: Optional[str] = None      # Für MLM
    target_income_monthly: Optional[float] = None
    
    # Berechnungs-Metadaten
    assumptions: Optional[dict] = None   # Annahmen die gemacht wurden
    confidence: float = 0.8              # Wie sicher sind wir (0-1)


# ═══════════════════════════════════════════════════════════════════════════
# DAILY FLOW CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class DailyFlowConfig:
    """
    Konfiguration für die Daily Flow Berechnung.
    
    Enthält Konversionsraten und Annahmen für die Umrechnung
    von Zielen in tägliche Aktivitäten.
    """
    # Arbeitstage
    working_days_per_week: int = 5
    
    # Konversionsraten
    contact_to_primary_unit: float = 0.1    # 10% der Kontakte werden zu Kunden/Deals
    
    # Follow-up Annahmen
    followups_per_primary: float = 3.0      # Durchschnittliche Follow-ups pro Abschluss
    
    # Reaktivierungs-Anteil
    reactivation_share: float = 0.15        # 15% der Aktivitäten sind Reaktivierungen
    
    # Vertical-spezifische Optionen
    has_team_building: bool = False         # MLM: Partner-Recruiting
    has_appointments: bool = False          # Immobilien: Besichtigungen
    appointment_conversion: float = 0.3     # Termin → Abschluss Rate


# ═══════════════════════════════════════════════════════════════════════════
# DAILY FLOW TARGETS
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class DailyFlowTargets:
    """
    Konkrete tägliche/wöchentliche Aktivitäts-Ziele.
    
    Das ist, was der User im Daily Flow Dashboard sieht.
    """
    # Tägliche Ziele
    new_contacts: int
    followups: int
    reactivations: int
    
    # Wöchentliche Ziele (für Übersicht)
    weekly_contacts: int = 0
    weekly_followups: int = 0
    weekly_reactivations: int = 0
    
    # Optionale Zusatz-Aktivitäten (je nach Vertical)
    appointments: Optional[int] = None      # Termine/Besichtigungen
    presentations: Optional[int] = None     # Präsentationen
    team_calls: Optional[int] = None        # Team-Calls (MLM)
    
    def __post_init__(self):
        """Berechne wöchentliche Werte wenn nicht gesetzt"""
        if self.weekly_contacts == 0:
            self.weekly_contacts = self.new_contacts * 5
        if self.weekly_followups == 0:
            self.weekly_followups = self.followups * 5
        if self.weekly_reactivations == 0:
            self.weekly_reactivations = self.reactivations * 5


# ═══════════════════════════════════════════════════════════════════════════
# KPI DEFINITION
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class KpiDefinition:
    """
    Definition eines KPI für das Dashboard.
    
    Ermöglicht dynamische Dashboard-Generierung pro Vertical.
    """
    id: str
    label: str
    emoji: str
    unit: Optional[str] = None
    description: Optional[str] = None
    is_primary: bool = False
    
    # Für Berechnungen
    aggregation: Literal["sum", "avg", "max", "last"] = "sum"
    period: Literal["daily", "weekly", "monthly", "total"] = "monthly"


# ═══════════════════════════════════════════════════════════════════════════
# HELPER TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class GoalProgress:
    """Fortschritt zum Ziel"""
    current: float
    target: float
    percent: float
    remaining: float
    is_achieved: bool
    
    @classmethod
    def calculate(cls, current: float, target: float) -> "GoalProgress":
        """Factory-Methode für Progress-Berechnung"""
        remaining = max(0, target - current)
        percent = min(100, (current / target) * 100) if target > 0 else 0
        return cls(
            current=current,
            target=target,
            percent=round(percent, 1),
            remaining=remaining,
            is_achieved=remaining == 0
        )


@dataclass
class TimeRemaining:
    """Verbleibende Zeit zum Ziel"""
    days: int
    weeks: int
    months: int
    is_expired: bool
    
    @classmethod
    def from_end_date(cls, end_date: date) -> "TimeRemaining":
        """Factory-Methode für Zeit-Berechnung"""
        today = date.today()
        diff_days = (end_date - today).days
        
        return cls(
            days=max(0, diff_days),
            weeks=max(0, diff_days // 7),
            months=max(0, diff_days // 30),
            is_expired=diff_days <= 0
        )

