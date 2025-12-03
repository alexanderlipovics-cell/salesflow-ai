"""
SALES FLOW AI - Mobile API Router
Endpoints für die Mobile App (Today, Squad, Profile, etc.)
"""
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.supabase import get_supabase_client
from app.core.auth_helper import get_current_user_id

router = APIRouter(prefix="/api/mobile", tags=["mobile"])

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class UserStats(BaseModel):
    today_contacts_target: int
    today_contacts_done: int
    today_points_target: int
    today_points_done: int
    streak_day: int

class DueLead(BaseModel):
    id: str
    name: str
    stage: str
    next_contact_due_at: str
    priority_score: float
    channel: str
    company_name: str

class SquadChallenge(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start_date: str
    end_date: str
    target_points: int = 0

class SquadMe(BaseModel):
    user_id: str
    name: str
    rank: Optional[int] = None
    points: int

class SquadLeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    name: str
    points: int

class SquadSummary(BaseModel):
    has_active_challenge: bool
    challenge_title: Optional[str] = None
    my_rank: Optional[int] = None
    my_points: Optional[int] = None
    my_team_points: Optional[int] = None
    target_points: Optional[int] = None

class TodayResponse(BaseModel):
    user_stats: UserStats
    due_leads: List[DueLead]
    squad_summary: SquadSummary

class SquadResponse(BaseModel):
    has_active_challenge: bool
    challenge: Optional[SquadChallenge] = None
    me: Optional[SquadMe] = None
    leaderboard: List[SquadLeaderboardEntry] = []

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _today_range_utc() -> tuple[datetime, datetime]:
    """Returns (start_of_today, end_of_today) in UTC."""
    today = datetime.now(timezone.utc).date()
    start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    end = datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc)
    return start, end

def _today_date() -> date:
    """Returns today's date."""
    return datetime.now(timezone.utc).date()

def _get_active_squad_for_user(supabase, user_id: str) -> Optional[Dict]:
    """
    Findet das aktive Squad für einen User.
    Returns None wenn kein Squad gefunden wird.
    """
    try:
        resp = (
            supabase.table("squad_members")
            .select("squad_id, squads(*)")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )
        
        if resp.data and resp.data.get("squads"):
            squad_data = resp.data["squads"]
            return {
                "id": squad_data.get("id"),
                "name": squad_data.get("name"),
                "is_active": squad_data.get("is_active", True),
            }
        return None
    except Exception as e:
        # Log error but don't fail - return None
        print(f"Error fetching squad for user {user_id}: {e}")
        return None

def _get_active_challenge_for_squad(supabase, squad_id: str) -> Optional[Dict]:
    """
    Findet die aktive Challenge für ein Squad.
    Returns None wenn keine Challenge gefunden wird.
    """
    try:
        today = _today_date()
        resp = (
            supabase.table("squad_challenges")
            .select("*")
            .eq("squad_id", squad_id)
            .eq("is_active", True)
            .lte("start_date", today.isoformat())
            .gte("end_date", today.isoformat())
            .maybe_single()
            .execute()
        )
        return resp.data if resp.data else None
    except Exception as e:
        print(f"Error fetching challenge for squad {squad_id}: {e}")
        return None

