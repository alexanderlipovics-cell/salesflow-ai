"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GOAL ENGINE                                                               ║
║  Berechnet aus Zielen → Volumen → Kunden/Partner → Daily Tasks            ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import math
from typing import Optional
from loguru import logger

from app.domain.goals.models import (
    GoalCalculationInput,
    GoalCalculationResult,
    DailyFlowConfig,
    DailyFlowTargets,
    WeeklyTargets,
    DailyTargets,
    GoalType,
    DEFAULT_DAILY_FLOW_CONFIG,
)
from app.domain.compensation.models import CompensationPlan, RankDefinition
from app.domain.compensation.plans import (
    get_plan_by_id,
    find_rank_for_income,
    find_rank_by_id,
)


class GoalEngine:
    """
    Goal Engine - Berechnet aus Zielen die nötigen Aktivitäten.
    
    Flow:
    1. Ziel-Rang bestimmen (nach Einkommen oder ID)
    2. Benötigtes Volumen berechnen
    3. Kunden/Partner-Schätzung
    4. Zeitliche Aufteilung
    5. Daily Flow Targets berechnen
    """
    
    # Share of volume from customers vs partners
    CUSTOMER_VOLUME_SHARE = 0.7
    PARTNER_VOLUME_SHARE = 0.3
    
    # Weeks per month (average)
    WEEKS_PER_MONTH = 4.33
    
    def __init__(self, plan: CompensationPlan, config: Optional[DailyFlowConfig] = None):
        """Initialize with a compensation plan."""
        self.plan = plan
        self.config = config or DEFAULT_DAILY_FLOW_CONFIG
    
    def calculate(self, input: GoalCalculationInput) -> GoalCalculationResult:
        """
        Main calculation method.
        
        Args:
            input: Goal calculation input with all parameters
            
        Returns:
            GoalCalculationResult with all calculated values
        """
        # 1. Find target rank
        target_rank = self._find_target_rank(input)
        if not target_rank:
            raise ValueError("Could not determine target rank for the given goal")
        
        logger.info(f"Target rank: {target_rank.name} for {self.plan.company_name}")
        
        # 2. Calculate required volume
        required_volume = target_rank.requirements.min_group_volume or 0
        current_volume = input.current_group_volume or 0
        missing_volume = max(0, required_volume - current_volume)
        
        # 3. Estimate customers and partners
        customers, partners = self._estimate_customers_partners(missing_volume)
        
        # 4. Time distribution
        weeks = input.timeframe_months * self.WEEKS_PER_MONTH
        per_month = missing_volume / input.timeframe_months if input.timeframe_months > 0 else 0
        per_week = missing_volume / weeks if weeks > 0 else 0
        per_day = per_week / self.config.working_days_per_week if self.config.working_days_per_week > 0 else 0
        
        # 5. Calculate daily flow targets
        daily_targets = self._calculate_daily_targets(
            customers, partners, input.timeframe_months
        )
        
        return GoalCalculationResult(
            target_rank=target_rank,
            required_group_volume=required_volume,
            missing_group_volume=missing_volume,
            estimated_customers=customers,
            estimated_partners=partners,
            per_month_volume=round(per_month),
            per_week_volume=round(per_week),
            per_day_volume=round(per_day),
            daily_targets=daily_targets,
            company_id=self.plan.company_id,
            company_name=self.plan.company_name,
            timeframe_months=input.timeframe_months,
        )
    
    def _find_target_rank(self, input: GoalCalculationInput) -> Optional[RankDefinition]:
        """Find the target rank based on goal type."""
        if input.goal_type == GoalType.INCOME:
            return find_rank_for_income(
                self.plan.company_id,
                input.target_monthly_income or 0,
                input.region
            )
        else:
            return find_rank_by_id(
                self.plan.company_id,
                input.target_rank_id or "",
                input.region
            )
    
    def _estimate_customers_partners(self, missing_volume: float) -> tuple[int, int]:
        """Estimate number of customers and partners needed."""
        avg_customer_volume = self.plan.avg_personal_volume_per_customer or 60
        avg_partner_volume = self.plan.avg_personal_volume_per_partner or 100
        
        customer_volume = missing_volume * self.CUSTOMER_VOLUME_SHARE
        partner_volume = missing_volume * self.PARTNER_VOLUME_SHARE
        
        customers = math.ceil(customer_volume / avg_customer_volume) if avg_customer_volume > 0 else 0
        partners = math.ceil(partner_volume / avg_partner_volume) if avg_partner_volume > 0 else 0
        
        return customers, partners
    
    def _calculate_daily_targets(
        self,
        total_customers: int,
        total_partners: int,
        timeframe_months: int,
    ) -> DailyFlowTargets:
        """Calculate daily and weekly activity targets."""
        weeks = timeframe_months * self.WEEKS_PER_MONTH
        working_days = self.config.working_days_per_week
        
        # Per week
        customers_per_week = total_customers / weeks if weeks > 0 else 0
        partners_per_week = total_partners / weeks if weeks > 0 else 0
        
        # Contacts based on conversion rates
        contacts_for_customers = (
            customers_per_week / self.config.contact_to_customer_rate
            if self.config.contact_to_customer_rate > 0 else 0
        )
        contacts_for_partners = (
            partners_per_week / self.config.contact_to_partner_rate
            if self.config.contact_to_partner_rate > 0 else 0
        )
        total_contacts_per_week = contacts_for_customers + contacts_for_partners
        
        # Follow-ups per week
        followups_per_week = (
            customers_per_week * self.config.followups_per_customer +
            partners_per_week * self.config.followups_per_partner
        )
        
        # Reactivations
        reactivations_per_week = total_contacts_per_week * self.config.reactivation_share
        
        # Daily values
        contacts_per_day = total_contacts_per_week / working_days if working_days > 0 else 0
        followups_per_day = followups_per_week / working_days if working_days > 0 else 0
        reactivations_per_day = reactivations_per_week / working_days if working_days > 0 else 0
        
        return DailyFlowTargets(
            weekly=WeeklyTargets(
                new_customers=round(customers_per_week, 1),
                new_partners=round(partners_per_week, 1),
                new_contacts=round(total_contacts_per_week),
                followups=round(followups_per_week),
                reactivations=round(reactivations_per_week),
            ),
            daily=DailyTargets(
                new_contacts=round(contacts_per_day),
                followups=round(followups_per_day),
                reactivations=round(reactivations_per_day),
            ),
        )


