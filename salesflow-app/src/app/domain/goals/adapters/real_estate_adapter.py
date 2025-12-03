"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - REAL ESTATE ADAPTER                                      ║
║  Goal Engine für Immobilienmakler                                         ║
╚════════════════════════════════════════════════════════════════════════════╝

Besonderheiten Immobilien:
- Pro-Deal Provision (keine Ränge)
- Längere Sales Cycles (3-12 Monate)
- Termine/Besichtigungen als Zwischen-Metrik
- Objekt-Akquise UND Käufer-Vermittlung
"""

from ..vertical_adapter import BaseVerticalAdapter
from ..types import (
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    DailyFlowTargets,
    KpiDefinition,
    VerticalId,
    GoalType,
)


class RealEstateAdapter(BaseVerticalAdapter):
    """
    Adapter für Immobilienmakler.
    
    Unterstützte Zieltypen:
    - income: Provisions-Ziel → Anzahl Deals berechnen
    - deals: Anzahl Abschlüsse
    - volume: Umsatz-/Transaktionsvolumen
    """
    
    # ─────────────────────────────────────────────────────────────────────────
    # Konfiguration
    # ─────────────────────────────────────────────────────────────────────────
    
    # Durchschnittswerte
    AVG_DEAL_VALUE = 350_000        # € durchschnittlicher Objektwert
    AVG_COMMISSION_RATE = 0.03      # 3% Provision
    AVG_COMMISSION_PER_DEAL = 10_500  # € pro Abschluss
    
    # Conversion Rates
    CONTACT_TO_VIEWING = 0.25       # 25% Kontakte → Besichtigung
    VIEWING_TO_DEAL = 0.15          # 15% Besichtigungen → Abschluss
    CONTACT_TO_DEAL = 0.04          # 4% End-to-End Conversion
    
    # ─────────────────────────────────────────────────────────────────────────
    # Interface Implementation
    # ─────────────────────────────────────────────────────────────────────────
    
    @property
    def vertical_id(self) -> str:
        return VerticalId.REAL_ESTATE.value
    
    def get_label(self) -> str:
        return "Immobilien"
    
    def get_default_conversion_config(self) -> DailyFlowConfig:
        """Immobilien-typische Konversionsraten"""
        return DailyFlowConfig(
            working_days_per_week=5,
            contact_to_primary_unit=0.04,       # 4% Kontakte → Abschluss
            followups_per_primary=8.0,          # 8 Follow-ups pro Deal (längerer Cycle)
            reactivation_share=0.12,            # 12% Reaktivierungen
            has_team_building=False,
            has_appointments=True,              # Besichtigungen als Zwischen-Metrik
            appointment_conversion=0.15,        # 15% Besichtigung → Deal
        )
    
    def get_kpi_definitions(self) -> list[KpiDefinition]:
        """KPIs für Immobilien Dashboard"""
        return [
            KpiDefinition(
                id="closings",
                label="Abschlüsse",
                emoji="🔑",
                unit="Deals",
                description="Verkaufte/Vermittelte Objekte",
                is_primary=True,
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="listings",
                label="Objekte",
                emoji="🏘️",
                unit="Anzahl",
                description="Aktive Listings",
                aggregation="sum",
                period="total",
            ),
            KpiDefinition(
                id="viewings",
                label="Besichtigungen",
                emoji="👁️",
                unit="Anzahl",
                aggregation="sum",
                period="weekly",
            ),
            KpiDefinition(
                id="offers",
                label="Angebote",
                emoji="📝",
                unit="Anzahl",
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="commission",
                label="Provision",
                emoji="💰",
                unit="€",
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="avg_deal_size",
                label="Ø Objektwert",
                emoji="📊",
                unit="€",
                aggregation="avg",
                period="total",
            ),
        ]
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Immobilien Goal Breakdown.
        
        Logik:
        1. Provisions-Ziel → Anzahl Deals
        2. Deals → Anzahl Besichtigungen
        3. Besichtigungen → Anzahl Kontakte
        """
        
        if goal_input.goal_type == GoalType.INCOME:
            return self._breakdown_from_income(goal_input)
        elif goal_input.goal_type == GoalType.DEALS:
            return self._breakdown_from_deals(goal_input)
        elif goal_input.goal_type == GoalType.VOLUME:
            return self._breakdown_from_volume(goal_input)
        else:
            # Fallback: Behandle als Income
            return self._breakdown_from_income(goal_input)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Private: Breakdown-Berechnungen
    # ─────────────────────────────────────────────────────────────────────────
    
    def _breakdown_from_income(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Provisions-Ziel"""
        target_income = goal_input.target_value or 5000  # €/Monat
        
        # Monatliches Ziel → Anzahl Deals
        monthly_deals = target_income / self.AVG_COMMISSION_PER_DEAL
        total_deals = monthly_deals * goal_input.timeframe_months
        
        # Besichtigungen nötig
        viewings_needed = total_deals / self.VIEWING_TO_DEAL
        
        # Kontakte nötig
        contacts_needed = viewings_needed / self.CONTACT_TO_VIEWING
        
        return GoalBreakdown(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_type=GoalType.INCOME,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Abschlüsse",
            primary_units=total_deals,
            primary_units_per_month=monthly_deals,
            primary_units_per_week=monthly_deals / 4.33,
            secondary_units={
                "viewings": round(viewings_needed),
                "contacts": round(contacts_needed),
                "estimated_volume": round(total_deals * self.AVG_DEAL_VALUE),
            },
            target_income_monthly=target_income,
            assumptions={
                "avg_commission_per_deal": self.AVG_COMMISSION_PER_DEAL,
                "avg_deal_value": self.AVG_DEAL_VALUE,
                "viewing_to_deal_rate": self.VIEWING_TO_DEAL,
            },
            confidence=0.75,
        )
    
    def _breakdown_from_deals(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Deal-Ziel"""
        target_deals = goal_input.target_value or 2
        current = goal_input.current_value or 0
        needed = max(0, target_deals - current)
        
        # Besichtigungen nötig
        viewings_needed = needed / self.VIEWING_TO_DEAL
        
        monthly_deals = needed / goal_input.timeframe_months
        
        return GoalBreakdown(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_type=GoalType.DEALS,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Abschlüsse",
            primary_units=needed,
            primary_units_per_month=monthly_deals,
            primary_units_per_week=monthly_deals / 4.33,
            secondary_units={
                "viewings": round(viewings_needed),
                "estimated_commission": round(needed * self.AVG_COMMISSION_PER_DEAL),
            },
            confidence=0.9,
        )
    
    def _breakdown_from_volume(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Transaktionsvolumen-Ziel"""
        target_volume = goal_input.target_value or 1_000_000  # €
        
        # Volumen → Anzahl Deals
        total_deals = target_volume / self.AVG_DEAL_VALUE
        monthly_deals = total_deals / goal_input.timeframe_months
        
        # Provision
        estimated_commission = target_volume * self.AVG_COMMISSION_RATE
        
        return GoalBreakdown(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_type=GoalType.VOLUME,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Abschlüsse",
            primary_units=total_deals,
            primary_units_per_month=monthly_deals,
            primary_units_per_week=monthly_deals / 4.33,
            secondary_units={
                "transaction_volume": round(target_volume),
                "estimated_commission": round(estimated_commission),
            },
            target_income_monthly=estimated_commission / goal_input.timeframe_months,
            assumptions={
                "avg_deal_value": self.AVG_DEAL_VALUE,
                "commission_rate": self.AVG_COMMISSION_RATE,
            },
            confidence=0.8,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Immobilien-spezifische Erweiterungen
    # ─────────────────────────────────────────────────────────────────────────
    
    def compute_daily_flow_targets(
        self,
        goal_breakdown: GoalBreakdown,
        config: DailyFlowConfig | None = None,
    ) -> DailyFlowTargets:
        """
        Immobilien-spezifische Daily Flow Berechnung.
        
        Berücksichtigt:
        - Besichtigungen als Zwischen-Schritt
        - Längere Follow-up Zyklen
        """
        if config is None:
            config = self.get_default_conversion_config()
        
        # Basis-Berechnung
        targets = super().compute_daily_flow_targets(goal_breakdown, config)
        
        # Immobilien-Ergänzung: Besichtigungen berechnen
        secondary = goal_breakdown.secondary_units or {}
        viewings_total = secondary.get("viewings", 0)
        
        if viewings_total > 0:
            weeks = goal_breakdown.timeframe_months * 4.33
            viewings_per_week = viewings_total / weeks
            targets.appointments = max(1, round(viewings_per_week))
        
        return targets

