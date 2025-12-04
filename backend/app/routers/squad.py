"""
Squad Challenge Management API Router
Handles challenge creation, updates, listing, and performance reports
"""
import logging
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.auth import User, get_current_user
from app.core.supabase import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/squad", tags=["Squad Challenges"])


# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────

class ChallengeCreateRequest(BaseModel):
    """Request to create a new squad challenge"""
    squad_id: str
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    target_points: int = 1000


class SquadChallenge(BaseModel):
    """Squad challenge model"""
    id: str
    squad_id: str
    title: str
    description: Optional[str]
    start_date: str
    end_date: str
    target_points: int
    is_active: bool = True


class ChallengeCreateResponse(BaseModel):
    """Response after creating challenge"""
    challenge: SquadChallenge


class ChallengeUpdateRequest(BaseModel):
    """Request to update challenge"""
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_points: Optional[int] = None
    is_active: Optional[bool] = None


class ChallengeListItem(SquadChallenge):
    """Challenge list item with additional fields"""
    pass


class ChallengeListResponse(BaseModel):
    """Response with list of challenges"""
    challenges: List[ChallengeListItem]


class ChallengeReportItem(BaseModel):
    """Single challenge report item"""
    challenge_id: str
    title: str
    start_date: str
    end_date: str
    target_points: int
    total_points: int
    total_contacts: int
    member_count: int
    active_members: int
    inactive_members: int


class ChallengeReportSummary(BaseModel):
    """Summary stats for challenge report"""
    total_challenges: int
    total_points: int
    total_contacts: int


class ChallengeReportResponse(BaseModel):
    """Complete challenge report response"""
    squad_id: str
    squad_name: Optional[str] = None
    period_from: str
    period_to: str
    challenges: List[ChallengeReportItem]
    summary: ChallengeReportSummary


# ─────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────

def check_challenge_overlap(
    supabase_client,
    squad_id: str,
    start: date,
    end: date,
    exclude_id: Optional[str] = None,
) -> bool:
    """
    Check if challenge dates overlap with existing active challenges.
    Returns True if overlap exists, False otherwise.
    """
    try:
        # Query active challenges for this squad
        query = supabase_client.table('squad_challenges').select('*').eq(
            'squad_id', squad_id
        ).eq('is_active', True)
        
        if exclude_id:
            query = query.neq('id', exclude_id)
        
        result = query.execute()
        
        if not result.data:
            return False
        
        # Check for overlap: (end < existing.start) OR (start > existing.end) = NO OVERLAP
        for existing in result.data:
            existing_start = date.fromisoformat(existing['start_date'])
            existing_end = date.fromisoformat(existing['end_date'])
            
            # Check if dates overlap
            if not (end < existing_start or start > existing_end):
                return True  # Overlap found
        
        return False  # No overlap
    except Exception as e:
        logger.error(f"Error checking overlap: {repr(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to check challenge overlap"
        )

def check_leader_permission(
    supabase_client,
    squad_id: str,
    user_id: str,
) -> bool:
    """
    Check if user is leader or co-leader of the squad.
    Returns True if authorized, False otherwise.
    """
    try:
        result = supabase_client.table('squad_members').select('role').eq(
            'squad_id', squad_id
        ).eq('user_id', user_id).eq('is_active', True).execute()
        
        if not result.data:
            return False
        
        member = result.data[0]
        return member["role"] in ("leader", "co_leader")
    except Exception as e:
        logger.error(f"Error checking leader permission: {repr(e)}")
        return False


def check_squad_membership(
    supabase_client,
    squad_id: str,
    user_id: str,
) -> bool:
    """
    Check if user is an active member of the squad.
    """
    try:
        result = (
            supabase_client.table("squad_members")
            .select("id")
            .eq("squad_id", squad_id)
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )

        return bool(result.data)
    except Exception as e:
        logger.error(f"Error checking squad membership: {repr(e)}")
        return False

# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/challenge", response_model=ChallengeCreateResponse)
async def create_challenge(
    request: ChallengeCreateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new squad challenge (only Leaders/Co-Leaders).
    
    Validates:
    - end_date >= start_date
    - No overlap with existing active challenges
    - User has leader/co-leader role
    """
    try:
        supabase_client = get_supabase_client()
        current_user_id = current_user.id
        
        # Validate date range
        if request.end_date < request.start_date:
            raise HTTPException(
                status_code=400,
                detail="End date must be after or equal to start date"
            )
        
        # Check leader permission
        if not check_leader_permission(
            supabase_client, request.squad_id, current_user_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Only squad leaders and co-leaders can create challenges"
            )
        
        # Check for overlap
        if check_challenge_overlap(
            supabase_client, request.squad_id, request.start_date, request.end_date
        ):
            raise HTTPException(
                status_code=400,
                detail="Challenge dates overlap with an existing active challenge"
            )
        
        # Create challenge
        challenge_data = {
            "squad_id": request.squad_id,
            "title": request.title,
            "description": request.description,
            "start_date": request.start_date.isoformat(),
            "end_date": request.end_date.isoformat(),
            "target_points": request.target_points,
            "is_active": True,
        }

        result = supabase_client.table("squad_challenges").insert(challenge_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create challenge")
        
        challenge = result.data[0]

        return ChallengeCreateResponse(
            challenge=SquadChallenge(
                id=challenge["id"],
                squad_id=challenge["squad_id"],
                title=challenge["title"],
                description=challenge.get("description"),
                start_date=challenge["start_date"],
                end_date=challenge["end_date"],
                target_points=challenge["target_points"],
                is_active=challenge.get("is_active", True),
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating challenge: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to create challenge")

@router.get("/challenges", response_model=ChallengeListResponse)
async def list_challenges(
    squad_id: Optional[str] = Query(None, description="Filter by squad ID"),
    current_user: User = Depends(get_current_user),
):
    """
    Get all challenges for a squad.
    
    - Returns all challenges if squad_id provided
    - Only squad members can view challenges
    - Sorted by start_date DESC (newest first)
    """
    if not squad_id:
        raise HTTPException(status_code=400, detail="squad_id parameter required")
    
    try:
        supabase_client = get_supabase_client()

        # Check squad membership
        if not check_squad_membership(supabase_client, squad_id, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only squad members can view challenges",
            )
        
        # Query challenges
        query = (
            supabase_client.table("squad_challenges")
            .select("*")
            .eq("squad_id", squad_id)
            .order("start_date", desc=True)
        )

        result = query.execute()
        
        challenges = [
            ChallengeListItem(
                id=ch["id"],
                squad_id=ch["squad_id"],
                title=ch["title"],
                description=ch.get("description"),
                start_date=ch["start_date"],
                end_date=ch["end_date"],
                target_points=ch["target_points"],
                is_active=ch.get("is_active", True),
            )
            for ch in (result.data or [])
        ]
        
        return ChallengeListResponse(challenges=challenges)
    except Exception as e:
        logger.error(f"Error listing challenges: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to list challenges")

@router.patch("/challenge/{challenge_id}", response_model=ChallengeCreateResponse)
async def update_challenge(
    challenge_id: str,
    request: ChallengeUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Update a challenge (only Leaders).
    
    - Partial update: Only provided fields are updated
    - Validates date range and overlap if dates changed
    - Only leaders can update challenges
    """
    try:
        supabase_client = get_supabase_client()
        current_user_id = current_user.id
        
        # Get existing challenge
        existing = (
            supabase_client.table("squad_challenges")
            .select("*")
            .eq("id", challenge_id)
            .execute()
        )
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        challenge = existing.data[0]
        squad_id = challenge["squad_id"]
        
        # Check leader permission
        if not check_leader_permission(supabase_client, squad_id, current_user_id):
            raise HTTPException(
                status_code=403,
                detail="Only squad leaders can update challenges",
            )
        
        # Prepare update data
        update_data = {}
        if request.title is not None:
            update_data['title'] = request.title
        if request.description is not None:
            update_data['description'] = request.description
        if request.target_points is not None:
            update_data['target_points'] = request.target_points
        if request.is_active is not None:
            update_data['is_active'] = request.is_active
        
        # Handle date updates with validation
        start_date = date.fromisoformat(challenge["start_date"])
        end_date = date.fromisoformat(challenge["end_date"])
        
        if request.start_date is not None:
            start_date = request.start_date
            update_data['start_date'] = start_date.isoformat()
        
        if request.end_date is not None:
            end_date = request.end_date
            update_data['end_date'] = end_date.isoformat()
        
        # Validate date range
        if end_date < start_date:
            raise HTTPException(
                status_code=400,
                detail="End date must be after or equal to start date"
            )
        
        # Check overlap if dates changed
        if request.start_date is not None or request.end_date is not None:
            if check_challenge_overlap(
                supabase_client, squad_id, start_date, end_date, exclude_id=challenge_id
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Updated dates overlap with an existing active challenge"
                )
        
        # Update challenge
        if update_data:
            result = (
                supabase_client.table("squad_challenges")
                .update(update_data)
                .eq("id", challenge_id)
                .execute()
            )
            
            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to update challenge")
            
            updated = result.data[0]
        else:
            updated = challenge
        
        return ChallengeCreateResponse(
            challenge=SquadChallenge(
                id=updated["id"],
                squad_id=updated["squad_id"],
                title=updated["title"],
                description=updated.get("description"),
                start_date=updated["start_date"],
                end_date=updated["end_date"],
                target_points=updated["target_points"],
                is_active=updated.get("is_active", True),
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating challenge: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to update challenge")

@router.get("/report/challenges", response_model=ChallengeReportResponse)
async def get_challenge_report(
    squad_id: Optional[str] = Query(None, description="Filter by squad ID"),
    date_from: Optional[date] = Query(None, description="Start date for report period"),
    date_to: Optional[date] = Query(None, description="End date for report period"),
    current_user: User = Depends(get_current_user),
):
    """
    Get performance report for squad challenges.
    
    - Default period: Current month if not specified
    - Aggregates points and contacts from speed_hunter_actions
    - Maps actions to challenges based on created_at date
    - Returns summary stats and per-challenge breakdown
    """
    if not squad_id:
        raise HTTPException(status_code=400, detail="squad_id parameter required")
    
    try:
        supabase_client = get_supabase_client()

        # Set default period to current month if not provided
        today = date.today()
        if not date_from:
            date_from = today.replace(day=1)  # First day of month
        if not date_to:
            # Last day of current month
            next_month = today.replace(day=28) + timedelta(days=4)
            date_to = (next_month - timedelta(days=next_month.day)).date()
        
        # Get squad name
        squad_result = (
            supabase_client.table("squads")
            .select("name")
            .eq("id", squad_id)
            .execute()
        )
        
        squad_name = squad_result.data[0]["name"] if squad_result.data else None
        
        # Get all challenges for this squad (including inactive ones in period)
        challenges_result = (
            supabase_client.table("squad_challenges")
            .select("*")
            .eq("squad_id", squad_id)
            .execute()
        )
        
        # Get squad members
        members_result = (
            supabase_client.table("squad_members")
            .select("user_id, is_active")
            .eq("squad_id", squad_id)
            .eq("is_active", True)
            .execute()
        )
        
        member_ids = [m['user_id'] for m in (members_result.data or [])]
        member_count = len(member_ids)
        
        if not member_ids:
            # No members, return empty report
            return ChallengeReportResponse(
                squad_id=squad_id,
                squad_name=squad_name,
                period_from=date_from.isoformat(),
                period_to=date_to.isoformat(),
                challenges=[],
                summary=ChallengeReportSummary(
                    total_challenges=0,
                    total_points=0,
                    total_contacts=0
                )
            )
        
        # Get speed_hunter_actions for squad members in period
        actions_result = (
            supabase_client.table("speed_hunter_actions")
            .select("user_id, points, created_at, action_type")
            .in_("user_id", member_ids)
            .gte("created_at", date_from.isoformat())
            .lte("created_at", date_to.isoformat())
            .execute()
        )
        
        actions = actions_result.data or []
        
        # Get active members (those with actions in period)
        active_user_ids = set(a['user_id'] for a in actions)
        active_members = len(active_user_ids)
        inactive_members = member_count - active_members
        
        # Aggregate actions by challenge
        challenge_reports = []
        total_points = 0
        total_contacts = 0
        
        for challenge in challenges_result.data or []:
            ch_start = date.fromisoformat(challenge["start_date"])
            ch_end = date.fromisoformat(challenge["end_date"])
            
            # Calculate overlap period with report period
            overlap_start = max(date_from, ch_start)
            overlap_end = min(date_to, ch_end)
            
            if overlap_start > overlap_end:
                # No overlap with report period
                continue
            
            # Filter actions within challenge period
            challenge_actions = []
            for action in actions:
                action_date = datetime.fromisoformat(
                    action["created_at"].replace("Z", "+00:00")
                ).date()
                if ch_start <= action_date <= ch_end:
                    challenge_actions.append(action)
            
            # Aggregate stats
            challenge_points = sum(a.get("points", 0) for a in challenge_actions)
            challenge_contacts = len(
                [a for a in challenge_actions if a.get("action_type") in ("call", "message")]
            )
            
            challenge_reports.append(
                ChallengeReportItem(
                    challenge_id=challenge["id"],
                    title=challenge["title"],
                    start_date=challenge["start_date"],
                    end_date=challenge["end_date"],
                    target_points=challenge["target_points"],
                    total_points=challenge_points,
                    total_contacts=challenge_contacts,
                    member_count=member_count,
                    active_members=active_members,
                    inactive_members=inactive_members
                )
            )
            
            total_points += challenge_points
            total_contacts += challenge_contacts
        
        return ChallengeReportResponse(
            squad_id=squad_id,
            squad_name=squad_name,
            period_from=date_from.isoformat(),
            period_to=date_to.isoformat(),
            challenges=challenge_reports,
            summary=ChallengeReportSummary(
                total_challenges=len(challenge_reports),
                total_points=total_points,
                total_contacts=total_contacts
            )
        )
    except Exception as e:
        logger.error(f"Error generating challenge report: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate challenge report")
