"""
Gamification API Router
Badges, Achievements, Streaks, Leaderboards
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from ..core.auth import get_current_user
from ..core.supabase import get_supabase_client
from ..services.gamification_service import GamificationService


router = APIRouter(prefix="/api/gamification", tags=["gamification"])


@router.get("/badges")
async def get_all_badges():
    """Get all available badges."""
    
    supabase = get_supabase_client()
    
    response = supabase.table('badges')\
        .select('*')\
        .eq('is_active', True)\
        .order('tier,name')\
        .execute()
    
    return response.data


@router.get("/achievements")
async def get_user_achievements(
    current_user: dict = Depends(get_current_user)
):
    """Get user's earned badges."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    response = supabase.table('user_achievements')\
        .select('*, badges(*)')\
        .eq('user_id', user_id)\
        .order('earned_at', desc=True)\
        .execute()
    
    return response.data


@router.get("/streak")
async def get_streak(
    current_user: dict = Depends(get_current_user)
):
    """Get user's current streak."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    response = supabase.table('daily_streaks')\
        .select('*')\
        .eq('user_id', user_id)\
        .execute()
    
    if not response.data:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None
        }
    
    return response.data[0]


@router.post("/streak/update")
async def update_streak(
    current_user: dict = Depends(get_current_user)
):
    """Manually update user's streak (called after activity)."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    service = GamificationService(supabase)
    
    await service.update_daily_streak(user_id)
    
    return {"status": "updated"}


@router.get("/leaderboard/{type}")
async def get_leaderboard(
    type: str,
    period: str = Query('weekly', regex='^(daily|weekly|monthly)$'),
    squad_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get leaderboard.
    
    Types:
    - most_leads: Most leads created
    - most_deals: Most deals closed
    - most_activities: Most activities logged
    - longest_streak: Longest daily streaks
    
    Periods:
    - daily: Today
    - weekly: Last 7 days
    - monthly: Last 30 days
    """
    
    supabase = get_supabase_client()
    service = GamificationService(supabase)
    
    entries = await service.get_leaderboard(type, period, squad_id)
    
    # Add user info
    for entry in entries:
        user_response = supabase.table('users')\
            .select('id, email, full_name')\
            .eq('id', entry['user_id'])\
            .execute()
        
        entry['user'] = user_response.data[0] if user_response.data else None
    
    return entries


@router.post("/check-badges")
async def check_new_badges(
    current_user: dict = Depends(get_current_user)
):
    """Check for newly unlocked badges."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    service = GamificationService(supabase)
    
    new_badges = await service.check_badge_unlock(user_id)
    
    return {
        "new_badges": new_badges,
        "count": len(new_badges)
    }


@router.get("/stats")
async def get_user_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive user gamification stats."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    service = GamificationService(supabase)
    
    stats = await service.get_user_stats(user_id)
    
    return stats


@router.get("/progress/{badge_id}")
async def get_badge_progress(
    badge_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get progress towards a specific badge."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    # Get badge
    badge_response = supabase.table('badges')\
        .select('*')\
        .eq('id', badge_id)\
        .execute()
    
    if not badge_response.data:
        raise HTTPException(404, "Badge not found")
    
    badge = badge_response.data[0]
    criteria = badge['criteria']
    
    # Check if already earned
    achievement = supabase.table('user_achievements')\
        .select('*')\
        .eq('user_id', user_id)\
        .eq('badge_id', badge_id)\
        .execute()
    
    if achievement.data:
        return {
            "badge": badge,
            "earned": True,
            "earned_at": achievement.data[0]['earned_at'],
            "progress": 100,
            "current": criteria.get('threshold', 0),
            "target": criteria.get('threshold', 0)
        }
    
    # Calculate progress
    service = GamificationService(supabase)
    badge_type = criteria.get('type')
    threshold = criteria.get('threshold', 0)
    current = 0
    
    if badge_type == 'lead_count':
        current = await supabase.fetchval("""
            SELECT COUNT(*) FROM leads WHERE user_id = $1
        """, user_id)
    
    elif badge_type == 'deal_count':
        current = await supabase.fetchval("""
            SELECT COUNT(*) FROM leads WHERE user_id = $1 AND status = 'won'
        """, user_id)
    
    elif badge_type == 'activity_count':
        current = await supabase.fetchval("""
            SELECT COUNT(*) FROM activities a
            JOIN leads l ON a.lead_id = l.id
            WHERE l.user_id = $1
        """, user_id)
    
    elif badge_type == 'streak':
        streak = await supabase.fetchval("""
            SELECT current_streak FROM daily_streaks WHERE user_id = $1
        """, user_id)
        current = streak or 0
    
    progress = min(100, int((current / threshold) * 100)) if threshold > 0 else 0
    
    return {
        "badge": badge,
        "earned": False,
        "progress": progress,
        "current": current,
        "target": threshold
    }

