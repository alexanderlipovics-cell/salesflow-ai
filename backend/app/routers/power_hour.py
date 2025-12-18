from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, date

router = APIRouter(prefix="/power-hour", tags=["power-hour"])

from app.core.deps import get_current_user
from app.supabase_client import get_supabase_client


class PowerHourSession(BaseModel):
    id: Optional[str] = None
    goal_contacts: int = 20
    contacts_made: int = 0
    goal_messages: int = 15
    messages_sent: int = 0
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    duration_minutes: int = 60
    is_active: bool = False
    streak_days: int = 0


class PowerHourStats(BaseModel):
    total_sessions: int
    total_contacts: int
    total_messages: int
    best_session_contacts: int
    current_streak: int
    longest_streak: int
    avg_contacts_per_session: float


class StartSessionRequest(BaseModel):
    goal_contacts: int = 20
    goal_messages: int = 15
    duration_minutes: int = 60


class UpdateProgressRequest(BaseModel):
    contacts_made: Optional[int] = None
    messages_sent: Optional[int] = None


MOTIVATIONAL_MESSAGES = [
    {"threshold": 0, "message": "Los geht's! 🚀 Du schaffst das!"},
    {"threshold": 25, "message": "Guter Start! Weiter so! 💪"},
    {"threshold": 50, "message": "Halbzeit! Du bist on fire! 🔥"},
    {"threshold": 75, "message": "Fast geschafft! Sprint zum Ziel! 🏃"},
    {"threshold": 90, "message": "Nur noch ein paar! Du bist UNSTOPPABLE! ⚡"},
    {"threshold": 100, "message": "GOAL! Du hast es geschafft! 🎉🏆"},
]


@router.post("/start")
async def start_power_hour(
    request: StartSessionRequest,
    current_user=Depends(get_current_user),
):
    """Start a new Power Hour session."""
    supabase = get_supabase_client()

    # Check for active session
    active = (
        supabase.table("power_hour_sessions")
        .select("id")
        .eq("user_id", str(current_user["id"]))
        .eq("is_active", True)
        .execute()
    )

    if active.data:
        raise HTTPException(400, "Du hast bereits eine aktive Session!")

    # Calculate streak (simple check on yesterday)
    yesterday = (datetime.now() - timedelta(days=1)).date().isoformat()
    supabase.table("power_hour_sessions").select("id").eq("user_id", str(current_user.id)).gte("started_at", yesterday).execute()

    # Get current streak
    streak_result = (
        supabase.table("user_stats")
        .select("power_hour_streak")
        .eq("user_id", str(current_user["id"]))
        .single()
        .execute()
    )

    current_streak = 0
    if streak_result.data:
        current_streak = streak_result.data.get("power_hour_streak", 0)

    # Create session
    session_data = {
        "user_id": str(current_user.id),
        "goal_contacts": request.goal_contacts,
        "goal_messages": request.goal_messages,
        "contacts_made": 0,
        "messages_sent": 0,
        "duration_minutes": request.duration_minutes,
        "started_at": datetime.now().isoformat(),
        "is_active": True,
        "created_at": datetime.now().isoformat(),
    }

    result = supabase.table("power_hour_sessions").insert(session_data).execute()

    session = result.data[0] if result.data else None

    return {
        "success": True,
        "session": session,
        "streak": current_streak + 1,
        "message": MOTIVATIONAL_MESSAGES[0]["message"],
    }


@router.post("/update/{session_id}")
async def update_progress(
    session_id: str,
    request: UpdateProgressRequest,
    current_user=Depends(get_current_user),
):
    """Update session progress."""
    supabase = get_supabase_client()

    # Get current session
    session = (
        supabase.table("power_hour_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", str(current_user["id"]))
        .single()
        .execute()
    )

    if not session.data:
        raise HTTPException(404, "Session nicht gefunden")

    current = session.data

    # Update counts
    update_data = {"updated_at": datetime.now().isoformat()}

    new_contacts = current["contacts_made"]
    new_messages = current["messages_sent"]

    if request.contacts_made is not None:
        new_contacts = request.contacts_made
        update_data["contacts_made"] = new_contacts

    if request.messages_sent is not None:
        new_messages = request.messages_sent
        update_data["messages_sent"] = new_messages

    supabase.table("power_hour_sessions").update(update_data).eq("id", session_id).execute()

    # Calculate progress percentage
    contact_progress = (new_contacts / current["goal_contacts"]) * 100 if current["goal_contacts"] > 0 else 0
    message_progress = (new_messages / current["goal_messages"]) * 100 if current["goal_messages"] > 0 else 0
    overall_progress = (contact_progress + message_progress) / 2

    # Get motivational message
    motivation = MOTIVATIONAL_MESSAGES[0]["message"]
    for m in MOTIVATIONAL_MESSAGES:
        if overall_progress >= m["threshold"]:
            motivation = m["message"]

    return {
        "success": True,
        "contacts_made": new_contacts,
        "messages_sent": new_messages,
        "contact_progress": round(contact_progress, 1),
        "message_progress": round(message_progress, 1),
        "overall_progress": round(overall_progress, 1),
        "motivation": motivation,
        "goal_reached": overall_progress >= 100,
    }


