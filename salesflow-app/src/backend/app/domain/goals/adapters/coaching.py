"""
╔════════════════════════════════════════════════════════════════════════════╗
║  COACHING ADAPTER                                                          ║
║  MRR-basierte Zielberechnung für Coaches & Berater                        ║
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


class CoachingAdapter(BaseVerticalAdapter):
    """
    Adapter für Coaches & Berater.
    
    Berechnet:
    - Income (MRR) → Klienten → Discovery Calls → Leads
    - Clients → Discovery Calls → Leads
    """
    
    # Durchschnittswerte (DACH-Markt)
    AVG_CLIENT_VALUE = 500       # 500€/Monat pro Klient
    AVG_PROGRAM_LENGTH = 6       # 6 Monate Ø Programmdauer
    
    # Conversion Rates
    DISCOVERY_TO_CLIENT = 0.30   # 30% Discovery → Klient
    LEAD_TO_DISCOVERY = 0.15     # 15% Lead → Discovery Call
    
    @property
    def vertical_id(self) -> str:
        return VerticalId.COACHING.value
    
    def get_label(self) -> str:
        return "Coaching & Beratung"
    
    def get_default_conversion_config(self) -> DailyFlowConfig:
        return DailyFlowConfig(
            working_days_per_week=5,
            contact_to_primary_unit=0.045,     # ~4.5% Lead → Klient (über Discovery)
            contact_to_secondary_unit=0.15,    # 15% Lead → Discovery Call
            followups_per_primary=5,           # 5 Follow-ups bis Klient
            followups_per_secondary=2,         # 2 Follow-ups bis Discovery
            reactivation_share=0.20,           # 20% alte Kontakte
        )
    
    def get_kpi_definitions(self) -> List[KpiDefinition]:
        return [
            KpiDefinition(
                id="new_leads",
                label="Neue Leads",
                description="Interessenten aus Content/Ads/Referrals",
                unit="per_day",
                icon="UserPlus",
                color="blue",
            ),
            KpiDefinition(
                id="followups",
                label="Follow-ups",
                description="Nachfass-Messages/-Calls",
                unit="per_day",
                icon="MessageCircle",
                color="green",
            ),
            KpiDefinition(
                id="discovery_calls",
                label="Discovery Calls",
                description="Erstgespräche",
                unit="per_week",
                icon="Video",
                color="purple",
            ),
            KpiDefinition(
                id="proposals",
                label="Angebote",
                description="Versendete Angebote",
                unit="per_week",
                icon="FileText",
                color="amber",
            ),
            KpiDefinition(
                id="new_clients",
                label="Neue Klienten",
                description="Coaching-Starts",
                unit="per_month",
                icon="UserCheck",
                color="emerald",
            ),
            KpiDefinition(
                id="mrr",
                label="MRR",
                description="Monthly Recurring Revenue",
                unit="per_month",
                icon="TrendingUp",
                color="indigo",
            ),
        ]
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Berechnet Goal-Breakdown für Coaching.
        
        Unterstützte GoalKinds:
        - INCOME → Klienten → Discovery Calls → Leads
        - CUSTOMERS (Klienten) → Discovery Calls → Leads
        - VOLUME (Umsatz) → Klienten → ...
        """
        if goal_input.goal_kind == GoalKind.INCOME:
            return self._compute_income_goal(goal_input)
        elif goal_input.goal_kind == GoalKind.CUSTOMERS:
            return self._compute_clients_goal(goal_input)
        elif goal_input.goal_kind == GoalKind.VOLUME:
            return self._compute_volume_goal(goal_input)
        else:
            return self._compute_income_goal(goal_input)
    
    def _compute_income_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """MRR-Ziel → Klienten → Discovery Calls"""
        target_mrr = goal_input.target_value
        
        avg_client_value = goal_input.vertical_meta.get("avg_client_value", self.AVG_CLIENT_VALUE)
        program_length = goal_input.vertical_meta.get("program_length", self.AVG_PROGRAM_LENGTH)
        
        # Wie viele aktive Klienten brauchen wir für dieses MRR?
        required_active_clients = target_mrr / avg_client_value
        
        # Wie viele neue Klienten brauchen wir im Zeitraum (Churn berücksichtigen)?
        churn_rate = goal_input.vertical_meta.get("churn_rate", 0.15)  # 15% Churn/Monat
        new_clients_needed = required_active_clients * (1 + churn_rate * goal_input.timeframe_months)
        
        # Discovery Calls → Klienten
        discovery_rate = goal_input.vertical_meta.get("discovery_to_client", self.DISCOVERY_TO_CLIENT)
        required_discovery = new_clients_needed / discovery_rate
        
        # Leads → Discovery
        lead_rate = goal_input.vertical_meta.get("lead_to_discovery", self.LEAD_TO_DISCOVERY)
        required_leads = required_discovery / lead_rate
        
        total_revenue = target_mrr * goal_input.timeframe_months
        weeks = goal_input.timeframe_months * 4.33
        
        return GoalBreakdown(
            vertical_id=VerticalId.COACHING,
            goal_kind=goal_input.goal_kind,
            timeframe_months=goal_input.timeframe_months,
            primary_units=new_clients_needed,       # Neue Klienten
            secondary_units=required_discovery,     # Discovery Calls
            required_volume=total_revenue,
            per_month_volume=target_mrr,
            per_week_volume=target_mrr / 4.33,
            per_day_volume=target_mrr / (4.33 * 5),
            vertical_details={
                "required_active_clients": required_active_clients,
                "required_leads": required_leads,
                "avg_client_value": avg_client_value,
                "discovery_to_client_rate": discovery_rate,
                "lead_to_discovery_rate": lead_rate,
            },
            notes=f"MRR-Ziel: {target_mrr:,.0f}€ = {required_active_clients:.0f} aktive Klienten",
        )
    
    def _compute_clients_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Klienten-Ziel → Discovery Calls → Leads"""
        required_clients = goal_input.target_value
        
        avg_client_value = goal_input.vertical_meta.get("avg_client_value", self.AVG_CLIENT_VALUE)
        discovery_rate = goal_input.vertical_meta.get("discovery_to_client", self.DISCOVERY_TO_CLIENT)
        
        required_discovery = required_clients / discovery_rate
        total_revenue = required_clients * avg_client_value * goal_input.timeframe_months
        
        weeks = goal_input.timeframe_months * 4.33
        
        return GoalBreakdown(
            vertical_id=VerticalId.COACHING,
            goal_kind=goal_input.goal_kind,
            timeframe_months=goal_input.timeframe_months,
            primary_units=required_clients,
            secondary_units=required_discovery,
            required_volume=total_revenue,
            per_month_volume=total_revenue / goal_input.timeframe_months,
            per_week_volume=total_revenue / weeks,
            per_day_volume=total_revenue / (weeks * 5),
            vertical_details={
                "avg_client_value": avg_client_value,
            },
            notes=f"Klienten-Ziel: {required_clients:.0f} neue Klienten",
        )
    
    def _compute_volume_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Umsatz-Ziel → Klienten → Discovery"""
        target_volume = goal_input.target_value
        avg_client_value = goal_input.vertical_meta.get("avg_client_value", self.AVG_CLIENT_VALUE)
        program_length = goal_input.vertical_meta.get("program_length", self.AVG_PROGRAM_LENGTH)
        
        # Lifetime Value pro Klient
        ltv = avg_client_value * program_length
        required_clients = target_volume / ltv
        
        discovery_rate = goal_input.vertical_meta.get("discovery_to_client", self.DISCOVERY_TO_CLIENT)
        required_discovery = required_clients / discovery_rate
        
        weeks = goal_input.timeframe_months * 4.33
        
        return GoalBreakdown(
            vertical_id=VerticalId.COACHING,
            goal_kind=goal_input.goal_kind,
            timeframe_months=goal_input.timeframe_months,
            primary_units=required_clients,
            secondary_units=required_discovery,
            required_volume=target_volume,
            per_month_volume=target_volume / goal_input.timeframe_months,
            per_week_volume=target_volume / weeks,
            per_day_volume=target_volume / (weeks * 5),
            vertical_details={
                "avg_client_ltv": ltv,
                "program_length": program_length,
            },
            notes=f"Umsatz-Ziel: {target_volume:,.0f}€ = {required_clients:.0f} Klienten × {ltv:,.0f}€ LTV",
        )

