"""
Tests für die Compensation Plans.

Testet die Provisionsberechnung für:
- Herbalife
- PM-International
- doTERRA
- LR Health & Beauty
"""
import pytest
from decimal import Decimal
from datetime import datetime
from uuid import uuid4

from app.services.compensation_plans import (
    CompensationPlanFactory,
    HerbalifeCompensationPlan,
    PMInternationalCompensationPlan,
    DoterraCompensationPlan,
    LRHealthCompensationPlan,
    TeamMember,
    CommissionType,
)


# ============= Fixtures =============

@pytest.fixture
def user():
    """Erstellt einen Test-User."""
    return TeamMember(
        id=uuid4(),
        name="Max Mustermann",
        rank="Supervisor",
        personal_volume=Decimal("500"),
        group_volume=Decimal("3500"),
        level=0,
        is_active=True
    )


@pytest.fixture
def team():
    """Erstellt ein Test-Team."""
    user_id = uuid4()
    return [
        TeamMember(
            id=uuid4(),
            name="Anna Schmidt",
            rank="Distributor",
            personal_volume=Decimal("200"),
            group_volume=Decimal("0"),
            level=1,
            sponsor_id=user_id,
            is_active=True
        ),
        TeamMember(
            id=uuid4(),
            name="Thomas Müller",
            rank="Senior Consultant",
            personal_volume=Decimal("300"),
            group_volume=Decimal("500"),
            level=1,
            sponsor_id=user_id,
            is_active=True
        ),
        TeamMember(
            id=uuid4(),
            name="Lisa Weber",
            rank="Distributor",
            personal_volume=Decimal("150"),
            group_volume=Decimal("0"),
            level=2,
            is_active=True
        ),
    ]


@pytest.fixture
def period():
    """Test-Zeitraum."""
    return {
        "start": datetime(2024, 1, 1),
        "end": datetime(2024, 1, 31)
    }


# ============= Factory Tests =============

class TestCompensationPlanFactory:
    """Tests für die Factory."""
    
    def test_list_supported_plans(self):
        """Testet, dass alle Pläne gelistet werden."""
        plans = CompensationPlanFactory.list_supported()
        
        assert "herbalife" in plans
        assert "pm_international" in plans
        assert "doterra" in plans
        assert "lr_health" in plans
        assert len(plans) == 4
    
    def test_get_herbalife_plan(self):
        """Testet Herbalife Plan."""
        plan = CompensationPlanFactory.get_plan("herbalife")
        
        assert isinstance(plan, HerbalifeCompensationPlan)
        assert "Distributor" in plan.ranks
        assert "Supervisor" in plan.ranks
    
    def test_get_pm_plan(self):
        """Testet PM-International Plan."""
        plan = CompensationPlanFactory.get_plan("pm_international")
        
        assert isinstance(plan, PMInternationalCompensationPlan)
        assert "Team Partner" in plan.ranks
    
    def test_get_doterra_plan(self):
        """Testet doTERRA Plan."""
        plan = CompensationPlanFactory.get_plan("doterra")
        
        assert isinstance(plan, DoterraCompensationPlan)
        assert "Wellness Advocate" in plan.ranks
    
    def test_get_lr_health_plan(self):
        """Testet LR Health Plan."""
        plan = CompensationPlanFactory.get_plan("lr_health")
        
        assert isinstance(plan, LRHealthCompensationPlan)
        assert "Partner" in plan.ranks
    
    def test_unknown_plan_raises_error(self):
        """Testet, dass unbekannte Pläne einen Fehler werfen."""
        with pytest.raises(ValueError, match="Unknown company"):
            CompensationPlanFactory.get_plan("unknown_company")


# ============= Herbalife Tests =============

