from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security.main import get_current_user

router = APIRouter(prefix="/network", tags=["network"])


class TeamMember(BaseModel):
    id: str
    name: str
    email: Optional[str]
    rank_id: int
    rank_name: str
    leg: str  # 'left' or 'right'
    joined_at: datetime
    is_active: bool
    personal_credits: int
    team_credits: int


class NetworkStats(BaseModel):
    total_partners: int
    active_partners: int
    inactive_partners: int
    new_this_month: int
    total_customers: int
    left_leg_credits: int
    right_leg_credits: int
    balanced_credits: int


class RankProgress(BaseModel):
    current_rank_id: int
    current_rank_name: str
    next_rank_id: Optional[int]
    next_rank_name: Optional[str]
    progress_percent: int
    credits_needed: int
    credits_current: int


class DashboardResponse(BaseModel):
    stats: NetworkStats
    rank_progress: RankProgress
    recent_activity: list
    monthly_projection: dict
    z4f_status: dict


MOCK_NETWORK_DATA = {
    "stats": {
        "total_partners": 12,
        "active_partners": 8,
        "inactive_partners": 4,
        "new_this_month": 2,
        "total_customers": 47,
        "left_leg_credits": 380,
        "right_leg_credits": 240,
        "balanced_credits": 620,
    },
    "rank_progress": {
        "current_rank_id": 4,
        "current_rank_name": "Silver",
        "next_rank_id": 5,
        "next_rank_name": "Gold",
        "progress_percent": 41,
        "credits_needed": 1500,
        "credits_current": 620,
    },
    "recent_activity": [
        {"type": "new_partner", "name": "Maria S.", "time": "2h ago"},
        {"type": "rank_up", "name": "Thomas K.", "rank": "Bronze", "time": "1d ago"},
        {"type": "order", "name": "Lisa M.", "amount": "€89", "time": "2d ago"},
        {"type": "inactive_alert", "name": "Peter H.", "days": 14, "time": "3d ago"},
    ],
    "monthly_projection": {
        "team_commission": 185,
        "cash_bonus": 67,
        "total": 252,
    },
    "z4f_status": {
        "current": 2,
        "target": 4,
        "qualified": False,
    },
}


@router.get("/dashboard")
async def get_network_dashboard(user=Depends(get_current_user)):
    """Get all MLM dashboard data in one call (Mock)."""
    return MOCK_NETWORK_DATA


@router.get("/team")
async def get_team_members(
    user=Depends(get_current_user), leg: Optional[str] = None, active_only: bool = False
):
    """Get team members with optional filtering (Mock)."""
    mock_team = [
        {
            "id": "1",
            "name": "Maria Schmidt",
            "rank_name": "Bronze",
            "leg": "left",
            "is_active": True,
            "personal_credits": 45,
            "joined_at": "2024-08-15",
        },
        {
            "id": "2",
            "name": "Thomas Keller",
            "rank_name": "Q-Team",
            "leg": "right",
            "is_active": True,
            "personal_credits": 28,
            "joined_at": "2024-09-20",
        },
        {
            "id": "3",
            "name": "Peter Huber",
            "rank_name": "Partner",
            "leg": "left",
            "is_active": False,
            "personal_credits": 0,
            "joined_at": "2024-07-01",
        },
    ]

    if leg:
        mock_team = [m for m in mock_team if m["leg"] == leg]
    if active_only:
        mock_team = [m for m in mock_team if m["is_active"]]

    return {"team": mock_team, "total": len(mock_team)}


@router.get("/rank-progress")
async def get_rank_progress(user=Depends(get_current_user)):
    """Get detailed rank progress information (Mock)."""
    return MOCK_NETWORK_DATA["rank_progress"]


@router.get("/tree")
async def get_genealogy_tree(user=Depends(get_current_user), depth: int = 3):
    """Get genealogy tree structure for visualization (Mock)."""
    mock_tree = {
        "id": "user",
        "name": "Du",
        "rank": "Silver",
        "children": [
            {
                "id": "1",
                "name": "Maria S.",
                "rank": "Bronze",
                "leg": "left",
                "children": [
                    {"id": "4", "name": "Anna K.", "rank": "Partner", "leg": "left", "children": []},
                    {"id": "5", "name": "Max B.", "rank": "Q-Team", "leg": "right", "children": []},
                ],
            },
            {
                "id": "2",
                "name": "Thomas K.",
                "rank": "Q-Team",
                "leg": "right",
                "children": [],
            },
        ],
    }
    return mock_tree