@router.post("/end/{session_id}")
async def end_power_hour(
    session_id: str,
    current_user=Depends(get_current_user),
):
    """End Power Hour session and calculate results."""
    supabase = get_supabase_client()

    # Get session
    session = (
        supabase.table("power_hour_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", str(current_user["id"]))
        .single()
        .execute()
    )

    if not session.data:
        raise HTTPException(404, "Session nicht gefunden")

    current = session.data

    # Calculate duration
    started = datetime.fromisoformat(current["started_at"].replace("Z", ""))
    ended = datetime.now()
    actual_duration = (ended - started).seconds // 60

    # Update session
    supabase.table("power_hour_sessions").update(
        {"is_active": False, "ended_at": ended.isoformat(), "actual_duration_minutes": actual_duration}
    ).eq("id", session_id).execute()

    # Update streak
    today = date.today().isoformat()

    # Check if already did one today
    today_sessions = (
        supabase.table("power_hour_sessions")
        .select("id")
        .eq("user_id", str(current_user["id"]))
        .gte("started_at", today)
        .neq("id", session_id)
        .execute()
    )

    if not today_sessions.data:
        # First session today - increment streak
        supabase.rpc(
            "increment_power_hour_streak",
            {
                "p_user_id": str(current_user.id),
            },
        ).execute()

    # Calculate stats
    contact_progress = (current["contacts_made"] / current["goal_contacts"]) * 100 if current["goal_contacts"] else 0
    message_progress = (current["messages_sent"] / current["goal_messages"]) * 100 if current["goal_messages"] else 0

    goal_reached = contact_progress >= 100 and message_progress >= 100

    # Celebration messages
    if goal_reached:
        celebration = "🎉🏆 FANTASTISCH! Du hast BEIDE Ziele erreicht! Du bist ein Sales-Champion!"
    elif contact_progress >= 100 or message_progress >= 100:
        celebration = "🎉 Super! Du hast ein Ziel erreicht! Weiter so!"
    elif contact_progress >= 50:
        celebration = "👍 Gut gemacht! Nächstes Mal schaffst du noch mehr!"
    else:
        celebration = "💪 Jede Session zählt! Morgen wird besser!"

    return {
        "success": True,
        "session_id": session_id,
        "duration_minutes": actual_duration,
        "contacts_made": current["contacts_made"],
        "contacts_goal": current["goal_contacts"],
        "messages_sent": current["messages_sent"],
        "messages_goal": current["goal_messages"],
        "contact_progress": round(contact_progress, 1),
        "message_progress": round(message_progress, 1),
        "goal_reached": goal_reached,
        "celebration": celebration,
    }


@router.get("/stats")
async def get_power_hour_stats(
    current_user=Depends(get_current_user),
):
    """Get Power Hour statistics."""
    supabase = get_supabase_client()

    sessions = (
        supabase.table("power_hour_sessions")
        .select("*")
        .eq("user_id", str(current_user["id"]))
        .eq("is_active", False)
        .execute()
    )

    data = sessions.data or []

    if not data:
        return PowerHourStats(
            total_sessions=0,
            total_contacts=0,
            total_messages=0,
            best_session_contacts=0,
            current_streak=0,
            longest_streak=0,
            avg_contacts_per_session=0,
        )

    total_contacts = sum(s["contacts_made"] for s in data)
    total_messages = sum(s["messages_sent"] for s in data)
    best_contacts = max(s["contacts_made"] for s in data)

    # Get streak
    streak_result = (
        supabase.table("user_stats")
        .select("power_hour_streak, power_hour_longest_streak")
        .eq("user_id", str(current_user["id"]))
        .single()
        .execute()
    )

    current_streak = 0
    longest_streak = 0
    if streak_result.data:
        current_streak = streak_result.data.get("power_hour_streak", 0)
        longest_streak = streak_result.data.get("power_hour_longest_streak", 0)

    return PowerHourStats(
        total_sessions=len(data),
        total_contacts=total_contacts,
        total_messages=total_messages,
        best_session_contacts=best_contacts,
        current_streak=current_streak,
        longest_streak=longest_streak,
        avg_contacts_per_session=round(total_contacts / len(data), 1) if data else 0,
    )


@router.get("/active")
async def get_active_session(
    current_user=Depends(get_current_user),
):
    """Get currently active Power Hour session."""
    supabase = get_supabase_client()

    result = (
        supabase.table("power_hour_sessions")
        .select("*")
        .eq("user_id", str(current_user["id"]))
        .eq("is_active", True)
        .single()
        .execute()
    )

    if not result.data:
        return {"active": False, "session": None}

    session = result.data

    # Check if expired
    started = datetime.fromisoformat(session["started_at"].replace("Z", ""))
    elapsed = (datetime.now() - started).seconds // 60
    remaining = max(0, session["duration_minutes"] - elapsed)

    if remaining == 0:
        # Auto-end expired session
        await end_power_hour(session["id"], current_user)
        return {"active": False, "session": None, "expired": True}

    return {
        "active": True,
        "session": session,
        "elapsed_minutes": elapsed,
        "remaining_minutes": remaining,
    }