# ============================================
# CONVENIENCE FUNCTIONS
# ============================================

def calculate_goal(input: GoalCalculationInput) -> GoalCalculationResult:
    """
    Calculate goal from input.
    
    This is the main entry point for goal calculation.
    """
    plan = get_plan_by_id(input.company_id, input.region)
    if not plan:
        raise ValueError(f"Unknown company: {input.company_id}")
    
    engine = GoalEngine(plan, input.config)
    return engine.calculate(input)


def format_target_summary(result: GoalCalculationResult) -> str:
    """Format calculation result as readable text."""
    return f"""
🎯 Um {result.target_rank.name} bei {result.company_name} zu erreichen:

📊 Benötigtes Volumen: {result.missing_group_volume:,.0f} {result.target_rank.unit.value.upper()}

👥 Das bedeutet ca.:
• {result.estimated_customers} neue Kunden
• {result.estimated_partners} aktive Partner

📅 Pro Woche:
• {result.daily_targets.weekly.new_contacts:.0f} neue Kontakte
• {result.daily_targets.weekly.followups:.0f} Follow-ups
• {result.daily_targets.weekly.reactivations:.0f} Reaktivierungen

🎯 Pro Tag (5 Arbeitstage):
• {result.daily_targets.daily.new_contacts:.0f} Kontakte ansprechen
• {result.daily_targets.daily.followups:.0f} Follow-ups
• {result.daily_targets.daily.reactivations:.0f} alte Kontakte reaktivieren
    """.strip()

