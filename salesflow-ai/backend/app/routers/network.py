from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..core.security import get_current_active_user
from ..core.deps import get_supabase

router = APIRouter(prefix="/network", tags=["network"])

# Bestehende Helper beibehalten, ggf. nicht genutzt
def _ensure_supabase():
    try:
        return get_supabase()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _extract_user_id(current_user: Any) -> str:
    if isinstance(current_user, dict):
        return str(
            current_user.get("user_id")
            or current_user.get("id")
            or current_user.get("sub")
        )
    if hasattr(current_user, "id"):
        return str(current_user["id"])
    return str(current_user)


# ═════════ MODELS ═════════
class NetworkSetup(BaseModel):
    current_rank: int = 0
    pcp: int = 0
    personal_credits: int = 0
    left_leg_credits: int = 0
    right_leg_credits: int = 0
    z4f_customers: int = 0
    company_type: str = "zinzino"


class TeamMemberCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    leg: str = "left"
    rank_id: int = 0
    personal_credits: int = 0
    notes: Optional[str] = None
    source: str = "manual"


class LeadConversion(BaseModel):
    lead_id: str
    leg: str
    rank: int = 0
    personal_credits: int = 0
    notes: Optional[str] = None


class TeamMemberImport(BaseModel):
    name: str
    email: Optional[str] = None
    rank: str = "Partner"
    leg: str = "left"
    credits: int = 0
    status: str = "active"


class ImportRequest(BaseModel):
    team_members: List[TeamMemberImport]


# ZINZINO RANKS (Mapping)
ZINZINO_RANKS = [
    {"id": 0, "name": "Partner", "icon": "👤", "balanced_credits": 0},
    {"id": 1, "name": "Q-Team", "icon": "🌱", "balanced_credits": 0},
    {"id": 2, "name": "X-Team", "icon": "⚡", "balanced_credits": 0},
    {"id": 3, "name": "Bronze", "icon": "🥉", "balanced_credits": 0},
    {"id": 4, "name": "Silver", "icon": "🥈", "balanced_credits": 750},
    {"id": 5, "name": "Gold", "icon": "🥇", "balanced_credits": 1500},
    {"id": 6, "name": "Executive", "icon": "💼", "balanced_credits": 3000},
    {"id": 7, "name": "Platinum", "icon": "💎", "balanced_credits": 6000},
    {"id": 8, "name": "Diamond", "icon": "💠", "balanced_credits": 12000},
]


def get_rank_name(rank_id: int) -> str:
    if 0 <= rank_id < len(ZINZINO_RANKS):
        return ZINZINO_RANKS[rank_id]["name"]
    return "Partner"


def rank_name_to_id(name: str) -> int:
    for rank in ZINZINO_RANKS:
        if rank["name"].lower() == name.lower():
            return rank["id"]
    return 0


def format_time_ago(timestamp_str: str) -> str:
    try:
        ts = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        now = datetime.now(ts.tzinfo)
        diff = now - ts
        if diff.days > 0:
            return f"{diff.days}d ago"
        if diff.seconds >= 3600:
            return f"{diff.seconds // 3600}h ago"
        if diff.seconds >= 60:
            return f"{diff.seconds // 60}m ago"
        return "just now"
    except Exception:
        return "recently"


