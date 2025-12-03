"""
╔════════════════════════════════════════════════════════════════════════════╗
║  REAL ESTATE ADAPTER                                                       ║
║  Provision-basierte Zielberechnung für Immobilienmakler                   ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List

from ..types import (
    VerticalId,
    GoalKind,
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    KpiDefinition,
)
from ..vertical_adapter import BaseVerticalAdapter


class RealEstateAdapter(BaseVerticalAdapter):
    """
    Adapter für Immobilienmakler.
    
    Berechnet:
    - Income → Deals → Leads/Besichtigungen
    - Deals → Leads/Besichtigungen
    """
    
    # Durchschnittswerte (DACH-Markt)
    AVG_DEAL_COMMISSION = 8000  # 8.000€ pro Deal
    AVG_DEAL_VALUE = 300000     # 300k€ Objektwert
    COMMISSION_RATE = 0.03      # 3% Provision
    
    # Conversion Rates
    VIEWING_TO_DEAL = 0.10      # 10% Besichtigungen → Deal
    LEAD_TO_VIEWING = 0.25      # 25% Leads → Besichtigung
    
    @property
    def vertical_id(self) -> str:
        return VerticalId.REAL_ESTATE.value
    
    def get_label(self) -> str:
        return "Immobilien / Makler"
    
    def get_default_conversion_config(self) -> DailyFlowConfig:
        return DailyFlowConfig(
            working_days_per_week=6,           # Makler arbeiten oft 6 Tage
            contact_to_primary_unit=0.025,     # 2.5% Lead → Deal (über Besichtigung)
            contact_to_secondary_unit=0.25,    # 25% Lead → Besichtigung
            followups_per_primary=8,           # 8 Follow-ups bis Deal
            followups_per_secondary=3,         # 3 Follow-ups bis Besichtigung
            reactivation_share=0.15,           # 15% alte Kontakte reaktivieren
        )
    
    def get_kpi_definitions(self) -> List[KpiDefinition]:
        return [
            KpiDefinition(
                id="new_leads",
                label="Neue Leads",
                description="Neue Interessenten (Käufer/Verkäufer)",
                unit="per_day",
                icon="UserPlus",
                color="blue",
            ),
            KpiDefinition(
                id="followups",
                label="Follow-ups",
                description="Nachfass-Kontakte",
                unit="per_day",
                icon="Phone",
                color="green",
            ),
            KpiDefinition(
                id="viewings",
                label="Besichtigungen",
                description="Objekt-Besichtigungen",
                unit="per_week",
                icon="Home",
                color="amber",
            ),
            KpiDefinition(
                id="listings",
                label="Neue Listings",
                description="Akquirierte Objekte",
                unit="per_month",
                icon="Building",
                color="purple",
            ),
            KpiDefinition(
                id="deals",
                label="Abschlüsse",
                description="Notartermine / Deals",
                unit="per_month",
                icon="FileCheck",
                color="emerald",
            ),
            KpiDefinition(
                id="commission",
                label="Provision",
                description="Verdiente Provision",
                unit="per_month",
                icon="Euro",
                color="indigo",
            ),
        ]
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Berechnet Goal-Breakdown für Immobilien.
        
        Unterstützte GoalKinds:
        - INCOME → Deals → Leads
        - DEALS → Leads
        - VOLUME → Deals → Leads
        """
        if goal_input.goal_kind == GoalKind.INCOME:
            return self._compute_income_goal(goal_input)
        elif goal_input.goal_kind == GoalKind.DEALS:
            return self._compute_deals_goal(goal_input)
        elif goal_input.goal_kind == GoalKind.VOLUME:
            return self._compute_volume_goal(goal_input)
        else:
            # Fallback: Income-Goal
            return self._compute_income_goal(goal_input)
    
    def _compute_income_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Income → Deals → Leads/Besichtigungen"""
        target_income = goal_input.target_value
        total_income = target_income * goal_input.timeframe_months
        
        # Wie viele Deals brauchen wir?
        avg_commission = goal_input.vertical_meta.get("avg_commission", self.AVG_DEAL_COMMISSION)
        required_deals = total_income / avg_commission
        
        # Wie viele Besichtigungen → Deals?
        viewing_rate = goal_input.vertical_meta.get("viewing_to_deal", self.VIEWING_TO_DEAL)
        required_viewings = required_deals / viewing_rate
        
        # Wie viele Leads → Besichtigungen?
        lead_rate = goal_input.vertical_meta.get("lead_to_viewing", self.LEAD_TO_VIEWING)
        required_leads = required_viewings / lead_rate
        
        weeks = goal_input.timeframe_months * 4.33
        
        return GoalBreakdown(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_kind=goal_input.goal_kind,
            timeframe_months=goal_input.timeframe_months,
            primary_units=required_deals,           # Deals = primary
            secondary_units=required_viewings,      # Besichtigungen = secondary
            required_volume=total_income,           # Gesamt-Provision
            per_month_volume=target_income,
            per_week_volume=target_income / 4.33,
            per_day_volume=target_income / (4.33 * 6),  # 6 Arbeitstage
            vertical_details={
                "required_leads": required_leads,
                "avg_commission": avg_commission,
                "viewing_to_deal_rate": viewing_rate,
                "lead_to_viewing_rate": lead_rate,
            },
            notes=f"Ziel: {target_income:,.0f}€/Monat = {required_deals:.1f} Deals in {goal_input.timeframe_months} Monaten",
        )
    
    def _compute_deals_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Deals → Leads/Besichtigungen"""
        required_deals = goal_input.target_value
        avg_commission = goal_input.vertical_meta.get("avg_commission", self.AVG_DEAL_COMMISSION)
        
        viewing_rate = goal_input.vertical_meta.get("viewing_to_deal", self.VIEWING_TO_DEAL)
        required_viewings = required_deals / viewing_rate
        
        total_income = required_deals * avg_commission
        weeks = goal_input.timeframe_months * 4.33
        
        return GoalBreakdown(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_kind=goal_input.goal_kind,
            timeframe_months=goal_input.timeframe_months,
            primary_units=required_deals,
            secondary_units=required_viewings,
            required_volume=total_income,
            per_month_volume=total_income / goal_input.timeframe_months,
            per_week_volume=total_income / weeks,
            per_day_volume=total_income / (weeks * 6),
            vertical_details={
                "avg_commission": avg_commission,
            },
            notes=f"Deal-Ziel: {required_deals:.0f} Abschlüsse",
        )
    
    def _compute_volume_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Volume (Objektwert) → Deals → Leads"""
        target_volume = goal_input.target_value
        avg_deal_value = goal_input.vertical_meta.get("avg_deal_value", self.AVG_DEAL_VALUE)
        commission_rate = goal_input.vertical_meta.get("commission_rate", self.COMMISSION_RATE)
        
        required_deals = target_volume / avg_deal_value
        total_commission = target_volume * commission_rate
        
        viewing_rate = goal_input.vertical_meta.get("viewing_to_deal", self.VIEWING_TO_DEAL)
        required_viewings = required_deals / viewing_rate
        
        weeks = goal_input.timeframe_months * 4.33
        
        return GoalBreakdown(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_kind=goal_input.goal_kind,
            timeframe_months=goal_input.timeframe_months,
            primary_units=required_deals,
            secondary_units=required_viewings,
            required_volume=total_commission,
            per_month_volume=total_commission / goal_input.timeframe_months,
            per_week_volume=total_commission / weeks,
            per_day_volume=total_commission / (weeks * 6),
            vertical_details={
                "total_object_volume": target_volume,
                "avg_deal_value": avg_deal_value,
                "commission_rate": commission_rate,
            },
            notes=f"Volumen-Ziel: {target_volume:,.0f}€ Objektwert = {total_commission:,.0f}€ Provision",
        )

