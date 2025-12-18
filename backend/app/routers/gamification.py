"""
Sales Flow AI - Gamification Router

Streaks, Achievements, Leaderboards, Progress-Tracking
"""

import logging
from datetime import date, datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from supabase import Client

from app.core.deps import get_current_user, get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gamification", tags=["Gamification"])


# ============================================================================
# SCHEMAS
# ============================================================================


class Achievement(BaseModel):
    id: UUID
    user_id: UUID
    achievement_type: str
    achievement_key: str
    achievement_name: str
    achievement_description: Optional[str] = None
    achievement_icon: Optional[str] = None
    progress_current: int
    progress_target: int
    is_completed: bool
    completed_at: Optional[datetime] = None
    points_awarded: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DailyActivity(BaseModel):
    id: UUID
    user_id: UUID
    activity_date: date
    new_contacts: int
    followups_sent: int
    calls_made: int
    meetings_booked: int
    deals_closed: int
    current_streak_days: int
    longest_streak_days: int
    daily_goal_met: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    user_id: UUID
    user_name: Optional[str] = None
    total_points: int
    achievements_count: int
    current_streak: int
    deals_closed: int
    rank: int


# ============================================================================
# ACHIEVEMENT DEFINITIONS
# ============================================================================


ACHIEVEMENT_DEFINITIONS = {
    "first_closing": {
        "type": "milestone",
        "name": "Erstes Closing",
        "description": "Du hast deinen ersten Deal abgeschlossen!",
        "icon": "🎯",
        "target": 1,
        "points": 100,
    },
    "7_day_streak": {
        "type": "streak",
        "name": "7-Tage-Streak",
        "description": "7 Tage in Folge aktiv!",
        "icon": "🔥",
        "target": 7,
        "points": 50,
    },
    "10_deals_closed": {
        "type": "milestone",
        "name": "10 Deals geschlossen",
        "description": "Du hast 10 Deals erfolgreich abgeschlossen!",
        "icon": "🏆",
        "target": 10,
        "points": 200,
    },
    "100_calls": {
        "type": "milestone",
        "name": "100 Calls gemacht",
        "description": "100 Gespräche geführt!",
        "icon": "📞",
        "target": 100,
        "points": 150,
    },
}


# ============================================================================
# ROUTES
# ============================================================================


