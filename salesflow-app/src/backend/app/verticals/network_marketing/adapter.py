"""
╔════════════════════════════════════════════════════════════════════════════╗
║  NETWORK MARKETING / MLM VERTICAL ADAPTER                                 ║
║  Erste Implementierung des Vertical-Systems                               ║
╚════════════════════════════════════════════════════════════════════════════╝

Enthält Logik für verschiedene MLM-Compensation-Plans:
  → Zinzino, PM International, LR Health, Ringana, etc.

Sync mit TypeScript:
  → src/services/verticalAdapters/networkMarketing.ts
"""

from typing import List

from app.domain.goals.types import (
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    KpiDefinition,
    VerticalId,
    GoalKind,
    CompensationPlan,
)
from app.domain.goals.vertical_adapter import BaseVerticalAdapter
from .comp_plans import get_compensation_plan


class NetworkMarketingAdapter(BaseVerticalAdapter):
    """
    Adapter für Network Marketing / MLM.
    
    Unterstützt verschiedene MLM-Firmen (Zinzino, Ringana, PM, etc.)
    über konfigurierbare Compensation Plans.
    """
    
    @property
    def vertical_id(self) -> str:
        return VerticalId.NETWORK_MARKETING.value
    
    def get_label(self) -> str:
        return "Network Marketing / MLM"
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Berechnet Goal Breakdown basierend auf MLM-spezifischer Logik.
        
        Unterstützt:
        - Income Goals → berechnet benötigtes Volumen & Struktur
        - Rank Goals → mapped auf Rang-Requirements
        - Volume Goals → direktes Volumen-Target
        """
        comp_plan_id = goal_input.vertical_meta.get("comp_plan_id")
        plan = get_compensation_plan(comp_plan_id) if comp_plan_id else None
        
        if plan:
            return self._compute_with_plan(goal_input, plan)
        return self._compute_heuristic(goal_input)
    
    def _compute_with_plan(
        self, 
        goal_input: GoalInput, 
        plan: CompensationPlan
    ) -> GoalBreakdown:
        """Berechnung mit konkretem Compensation Plan."""
        
        target = goal_input.target_value
        months = goal_input.timeframe_months
        
        match goal_input.goal_kind:
            case GoalKind.INCOME:
                return self._income_to_breakdown(target, months, plan)
            case GoalKind.RANK:
                return self._rank_to_breakdown(int(target), months, plan)
            case GoalKind.VOLUME:
                return self._volume_to_breakdown(target, months, plan)
            case _:
                return self._compute_heuristic(goal_input)
    
    def _income_to_breakdown(
        self,
        target_income_per_month: float,
        months: int,
        plan: CompensationPlan,
    ) -> GoalBreakdown:
        """Einkommen → benötigter Rang → Volumen → Kunden/Partner."""
        
        # Finde Rang der das Einkommen erreicht
        target_rank = None
        for rank in plan.ranks:
            if rank.avg_income >= target_income_per_month:
                target_rank = rank
                break
        
        if not target_rank:
            target_rank = plan.ranks[-1]  # Höchster Rang
        
        required_volume = target_rank.required_volume
        
        # Kunden/Partner Schätzung
        volume_per_customer = plan.avg_volume_per_customer
        est_customers = required_volume / volume_per_customer
        est_partners = est_customers / plan.customer_to_partner_ratio
        
        per_month = required_volume / months
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.INCOME,
            timeframe_months=months,
            primary_units=est_customers,
            secondary_units=est_partners,
            required_volume=required_volume,
            per_month_volume=per_month,
            per_week_volume=per_month / 4,
            per_day_volume=per_month / 30,
            vertical_details={
                "plan_id": plan.id,
                "target_rank_id": target_rank.id,
                "target_rank_name": target_rank.name,
                "target_income": target_income_per_month,
                "avg_income_at_rank": target_rank.avg_income,
            },
            notes=f"Basierend auf {plan.display_name}, Ziel-Rang: {target_rank.name}",
        )
    
    def _rank_to_breakdown(
        self,
        target_rank_index: int,
        months: int,
        plan: CompensationPlan,
    ) -> GoalBreakdown:
        """Rang-Ziel → Volumen → Kunden/Partner."""
        
        if target_rank_index >= len(plan.ranks):
            target_rank_index = len(plan.ranks) - 1
        
        target_rank = plan.ranks[target_rank_index]
        required_volume = target_rank.required_volume
        
        volume_per_customer = plan.avg_volume_per_customer
        est_customers = required_volume / volume_per_customer
        est_partners = est_customers / plan.customer_to_partner_ratio
        
        per_month = required_volume / months
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.RANK,
            timeframe_months=months,
            primary_units=est_customers,
            secondary_units=est_partners,
            required_volume=required_volume,
            per_month_volume=per_month,
            per_week_volume=per_month / 4,
            per_day_volume=per_month / 30,
            vertical_details={
                "plan_id": plan.id,
                "target_rank_id": target_rank.id,
                "target_rank_name": target_rank.name,
            },
            notes=f"Rang-Ziel: {target_rank.name} mit {plan.display_name}",
        )
    
    def _volume_to_breakdown(
        self,
        target_volume: float,
        months: int,
        plan: CompensationPlan,
    ) -> GoalBreakdown:
        """Direktes Volumen-Ziel."""
        
        volume_per_customer = plan.avg_volume_per_customer
        est_customers = target_volume / volume_per_customer
        est_partners = est_customers / plan.customer_to_partner_ratio
        
        per_month = target_volume / months
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.VOLUME,
            timeframe_months=months,
            primary_units=est_customers,
            secondary_units=est_partners,
            required_volume=target_volume,
            per_month_volume=per_month,
            per_week_volume=per_month / 4,
            per_day_volume=per_month / 30,
            vertical_details={"plan_id": plan.id},
            notes=f"Volumen-Ziel: {target_volume} {plan.unit_label}",
        )
    
    def _compute_heuristic(self, goal_input: GoalInput) -> GoalBreakdown:
        """Fallback-Heuristik ohne konkreten Plan."""
        
        target = goal_input.target_value
        months = goal_input.timeframe_months
        
        # Grobe Annahmen
        if goal_input.goal_kind == GoalKind.INCOME:
            required_volume = target * 3 * months  # 3x Einkommen als Volumen
        elif goal_input.goal_kind == GoalKind.VOLUME:
            required_volume = target
        else:
            required_volume = target * 100  # Deals/Clients → Credits
        
        est_customers = required_volume / 100  # 100 Credits pro Kunde
        est_partners = est_customers / 5
        
        per_month = required_volume / months
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=goal_input.goal_kind,
            timeframe_months=months,
            primary_units=est_customers,
            secondary_units=est_partners,
            required_volume=required_volume,
            per_month_volume=per_month,
            per_week_volume=per_month / 4,
            per_day_volume=per_month / 30,
            vertical_details={"heuristic": True},
            notes="Heuristik ohne konkreten MLM-Plan",
        )
    
    def get_default_conversion_config(self) -> DailyFlowConfig:
        """Standard-Konversionsannahmen für MLM."""
        return DailyFlowConfig(
            working_days_per_week=5,
            contact_to_primary_unit=0.20,      # 20% → Kunde
            contact_to_secondary_unit=0.05,    # 5% → Partner
            followups_per_primary=3,
            followups_per_secondary=5,
            reactivation_share=0.20,
        )
    
    def get_kpi_definitions(self) -> List[KpiDefinition]:
        """KPIs für Network Marketing Dashboard."""
        return [
            KpiDefinition(
                id="new_contacts",
                label="Neue Kontakte",
                description="Erstkontakte mit neuen Interessenten",
                unit="per_day",
                icon="UserPlus",
                color="blue",
            ),
            KpiDefinition(
                id="followups",
                label="Follow-ups",
                description="Nachfassen bei bestehenden Kontakten",
                unit="per_day",
                icon="MessageSquare",
                color="green",
            ),
            KpiDefinition(
                id="reactivations",
                label="Reaktivierungen",
                description="Wiedereinstieg alter Kontakte",
                unit="per_day",
                icon="RefreshCw",
                color="orange",
            ),
            KpiDefinition(
                id="customers",
                label="Kunden",
                description="Aktive Produktkunden",
                unit="total",
                icon="Users",
                color="purple",
            ),
            KpiDefinition(
                id="partners",
                label="Partner",
                description="Aktive Geschäftspartner",
                unit="total",
                icon="Handshake",
                color="indigo",
            ),
            KpiDefinition(
                id="team_volume",
                label="Team-Volumen",
                description="Gesamtvolumen der Struktur",
                unit="per_month",
                icon="TrendingUp",
                color="emerald",
            ),
        ]


# ═══════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════

network_marketing_adapter = NetworkMarketingAdapter()

