"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - BASE VERTICAL ADAPTER                                    ║
║  Abstrakte Basisklasse für Branchen-Adapter                               ║
╚════════════════════════════════════════════════════════════════════════════╝

Jeder Vertical-Adapter implementiert diese Schnittstelle:
  → Network Marketing: Rang → Volumen → Kunden/Partner
  → Immobilien: Provision → Deals → Leads
  → Coaching: MRR → Klienten → Discovery Calls
  → etc.

Sync mit TypeScript:
  → src/services/verticalAdapters/baseAdapter.ts
"""

from abc import ABC, abstractmethod
from typing import List

from .types import (
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    KpiDefinition,
)


class BaseVerticalAdapter(ABC):
    """
    Abstrakte Basisklasse für Vertical-Adapter.
    
    Jeder Adapter muss folgende Methoden implementieren:
    - vertical_id: Eindeutige ID der Branche
    - get_label(): Anzeigename
    - compute_goal_breakdown(): Ziel → Breakdown
    - get_default_conversion_config(): Standard-Conversion-Rates
    - get_kpi_definitions(): KPIs für Dashboard
    """
    
    @property
    @abstractmethod
    def vertical_id(self) -> str:
        """Eindeutige ID der Branche (z.B. 'network_marketing')."""
        pass
    
    @abstractmethod
    def get_label(self) -> str:
        """Anzeigename der Branche (z.B. 'Network Marketing / MLM')."""
        pass
    
    @abstractmethod
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Berechnet aus einem Ziel den vollständigen Breakdown.
        
        Args:
            goal_input: Ziel-Definition (Art, Wert, Zeitraum, etc.)
            
        Returns:
            GoalBreakdown mit allen berechneten Werten
        """
        pass
    
    @abstractmethod
    def get_default_conversion_config(self) -> DailyFlowConfig:
        """
        Standard-Conversion-Rates für diese Branche.
        
        Beispiel Network Marketing:
            - 20% Kontakte → Kunde
            - 5% Kontakte → Partner
            - 3 Follow-ups pro Kunde
            - 5 Follow-ups pro Partner
        """
        pass
    
    @abstractmethod
    def get_kpi_definitions(self) -> List[KpiDefinition]:
        """
        KPI-Definitionen für das Dashboard.
        
        Gibt eine Liste von KPIs zurück, die für diese Branche relevant sind.
        """
        pass
    
    # ═══════════════════════════════════════════════════════════════════════
    # HELPER METHODS (optional zu überschreiben)
    # ═══════════════════════════════════════════════════════════════════════
    
    def compute_daily_targets(
        self,
        breakdown: GoalBreakdown,
        config: DailyFlowConfig,
    ) -> dict:
        """
        Berechnet tägliche Aktivitäts-Targets aus dem Breakdown.
        
        Kann von Subklassen überschrieben werden für spezielle Logik.
        """
        weeks = breakdown.timeframe_months * 4.33
        working_days = weeks * config.working_days_per_week
        
        # Kontakte basierend auf Conversion Rate
        contacts_needed = breakdown.primary_units / config.contact_to_primary_unit
        contacts_per_day = contacts_needed / working_days
        
        # Follow-ups
        total_followups = (
            breakdown.primary_units * config.followups_per_primary +
            breakdown.secondary_units * config.followups_per_secondary
        )
        followups_per_day = total_followups / working_days
        
        # Reaktivierungen
        reactivations_per_day = contacts_per_day * config.reactivation_share
        
        return {
            "daily": {
                "new_contacts": round(contacts_per_day),
                "followups": round(followups_per_day),
                "reactivations": round(reactivations_per_day),
            },
            "weekly": {
                "new_contacts": round(contacts_per_day * config.working_days_per_week),
                "followups": round(followups_per_day * config.working_days_per_week),
                "reactivations": round(reactivations_per_day * config.working_days_per_week),
                "primary_units": round(breakdown.primary_units / weeks, 1),
                "secondary_units": round(breakdown.secondary_units / weeks, 1),
            },
        }
    
    def format_breakdown_summary(self, breakdown: GoalBreakdown) -> str:
        """Formatiert den Breakdown als lesbaren Text."""
        return f"""
🎯 Ziel-Breakdown ({self.get_label()})

📊 Benötigtes Volumen: {breakdown.required_volume:,.0f}
   • Pro Monat: {breakdown.per_month_volume:,.0f}
   • Pro Woche: {breakdown.per_week_volume:,.0f}
   • Pro Tag: {breakdown.per_day_volume:,.0f}

👥 Geschätzte Einheiten:
   • Primär (Kunden): {breakdown.primary_units:,.0f}
   • Sekundär (Partner): {breakdown.secondary_units:,.0f}

📝 {breakdown.notes}
        """.strip()