def _get_squad_leaderboard_for_user(supabase, user_id: str):
    """
    Berechnet Challenge + Leaderboard + eigene Punkte für den User.
    Rückgabe ist ein dict mit:
    - has_active_challenge (bool)
    - challenge (SquadChallenge | None)
    - me (SquadMe | None)
    - leaderboard (list[SquadLeaderboardEntry])
    - total_team_points (int)
    """
    squad = _get_active_squad_for_user(supabase, user_id)
    if not squad:
        return {
            "has_active_challenge": False,
            "challenge": None,
            "me": None,
            "leaderboard": [],
            "total_team_points": 0,
        }

    challenge = _get_active_challenge_for_squad(supabase, squad["id"])
    if not challenge:
        return {
            "has_active_challenge": False,
            "challenge": None,
            "me": None,
            "leaderboard": [],
            "total_team_points": 0,
        }

    challenge_model = SquadChallenge(
        id=challenge["id"],
        title=challenge["title"],
        description=challenge.get("description"),
        start_date=str(challenge["start_date"]),
        end_date=str(challenge["end_date"]),
        target_points=challenge.get("target_points", 0),
    )

    # Alle aktiven Squad-Member holen
    members_resp = (
        supabase.table("squad_members")
        .select("user_id, role, is_active")
        .eq("squad_id", squad["id"])
        .eq("is_active", True)
        .execute()
    )
    members_rows = members_resp.data or []
    member_user_ids = [row["user_id"] for row in members_rows]

    if not member_user_ids:
        return {
            "has_active_challenge": True,
            "challenge": challenge_model,
            "me": None,
            "leaderboard": [],
            "total_team_points": 0,
        }

    # Namen/Profil der Squad-Member
    prof_resp = (
        supabase.table("user_profiles")
        .select("id, full_name")
        .in_("id", member_user_ids)
        .execute()
    )
    prof_rows = prof_resp.data or []
    profiles_by_id = {row["id"]: row.get("full_name") or "Unbekannt" for row in prof_rows}

    # Punkte der Speed-Hunter-Actions im Challenge-Zeitraum
    start_dt = datetime.combine(
        date.fromisoformat(str(challenge["start_date"])),
        datetime.min.time(),
        tzinfo=timezone.utc
    )
    end_dt = datetime.combine(
        date.fromisoformat(str(challenge["end_date"])),
        datetime.min.time(),
        tzinfo=timezone.utc
    ) + timedelta(days=1)

    actions_resp = (
        supabase.table("speed_hunter_actions")
        .select("user_id, points, created_at")
        .in_("user_id", member_user_ids)
        .gte("created_at", start_dt.isoformat())
        .lt("created_at", end_dt.isoformat())
        .execute()
    )
    actions_rows = actions_resp.data or []

    points_by_user: Dict[str, int] = {}
    for row in actions_rows:
        uid = row["user_id"]
        pts = int(row.get("points", 0) or 0)
        points_by_user[uid] = points_by_user.get(uid, 0) + pts

    leaderboard_raw = []
    for uid in member_user_ids:
        pts = points_by_user.get(uid, 0)
        name = profiles_by_id.get(uid, "Unbekannt")
        leaderboard_raw.append((uid, name, pts))

    leaderboard_raw.sort(key=lambda x: x[2], reverse=True)

    leaderboard_models: List[SquadLeaderboardEntry] = []
    my_entry: Optional[SquadMe] = None
    total_team_points = 0

    for rank, (uid, name, pts) in enumerate(leaderboard_raw, start=1):
        total_team_points += pts
        leaderboard_models.append(
            SquadLeaderboardEntry(
                rank=rank,
                user_id=uid,
                name=name,
                points=pts,
            )
        )
        if uid == user_id:
            my_entry = SquadMe(
                user_id=uid,
                name=name,
                rank=rank,
                points=pts,
            )

    if not my_entry:
        my_entry = SquadMe(
            user_id=user_id,
            name=profiles_by_id.get(user_id, "Du"),
            rank=None,
            points=points_by_user.get(user_id, 0),
        )

    return {
        "has_active_challenge": True,
        "challenge": challenge_model,
        "me": my_entry,
        "leaderboard": leaderboard_models,
        "total_team_points": total_team_points,
    }

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/today", response_model=TodayResponse)
async def get_today(
    user_id: str = Depends(get_current_user_id),
):
    """
    GET /api/mobile/today
    Liefert Tagesübersicht: User Stats, fällige Leads, Squad Summary
    """
    supabase = get_supabase_client()

    # 1) User Stats aus Speed Hunter Sessions/Actions berechnen
    start_of_today, end_of_today = _today_range_utc()
    
    # Heutige Actions zählen
    actions_resp = (
        supabase.table("speed_hunter_actions")
        .select("points")
        .eq("user_id", user_id)
        .gte("created_at", start_of_today.isoformat())
        .lt("created_at", end_of_today.isoformat())
        .execute()
    )
    
    today_contacts_done = len(actions_resp.data or [])
    today_points_done = sum(int(row.get("points", 0) or 0) for row in (actions_resp.data or []))
    
    # Targets aus User Settings (oder Defaults)
    # TODO: Aus user_profiles oder settings Tabelle holen
    today_contacts_target = 20
    today_points_target = 40
    
    # Streak berechnen (Tage in Folge mit mindestens 1 Action)
    # TODO: Implementiere echte Streak-Berechnung
    streak_day = 0
    
    user_stats = UserStats(
        today_contacts_target=today_contacts_target,
        today_contacts_done=today_contacts_done,
        today_points_target=today_points_target,
        today_points_done=today_points_done,
        streak_day=streak_day,
    )

    # 2) Fällige Leads (aus today_follow_ups View oder leads Tabelle)
    # TODO: Implementiere echte Lead-Abfrage mit Priority-Score
    due_leads: List[DueLead] = []

    # 3) Squad-Summary (live aus Squad/Challenge/Speed-Hunter-Stats)
    squad_stats = _get_squad_leaderboard_for_user(supabase, user_id)

    if not squad_stats["has_active_challenge"]:
        squad_summary = SquadSummary(
            has_active_challenge=False,
            challenge_title=None,
            my_rank=None,
            my_points=None,
            my_team_points=None,
            target_points=None,
        )
    else:
        challenge = squad_stats["challenge"]
        me = squad_stats["me"]
        squad_summary = SquadSummary(
            has_active_challenge=True,
            challenge_title=challenge.title,
            my_rank=me.rank if me else None,
            my_points=me.points if me else 0,
            my_team_points=squad_stats["total_team_points"],
            target_points=challenge.target_points,
        )

    return TodayResponse(
        user_stats=user_stats,
        due_leads=due_leads,
        squad_summary=squad_summary,
    )

@router.get("/squad", response_model=SquadResponse)
async def get_squad(
    user_id: str = Depends(get_current_user_id),
):
    """
    GET /api/mobile/squad
    Liefert Squad-Übersicht: Challenge, Leaderboard, eigener Rang
    """
    supabase = get_supabase_client()

    stats = _get_squad_leaderboard_for_user(supabase, user_id)
    if not stats["has_active_challenge"]:
        return SquadResponse(
            has_active_challenge=False,
            challenge=None,
            me=None,
            leaderboard=[],
        )

    return SquadResponse(
        has_active_challenge=True,
        challenge=stats["challenge"],
        me=stats["me"],
        leaderboard=stats["leaderboard"],
    )