# ═════════ DASHBOARD ═════════
@router.get("/dashboard")
async def get_network_dashboard(
    user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    user_id = str(user.get("sub"))

    settings_result = (
        supabase.table("network_settings").select("*").eq("user_id", user_id).execute()
    )
    settings = settings_result.data[0] if settings_result.data else None

    if not settings:
        return {
            "has_setup": False,
            "stats": None,
            "rank_progress": None,
            "recent_activity": [],
            "monthly_projection": {"team_commission": 0, "cash_bonus": 0, "total": 0},
            "z4f_status": {"current": 0, "target": 4, "qualified": False},
            "user_stats": None,
        }

    team_result = (
        supabase.table("team_members").select("*").eq("user_id", user_id).execute()
    )
    team_members = team_result.data or []

    total_partners = len(team_members)
    active_partners = len([m for m in team_members if m.get("is_active", False)])
    inactive_partners = total_partners - active_partners

    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = len(
        [
            m
            for m in team_members
            if m.get("joined_at")
            and datetime.fromisoformat(str(m["joined_at"]).replace("Z", "+00:00"))
            >= month_start
        ]
    )

    activity_result = (
        supabase.table("team_activity")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    recent_activity = []
    for event in activity_result.data or []:
        item = {
            "id": event["id"],
            "type": event["event_type"],
            "name": event.get("member_name", "Unbekannt"),
            "time": format_time_ago(event.get("created_at", "")),
            "details": event.get("details", {}),
        }
        if event["event_type"] == "rank_up":
            item["rank"] = event.get("details", {}).get("new_rank", "")
        if event["event_type"] == "order":
            item["amount"] = f"€{event.get('details', {}).get('amount', 0)}"
        if event["event_type"] == "inactive_alert":
            item["days"] = event.get("details", {}).get("days_inactive", 0)
        recent_activity.append(item)

    left = settings.get("left_leg_credits", 0)
    right = settings.get("right_leg_credits", 0)
    balanced_credits = min(left, right) * 2

    current_rank_id = settings.get("current_rank", 0)
    current_rank = (
        ZINZINO_RANKS[current_rank_id]
        if current_rank_id < len(ZINZINO_RANKS)
        else ZINZINO_RANKS[0]
    )
    next_rank = (
        ZINZINO_RANKS[current_rank_id + 1]
        if current_rank_id + 1 < len(ZINZINO_RANKS)
        else None
    )

    progress_percent = 100
    credits_needed = 0
    if next_rank and next_rank["balanced_credits"] > 0:
        credits_needed = next_rank["balanced_credits"]
        progress_percent = min(100, int((balanced_credits / credits_needed) * 100))

    team_commission = int(balanced_credits * 0.075)
    cash_bonus = int(settings.get("personal_credits", 0) * 0.10)

    return {
        "has_setup": True,
        "stats": {
            "total_partners": total_partners,
            "active_partners": active_partners,
            "inactive_partners": inactive_partners,
            "new_this_month": new_this_month,
            "left_leg_credits": left,
            "right_leg_credits": right,
            "balanced_credits": balanced_credits,
        },
        "rank_progress": {
            "current_rank_id": current_rank_id,
            "current_rank_name": current_rank["name"],
            "current_rank_icon": current_rank["icon"],
            "next_rank_id": current_rank_id + 1 if next_rank else None,
            "next_rank_name": next_rank["name"] if next_rank else None,
            "progress_percent": progress_percent,
            "credits_needed": credits_needed,
            "credits_current": balanced_credits,
        },
        "user_stats": {
            "pcp": settings.get("pcp", 0),
            "personal_credits": settings.get("personal_credits", 0),
            "z4f_customers": settings.get("z4f_customers", 0),
        },
        "recent_activity": recent_activity,
        "monthly_projection": {
            "team_commission": team_commission,
            "cash_bonus": cash_bonus,
            "total": team_commission + cash_bonus,
        },
        "z4f_status": {
            "current": settings.get("z4f_customers", 0),
            "target": 4,
            "qualified": settings.get("z4f_customers", 0) >= 4,
        },
    }


# ═════════ SETUP & SETTINGS ═════════
@router.get("/has-setup")
async def check_has_setup(
    user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    result = (
        supabase.table("network_settings")
        .select("has_completed_setup")
        .eq("user_id", str(user.get("sub")))
        .execute()
    )
    if result.data and result.data[0].get("has_completed_setup"):
        return {"has_setup": True}
    return {"has_setup": False}


@router.post("/setup")
async def setup_network(
    data: NetworkSetup,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    user_id = str(user.get("sub"))
    existing = supabase.table("network_settings").select("id").eq("user_id", user_id).execute()

    settings_data = {
        "user_id": user_id,
        "current_rank": data.current_rank,
        "pcp": data.pcp,
        "personal_credits": data.personal_credits,
        "left_leg_credits": data.left_leg_credits,
        "right_leg_credits": data.right_leg_credits,
        "z4f_customers": data.z4f_customers,
        "company_type": data.company_type,
        "has_completed_setup": True,
        "last_synced_at": datetime.now().isoformat(),
    }

    if existing.data:
        supabase.table("network_settings").update(settings_data).eq("user_id", user_id).execute()
    else:
        supabase.table("network_settings").insert(settings_data).execute()

    return {"success": True, "message": "Network settings saved"}


@router.get("/settings")
async def get_network_settings(
    user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    result = (
        supabase.table("network_settings")
        .select("*")
        .eq("user_id", str(user.get("sub")))
        .execute()
    )
    if result.data:
        return result.data[0]
    return {
        "current_rank": 0,
        "pcp": 0,
        "personal_credits": 0,
        "left_leg_credits": 0,
        "right_leg_credits": 0,
        "z4f_customers": 0,
        "company_type": "zinzino",
    }


@router.put("/settings")
async def update_network_settings(
    data: NetworkSetup,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    user_id = str(user.get("sub"))
    existing = supabase.table("network_settings").select("id").eq("user_id", user_id).execute()

    settings_data = {
        "current_rank": data.current_rank,
        "pcp": data.pcp,
        "personal_credits": data.personal_credits,
        "left_leg_credits": data.left_leg_credits,
        "right_leg_credits": data.right_leg_credits,
        "z4f_customers": data.z4f_customers,
        "last_synced_at": datetime.now().isoformat(),
    }

    if existing.data:
        supabase.table("network_settings").update(settings_data).eq("user_id", user_id).execute()
    else:
        settings_data["user_id"] = user_id
        settings_data["has_completed_setup"] = True
        supabase.table("network_settings").insert(settings_data).execute()

    return {"success": True, "message": "Settings updated"}


# ═════════ TEAM MEMBERS ═════════
@router.get("/team")
async def get_team_members(
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
    leg: Optional[str] = None,
    active_only: bool = False,
):
    query = supabase.table("team_members").select("*").eq("user_id", str(user.get("sub")))
    if leg:
        query = query.eq("leg", leg)
    if active_only:
        query = query.eq("is_active", True)
    result = query.order("joined_at", desc=True).execute()

    team = []
    for member in result.data or []:
        member["rank_name"] = get_rank_name(member.get("rank_id", 0))
        team.append(member)

    return {"team": team, "total": len(team)}


@router.post("/team")
async def add_team_member(
    member: TeamMemberCreate,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    member_data = {
        "user_id": str(user.get("sub")),
        "name": member.name,
        "email": member.email,
        "phone": member.phone,
        "leg": member.leg,
        "rank_id": member.rank_id,
        "personal_credits": member.personal_credits,
        "notes": member.notes,
        "source": member.source,
        "is_active": True,
    }

    result = supabase.table("team_members").insert(member_data).execute()

    if result.data:
        supabase.table("team_activity").insert(
            {
                "user_id": str(user.get("sub")),
                "event_type": "new_partner",
                "team_member_id": result.data[0]["id"],
                "member_name": member.name,
                "details": {"leg": member.leg, "source": member.source},
            }
        ).execute()

    return {"success": True, "member": result.data[0] if result.data else None}


@router.delete("/team/{member_id}")
async def delete_team_member(
    member_id: str, user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    supabase.table("team_members").delete().eq("id", member_id).eq("user_id", str(user.get("sub"))).execute()
    return {"success": True}


# ═════════ LEAD CONVERSION ═════════
@router.post("/convert-lead")
async def convert_lead_to_partner(
    data: LeadConversion,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    user_id = str(user.get("sub"))
    lead_result = (
        supabase.table("leads").select("*").eq("id", data.lead_id).eq("user_id", user_id).execute()
    )
    if not lead_result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = lead_result.data[0]

    member_data = {
        "user_id": user_id,
        "name": lead.get("name", "Unbekannt"),
        "email": lead.get("email"),
        "phone": lead.get("phone"),
        "leg": data.leg,
        "rank_id": data.rank,
        "personal_credits": data.personal_credits,
        "notes": data.notes,
        "source": "lead_conversion",
        "original_lead_id": data.lead_id,
        "is_active": True,
    }
    member_result = supabase.table("team_members").insert(member_data).execute()

    supabase.table("leads").update(
        {"status": "converted", "converted_at": datetime.now().isoformat()}
    ).eq("id", data.lead_id).execute()

    if member_result.data:
        supabase.table("team_activity").insert(
            {
                "user_id": user_id,
                "event_type": "new_partner",
                "team_member_id": member_result.data[0]["id"],
                "member_name": lead.get("name", "Unbekannt"),
                "details": {"leg": data.leg, "source": "lead_conversion", "lead_id": data.lead_id},
            }
        ).execute()

    return {
        "success": True,
        "message": "Lead zu Partner konvertiert",
        "member": member_result.data[0] if member_result.data else None,
    }


# ═════════ CSV IMPORT ═════════
@router.post("/import")
async def import_team_csv(
    data: ImportRequest,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    user_id = str(user.get("sub"))
    imported = 0
    errors = []

    for member in data.team_members:
        try:
            if not member.name:
                errors.append("Zeile übersprungen: Kein Name")
                continue
            member_data = {
                "user_id": user_id,
                "name": member.name,
                "email": member.email,
                "leg": member.leg if member.leg in ["left", "right"] else "left",
                "rank_id": rank_name_to_id(member.rank),
                "personal_credits": member.credits,
                "is_active": member.status == "active",
                "source": "csv_import",
            }
            supabase.table("team_members").insert(member_data).execute()
            imported += 1
        except Exception as e:
            errors.append(f"Fehler bei {member.name}: {str(e)}")

    supabase.table("network_settings").update(
        {"last_synced_at": datetime.now().isoformat()}
    ).eq("user_id", user_id).execute()

    return {"success": len(errors) == 0, "imported": imported, "errors": errors}


# ═════════ RANK PROGRESS ═════════
@router.get("/rank-progress")
async def get_rank_progress(
    user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    result = (
        supabase.table("network_settings")
        .select("*")
        .eq("user_id", str(user.get("sub")))
        .execute()
    )
    if not result.data:
        return {"error": "No settings found"}

    settings = result.data[0]
    left = settings.get("left_leg_credits", 0)
    right = settings.get("right_leg_credits", 0)
    balanced = min(left, right) * 2

    current_rank_id = settings.get("current_rank", 0)
    current_rank = (
        ZINZINO_RANKS[current_rank_id]
        if current_rank_id < len(ZINZINO_RANKS)
        else ZINZINO_RANKS[0]
    )
    next_rank = (
        ZINZINO_RANKS[current_rank_id + 1]
        if current_rank_id + 1 < len(ZINZINO_RANKS)
        else None
    )

    progress = 100
    if next_rank and next_rank["balanced_credits"] > 0:
        progress = min(100, int((balanced / next_rank["balanced_credits"]) * 100))

    return {
        "current_rank_id": current_rank_id,
        "current_rank_name": current_rank["name"],
        "current_rank_icon": current_rank["icon"],
        "next_rank_id": current_rank_id + 1 if next_rank else None,
        "next_rank_name": next_rank["name"] if next_rank else None,
        "next_rank_icon": next_rank["icon"] if next_rank else None,
        "progress_percent": progress,
        "balanced_credits": balanced,
        "needed_credits": next_rank["balanced_credits"] if next_rank else 0,
        "remaining_credits": max(
            0, (next_rank["balanced_credits"] if next_rank else 0) - balanced
        ),
    }