@router.get("/achievements", response_model=List[Achievement])
async def list_achievements(
    completed_only: bool = Query(False),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Liste alle Achievements eines Users."""
    user_id = current_user.get("team_member_id") or current_user.get("id")
    
    query = (
        supabase.table("user_achievements")
        .select("*")
        .eq("user_id", user_id)
    )
    
    if completed_only:
        query = query.eq("is_completed", True)
    
    result = query.order("created_at", desc=True).execute()
    
    return [Achievement(**row) for row in result.data]


async def update_achievement_progress_internal(
    achievement_key: str,
    progress_increment: int,
    supabase: Client,
    current_user: dict,
):
    """Interne Funktion zum Aktualisieren von Achievements."""
    user_id = current_user.get("team_member_id") or current_user.get("id")
    
    # Hole oder erstelle Achievement
    existing = (
        supabase.table("user_achievements")
        .select("*")
        .eq("user_id", user_id)
        .eq("achievement_key", achievement_key)
        .maybe_single()
        .execute()
    )
    
    if existing.data:
        achievement = existing.data
        new_progress = achievement["progress_current"] + progress_increment
        is_completed = new_progress >= achievement["progress_target"]
        
        update_data = {
            "progress_current": new_progress,
            "is_completed": is_completed,
        }
        
        if is_completed and not achievement.get("completed_at"):
            update_data["completed_at"] = datetime.now().isoformat()
            update_data["points_awarded"] = achievement.get("points_awarded", 0) or ACHIEVEMENT_DEFINITIONS.get(achievement_key, {}).get("points", 0)
        
        result = (
            supabase.table("user_achievements")
            .update(update_data)
            .eq("id", achievement["id"])
            .execute()
        )
        
        return Achievement(**result.data[0])
    else:
        # Erstelle neues Achievement
        definition = ACHIEVEMENT_DEFINITIONS.get(achievement_key, {
            "type": "milestone",
            "name": achievement_key,
            "description": "",
            "icon": "🏅",
            "target": 1,
            "points": 10,
        })
        
        new_progress = progress_increment
        is_completed = new_progress >= definition["target"]
        
        data = {
            "user_id": user_id,
            "achievement_type": definition["type"],
            "achievement_key": achievement_key,
            "achievement_name": definition["name"],
            "achievement_description": definition.get("description"),
            "achievement_icon": definition.get("icon"),
            "progress_current": new_progress,
            "progress_target": definition["target"],
            "is_completed": is_completed,
            "points_awarded": definition["points"] if is_completed else 0,
            "completed_at": datetime.now().isoformat() if is_completed else None,
        }
        
        result = supabase.table("user_achievements").insert(data).execute()
        
        return Achievement(**result.data[0])


@router.post("/achievements/{achievement_key}/progress")
async def update_achievement_progress(
    achievement_key: str,
    progress_increment: int = Query(1, ge=1),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Aktualisiere Fortschritt eines Achievements."""
    user_id = current_user.get("team_member_id") or current_user.get("id")
    
    # Hole oder erstelle Achievement
    existing = (
        supabase.table("user_achievements")
        .select("*")
        .eq("user_id", user_id)
        .eq("achievement_key", achievement_key)
        .maybe_single()
        .execute()
    )
    
    if existing.data:
        achievement = existing.data
        new_progress = achievement["progress_current"] + progress_increment
        is_completed = new_progress >= achievement["progress_target"]
        
        update_data = {
            "progress_current": new_progress,
            "is_completed": is_completed,
        }
        
        if is_completed and not achievement.get("completed_at"):
            update_data["completed_at"] = datetime.now().isoformat()
        
        result = (
            supabase.table("user_achievements")
            .update(update_data)
            .eq("id", achievement["id"])
            .execute()
        )
        
        return Achievement(**result.data[0])
    else:
        # Erstelle neues Achievement
        definition = ACHIEVEMENT_DEFINITIONS.get(achievement_key, {
            "type": "milestone",
            "name": achievement_key,
            "description": "",
            "icon": "🏅",
            "target": 1,
            "points": 10,
        })
        
        new_progress = progress_increment
        is_completed = new_progress >= definition["target"]
        
        data = {
            "user_id": user_id,
            "achievement_type": definition["type"],
            "achievement_key": achievement_key,
            "achievement_name": definition["name"],
            "achievement_description": definition.get("description"),
            "achievement_icon": definition.get("icon"),
            "progress_current": new_progress,
            "progress_target": definition["target"],
            "is_completed": is_completed,
            "points_awarded": definition["points"] if is_completed else 0,
            "completed_at": datetime.now().isoformat() if is_completed else None,
        }
        
        result = supabase.table("user_achievements").insert(data).execute()
        
        return Achievement(**result.data[0])


@router.get("/daily-activities")
async def list_daily_activities(
    days: int = Query(7, ge=1, le=30),
    mobile: bool = Query(False, description="Mobile-optimierte Response"),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Liste tägliche Aktivitäten."""
    user_id = current_user.get("team_member_id") or current_user.get("id")
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)
    
    result = (
        supabase.table("daily_activities")
        .select("*")
        .eq("user_id", user_id)
        .gte("activity_date", start_date.isoformat())
        .lte("activity_date", end_date.isoformat())
        .order("activity_date", desc=True)
        .execute()
    )
    
    # Mobile-optimierte Response
    if mobile:
        return [
            {
                "id": str(row["id"]),
                "title": f"{row.get('calls_made', 0)} Calls, {row.get('deals_closed', 0)} Deals",
                "date": row.get("activity_date", ""),
                "completed": row.get("daily_goal_met", False),
                "xp": (row.get("calls_made", 0) * 5) + (row.get("deals_closed", 0) * 50),
                "current_streak": row.get("current_streak_days", 0),
                "longest_streak": row.get("longest_streak_days", 0),
            }
            for row in result.data
        ]
    
    # Standard Response
    return [DailyActivity(**row) for row in result.data]


class DailyActivityTrackRequest(BaseModel):
    id: Optional[str] = None
    completed: Optional[bool] = None
    activity_date: Optional[str] = None


@router.post("/daily-activities/track")
async def track_daily_activity(
    body: Optional[DailyActivityTrackRequest] = Body(None),
    activity_date: Optional[date] = Query(None),
    new_contacts: int = Query(0),
    followups_sent: int = Query(0),
    calls_made: int = Query(0),
    meetings_booked: int = Query(0),
    deals_closed: int = Query(0),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Tracke tägliche Aktivität und aktualisiere Streaks."""
    user_id = current_user.get("team_member_id") or current_user.get("id")
    
    # Unterstütze sowohl Query-Parameter als auch Body (für Mobile App)
    if body and body.completed is not None:
        # Mobile App sendet: { id, completed }
        today = date.today()
        existing = (
            supabase.table("daily_activities")
            .select("*")
            .eq("user_id", user_id)
            .eq("activity_date", today.isoformat())
            .maybe_single()
            .execute()
        )
        
        # Vereinfachte Logik: Wenn Task completed, erhöhe entsprechende Metrik
        update_data = {}
        if body.completed:
            # Beispiel: Task "20 Calls" → calls_made += 1
            update_data["calls_made"] = (existing.data.get("calls_made", 0) if existing.data else 0) + 1
        
        # Berechne Streak (wie unten)
        yesterday = today - timedelta(days=1)
        yesterday_activity = (
            supabase.table("daily_activities")
            .select("current_streak_days")
            .eq("user_id", user_id)
            .eq("activity_date", yesterday.isoformat())
            .maybe_single()
            .execute()
        )
        
        current_streak = 1
        if yesterday_activity.data and yesterday_activity.data.get("current_streak_days"):
            current_streak = yesterday_activity.data["current_streak_days"] + 1
        
        longest_result = (
            supabase.table("daily_activities")
            .select("longest_streak_days")
            .eq("user_id", user_id)
            .order("longest_streak_days", desc=True)
            .limit(1)
            .execute()
        )
        
        longest_streak = current_streak
        if longest_result.data and longest_result.data[0].get("longest_streak_days", 0) > current_streak:
            longest_streak = longest_result.data[0]["longest_streak_days"]
        
        update_data.update({
            "current_streak_days": current_streak,
            "longest_streak_days": longest_streak,
            "daily_goal_met": True,
        })
        
        if existing.data:
            result = (
                supabase.table("daily_activities")
                .update(update_data)
                .eq("id", existing.data["id"])
                .execute()
            )
        else:
            data = {
                "user_id": user_id,
                "activity_date": today.isoformat(),
                "new_contacts": 0,
                "followups_sent": 0,
                "calls_made": update_data.get("calls_made", 0),
                "meetings_booked": 0,
                "deals_closed": 0,
                **update_data,
            }
            result = supabase.table("daily_activities").insert(data).execute()
        
        return DailyActivity(**result.data[0])
    
    # Original-Logik für Query-Parameter
    activity_date = activity_date or date.today()
    
    # Prüfe ob bereits existiert
    existing = (
        supabase.table("daily_activities")
        .select("*")
        .eq("user_id", user_id)
        .eq("activity_date", activity_date.isoformat())
        .maybe_single()
        .execute()
    )
    
    # Berechne Streak
    yesterday = activity_date - timedelta(days=1)
    yesterday_activity = (
        supabase.table("daily_activities")
        .select("current_streak_days")
        .eq("user_id", user_id)
        .eq("activity_date", yesterday.isoformat())
        .maybe_single()
        .execute()
    )
    
    current_streak = 1
    if yesterday_activity.data and yesterday_activity.data.get("current_streak_days"):
        current_streak = yesterday_activity.data["current_streak_days"] + 1
    
    # Hole längsten Streak
    longest_result = (
        supabase.table("daily_activities")
        .select("longest_streak_days")
        .eq("user_id", user_id)
        .order("longest_streak_days", desc=True)
        .limit(1)
        .execute()
    )
    
    longest_streak = current_streak
    if longest_result.data and longest_result.data[0].get("longest_streak_days", 0) > current_streak:
        longest_streak = longest_result.data[0]["longest_streak_days"]
    
    # Daily Goal (vereinfacht: mindestens 1 Aktivität)
    daily_goal_met = (new_contacts + followups_sent + calls_made + meetings_booked + deals_closed) > 0
    
    data = {
        "user_id": user_id,
        "activity_date": activity_date.isoformat(),
        "new_contacts": new_contacts,
        "followups_sent": followups_sent,
        "calls_made": calls_made,
        "meetings_booked": meetings_booked,
        "deals_closed": deals_closed,
        "current_streak_days": current_streak,
        "longest_streak_days": longest_streak,
        "daily_goal_met": daily_goal_met,
    }
    
    if existing.data:
        result = (
            supabase.table("daily_activities")
            .update(data)
            .eq("id", existing.data["id"])
            .execute()
        )
    else:
        result = supabase.table("daily_activities").insert(data).execute()
    
    # Update Achievements
    if deals_closed > 0:
        await update_achievement_progress_internal("first_closing", deals_closed, supabase, current_user)
    
    if current_streak >= 7:
        await update_achievement_progress_internal("7_day_streak", 0, supabase, current_user)
    
    return DailyActivity(**result.data[0])


async def get_leaderboard_internal(
    period: str,
    limit: int,
    supabase: Client,
    current_user: dict,
):
    """Interne Funktion für Leaderboard-Logik."""
    # Vereinfachte Version: Hole alle Users mit Achievements
    result = (
        supabase.table("user_achievements")
        .select("user_id, points_awarded, is_completed")
        .eq("is_completed", True)
        .execute()
    )
    
    # Aggregiere Punkte pro User
    user_points = {}
    user_achievements = {}
    
    for row in result.data:
        user_id = row["user_id"]
        if user_id not in user_points:
            user_points[user_id] = 0
            user_achievements[user_id] = 0
        
        user_points[user_id] += row.get("points_awarded", 0)
        user_achievements[user_id] += 1
    
    # Hole Streaks
    streaks_result = (
        supabase.table("daily_activities")
        .select("user_id, current_streak_days")
        .order("activity_date", desc=True)
        .execute()
    )
    
    user_streaks = {}
    for row in streaks_result.data:
        user_id = row["user_id"]
        if user_id not in user_streaks:
            user_streaks[user_id] = row.get("current_streak_days", 0)
    
    # Hole Deals
    deals_result = (
        supabase.table("deals")
        .select("owner_id")
        .eq("won", True)
        .execute()
    )
    
    user_deals = {}
    for row in deals_result.data:
        owner_id = row["owner_id"]
        user_deals[owner_id] = user_deals.get(owner_id, 0) + 1
    
    # Erstelle Leaderboard
    leaderboard = []
    for user_id, points in sorted(user_points.items(), key=lambda x: x[1], reverse=True)[:limit]:
        leaderboard.append(LeaderboardEntry(
            user_id=UUID(user_id),
            total_points=points,
            achievements_count=user_achievements.get(user_id, 0),
            current_streak=user_streaks.get(user_id, 0),
            deals_closed=user_deals.get(user_id, 0),
            rank=len(leaderboard) + 1,
        ))
    
    return leaderboard


@router.get("/leaderboard")
async def get_leaderboard(
    period: str = Query("week", description="week, month, all_time"),
    limit: int = Query(10, ge=1, le=100),
    mobile: bool = Query(False, description="Mobile-optimierte Response"),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Hole Leaderboard."""
    leaderboard_entries = await get_leaderboard_internal(period, limit, supabase, current_user)
    
    # Mobile-optimierte Response
    if mobile:
        return [
            {
                "id": str(entry.user_id),
                "rank": entry.rank,
                "name": entry.user_name or f"User {entry.rank}",
                "points": entry.total_points,
                "trend": 0,  # Kann aus historischen Daten berechnet werden
            }
            for entry in leaderboard_entries
        ]
    
    # Standard Response
    return leaderboard_entries