class TestHerbalifeCompensationPlan:
    """Tests für den Herbalife Plan."""
    
    def test_ranks_order(self):
        """Testet die Rang-Reihenfolge."""
        plan = HerbalifeCompensationPlan()
        
        assert plan.ranks[0] == "Distributor"
        assert "Supervisor" in plan.ranks
        assert plan.ranks[-1] == "President's Team"
    
    def test_discount_levels(self):
        """Testet die Rabattstufen."""
        plan = HerbalifeCompensationPlan()
        
        assert plan.discount_levels["Distributor"] == Decimal("0.25")
        assert plan.discount_levels["Supervisor"] == Decimal("0.50")
    
    def test_calculate_commissions_basic(self, user, team, period):
        """Testet grundlegende Provisionsberechnung."""
        plan = HerbalifeCompensationPlan()
        
        statement = plan.calculate_commissions(
            user, team, period["start"], period["end"]
        )
        
        assert statement.user_id == user.id
        assert statement.rank == user.rank
        assert len(statement.commissions) > 0
        assert statement.total_earnings > 0
    
    def test_retail_profit_calculation(self, user, team, period):
        """Testet Retail Profit Berechnung."""
        plan = HerbalifeCompensationPlan()
        
        statement = plan.calculate_commissions(
            user, team, period["start"], period["end"]
        )
        
        retail_commissions = [
            c for c in statement.commissions 
            if c.type == CommissionType.RETAIL_PROFIT
        ]
        
        assert len(retail_commissions) == 1
        assert retail_commissions[0].amount > 0
    
    def test_determine_rank_distributor(self, team, period):
        """Testet Rang-Bestimmung für Distributor."""
        plan = HerbalifeCompensationPlan()
        
        user = TeamMember(
            id=uuid4(),
            name="Newbie",
            rank="Distributor",
            personal_volume=Decimal("100"),
            group_volume=Decimal("0"),
            level=0
        )
        
        rank = plan.determine_rank(user, [])
        assert rank == "Distributor"
    
    def test_determine_rank_senior_consultant(self):
        """Testet Rang-Bestimmung für Senior Consultant."""
        plan = HerbalifeCompensationPlan()
        
        user = TeamMember(
            id=uuid4(),
            name="Senior",
            rank="Distributor",
            personal_volume=Decimal("500"),
            group_volume=Decimal("0"),
            level=0
        )
        
        rank = plan.determine_rank(user, [])
        assert rank == "Senior Consultant"


# ============= PM-International Tests =============

class TestPMInternationalCompensationPlan:
    """Tests für PM-International Plan."""
    
    def test_unilevel_rates(self):
        """Testet Unilevel-Raten."""
        plan = PMInternationalCompensationPlan()
        
        assert len(plan.unilevel_rates) == 7
        assert plan.unilevel_rates[0] == Decimal("0.06")  # Gen 1
        assert plan.unilevel_rates[5] == Decimal("0.02")  # Gen 6
    
    def test_calculate_direct_bonus(self, user, team, period):
        """Testet Direct Sales Bonus."""
        plan = PMInternationalCompensationPlan()
        user.rank = "Team Partner"
        
        statement = plan.calculate_commissions(
            user, team, period["start"], period["end"]
        )
        
        retail = [c for c in statement.commissions if c.type == CommissionType.RETAIL_PROFIT]
        assert len(retail) == 1
        # 25% von 500 PV = 125
        assert float(retail[0].amount) == 125.0
    
    def test_determine_rank_sales_manager(self):
        """Testet Rang-Bestimmung für Sales Manager."""
        plan = PMInternationalCompensationPlan()
        
        user = TeamMember(
            id=uuid4(),
            name="Manager",
            rank="Team Partner",
            personal_volume=Decimal("500"),
            group_volume=Decimal("3000"),
            level=0
        )
        
        rank = plan.determine_rank(user, [])
        assert rank == "Sales Manager"


# ============= doTERRA Tests =============

