"""
╔════════════════════════════════════════════════════════════════════════════╗
║  NETWORK MARKETING - COMPENSATION PLANS                                   ║
║  Konfigurationen für verschiedene MLM-Firmen                              ║
╚════════════════════════════════════════════════════════════════════════════╝

⚠️ DISCLAIMER: Alle Zahlen sind vereinfachte Beispielwerte.
   Für genaue Informationen siehe offizielle Firmen-Dokumente.
   
Sync mit TypeScript:
  → src/config/compensation/*.plan.ts
"""

from typing import Optional
from app.domain.goals.types import CompensationPlan, RankDefinition, RankRequirement


# ═══════════════════════════════════════════════════════════════════════════
# ZINZINO (DE)
# ═══════════════════════════════════════════════════════════════════════════

ZINZINO_DE_PLAN = CompensationPlan(
    id="zinzino_de",
    display_name="Zinzino",
    company_id="zinzino",
    region="DE",
    unit_label="Credits",
    currency="EUR",
    avg_volume_per_customer=60.0,
    avg_volume_per_partner=100.0,
    customer_to_partner_ratio=5.0,
    ranks=[
        RankDefinition(id="starter", name="Starter", order=0, required_volume=0, avg_income=0),
        RankDefinition(id="builder", name="Builder", order=1, required_volume=500, avg_income=100),
        RankDefinition(id="team_leader", name="Team Leader", order=2, required_volume=2000, avg_income=400),
        RankDefinition(id="senior_leader", name="Senior Leader", order=3, required_volume=4000, avg_income=800),
        RankDefinition(id="executive", name="Executive", order=4, required_volume=8000, avg_income=1500),
        RankDefinition(id="elite", name="Elite", order=5, required_volume=15000, avg_income=3000),
        RankDefinition(id="ambassador", name="Ambassador", order=6, required_volume=30000, avg_income=6000),
        RankDefinition(id="crown_ambassador", name="Crown Ambassador", order=7, required_volume=60000, avg_income=12000),
    ],
)


# ═══════════════════════════════════════════════════════════════════════════
# PM INTERNATIONAL (DE)
# ═══════════════════════════════════════════════════════════════════════════

PM_INTERNATIONAL_DE_PLAN = CompensationPlan(
    id="pm_international_de",
    display_name="PM International",
    company_id="pm_international",
    region="DE",
    unit_label="PV",
    currency="EUR",
    avg_volume_per_customer=80.0,
    avg_volume_per_partner=150.0,
    customer_to_partner_ratio=4.0,
    ranks=[
        RankDefinition(id="team_partner", name="Team Partner", order=0, required_volume=0, avg_income=0),
        RankDefinition(id="senior_team_partner", name="Senior Team Partner", order=1, required_volume=1000, avg_income=200),
        RankDefinition(id="manager", name="Manager", order=2, required_volume=4000, avg_income=600),
        RankDefinition(id="senior_manager", name="Senior Manager", order=3, required_volume=8000, avg_income=1200),
        RankDefinition(id="director", name="Director", order=4, required_volume=15000, avg_income=2500),
        RankDefinition(id="senior_director", name="Senior Director", order=5, required_volume=30000, avg_income=5000),
        RankDefinition(id="vp", name="Vice President", order=6, required_volume=60000, avg_income=10000),
        RankDefinition(id="president", name="President", order=7, required_volume=120000, avg_income=25000),
    ],
)


# ═══════════════════════════════════════════════════════════════════════════
# LR HEALTH & BEAUTY (DE)
# ═══════════════════════════════════════════════════════════════════════════

