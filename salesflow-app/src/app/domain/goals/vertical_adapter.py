"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - VERTICAL PLAN ADAPTER                                    ║
║  Das Herz der Erweiterbarkeit                                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Jedes Vertical (MLM, Immobilien, Finance, etc.) implementiert dieses Interface.
Das ermöglicht "Plug & Play" für neue Branchen.

Architektur:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   GoalInput     │────▶│ VerticalAdapter │────▶│  GoalBreakdown  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ DailyFlowTargets│
                        └─────────────────┘
"""

from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable

from .types import (
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    DailyFlowTargets,
    KpiDefinition,
    VerticalId,
)


# ═══════════════════════════════════════════════════════════════════════════
# PROTOCOL (Interface)
# ═══════════════════════════════════════════════════════════════════════════

@runtime_checkable
class VerticalPlanAdapter(Protocol):
    """
    Protocol für Vertical-spezifische Logik.
    
    Jedes Vertical muss implementieren:
    1. compute_goal_breakdown: Ziel → konkrete Zahlen
    2. get_default_conversion_config: Standard-Konversionsannahmen
    3. get_kpi_definitions: Welche KPIs zeigt das Dashboard
    
    Verwendung:
    ```python
    adapter = MLMAdapter()
    breakdown = adapter.compute_goal_breakdown(goal_input)
    targets = adapter.compute_daily_flow_targets(breakdown)
    ```
    """
    
    vertical_id: str
    
    def get_label(self) -> str:
        """Human-readable Name des Verticals"""
        ...
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Rechnet aus einem GoalInput (income/rank/deals/volume)
        einen konkreten GoalBreakdown für dieses Vertical.
        """
        ...
    
    def get_default_conversion_config(self) -> DailyFlowConfig:
        """
        Liefert Default-Konversionsannahmen für dieses Vertical,
        damit die Flow Engine DailyFlowTargets berechnen kann.
        """
        ...
    
    def get_kpi_definitions(self) -> list[KpiDefinition]:
        """
        Beschreibt, welche KPIs dieses Vertical primär kennt.
        Für dynamische Dashboard-Generierung.
        """
        ...


# ═══════════════════════════════════════════════════════════════════════════
# BASE ADAPTER (Abstract Class)
# ═══════════════════════════════════════════════════════════════════════════

class BaseVerticalAdapter(ABC):
    """
    Abstrakte Basisklasse für Vertical Adapters.
    
    Bietet gemeinsame Funktionalität:
    - compute_daily_flow_targets(): Standard-Berechnung für Daily Flow
    - Validierung und Fehlerbehandlung
    
    Subklassen müssen implementieren:
    - vertical_id, get_label()
    - compute_goal_breakdown()
    - get_default_conversion_config()
    - get_kpi_definitions()
    """
    
    @property
    @abstractmethod
    def vertical_id(self) -> str:
        """Eindeutige ID des Verticals"""
        pass
    
    @abstractmethod
    def get_label(self) -> str:
        """Human-readable Name des Verticals"""
        pass
    
    @abstractmethod
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """Ziel → konkrete Zahlen"""
        pass
    
    @abstractmethod
    def get_default_conversion_config(self) -> DailyFlowConfig:
        """Standard-Konversionsannahmen"""
        pass
    
    @abstractmethod
    def get_kpi_definitions(self) -> list[KpiDefinition]:
        """KPIs für Dashboard"""
        pass
    
    # ─────────────────────────────────────────────────────────────────────────
    # Gemeinsame Implementierung
    # ─────────────────────────────────────────────────────────────────────────
    
    def compute_daily_flow_targets(
        self,
        goal_breakdown: GoalBreakdown,
        config: DailyFlowConfig | None = None,
    ) -> DailyFlowTargets:
        """
        Berechnet aus GoalBreakdown die täglichen Targets.
        
        Standard-Algorithmus:
        1. primary_units / Tage = Units pro Tag
        2. Units pro Tag / Konversionsrate = Kontakte pro Tag
        3. Kontakte * Follow-up-Faktor = Follow-ups pro Tag
        4. Reaktivierungen als Anteil der Gesamt-Aktivitäten
        
        Kann von Subklassen überschrieben werden für 
        vertical-spezifische Logik.
        """
        if config is None:
            config = self.get_default_conversion_config()
        
        # Basis-Berechnungen
        working_days = config.working_days_per_week
        weeks_per_month = 4.33
        days_per_month = working_days * weeks_per_month
        
        # Primary units pro Tag
        total_days = goal_breakdown.timeframe_months * days_per_month
        primary_per_day = goal_breakdown.primary_units / total_days
        
        # Kontakte nötig (basierend auf Konversionsrate)
        if config.contact_to_primary_unit > 0:
            contacts_per_day = primary_per_day / config.contact_to_primary_unit
        else:
            contacts_per_day = primary_per_day * 5  # Fallback: 5x mehr Kontakte
        
        # Follow-ups
        followups_per_day = primary_per_day * config.followups_per_primary
        
        # Reaktivierungen (Anteil der Gesamt-Aktivitäten)
        total_daily = contacts_per_day + followups_per_day
        reactivations_per_day = total_daily * config.reactivation_share
        
        # Wöchentliche Werte
        weekly_contacts = contacts_per_day * working_days
        weekly_followups = followups_per_day * working_days
        weekly_reactivations = reactivations_per_day * working_days
        
        return DailyFlowTargets(
            new_contacts=max(1, round(contacts_per_day)),
            followups=max(1, round(followups_per_day)),
            reactivations=max(0, round(reactivations_per_day)),
            weekly_contacts=max(1, round(weekly_contacts)),
            weekly_followups=max(1, round(weekly_followups)),
            weekly_reactivations=max(0, round(weekly_reactivations)),
        )
    
    def validate_goal_input(self, goal_input: GoalInput) -> list[str]:
        """
        Validiert einen GoalInput.
        
        Returns:
            Liste von Fehlermeldungen (leer wenn valide)
        """
        errors = []
        
        if goal_input.timeframe_months < 1:
            errors.append("Zeitraum muss mindestens 1 Monat sein")
        
        if goal_input.timeframe_months > 60:
            errors.append("Zeitraum darf maximal 60 Monate sein")
        
        if goal_input.target_value is not None and goal_input.target_value <= 0:
            errors.append("Zielwert muss positiv sein")
        
        return errors
    
    def format_summary(self, breakdown: GoalBreakdown, targets: DailyFlowTargets) -> str:
        """
        Formatiert eine lesbare Zusammenfassung.
        
        Für Chief AI Coaching Messages.
        """
        lines = [
            f"🎯 Dein {breakdown.timeframe_months}-Monats-Plan:",
            "",
            f"📊 Ziel: {breakdown.primary_units:.0f} {breakdown.primary_unit_label}",
            f"   └─ {breakdown.primary_units_per_month:.1f} pro Monat",
            f"   └─ {breakdown.primary_units_per_week:.1f} pro Woche",
            "",
            "📅 Tägliche Aktivitäten:",
            f"   • {targets.new_contacts} neue Kontakte",
            f"   • {targets.followups} Follow-ups",
            f"   • {targets.reactivations} Reaktivierungen",
        ]
        
        if targets.appointments:
            lines.append(f"   • {targets.appointments} Termine")
        
        return "\n".join(lines)