class TestDoterraCompensationPlan:
    """Tests für doTERRA Plan."""
    
    def test_fast_start_rates(self):
        """Testet Fast Start Raten."""
        plan = DoterraCompensationPlan()
        
        assert len(plan.fast_start_rates) == 3
        assert plan.fast_start_rates[0] == Decimal("0.20")  # 20% Level 1
        assert plan.fast_start_rates[1] == Decimal("0.10")  # 10% Level 2
        assert plan.fast_start_rates[2] == Decimal("0.05")  # 5% Level 3
    
    def test_power_of_3_bonuses(self):
        """Testet Power of 3 Bonus-Stufen."""
        plan = DoterraCompensationPlan()
        
        assert plan.power_of_3_bonuses[1] == Decimal("50")    # 3 active
        assert plan.power_of_3_bonuses[2] == Decimal("250")   # 9 active
        assert plan.power_of_3_bonuses[3] == Decimal("1500")  # 27 active
    
    def test_determine_rank_manager(self):
        """Testet Rang-Bestimmung für Manager."""
        plan = DoterraCompensationPlan()
        
        user = TeamMember(
            id=uuid4(),
            name="Manager",
            rank="Wellness Advocate",
            personal_volume=Decimal("500"),
            group_volume=Decimal("0"),
            level=0
        )
        
        rank = plan.determine_rank(user, [])
        assert rank == "Manager"


# ============= LR Health Tests =============

class TestLRHealthCompensationPlan:
    """Tests für LR Health Plan."""
    
    def test_generation_rates(self):
        """Testet Generation-Raten."""
        plan = LRHealthCompensationPlan()
        
        assert len(plan.generation_rates) == 6
        assert plan.generation_rates[0] == Decimal("0.21")  # Gen 1: 21%
        assert plan.generation_rates[1] == Decimal("0.07")  # Gen 2: 7%
    
    def test_car_bonus_qualification(self):
        """Testet Car Bonus Qualifikation."""
        plan = LRHealthCompensationPlan()
        
        assert plan.car_bonus_volume == Decimal("50000")
        assert plan.car_bonus_amount == Decimal("500")
    
    def test_personal_bonus_21_percent(self, user, period):
        """Testet 21% Personal Bonus."""
        plan = LRHealthCompensationPlan()
        user.rank = "Partner"
        
        statement = plan.calculate_commissions(user, [], period["start"], period["end"])
        
        retail = [c for c in statement.commissions if c.type == CommissionType.RETAIL_PROFIT]
        assert len(retail) == 1
        # 21% von 500 PV = 105
        assert float(retail[0].amount) == 105.0


# ============= Integration Tests =============

class TestCompensationIntegration:
    """Integration Tests."""
    
    def test_all_plans_calculate_without_error(self, user, team, period):
        """Testet, dass alle Pläne ohne Fehler berechnen."""
        for plan_id in CompensationPlanFactory.list_supported():
            plan = CompensationPlanFactory.get_plan(plan_id)
            
            # Passe Rang an den Plan an
            user.rank = plan.ranks[0]
            
            statement = plan.calculate_commissions(
                user, team, period["start"], period["end"]
            )
            
            assert statement is not None
            assert statement.total_earnings >= 0
    
    def test_all_plans_determine_rank(self, user, team):
        """Testet, dass alle Pläne einen Rang bestimmen."""
        for plan_id in CompensationPlanFactory.list_supported():
            plan = CompensationPlanFactory.get_plan(plan_id)
            
            rank = plan.determine_rank(user, team)
            
            assert rank in plan.ranks
    
    def test_commission_statement_has_required_fields(self, user, team, period):
        """Testet, dass CommissionStatement alle Felder hat."""
        plan = CompensationPlanFactory.get_plan("herbalife")
        
        statement = plan.calculate_commissions(
            user, team, period["start"], period["end"]
        )
        
        assert hasattr(statement, 'user_id')
        assert hasattr(statement, 'period_start')
        assert hasattr(statement, 'period_end')
        assert hasattr(statement, 'rank')
        assert hasattr(statement, 'personal_volume')
        assert hasattr(statement, 'group_volume')
        assert hasattr(statement, 'total_volume')
        assert hasattr(statement, 'commissions')
        assert hasattr(statement, 'total_earnings')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

