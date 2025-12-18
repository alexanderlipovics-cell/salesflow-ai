"""
Compensation Plan Implementations for SalesFlow AI.

Implements calculation logic for various MLM compensation plans:
- Herbalife (Breakaway)
- PM-International (Unilevel)
- LR Health & Beauty (Unilevel)
- doTERRA (Unilevel with Fast Start)
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID
import logging

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ============= Base Models =============

class CommissionType(str, Enum):
    """Types of commissions."""
    RETAIL_PROFIT = "retail_profit"
    WHOLESALE_COMMISSION = "wholesale_commission"
    ROYALTY_OVERRIDE = "royalty_override"
    PRODUCTION_BONUS = "production_bonus"
    LEADERSHIP_BONUS = "leadership_bonus"
    INFINITY_BONUS = "infinity_bonus"
    FAST_START = "fast_start"
    POWER_OF_3 = "power_of_3"
    UNILEVEL = "unilevel"
    CAR_BONUS = "car_bonus"
    VACATION_BONUS = "vacation_bonus"


@dataclass
class TeamMember:
    """Represents a team member in the organization."""
    id: UUID
    name: str
    rank: str
    personal_volume: Decimal
    group_volume: Decimal
    level: int  # Depth in organization
    is_active: bool = True
    qualification_status: str = "qualified"
    joined_date: Optional[datetime] = None
    sponsor_id: Optional[UUID] = None
    
    @property
    def total_volume(self) -> Decimal:
        return self.personal_volume + self.group_volume


class Commission(BaseModel):
    """Single commission payment."""
    type: CommissionType
    amount: Decimal
    source_member_id: Optional[UUID] = None
    source_member_name: Optional[str] = None
    level: Optional[int] = None
    volume: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    description: str = ""


class CommissionStatement(BaseModel):
    """Complete commission statement for a period."""
    user_id: UUID
    period_start: datetime
    period_end: datetime
    rank: str
    personal_volume: Decimal
    group_volume: Decimal
    total_volume: Decimal
    commissions: list[Commission] = Field(default_factory=list)
    total_earnings: Decimal = Decimal("0")
    bonuses: dict[str, Decimal] = Field(default_factory=dict)
    
    def calculate_total(self):
        """Calculate total earnings."""
        self.total_earnings = sum(c.amount for c in self.commissions)
        return self.total_earnings


class RankRequirement(BaseModel):
    """Requirements for a rank."""
    rank_name: str
    personal_volume_min: Decimal = Decimal("0")
    group_volume_min: Decimal = Decimal("0")
    active_legs_min: int = 0
    qualified_legs_min: int = 0
    rank_legs: dict[str, int] = Field(default_factory=dict)  # rank: count required


# ============= Base Compensation Plan =============

class BaseCompensationPlan(ABC):
    """Abstract base class for compensation plans."""
    
    def __init__(self):
        self.ranks: list[str] = []
        self.rank_requirements: dict[str, RankRequirement] = {}
        self.commission_rates: dict[str, dict] = {}
    
    @abstractmethod
    def calculate_commissions(
        self,
        user: TeamMember,
        team: list[TeamMember],
        period_start: datetime,
        period_end: datetime
    ) -> CommissionStatement:
        """Calculate all commissions for a user."""
        pass
    
    @abstractmethod
    def determine_rank(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> str:
        """Determine user's rank based on qualifications."""
        pass
    
    def get_downline(
        self,
        user_id: UUID,
        team: list[TeamMember],
        max_levels: int = None
    ) -> list[TeamMember]:
        """Get all downline members up to max_levels deep."""
        downline = []
        current_level = [m for m in team if m.sponsor_id == user_id]
        level = 1
        
        while current_level and (max_levels is None or level <= max_levels):
            for member in current_level:
                member.level = level
                downline.append(member)
            
            next_level = []
            for member in current_level:
                next_level.extend([m for m in team if m.sponsor_id == member.id])
            
            current_level = next_level
            level += 1
        
        return downline
    
    def count_qualified_legs(
        self,
        user_id: UUID,
        team: list[TeamMember],
        min_volume: Decimal = Decimal("0")
    ) -> int:
        """Count qualifying legs (first-level recruits with volume)."""
        first_level = [m for m in team if m.sponsor_id == user_id]
        return sum(
            1 for m in first_level
            if m.is_active and m.total_volume >= min_volume
        )


# ============= Herbalife Compensation Plan =============