LR_HEALTH_DE_PLAN = CompensationPlan(
    id="lr_health_de",
    display_name="LR Health & Beauty",
    company_id="lr_health",
    region="DE",
    unit_label="VP",
    currency="EUR",
    avg_volume_per_customer=50.0,
    avg_volume_per_partner=120.0,
    customer_to_partner_ratio=6.0,
    ranks=[
        RankDefinition(id="partner", name="Partner", order=0, required_volume=0, avg_income=0),
        RankDefinition(id="junior_partner", name="Junior Partner", order=1, required_volume=400, avg_income=80),
        RankDefinition(id="partner_1", name="Partner 1★", order=2, required_volume=1500, avg_income=300),
        RankDefinition(id="partner_2", name="Partner 2★", order=3, required_volume=3500, avg_income=600),
        RankDefinition(id="partner_3", name="Partner 3★", order=4, required_volume=7000, avg_income=1200),
        RankDefinition(id="organisation_leader", name="Organisations Leader", order=5, required_volume=15000, avg_income=2500),
        RankDefinition(id="senior_org_leader", name="Senior Org. Leader", order=6, required_volume=35000, avg_income=5000),
        RankDefinition(id="top_org_leader", name="Top Org. Leader", order=7, required_volume=75000, avg_income=12000),
    ],
)


# ═══════════════════════════════════════════════════════════════════════════
# RINGANA (DE/AT)
# ═══════════════════════════════════════════════════════════════════════════

RINGANA_DE_PLAN = CompensationPlan(
    id="ringana_de",
    display_name="Ringana",
    company_id="ringana",
    region="DE",
    unit_label="Punkte",
    currency="EUR",
    avg_volume_per_customer=70.0,
    avg_volume_per_partner=140.0,
    customer_to_partner_ratio=5.0,
    ranks=[
        RankDefinition(id="starter", name="Starter", order=0, required_volume=0, avg_income=0),
        RankDefinition(id="consultant", name="Consultant", order=1, required_volume=600, avg_income=120),
        RankDefinition(id="manager", name="Manager", order=2, required_volume=2500, avg_income=500),
        RankDefinition(id="director", name="Director", order=3, required_volume=6000, avg_income=1000),
        RankDefinition(id="executive", name="Executive", order=4, required_volume=12000, avg_income=2000),
        RankDefinition(id="president", name="President", order=5, required_volume=25000, avg_income=4000),
        RankDefinition(id="chairman", name="Chairman", order=6, required_volume=50000, avg_income=8000),
    ],
)


# ═══════════════════════════════════════════════════════════════════════════
# PLAN REGISTRY
# ═══════════════════════════════════════════════════════════════════════════

ALL_COMPENSATION_PLANS: dict[str, CompensationPlan] = {
    "zinzino": ZINZINO_DE_PLAN,
    "zinzino_de": ZINZINO_DE_PLAN,
    "pm_international": PM_INTERNATIONAL_DE_PLAN,
    "pm_international_de": PM_INTERNATIONAL_DE_PLAN,
    "pm": PM_INTERNATIONAL_DE_PLAN,
    "lr_health": LR_HEALTH_DE_PLAN,
    "lr_health_de": LR_HEALTH_DE_PLAN,
    "lr": LR_HEALTH_DE_PLAN,
    "ringana": RINGANA_DE_PLAN,
    "ringana_de": RINGANA_DE_PLAN,
}


def get_compensation_plan(plan_id: str) -> Optional[CompensationPlan]:
    """
    Gibt den Compensation Plan für eine Firma zurück.
    
    Args:
        plan_id: ID des Plans (z.B. "zinzino", "pm_international")
        
    Returns:
        CompensationPlan oder None wenn nicht gefunden
    """
    return ALL_COMPENSATION_PLANS.get(plan_id.lower())


def list_available_plans() -> list[dict]:
    """Listet alle verfügbaren Compensation Plans."""
    seen = set()
    plans = []
    for plan in ALL_COMPENSATION_PLANS.values():
        if plan.id not in seen:
            seen.add(plan.id)
            plans.append({
                "id": plan.id,
                "display_name": plan.display_name,
                "company_id": plan.company_id,
                "region": plan.region,
                "unit_label": plan.unit_label,
                "ranks_count": len(plan.ranks),
            })
    return plans

