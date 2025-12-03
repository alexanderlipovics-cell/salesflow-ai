"""
╔════════════════════════════════════════════════════════════════════════════╗
║  NETWORK MARKETING ADAPTER                                                 ║
║  Rang-basierte Zielberechnung für MLM (Zinzino, PM, LR, etc.)             ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Optional

from ..types import (
    VerticalId,
    GoalKind,
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    KpiDefinition,
    CompensationPlan,
    RankDefinition,
)
from ..vertical_adapter import BaseVerticalAdapter


class NetworkMarketingAdapter(BaseVerticalAdapter):
    """
    Adapter für Network Marketing / MLM.
    
    Berechnet:
    - Income → Rang → Volumen → Kunden/Partner
    - Rank → Volumen → Kunden/Partner
    - Volume → Kunden/Partner
    """
    
    def __init__(self, compensation_plan: Optional[CompensationPlan] = None):
        """
        Args:
            compensation_plan: Optional - wenn nicht gegeben, nutzen wir Defaults
        """
        self._plan = compensation_plan
    
    @property
    def vertical_id(self) -> str:
        return VerticalId.NETWORK_MARKETING.value
    
    def get_label(self) -> str:
        if self._plan:
            return f"Network Marketing ({self._plan.display_name})"
        return "Network Marketing / MLM"
    
    def get_default_conversion_config(self) -> DailyFlowConfig:
        return DailyFlowConfig(
            working_days_per_week=5,
            contact_to_primary_unit=0.20,     # 20% Kontakte → Kunde
            contact_to_secondary_unit=0.05,   # 5% Kontakte → Partner
            followups_per_primary=3,          # 3 Follow-ups pro Kunde
            followups_per_secondary=5,        # 5 Follow-ups pro Partner
            reactivation_share=0.20,          # 20% Reaktivierungen
        )
    
    def get_kpi_definitions(self) -> List[KpiDefinition]:
        unit_label = self._plan.unit_label if self._plan else "Credits"
        return [
            KpiDefinition(
                id="new_contacts",
                label="Neue Kontakte",
                description="Erstkontakte mit Interessenten",
                unit="per_day",
                icon="UserPlus",
                color="blue",
            ),
            KpiDefinition(
                id="followups",
                label="Follow-ups",
                description="Nachfass-Gespräche",
                unit="per_day",
                icon="MessageSquare",
                color="green",
            ),
            KpiDefinition(
                id="new_customers",
                label="Neue Kunden",
                description="Kunden-Abschlüsse",
                unit="per_week",
                icon="ShoppingCart",
                color="emerald",
            ),
            KpiDefinition(
                id="new_partners",
                label="Neue Partner",
                description="Partner-Registrierungen",
                unit="per_week",
                icon="Users",
                color="purple",
            ),
            KpiDefinition(
                id="personal_volume",
                label=f"Eigene {unit_label}",
                description="Persönliches Volumen",
                unit="per_month",
                icon="TrendingUp",
                color="amber",
            ),
            KpiDefinition(
                id="group_volume",
                label=f"Gruppen-{unit_label}",
                description="Gesamtes Teamvolumen",
                unit="per_month",
                icon="Network",
                color="indigo",
            ),
        ]
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Berechnet Goal-Breakdown für Network Marketing.
        
        Unterstützte GoalKinds:
        - INCOME → Rang finden → Volumen → Kunden/Partner
        - RANK → Volumen → Kunden/Partner
        - VOLUME → Kunden/Partner
        - CUSTOMERS → direkt
        - PARTNERS → direkt
        """
        if goal_input.goal_kind == GoalKind.INCOME:
            return self._compute_income_goal(goal_input)
        elif goal_input.goal_kind == GoalKind.RANK:
            return self._compute_rank_goal(goal_input)
        elif goal_input.goal_kind == GoalKind.VOLUME:
            return self._compute_volume_goal(goal_input)
        elif goal_input.goal_kind == GoalKind.CUSTOMERS:
            return self._compute_customers_goal(goal_input)
        elif goal_input.goal_kind == GoalKind.PARTNERS:
            return self._compute_partners_goal(goal_input)
        else:
            # Fallback: Volume-Goal
            return self._compute_volume_goal(goal_input)
    
    # ═══════════════════════════════════════════════════════════════════════
    # PRIVATE METHODS
    # ═══════════════════════════════════════════════════════════════════════
    
    def _compute_income_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Income → Rang → Volumen → Kunden/Partner"""
        target_income = goal_input.target_value
        
        # Finde passenden Rang für Ziel-Einkommen
        target_rank = self._find_rank_for_income(target_income)
        required_volume = target_rank.required_volume if target_rank else target_income * 50
        
        return self._volume_to_breakdown(
            required_volume=required_volume,
            goal_input=goal_input,
            notes=f"Ziel-Rang: {target_rank.name if target_rank else 'N/A'} für {target_income:,.0f}€/Monat"
        )
    
    def _compute_rank_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Rang → Volumen → Kunden/Partner"""
        rank_id = goal_input.vertical_meta.get("rank_id")
        target_rank = self._find_rank_by_id(rank_id)
        
        required_volume = target_rank.required_volume if target_rank else goal_input.target_value
        
        return self._volume_to_breakdown(
            required_volume=required_volume,
            goal_input=goal_input,
            notes=f"Rang-Ziel: {target_rank.name if target_rank else rank_id}"
        )
    
    def _compute_volume_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Volumen → Kunden/Partner"""
        return self._volume_to_breakdown(
            required_volume=goal_input.target_value,
            goal_input=goal_input,
            notes=f"Volumen-Ziel: {goal_input.target_value:,.0f}"
        )
    
    def _compute_customers_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Direkte Kunden-Anzahl"""
        avg_vol = self._plan.avg_volume_per_customer if self._plan else 60
        required_volume = goal_input.target_value * avg_vol
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=goal_input.goal_kind,
            timeframe_months=goal_input.timeframe_months,
            primary_units=goal_input.target_value,
            secondary_units=0,
            required_volume=required_volume,
            per_month_volume=required_volume / goal_input.timeframe_months,
            per_week_volume=required_volume / (goal_input.timeframe_months * 4.33),
            per_day_volume=required_volume / (goal_input.timeframe_months * 4.33 * 5),
            notes=f"Kunden-Ziel: {goal_input.target_value:.0f} Kunden",
        )
    
    def _compute_partners_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """Direkte Partner-Anzahl"""
        avg_vol = self._plan.avg_volume_per_partner if self._plan else 100
        required_volume = goal_input.target_value * avg_vol
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=goal_input.goal_kind,
            timeframe_months=goal_input.timeframe_months,
            primary_units=0,
            secondary_units=goal_input.target_value,
            required_volume=required_volume,
            per_month_volume=required_volume / goal_input.timeframe_months,
            per_week_volume=required_volume / (goal_input.timeframe_months * 4.33),
            per_day_volume=required_volume / (goal_input.timeframe_months * 4.33 * 5),
            notes=f"Partner-Ziel: {goal_input.target_value:.0f} Partner",
        )
    
    def _volume_to_breakdown(
        self,
        required_volume: float,
        goal_input: GoalInput,
        notes: str = "",
    ) -> GoalBreakdown:
        """Konvertiert Volumen zu Kunden/Partner-Breakdown."""
        avg_cust_vol = self._plan.avg_volume_per_customer if self._plan else 60
        avg_partner_vol = self._plan.avg_volume_per_partner if self._plan else 100
        cust_partner_ratio = self._plan.customer_to_partner_ratio if self._plan else 5
        
        # Volumen-Verteilung: 70% von Kunden, 30% von Partnern (typisch)
        customer_volume_share = 0.7
        partner_volume_share = 0.3
        
        estimated_customers = (required_volume * customer_volume_share) / avg_cust_vol
        estimated_partners = (required_volume * partner_volume_share) / avg_partner_vol
        
        weeks = goal_input.timeframe_months * 4.33
        days = weeks * 5  # 5 Arbeitstage
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=goal_input.goal_kind,
            timeframe_months=goal_input.timeframe_months,
            primary_units=estimated_customers,
            secondary_units=estimated_partners,
            required_volume=required_volume,
            per_month_volume=required_volume / goal_input.timeframe_months,
            per_week_volume=required_volume / weeks,
            per_day_volume=required_volume / days,
            vertical_details={
                "avg_customer_volume": avg_cust_vol,
                "avg_partner_volume": avg_partner_vol,
                "customer_partner_ratio": cust_partner_ratio,
            },
            notes=notes,
        )
    
    def _find_rank_for_income(self, target_income: float) -> Optional[RankDefinition]:
        """Findet den passenden Rang für ein Ziel-Einkommen."""
        if not self._plan:
            return None
        
        # Finde den niedrigsten Rang, der das Ziel-Einkommen ermöglicht
        for rank in sorted(self._plan.ranks, key=lambda r: r.order):
            if rank.avg_income >= target_income:
                return rank
        
        # Wenn keiner passt, nimm den höchsten
        return max(self._plan.ranks, key=lambda r: r.order) if self._plan.ranks else None
    
    def _find_rank_by_id(self, rank_id: Optional[str]) -> Optional[RankDefinition]:
        """Findet einen Rang nach ID."""
        if not self._plan or not rank_id:
            return None
        
        for rank in self._plan.ranks:
            if rank.id == rank_id:
                return rank
        return None

