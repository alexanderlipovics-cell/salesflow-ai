"""
╔════════════════════════════════════════════════════════════════════════════╗
║  COMPENSATION PLANS REGISTRY                                               ║
║  Alle verfügbaren MLM Compensation Plans                                   ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Optional, Dict, Any
from app.domain.compensation.models import (
    CompensationPlan,
    RankDefinition,
    RankRequirement,
    RankEarningEstimate,
    LegVolumeRequirement,
    PlanType,
    PlanUnit,
    Region,
)


# ============================================
# ZINZINO (DE)
# ============================================

ZINZINO_DE = CompensationPlan(
    company_id="zinzino",
    company_name="Zinzino",
    company_logo="🧬",
    region=Region.DE,
    plan_type=PlanType.UNILEVEL,
    unit_label="Credits",
    unit_code=PlanUnit.CREDITS,
    currency="EUR",
    avg_personal_volume_per_customer=60,
    avg_personal_volume_per_partner=100,
    version=1,
    last_updated="2024-12",
    disclaimer="Vereinfachte Beispielwerte. Keine Verdienstgarantie.",
    ranks=[
        RankDefinition(
            id="starter",
            name="Starter",
            order=0,
            unit=PlanUnit.CREDITS,
            requirements=RankRequirement(min_personal_volume=0),
            earning_estimate=RankEarningEstimate(avg_monthly_income=0),
        ),
        RankDefinition(
            id="builder",
            name="Builder",
            order=1,
            unit=PlanUnit.CREDITS,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=500,
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=100, range=(50, 200)),
        ),
        RankDefinition(
            id="team_leader",
            name="Team Leader",
            order=2,
            unit=PlanUnit.CREDITS,
            requirements=RankRequirement(
                min_personal_volume=200,
                min_group_volume=2000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=2, min_volume_per_leg=500),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=400, range=(200, 800)),
        ),
        RankDefinition(
            id="senior_leader",
            name="Senior Leader",
            order=3,
            unit=PlanUnit.CREDITS,
            requirements=RankRequirement(
                min_personal_volume=200,
                min_group_volume=4000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=3, min_volume_per_leg=1000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=800, range=(400, 1500)),
        ),
        RankDefinition(
            id="executive",
            name="Executive",
            order=4,
            unit=PlanUnit.CREDITS,
            requirements=RankRequirement(
                min_personal_volume=200,
                min_group_volume=8000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=3, min_volume_per_leg=2000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=1500, range=(800, 3000)),
        ),
        RankDefinition(
            id="elite",
            name="Elite",
            order=5,
            unit=PlanUnit.CREDITS,
            requirements=RankRequirement(
                min_personal_volume=200,
                min_group_volume=15000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=4, min_volume_per_leg=3000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=3000, range=(1500, 6000)),
        ),
        RankDefinition(
            id="ambassador",
            name="Ambassador",
            order=6,
            unit=PlanUnit.CREDITS,
            requirements=RankRequirement(
                min_personal_volume=200,
                min_group_volume=30000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=4, min_volume_per_leg=6000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=6000, range=(3000, 15000)),
        ),
        RankDefinition(
            id="crown_ambassador",
            name="Crown Ambassador",
            order=7,
            unit=PlanUnit.CREDITS,
            requirements=RankRequirement(
                min_personal_volume=200,
                min_group_volume=60000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=5, min_volume_per_leg=10000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=12000, range=(6000, 30000)),
        ),
    ],
)


# ============================================
# PM-INTERNATIONAL (DE)
# ============================================

PM_INTERNATIONAL_DE = CompensationPlan(
    company_id="pm-international",
    company_name="PM-International",
    company_logo="💪",
    region=Region.DE,
    plan_type=PlanType.UNILEVEL,
    unit_label="Punkte",
    unit_code=PlanUnit.PV,
    currency="EUR",
    avg_personal_volume_per_customer=80,
    avg_personal_volume_per_partner=150,
    version=1,
    last_updated="2024-12",
    disclaimer="Basiert auf öffentlichen Informationen. Keine Verdienstgarantie.",
    ranks=[
        RankDefinition(
            id="berater",
            name="Berater",
            order=0,
            unit=PlanUnit.PV,
            requirements=RankRequirement(min_personal_volume=0),
            earning_estimate=RankEarningEstimate(avg_monthly_income=0),
        ),
        RankDefinition(
            id="supervisor",
            name="Supervisor",
            order=1,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=1000,
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=200, range=(100, 400)),
        ),
        RankDefinition(
            id="team_manager",
            name="Team Manager",
            order=2,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=4000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=2, min_volume_per_leg=1000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=600, range=(300, 1200)),
        ),
        RankDefinition(
            id="executive_manager",
            name="Executive Manager",
            order=3,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=10000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=3, min_volume_per_leg=2500),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=1500, range=(800, 3000)),
        ),
        RankDefinition(
            id="vp",
            name="Vice President",
            order=4,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=25000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=4, min_volume_per_leg=5000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=4000, range=(2000, 8000)),
        ),
        RankDefinition(
            id="president",
            name="President",
            order=5,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=50000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=4, min_volume_per_leg=10000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=10000, range=(5000, 25000)),
        ),
    ],
)


# ============================================
# LR HEALTH & BEAUTY (DE)
# ============================================

LR_HEALTH_DE = CompensationPlan(
    company_id="lr-health",
    company_name="LR Health & Beauty",
    company_logo="💄",
    region=Region.DE,
    plan_type=PlanType.UNILEVEL,
    unit_label="PV",
    unit_code=PlanUnit.PV,
    currency="EUR",
    avg_personal_volume_per_customer=50,
    avg_personal_volume_per_partner=120,
    version=1,
    last_updated="2024-12",
    disclaimer="Fast Track Bonus nur in ersten 3 Monaten. Keine Verdienstgarantie.",
    ranks=[
        RankDefinition(
            id="partner",
            name="Partner",
            order=0,
            unit=PlanUnit.PV,
            requirements=RankRequirement(min_personal_volume=0),
            earning_estimate=RankEarningEstimate(avg_monthly_income=0),
        ),
        RankDefinition(
            id="junior_manager",
            name="Junior Manager",
            order=1,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=4000,
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=250, range=(200, 400)),
        ),
        RankDefinition(
            id="manager",
            name="Manager",
            order=2,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=8000,
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=500, range=(400, 800)),
        ),
        RankDefinition(
            id="team_leader",
            name="Team Leader",
            order=3,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=16000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=3, min_volume_per_leg=4000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=1250, range=(1000, 2000)),
        ),
        RankDefinition(
            id="executive",
            name="Executive",
            order=4,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=25000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=3, min_volume_per_leg=6000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=2500, range=(1500, 5000)),
        ),
        RankDefinition(
            id="top_executive",
            name="Top Executive",
            order=5,
            unit=PlanUnit.PV,
            requirements=RankRequirement(
                min_personal_volume=100,
                min_group_volume=40000,
                leg_volume_requirements=LegVolumeRequirement(legs_required=4, min_volume_per_leg=8000),
            ),
            earning_estimate=RankEarningEstimate(avg_monthly_income=5000, range=(3000, 10000)),
        ),
    ],
)


# ============================================
# REGISTRY
# ============================================

COMPENSATION_PLANS: List[CompensationPlan] = [
    ZINZINO_DE,
    PM_INTERNATIONAL_DE,
    LR_HEALTH_DE,
]

PLAN_REGISTRY: Dict[str, CompensationPlan] = {
    f"{plan.company_id}_{plan.region.value}": plan
    for plan in COMPENSATION_PLANS
}


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_plan_by_id(company_id: str, region: str = "DE") -> Optional[CompensationPlan]:
    """Get a compensation plan by company ID and region."""
    key = f"{company_id}_{region}"
    return PLAN_REGISTRY.get(key)


def get_all_plans() -> List[CompensationPlan]:
    """Get all available compensation plans."""
    return COMPENSATION_PLANS


def get_plans_by_region(region: str) -> List[CompensationPlan]:
    """Get all plans for a specific region."""
    return [p for p in COMPENSATION_PLANS if p.region.value == region]


def get_available_companies() -> List[Dict[str, Any]]:
    """Get list of available companies."""
    return [
        {
            "id": p.company_id,
            "name": p.company_name,
            "logo": p.company_logo or "🏢",
            "region": p.region.value,
        }
        for p in COMPENSATION_PLANS
    ]


def find_rank_for_income(
    company_id: str, 
    target_income: float, 
    region: str = "DE"
) -> Optional[RankDefinition]:
    """Find the rank that matches the target income."""
    plan = get_plan_by_id(company_id, region)
    if not plan:
        return None
    
    sorted_ranks = sorted(plan.ranks, key=lambda r: r.order)
    
    for rank in sorted_ranks:
        if rank.earning_estimate and rank.earning_estimate.avg_monthly_income >= target_income:
            return rank
    
    # Return highest rank if no match
    return sorted_ranks[-1] if sorted_ranks else None


def find_rank_by_id(
    company_id: str, 
    rank_id: str, 
    region: str = "DE"
) -> Optional[RankDefinition]:
    """Find a specific rank by ID."""
    plan = get_plan_by_id(company_id, region)
    if not plan:
        return None
    
    for rank in plan.ranks:
        if rank.id == rank_id:
            return rank
    
    return None