class HerbalifeCompensationPlan(BaseCompensationPlan):
    """
    Herbalife Marketing Plan (Breakaway/Stairstep).
    
    Ranks: Distributor → Senior Consultant → Success Builder → 
           Qualified Producer → Supervisor → World Team → GET → 
           Millionaire Team → President's Team
    """
    
    def __init__(self):
        super().__init__()
        
        self.ranks = [
            "Distributor",
            "Senior Consultant", 
            "Success Builder",
            "Qualified Producer",
            "Supervisor",
            "World Team",
            "Global Expansion Team",
            "Millionaire Team",
            "President's Team"
        ]
        
        # Discount levels by rank
        self.discount_levels = {
            "Distributor": Decimal("0.25"),
            "Senior Consultant": Decimal("0.35"),
            "Success Builder": Decimal("0.42"),
            "Qualified Producer": Decimal("0.42"),
            "Supervisor": Decimal("0.50"),
            "World Team": Decimal("0.50"),
            "Global Expansion Team": Decimal("0.50"),
            "Millionaire Team": Decimal("0.50"),
            "President's Team": Decimal("0.50")
        }
        
        # Royalty override percentages
        self.royalty_rates = {
            "Supervisor": [Decimal("0.05")],  # 5% on 1 level
            "World Team": [Decimal("0.05"), Decimal("0.05"), Decimal("0.05")],  # 5% x 3 levels
            "Global Expansion Team": [Decimal("0.05")] * 4,  # 5% x 4 levels
            "Millionaire Team": [Decimal("0.05")] * 5,  # 5% x 5 levels
            "President's Team": [Decimal("0.05")] * 6  # 5% x 6 levels (simplified)
        }
        
        # Volume requirements
        self.rank_requirements = {
            "Senior Consultant": RankRequirement(
                rank_name="Senior Consultant",
                personal_volume_min=Decimal("500"),
                group_volume_min=Decimal("0")
            ),
            "Success Builder": RankRequirement(
                rank_name="Success Builder",
                personal_volume_min=Decimal("1000"),
                group_volume_min=Decimal("0")
            ),
            "Qualified Producer": RankRequirement(
                rank_name="Qualified Producer",
                personal_volume_min=Decimal("0"),
                group_volume_min=Decimal("2500")
            ),
            "Supervisor": RankRequirement(
                rank_name="Supervisor",
                personal_volume_min=Decimal("0"),
                group_volume_min=Decimal("4000"),
                qualified_legs_min=1
            ),
            "World Team": RankRequirement(
                rank_name="World Team",
                group_volume_min=Decimal("10000"),
                rank_legs={"Supervisor": 3}
            )
        }
    
    def calculate_commissions(
        self,
        user: TeamMember,
        team: list[TeamMember],
        period_start: datetime,
        period_end: datetime
    ) -> CommissionStatement:
        """Calculate Herbalife commissions."""
        statement = CommissionStatement(
            user_id=user.id,
            period_start=period_start,
            period_end=period_end,
            rank=user.rank,
            personal_volume=user.personal_volume,
            group_volume=user.group_volume,
            total_volume=user.total_volume
        )
        
        # 1. Retail Profit (25-50% based on rank)
        retail_profit = self._calculate_retail_profit(user)
        if retail_profit.amount > 0:
            statement.commissions.append(retail_profit)
        
        # 2. Wholesale Commission (difference in discount levels)
        downline = self.get_downline(user.id, team, max_levels=10)
        wholesale_commissions = self._calculate_wholesale_commissions(user, downline)
        statement.commissions.extend(wholesale_commissions)
        
        # 3. Royalty Overrides (for Supervisors+)
        if user.rank in self.royalty_rates:
            royalties = self._calculate_royalties(user, downline)
            statement.commissions.extend(royalties)
        
        # 4. Production Bonus
        production_bonus = self._calculate_production_bonus(user, downline)
        if production_bonus:
            statement.commissions.append(production_bonus)
        
        statement.calculate_total()
        return statement
    
    def _calculate_retail_profit(self, user: TeamMember) -> Commission:
        """Calculate retail profit margin."""
        discount = self.discount_levels.get(user.rank, Decimal("0.25"))
        # Assume 30% of personal volume is retail sales
        retail_sales = user.personal_volume * Decimal("0.30")
        profit = retail_sales * discount
        
        return Commission(
            type=CommissionType.RETAIL_PROFIT,
            amount=profit.quantize(Decimal("0.01"), ROUND_HALF_UP),
            volume=retail_sales,
            rate=discount,
            description=f"Retail profit at {discount:.0%} discount"
        )
    
    def _calculate_wholesale_commissions(
        self,
        user: TeamMember,
        downline: list[TeamMember]
    ) -> list[Commission]:
        """Calculate wholesale commissions from downline."""
        commissions = []
        user_discount = self.discount_levels.get(user.rank, Decimal("0.25"))
        
        for member in downline:
            member_discount = self.discount_levels.get(member.rank, Decimal("0.25"))
            diff = user_discount - member_discount
            
            if diff > 0:
                amount = member.personal_volume * diff
                commissions.append(Commission(
                    type=CommissionType.WHOLESALE_COMMISSION,
                    amount=amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
                    source_member_id=member.id,
                    source_member_name=member.name,
                    level=member.level,
                    volume=member.personal_volume,
                    rate=diff,
                    description=f"Wholesale from {member.name} ({diff:.0%})"
                ))
        
        return commissions
    
    def _calculate_royalties(
        self,
        user: TeamMember,
        downline: list[TeamMember]
    ) -> list[Commission]:
        """Calculate royalty override commissions."""
        commissions = []
        rates = self.royalty_rates.get(user.rank, [])
        
        # Group downline by level
        by_level: dict[int, list[TeamMember]] = {}
        for member in downline:
            level = member.level
            if level not in by_level:
                by_level[level] = []
            by_level[level].append(member)
        
        # Calculate royalties per level
        for level, rate in enumerate(rates, 1):
            members = by_level.get(level, [])
            level_volume = sum(m.personal_volume for m in members)
            
            if level_volume > 0:
                amount = level_volume * rate
                commissions.append(Commission(
                    type=CommissionType.ROYALTY_OVERRIDE,
                    amount=amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
                    level=level,
                    volume=level_volume,
                    rate=rate,
                    description=f"Royalty override level {level} ({rate:.0%})"
                ))
        
        return commissions
    
    def _calculate_production_bonus(
        self,
        user: TeamMember,
        downline: list[TeamMember]
    ) -> Optional[Commission]:
        """Calculate production bonus for qualifying volume."""
        total_volume = user.personal_volume + sum(m.personal_volume for m in downline)
        
        # Production bonus tiers (simplified)
        if total_volume >= Decimal("10000"):
            rate = Decimal("0.02")
        elif total_volume >= Decimal("5000"):
            rate = Decimal("0.01")
        else:
            return None
        
        amount = total_volume * rate
        return Commission(
            type=CommissionType.PRODUCTION_BONUS,
            amount=amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
            volume=total_volume,
            rate=rate,
            description=f"Production bonus ({rate:.0%})"
        )
    
    def determine_rank(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> str:
        """Determine Herbalife rank."""
        downline = self.get_downline(user.id, team)
        total_group = sum(m.total_volume for m in downline) + user.personal_volume
        
        # Check from highest to lowest
        for rank in reversed(self.ranks):
            if rank not in self.rank_requirements:
                continue
            
            req = self.rank_requirements[rank]
            
            if user.personal_volume < req.personal_volume_min:
                continue
            
            if total_group < req.group_volume_min:
                continue
            
            if req.qualified_legs_min > 0:
                qualified = self.count_qualified_legs(user.id, team, Decimal("500"))
                if qualified < req.qualified_legs_min:
                    continue
            
            return rank
        
        return "Distributor"


# ============= PM-International Compensation Plan =============

class PMInternationalCompensationPlan(BaseCompensationPlan):
    """
    PM-International FitLine Marketing Plan (Unilevel).
    
    Ranks: Team Partner → Sales Manager → Director → 
           Vice President → President → Chairman
    """
    
    def __init__(self):
        super().__init__()
        
        self.ranks = [
            "Team Partner",
            "Sales Manager",
            "Director",
            "Vice President",
            "President",
            "Chairman"
        ]
        
        # Unilevel commission rates by generation
        self.unilevel_rates = [
            Decimal("0.06"),  # Gen 1: 6%
            Decimal("0.06"),  # Gen 2: 6%
            Decimal("0.06"),  # Gen 3: 6%
            Decimal("0.04"),  # Gen 4: 4%
            Decimal("0.04"),  # Gen 5: 4%
            Decimal("0.02"),  # Gen 6: 2%
            Decimal("0.02"),  # Gen 7: 2%
        ]
        
        # Rank volume requirements (simplified)
        self.rank_requirements = {
            "Sales Manager": RankRequirement(
                rank_name="Sales Manager",
                group_volume_min=Decimal("3000")
            ),
            "Director": RankRequirement(
                rank_name="Director",
                group_volume_min=Decimal("10000"),
                rank_legs={"Sales Manager": 2}
            ),
            "Vice President": RankRequirement(
                rank_name="Vice President",
                group_volume_min=Decimal("30000"),
                rank_legs={"Director": 2}
            )
        }
    
    def calculate_commissions(
        self,
        user: TeamMember,
        team: list[TeamMember],
        period_start: datetime,
        period_end: datetime
    ) -> CommissionStatement:
        """Calculate PM-International commissions."""
        statement = CommissionStatement(
            user_id=user.id,
            period_start=period_start,
            period_end=period_end,
            rank=user.rank,
            personal_volume=user.personal_volume,
            group_volume=user.group_volume,
            total_volume=user.total_volume
        )
        
        # 1. Direct Sales Bonus
        direct_bonus = self._calculate_direct_bonus(user)
        if direct_bonus.amount > 0:
            statement.commissions.append(direct_bonus)
        
        # 2. Unilevel Commissions
        downline = self.get_downline(user.id, team, max_levels=7)
        unilevel = self._calculate_unilevel(user, downline)
        statement.commissions.extend(unilevel)
        
        # 3. Leadership Bonus (for Directors+)
        if user.rank in ["Director", "Vice President", "President", "Chairman"]:
            leadership = self._calculate_leadership_bonus(user, team)
            if leadership:
                statement.commissions.append(leadership)
        
        statement.calculate_total()
        return statement
    
    def _calculate_direct_bonus(self, user: TeamMember) -> Commission:
        """Calculate direct sales bonus."""
        rate = Decimal("0.25")  # 25% on personal sales
        amount = user.personal_volume * rate
        
        return Commission(
            type=CommissionType.RETAIL_PROFIT,
            amount=amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
            volume=user.personal_volume,
            rate=rate,
            description="Direct sales bonus (25%)"
        )
    
    def _calculate_unilevel(
        self,
        user: TeamMember,
        downline: list[TeamMember]
    ) -> list[Commission]:
        """Calculate unilevel commissions."""
        commissions = []
        
        # Group by generation/level
        by_level: dict[int, list[TeamMember]] = {}
        for member in downline:
            level = member.level
            if level not in by_level:
                by_level[level] = []
            by_level[level].append(member)
        
        for level, rate in enumerate(self.unilevel_rates, 1):
            members = by_level.get(level, [])
            level_volume = sum(m.personal_volume for m in members if m.is_active)
            
            if level_volume > 0:
                amount = level_volume * rate
                commissions.append(Commission(
                    type=CommissionType.UNILEVEL,
                    amount=amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
                    level=level,
                    volume=level_volume,
                    rate=rate,
                    description=f"Unilevel Gen {level} ({rate:.0%})"
                ))
        
        return commissions
    
    def _calculate_leadership_bonus(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> Optional[Commission]:
        """Calculate leadership/infinity bonus."""
        # Simplified - bonus on matching volume of downline leaders
        rank_index = self.ranks.index(user.rank)
        if rank_index < 2:  # Need Director+
            return None
        
        matching_rate = Decimal("0.05")  # 5% matching
        downline = self.get_downline(user.id, team)
        leader_volume = sum(
            m.group_volume for m in downline
            if m.rank in self.ranks[2:]  # Directors+
        )
        
        if leader_volume > 0:
            amount = leader_volume * matching_rate
            return Commission(
                type=CommissionType.LEADERSHIP_BONUS,
                amount=amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
                volume=leader_volume,
                rate=matching_rate,
                description=f"Leadership bonus ({matching_rate:.0%})"
            )
        
        return None
    
    def determine_rank(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> str:
        """Determine PM-International rank."""
        downline = self.get_downline(user.id, team)
        total_group = sum(m.total_volume for m in downline) + user.personal_volume
        
        # Simple rank determination
        if total_group >= Decimal("30000"):
            return "Vice President"
        elif total_group >= Decimal("10000"):
            return "Director"
        elif total_group >= Decimal("3000"):
            return "Sales Manager"
        
        return "Team Partner"


# ============= doTERRA Compensation Plan =============

class DoterraCompensationPlan(BaseCompensationPlan):
    """
    doTERRA Compensation Plan (Unilevel with Fast Start).
    
    Ranks: Wellness Advocate → Manager → Director → Executive →
           Elite → Premier → Silver → Gold → Platinum → 
           Diamond → Blue Diamond → Presidential Diamond
    """
    
    def __init__(self):
        super().__init__()
        
        self.ranks = [
            "Wellness Advocate", "Manager", "Director", "Executive",
            "Elite", "Premier", "Silver", "Gold", "Platinum",
            "Diamond", "Blue Diamond", "Presidential Diamond"
        ]
        
        # Fast Start bonus (first 60 days)
        self.fast_start_rates = [
            Decimal("0.20"),  # Level 1: 20%
            Decimal("0.10"),  # Level 2: 10%
            Decimal("0.05"),  # Level 3: 5%
        ]
        
        # Unilevel rates by rank
        self.unilevel_by_rank = {
            "Wellness Advocate": [Decimal("0.02")],
            "Manager": [Decimal("0.02")] * 2,
            "Director": [Decimal("0.02")] * 3,
            "Executive": [Decimal("0.03"), Decimal("0.03"), Decimal("0.02")],
            "Elite": [Decimal("0.03")] * 4,
            "Premier": [Decimal("0.03")] * 5,
            "Silver": [Decimal("0.03")] * 6,
            "Gold": [Decimal("0.03")] * 7,
        }
        
        # Power of 3 bonus amounts
        self.power_of_3_bonuses = {
            1: Decimal("50"),   # 3 active with 100 PV each
            2: Decimal("250"),  # 9 active (3x3)
            3: Decimal("1500"), # 27 active (3x3x3)
        }
    
    def calculate_commissions(
        self,
        user: TeamMember,
        team: list[TeamMember],
        period_start: datetime,
        period_end: datetime
    ) -> CommissionStatement:
        """Calculate doTERRA commissions."""
        statement = CommissionStatement(
            user_id=user.id,
            period_start=period_start,
            period_end=period_end,
            rank=user.rank,
            personal_volume=user.personal_volume,
            group_volume=user.group_volume,
            total_volume=user.total_volume
        )
        
        # 1. Retail Profit (25%)
        if user.personal_volume >= Decimal("100"):  # Minimum PV
            retail = Commission(
                type=CommissionType.RETAIL_PROFIT,
                amount=(user.personal_volume * Decimal("0.25")).quantize(Decimal("0.01")),
                rate=Decimal("0.25"),
                description="Retail profit (25%)"
            )
            statement.commissions.append(retail)
        
        downline = self.get_downline(user.id, team, max_levels=7)
        
        # 2. Fast Start Bonus (new enrollees in first 60 days)
        fast_start = self._calculate_fast_start(user, downline, period_end)
        statement.commissions.extend(fast_start)
        
        # 3. Unilevel Commissions
        unilevel = self._calculate_unilevel(user, downline)
        statement.commissions.extend(unilevel)
        
        # 4. Power of 3 Bonus
        power_of_3 = self._calculate_power_of_3(user, team)
        if power_of_3:
            statement.commissions.append(power_of_3)
        
        statement.calculate_total()
        return statement
    
    def _calculate_fast_start(
        self,
        user: TeamMember,
        downline: list[TeamMember],
        period_end: datetime
    ) -> list[Commission]:
        """Calculate Fast Start bonuses."""
        commissions = []
        
        for level, rate in enumerate(self.fast_start_rates, 1):
            level_members = [m for m in downline if m.level == level]
            
            for member in level_members:
                # Check if in Fast Start period (60 days)
                if member.joined_date:
                    days_enrolled = (period_end - member.joined_date).days
                    if days_enrolled <= 60 and member.personal_volume >= Decimal("100"):
                        amount = member.personal_volume * rate
                        commissions.append(Commission(
                            type=CommissionType.FAST_START,
                            amount=amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
                            source_member_id=member.id,
                            source_member_name=member.name,
                            level=level,
                            volume=member.personal_volume,
                            rate=rate,
                            description=f"Fast Start from {member.name} ({rate:.0%})"
                        ))
        
        return commissions
    
    def _calculate_unilevel(
        self,
        user: TeamMember,
        downline: list[TeamMember]
    ) -> list[Commission]:
        """Calculate unilevel commissions."""
        commissions = []
        rates = self.unilevel_by_rank.get(user.rank, [Decimal("0.02")])
        
        by_level: dict[int, list[TeamMember]] = {}
        for member in downline:
            if member.level not in by_level:
                by_level[member.level] = []
            by_level[member.level].append(member)
        
        for level, rate in enumerate(rates, 1):
            members = by_level.get(level, [])
            level_volume = sum(m.personal_volume for m in members if m.is_active)
            
            if level_volume > 0:
                amount = level_volume * rate
                commissions.append(Commission(
                    type=CommissionType.UNILEVEL,
                    amount=amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
                    level=level,
                    volume=level_volume,
                    rate=rate,
                    description=f"Unilevel Level {level} ({rate:.0%})"
                ))
        
        return commissions
    
    def _calculate_power_of_3(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> Optional[Commission]:
        """Calculate Power of 3 bonus."""
        # Count active team members with 100+ PV in structure
        def count_active_with_structure(member_id: UUID, depth: int) -> int:
            if depth > 3:
                return 0
            
            direct = [
                m for m in team
                if m.sponsor_id == member_id
                and m.is_active
                and m.personal_volume >= Decimal("100")
            ]
            
            count = len(direct)
            for d in direct:
                count += count_active_with_structure(d.id, depth + 1)
            
            return count
        
        # Check Power of 3 levels
        active_count = count_active_with_structure(user.id, 1)
        
        if active_count >= 27:
            bonus = self.power_of_3_bonuses[3]
            level = 3
        elif active_count >= 9:
            bonus = self.power_of_3_bonuses[2]
            level = 2
        elif active_count >= 3:
            bonus = self.power_of_3_bonuses[1]
            level = 1
        else:
            return None
        
        return Commission(
            type=CommissionType.POWER_OF_3,
            amount=bonus,
            level=level,
            description=f"Power of 3 Level {level} (${bonus})"
        )
    
    def determine_rank(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> str:
        """Determine doTERRA rank."""
        downline = self.get_downline(user.id, team)
        total_ov = sum(m.personal_volume for m in downline) + user.personal_volume
        
        # Simplified rank determination
        if total_ov >= Decimal("100000"):
            return "Diamond"
        elif total_ov >= Decimal("50000"):
            return "Platinum"
        elif total_ov >= Decimal("20000"):
            return "Gold"
        elif total_ov >= Decimal("10000"):
            return "Silver"
        elif total_ov >= Decimal("5000"):
            return "Premier"
        elif total_ov >= Decimal("3000"):
            return "Elite"
        elif total_ov >= Decimal("2000"):
            return "Executive"
        elif total_ov >= Decimal("1000"):
            return "Director"
        elif total_ov >= Decimal("500"):
            return "Manager"
        
        return "Wellness Advocate"


# ============= LR Health & Beauty Compensation Plan =============

class LRHealthCompensationPlan(BaseCompensationPlan):
    """
    LR Health & Beauty Compensation Plan (Unilevel).
    
    Ranks: Partner → Junior Partner → Partner → Senior Partner →
           Manager levels (1-4 Star)
    """
    
    def __init__(self):
        super().__init__()
        
        self.ranks = [
            "Partner",
            "Junior Partner", 
            "Senior Partner",
            "1-Star Manager",
            "2-Star Manager",
            "3-Star Manager",
            "4-Star Manager"
        ]
        
        # Commission rates by generation
        self.generation_rates = [
            Decimal("0.21"),  # Gen 1: 21%
            Decimal("0.07"),  # Gen 2: 7%
            Decimal("0.05"),  # Gen 3: 5%
            Decimal("0.03"),  # Gen 4: 3%
            Decimal("0.02"),  # Gen 5: 2%
            Decimal("0.02"),  # Gen 6: 2%
        ]
        
        # Car bonus qualification
        self.car_bonus_volume = Decimal("50000")
        self.car_bonus_amount = Decimal("500")
    
    def calculate_commissions(
        self,
        user: TeamMember,
        team: list[TeamMember],
        period_start: datetime,
        period_end: datetime
    ) -> CommissionStatement:
        """Calculate LR Health commissions."""
        statement = CommissionStatement(
            user_id=user.id,
            period_start=period_start,
            period_end=period_end,
            rank=user.rank,
            personal_volume=user.personal_volume,
            group_volume=user.group_volume,
            total_volume=user.total_volume
        )
        
        # 1. Personal Sales Bonus (21%)
        personal_bonus = Commission(
            type=CommissionType.RETAIL_PROFIT,
            amount=(user.personal_volume * Decimal("0.21")).quantize(Decimal("0.01")),
            volume=user.personal_volume,
            rate=Decimal("0.21"),
            description="Personal sales bonus (21%)"
        )
        statement.commissions.append(personal_bonus)
        
        # 2. Generation Commissions
        downline = self.get_downline(user.id, team, max_levels=6)
        gen_commissions = self._calculate_generation_bonus(user, downline)
        statement.commissions.extend(gen_commissions)
        
        # 3. Car Bonus
        car_bonus = self._calculate_car_bonus(user, team)
        if car_bonus:
            statement.commissions.append(car_bonus)
        
        statement.calculate_total()
        return statement
    
    def _calculate_generation_bonus(
        self,
        user: TeamMember,
        downline: list[TeamMember]
    ) -> list[Commission]:
        """Calculate generation bonuses."""
        commissions = []
        
        by_level: dict[int, list[TeamMember]] = {}
        for member in downline:
            if member.level not in by_level:
                by_level[member.level] = []
            by_level[member.level].append(member)
        
        for gen, rate in enumerate(self.generation_rates, 1):
            members = by_level.get(gen, [])
            gen_volume = sum(m.personal_volume for m in members)
            
            if gen_volume > 0:
                amount = gen_volume * rate
                commissions.append(Commission(
                    type=CommissionType.UNILEVEL,
                    amount=amount.quantize(Decimal("0.01"), ROUND_HALF_UP),
                    level=gen,
                    volume=gen_volume,
                    rate=rate,
                    description=f"Generation {gen} bonus ({rate:.0%})"
                ))
        
        return commissions
    
    def _calculate_car_bonus(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> Optional[Commission]:
        """Calculate car bonus qualification."""
        downline = self.get_downline(user.id, team)
        total_volume = user.personal_volume + sum(m.personal_volume for m in downline)
        
        if total_volume >= self.car_bonus_volume:
            return Commission(
                type=CommissionType.CAR_BONUS,
                amount=self.car_bonus_amount,
                volume=total_volume,
                description=f"Car bonus (${self.car_bonus_amount})"
            )
        
        return None
    
    def determine_rank(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> str:
        """Determine LR Health rank."""
        downline = self.get_downline(user.id, team)
        total = user.personal_volume + sum(m.personal_volume for m in downline)
        
        if total >= Decimal("100000"):
            return "4-Star Manager"
        elif total >= Decimal("50000"):
            return "3-Star Manager"
        elif total >= Decimal("20000"):
            return "2-Star Manager"
        elif total >= Decimal("10000"):
            return "1-Star Manager"
        elif total >= Decimal("5000"):
            return "Senior Partner"
        elif total >= Decimal("1000"):
            return "Junior Partner"
        
        return "Partner"


# ============= Zinzino Compensation Plan =============

class ZinzinoCompensationPlan(BaseCompensationPlan):
    """
    Zinzino Dual-Team Binary Compensation Plan.
    
    Features:
    - Dual-Team System (2:1 Ratio)
    - Customer Career Titles (Q-Team bis Top-Team 200)
    - Partner Career Titles (Bronze bis Black Crown)
    - Team Provision (10-15% auf Balanced Credits)
    - CAB Bonus (Customer Acquisition Bonus)
    - Fast Start Plan (120 Tage)
    - Mentor Matching Bonus
    """
    
    def __init__(self):
        super().__init__()
        
        self.ranks = [
            "Partner",  # Starter
            # Customer Career
            "Q-Team", "X-Team", "A-Team", "Pro-Team", "Top-Team", "Top-Team 200",
            # Partner Career
            "Bronze", "Silver", "Gold", "Executive", "Platinum", "Diamond",
            "Crown", "Royal Crown", "Black Crown"
        ]
        
        # Rank requirements
        self.rank_requirements = {
            "Q-Team": RankRequirement(
                rank_name="Q-Team",
                personal_volume_min=Decimal("20"),  # PCV
                group_volume_min=Decimal("0")
            ),
            "X-Team": RankRequirement(
                rank_name="X-Team",
                personal_volume_min=Decimal("50"),  # PCV
                group_volume_min=Decimal("0")
            ),
            "A-Team": RankRequirement(
                rank_name="A-Team",
                personal_volume_min=Decimal("125"),  # PCV
                group_volume_min=Decimal("0")
            ),
            "Pro-Team": RankRequirement(
                rank_name="Pro-Team",
                personal_volume_min=Decimal("250"),  # PCV
                group_volume_min=Decimal("0")
            ),
            "Top-Team": RankRequirement(
                rank_name="Top-Team",
                personal_volume_min=Decimal("500"),  # PCV
                group_volume_min=Decimal("0")
            ),
            "Top-Team 200": RankRequirement(
                rank_name="Top-Team 200",
                personal_volume_min=Decimal("1000"),  # PCV
                group_volume_min=Decimal("0")
            ),
            "Bronze": RankRequirement(
                rank_name="Bronze",
                personal_volume_min=Decimal("20"),  # PCV
                group_volume_min=Decimal("375")  # MCV
            ),
            "Silver": RankRequirement(
                rank_name="Silver",
                personal_volume_min=Decimal("20"),
                group_volume_min=Decimal("750")
            ),
            "Gold": RankRequirement(
                rank_name="Gold",
                personal_volume_min=Decimal("20"),
                group_volume_min=Decimal("1500")
            ),
            "Executive": RankRequirement(
                rank_name="Executive",
                personal_volume_min=Decimal("50"),
                group_volume_min=Decimal("3000")
            ),
            "Platinum": RankRequirement(
                rank_name="Platinum",
                personal_volume_min=Decimal("50"),
                group_volume_min=Decimal("6000")
            ),
            "Diamond": RankRequirement(
                rank_name="Diamond",
                personal_volume_min=Decimal("50"),
                group_volume_min=Decimal("12000")
            ),
            "Crown": RankRequirement(
                rank_name="Crown",
                personal_volume_min=Decimal("50"),
                group_volume_min=Decimal("25000")
            ),
            "Royal Crown": RankRequirement(
                rank_name="Royal Crown",
                personal_volume_min=Decimal("50"),
                group_volume_min=Decimal("50000")
            ),
            "Black Crown": RankRequirement(
                rank_name="Black Crown",
                personal_volume_min=Decimal("50"),
                group_volume_min=Decimal("100000")
            ),
        }
        
        # Team provision rates by rank
        self.team_provision_rates = {
            "Partner": Decimal("0.10"),
            "Q-Team": Decimal("0.10"),
            "X-Team": Decimal("0.10"),
            "A-Team": Decimal("0.10"),
            "Pro-Team": Decimal("0.10"),
            "Top-Team": Decimal("0.10"),
            "Top-Team 200": Decimal("0.10"),
            "Bronze": Decimal("0.10"),
            "Silver": Decimal("0.10"),
            "Gold": Decimal("0.10"),
            "Executive": Decimal("0.15"),
            "Platinum": Decimal("0.15"),
            "Diamond": Decimal("0.15"),
            "Crown": Decimal("0.15"),
            "Royal Crown": Decimal("0.15"),
            "Black Crown": Decimal("0.15"),
        }
        
        # Cash bonus rates for Customer Career
        self.cash_bonus_rates = {
            "Q-Team": Decimal("0.10"),
            "X-Team": Decimal("0.10"),
            "A-Team": Decimal("0.20"),
            "Pro-Team": Decimal("0.25"),
            "Top-Team": Decimal("0.30"),
            "Top-Team 200": Decimal("0.30"),
        }
        
        # CAB Bonus tiers
        self.cab_tiers = [
            {"left": Decimal("150"), "right": Decimal("150"), "bonus": Decimal("100")},
            {"left": Decimal("500"), "right": Decimal("500"), "bonus": Decimal("200")},
            {"left": Decimal("1500"), "right": Decimal("1500"), "bonus": Decimal("300")},
            {"left": Decimal("7500"), "right": Decimal("7500"), "bonus": Decimal("400")},
            {"left": Decimal("15000"), "right": Decimal("15000"), "bonus": Decimal("500")},
        ]
    
    def calculate_commissions(
        self,
        user: TeamMember,
        team: list[TeamMember],
        period_start: datetime,
        period_end: datetime
    ) -> CommissionStatement:
        """Calculate Zinzino commissions."""
        statement = CommissionStatement(
            user_id=user.id,
            period_start=period_start,
            period_end=period_end,
            rank=user.rank,
            personal_volume=user.personal_volume,
            group_volume=user.group_volume,
            total_volume=user.total_volume
        )
        
        # Note: Zinzino uses a dual-team system (left/right credits)
        # This is simplified - in reality, we'd need left_credits and right_credits from user data
        
        # 1. Team Provision (on balanced credits)
        # Balanced = min(left + right, smaller_team * 3)
        # For now, we'll use group_volume as approximation
        balanced_credits = self._calculate_balanced_credits(user, team)
        provision_rate = self.team_provision_rates.get(user.rank, Decimal("0.10"))
        team_provision = balanced_credits * provision_rate
        
        if team_provision > 0:
            statement.commissions.append(Commission(
                type=CommissionType.UNILEVEL,
                amount=team_provision.quantize(Decimal("0.01"), ROUND_HALF_UP),
                volume=balanced_credits,
                rate=provision_rate,
                description=f"Team Provision ({provision_rate:.0%}) on balanced credits"
            ))
        
        # 2. Cash Bonus (for Customer Career titles)
        if user.rank in self.cash_bonus_rates:
            cash_bonus_rate = self.cash_bonus_rates[user.rank]
            cash_bonus = user.personal_volume * cash_bonus_rate
            if cash_bonus > 0:
                statement.commissions.append(Commission(
                    type=CommissionType.RETAIL_PROFIT,
                    amount=cash_bonus.quantize(Decimal("0.01"), ROUND_HALF_UP),
                    volume=user.personal_volume,
                    rate=cash_bonus_rate,
                    description=f"Cash Bonus ({cash_bonus_rate:.0%})"
                ))
        
        # 3. CAB Bonus (simplified - would need left/right credits)
        cab_bonus = self._calculate_cab_bonus(user, team)
        if cab_bonus:
            statement.commissions.append(cab_bonus)
        
        statement.calculate_total()
        return statement
    
    def _calculate_balanced_credits(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> Decimal:
        """Calculate balanced credits (2:1 ratio system)."""
        # Simplified: Use group_volume as approximation
        # In reality, would need left_credits and right_credits
        downline = self.get_downline(user.id, team)
        
        # Split downline into two teams (simplified)
        left_team = [m for i, m in enumerate(downline) if i % 2 == 0]
        right_team = [m for i, m in enumerate(downline) if i % 2 == 1]
        
        left_credits = sum(m.personal_volume for m in left_team)
        right_credits = sum(m.personal_volume for m in right_team)
        
        smaller = min(left_credits, right_credits)
        larger = max(left_credits, right_credits)
        
        # 2:1 Ratio: max 2 parts from larger, 1 part from smaller
        balanced = min(larger + smaller, smaller * Decimal("3"))
        
        return balanced
    
    def _calculate_cab_bonus(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> Optional[Commission]:
        """Calculate Customer Acquisition Bonus."""
        # Simplified - would need actual left/right credits
        downline = self.get_downline(user.id, team)
        left_team = [m for i, m in enumerate(downline) if i % 2 == 0]
        right_team = [m for i, m in enumerate(downline) if i % 2 == 1]
        
        left_credits = sum(m.personal_volume for m in left_team)
        right_credits = sum(m.personal_volume for m in right_team)
        
        # Find matching tier
        for tier in reversed(self.cab_tiers):
            if left_credits >= tier["left"] and right_credits >= tier["right"]:
                return Commission(
                    type=CommissionType.PRODUCTION_BONUS,
                    amount=tier["bonus"],
                    description=f"CAB Bonus Tier ({tier['bonus']} PP)"
                )
        
        return None
    
    def determine_rank(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> str:
        """Determine Zinzino rank."""
        downline = self.get_downline(user.id, team)
        total_group = sum(m.total_volume for m in downline) + user.personal_volume
        
        # Check from highest to lowest
        for rank in reversed(self.ranks):
            if rank not in self.rank_requirements:
                continue
            
            req = self.rank_requirements[rank]
            
            if user.personal_volume < req.personal_volume_min:
                continue
            
            if total_group < req.group_volume_min:
                continue
            
            return rank
        
        return "Partner"


# ============= Factory =============

# ============= Party Plan Compensation Plan =============

class PartyPlanCompensationPlan(BaseCompensationPlan):
    """
    Party Plan Compensation (z.B. Tupperware, Scentsy, Partylite).
    
    Features:
    - Host Bonuses (Party-Volumen)
    - Booking Bonuses (neue Parties buchen)
    - Team Bonuses (Downline-Parties)
    """
    
    def __init__(self):
        super().__init__()
        
        self.ranks = [
            "Consultant",
            "Senior Consultant",
            "Team Leader",
            "Director",
            "Executive Director",
            "National Director"
        ]
        
        # Host Bonus: % vom Party-Volumen
        self.host_bonus_rate = Decimal("0.15")  # 15%
        
        # Booking Bonus: Fixbetrag pro gebuchter Party
        self.booking_bonus = Decimal("25")
        
        # Team Bonus: % vom Downline-Party-Volumen
        self.team_bonus_rate = Decimal("0.05")  # 5%
    
    def calculate_commissions(
        self,
        user: TeamMember,
        team: list[TeamMember],
        period_start: datetime,
        period_end: datetime
    ) -> CommissionStatement:
        """Calculate Party Plan commissions."""
        statement = CommissionStatement(
            user_id=user.id,
            period_start=period_start,
            period_end=period_end,
            rank=user.rank,
            personal_volume=user.personal_volume,
            group_volume=user.group_volume,
            total_volume=user.total_volume
        )
        
        # 1. Host Bonus (15% vom eigenen Party-Volumen)
        host_bonus = (user.personal_volume * self.host_bonus_rate).quantize(Decimal("0.01"))
        if host_bonus > 0:
            statement.commissions.append(Commission(
                type=CommissionType.RETAIL_PROFIT,
                amount=host_bonus,
                volume=user.personal_volume,
                rate=self.host_bonus_rate,
                description=f"Host Bonus ({self.host_bonus_rate:.0%} vom Party-Volumen)"
            ))
        
        # 2. Booking Bonus (vereinfacht: 1 Party = 1 Booking)
        # Annahme: Jede 100 PV = 1 Party
        parties_hosted = int(user.personal_volume / Decimal("100"))
        booking_bonus = Decimal(parties_hosted) * self.booking_bonus
        if booking_bonus > 0:
            statement.commissions.append(Commission(
                type=CommissionType.FAST_START,
                amount=booking_bonus,
                description=f"Booking Bonus ({parties_hosted} Parties)"
            ))
        
        # 3. Team Bonus (5% vom Downline-Party-Volumen)
        downline = self.get_downline(user.id, team)
        team_party_volume = sum(m.personal_volume for m in downline)
        team_bonus = (team_party_volume * self.team_bonus_rate).quantize(Decimal("0.01"))
        if team_bonus > 0:
            statement.commissions.append(Commission(
                type=CommissionType.UNILEVEL,
                amount=team_bonus,
                volume=team_party_volume,
                rate=self.team_bonus_rate,
                description=f"Team Bonus ({self.team_bonus_rate:.0%} vom Downline-Volumen)"
            ))
        
        statement.calculate_total()
        return statement
    
    def determine_rank(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> str:
        """Determine Party Plan rank."""
        downline = self.get_downline(user.id, team)
        total_volume = sum(m.personal_volume for m in downline) + user.personal_volume
        
        if total_volume >= Decimal("50000"):
            return "National Director"
        elif total_volume >= Decimal("25000"):
            return "Executive Director"
        elif total_volume >= Decimal("10000"):
            return "Director"
        elif total_volume >= Decimal("5000"):
            return "Team Leader"
        elif total_volume >= Decimal("2000"):
            return "Senior Consultant"
        
        return "Consultant"


# ============= Generation Plan Compensation Plan =============

class GenerationPlanCompensationPlan(BaseCompensationPlan):
    """
    Generation Plan Compensation (mehrere Generationen mit abnehmenden Prozentsätzen).
    
    Features:
    - Generation 1: Höchster Prozentsatz
    - Generation 2-6: Abnehmende Prozentsätze
    - Max. Generationen-Limit
    """
    
    def __init__(self):
        super().__init__()
        
        self.ranks = [
            "Distributor",
            "Senior Distributor",
            "Team Leader",
            "Manager",
            "Director",
            "Executive Director"
        ]
        
        # Generation Rates (abnehmend)
        self.generation_rates = [
            Decimal("0.25"),  # Gen 1: 25%
            Decimal("0.10"),  # Gen 2: 10%
            Decimal("0.05"),  # Gen 3: 5%
            Decimal("0.03"),  # Gen 4: 3%
            Decimal("0.02"),  # Gen 5: 2%
            Decimal("0.01"),  # Gen 6: 1%
        ]
        
        self.max_generations = 6
    
    def calculate_commissions(
        self,
        user: TeamMember,
        team: list[TeamMember],
        period_start: datetime,
        period_end: datetime
    ) -> CommissionStatement:
        """Calculate Generation Plan commissions."""
        statement = CommissionStatement(
            user_id=user.id,
            period_start=period_start,
            period_end=period_end,
            rank=user.rank,
            personal_volume=user.personal_volume,
            group_volume=user.group_volume,
            total_volume=user.total_volume
        )
        
        # Berechne Generation Commissions
        for gen in range(1, self.max_generations + 1):
            if gen > len(self.generation_rates):
                break
            
            rate = self.generation_rates[gen - 1]
            gen_members = self._get_generation_members(user.id, team, gen)
            gen_volume = sum(m.personal_volume for m in gen_members)
            
            if gen_volume > 0:
                commission = (gen_volume * rate).quantize(Decimal("0.01"))
                statement.commissions.append(Commission(
                    type=CommissionType.UNILEVEL,
                    amount=commission,
                    level=gen,
                    volume=gen_volume,
                    rate=rate,
                    description=f"Generation {gen} ({rate:.0%})"
                ))
        
        statement.calculate_total()
        return statement
    
    def _get_generation_members(
        self,
        user_id: UUID,
        team: list[TeamMember],
        generation: int
    ) -> list[TeamMember]:
        """Get all members in a specific generation."""
        if generation == 1:
            return [m for m in team if m.sponsor_id == user_id]
        
        # Rekursiv für höhere Generationen
        gen_members = []
        prev_gen = self._get_generation_members(user_id, team, generation - 1)
        
        for member in prev_gen:
            gen_members.extend([m for m in team if m.sponsor_id == member.id])
        
        return gen_members
    
    def determine_rank(
        self,
        user: TeamMember,
        team: list[TeamMember]
    ) -> str:
        """Determine Generation Plan rank."""
        downline = self.get_downline(user.id, team)
        total_volume = sum(m.personal_volume for m in downline) + user.personal_volume
        active_legs = len([m for m in downline if m.is_active and m.personal_volume >= Decimal("100")])
        
        if total_volume >= Decimal("100000") and active_legs >= 10:
            return "Executive Director"
        elif total_volume >= Decimal("50000") and active_legs >= 5:
            return "Director"
        elif total_volume >= Decimal("20000") and active_legs >= 3:
            return "Manager"
        elif total_volume >= Decimal("10000") and active_legs >= 2:
            return "Team Leader"
        elif total_volume >= Decimal("5000"):
            return "Senior Distributor"
        
        return "Distributor"


class CompensationPlanFactory:
    """Factory for creating compensation plan instances."""
    
    _plans = {
        "zinzino": ZinzinoCompensationPlan,
        "herbalife": HerbalifeCompensationPlan,
        "pm_international": PMInternationalCompensationPlan,
        "pm-international": PMInternationalCompensationPlan,
        "doterra": DoterraCompensationPlan,
        "lr_health": LRHealthCompensationPlan,
        "lr-health": LRHealthCompensationPlan,
        "party-plan": PartyPlanCompensationPlan,
        "party_plan": PartyPlanCompensationPlan,
        "generation-plan": GenerationPlanCompensationPlan,
        "generation_plan": GenerationPlanCompensationPlan,
    }
    
    @classmethod
    def get_plan(cls, company_id: str) -> BaseCompensationPlan:
        """Get compensation plan for a company."""
        company_id_lower = company_id.lower().replace(" ", "-").replace("_", "-")
        plan_class = cls._plans.get(company_id_lower)
        
        # Fallback: Try partial match
        if not plan_class:
            for key, plan in cls._plans.items():
                if key in company_id_lower or company_id_lower in key:
                    plan_class = plan
                    break
        
        if not plan_class:
            raise ValueError(f"Unknown company: {company_id}. Supported: {list(cls._plans.keys())}")
        return plan_class()
    
    @classmethod
    def list_supported(cls) -> list[str]:
        """List supported company IDs."""
        return list(set(cls._plans.keys()))  # Remove duplicates

