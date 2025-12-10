from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_current_user
from ..core.deps import get_supabase

router = APIRouter(prefix="/network", tags=["network"])


def _ensure_supabase():
    try:
        return get_supabase()
    except SupabaseNotConfiguredError as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _extract_user_id(current_user: Any) -> str:
    """Ermittle die user_id unabhängig vom Format."""
    if isinstance(current_user, dict):
        return str(
            current_user.get("user_id")
            or current_user.get("id")
            or current_user.get("sub")
        )
    if hasattr(current_user, "id"):
        return str(current_user["id"])
    return str(current_user)


class TeamMemberCreate(BaseModel):
    member_name: str
    member_email: Optional[str] = None
    member_phone: Optional[str] = None
    sponsor_id: Optional[str] = None
    rank: str = "Starter"
    status: str = "active"
    joined_at: Optional[date] = None


class TeamStats(BaseModel):
    total_team: int
    direct_partners: int
    active_members: int
    inactive_members: int
    new_this_week: int
    new_this_month: int
    total_group_volume: float


class NetworkSetup(BaseModel):
    current_rank: int
    team_size: int = 0
    left_leg_credits: int = 0
    right_leg_credits: int = 0
    z4f_customers: int = 0
    pcp: int = 0
    personal_credits: int = 0


class TeamMemberImport(BaseModel):
    name: str
    email: Optional[str] = None
    rank: str = "Partner"
    leg: str = "left"
    credits: int = 0
    status: str = "active"
    joined_at: Optional[str] = None


class ImportRequest(BaseModel):
    team_members: List[TeamMemberImport]


class LeadConversion(BaseModel):
    lead_id: str
    leg: str  # 'left' or 'right'
    rank: int = 0
    personal_credits: int = 0
    notes: Optional[str] = None


@router.get("/team")
async def get_team(current_user=Depends(get_current_user)):
    """Hole das Team/Downline des Nutzers."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("team_members")
        .select("*")
        .eq("user_id", user_id)
        .order("level")
        .order("member_name")
        .execute()
    )

    return {"team": result.data or []}


@router.get("/team/stats")
async def get_team_stats(current_user=Depends(get_current_user)) -> TeamStats:
    """Aggregierte Team-Statistiken."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    team = (
        supabase.table("team_members")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    members: List[Dict[str, Any]] = team.data or []

    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    direct = [
        m for m in members if m.get("level") == 1 or m.get("sponsor_id") is None
    ]
    active = [m for m in members if m.get("status") == "active"]
    inactive = [m for m in members if m.get("status") == "inactive"]

    def _parse_joined_at(member: Dict[str, Any]) -> Optional[date]:
        joined_at = member.get("joined_at")
        if isinstance(joined_at, date):
            return joined_at
        if isinstance(joined_at, str):
            try:
                return date.fromisoformat(joined_at)
            except ValueError:
                return None
        return None

    new_week = [
        m for m in members if (_parse_joined_at(m) or date.min) >= week_ago
    ]
    new_month = [
        m for m in members if (_parse_joined_at(m) or date.min) >= month_ago
    ]

    total_gv = sum(float(m.get("group_volume") or 0) for m in members)

    return TeamStats(
        total_team=len(members),
        direct_partners=len(direct),
        active_members=len(active),
        inactive_members=len(inactive),
        new_this_week=len(new_week),
        new_this_month=len(new_month),
        total_group_volume=total_gv,
    )


@router.post("/team")
async def add_team_member(
    member: TeamMemberCreate, current_user=Depends(get_current_user)
):
    """Füge ein Teammitglied hinzu."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    level = 1
    if member.sponsor_id:
        sponsor = (
            supabase.table("team_members")
            .select("level")
            .eq("id", member.sponsor_id)
            .single()
            .execute()
        )
        if sponsor.data:
            level = (sponsor.data.get("level") or 0) + 1
        else:
            raise HTTPException(
                status_code=404, detail="Sponsor nicht gefunden"
            )

    member_data = {
        "user_id": user_id,
        "member_name": member.member_name,
        "member_email": member.member_email,
        "member_phone": member.member_phone,
        "sponsor_id": member.sponsor_id,
        "level": level,
        "rank": member.rank,
        "status": member.status,
        "joined_at": member.joined_at.isoformat()
        if member.joined_at
        else date.today().isoformat(),
        "created_at": datetime.now().isoformat(),
    }

    result = supabase.table("team_members").insert(member_data).execute()

    return {"success": True, "member": result.data[0] if result.data else None}


@router.post("/convert-lead")
async def convert_lead_to_partner(
    data: LeadConversion, current_user=Depends(get_current_user)
):
    """Convert a lead to a team partner (placeholder, replace with Supabase logic)."""
    user_id = _extract_user_id(current_user)
    try:
        team_member = {
            "user_id": user_id,
            "name": "Lead Name",
            "email": "lead@email.com",
            "leg": data.leg,
            "rank_id": data.rank,
            "personal_credits": data.personal_credits,
            "joined_at": datetime.now().isoformat(),
            "is_active": True,
            "notes": data.notes,
            "source": "lead_conversion",
            "original_lead_id": data.lead_id,
        }
        # TODO: Insert into team_members and update lead status in Supabase
        return {
            "success": True,
            "message": "Lead erfolgreich zu Partner konvertiert",
            "team_member": team_member,
        }
    except Exception as exc:  # pragma: no cover - defensive
        return {"success": False, "error": str(exc)}


@router.get("/rank-progress")
async def get_rank_progress(current_user=Depends(get_current_user)):
    """Status des Rang-Fortschritts."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    settings = (
        supabase.table("user_settings")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not settings.data:
        return {
            "current_rank": "Starter",
            "next_rank": None,
            "progress_percent": 0,
            "requirements": [],
        }

    user_settings = settings.data
    current_rank = user_settings.get("current_rank", "Starter")
    pv = float(user_settings.get("personal_volume_monthly") or 0)
    gv = float(user_settings.get("team_volume_monthly") or 0)

    ranks = (
        supabase.table("rank_definitions")
        .select("*")
        .eq("user_id", user_id)
        .order("rank_order")
        .execute()
    )

    rank_list: List[Dict[str, Any]] = ranks.data or []

    current_rank_data = None
    next_rank_data = None

    for i, rank in enumerate(rank_list):
        if rank["rank_name"] == current_rank:
            current_rank_data = rank
            if i + 1 < len(rank_list):
                next_rank_data = rank_list[i + 1]
            break

    if not next_rank_data:
        return {
            "current_rank": current_rank,
            "next_rank": None,
            "progress_percent": 100,
            "requirements": [],
            "message": "Du hast den höchsten Rang erreicht! 🏆",
        }

    requirements = []
    total_progress = 0

    if next_rank_data.get("pv_required"):
        pv_req = float(next_rank_data["pv_required"])
        pv_progress = min(100, (pv / pv_req) * 100) if pv_req > 0 else 100
        requirements.append(
            {
                "name": "Personal Volume",
                "current": pv,
                "required": pv_req,
                "progress": pv_progress,
                "met": pv >= pv_req,
            }
        )
        total_progress += pv_progress

    if next_rank_data.get("gv_required"):
        gv_req = float(next_rank_data["gv_required"])
        gv_progress = min(100, (gv / gv_req) * 100) if gv_req > 0 else 100
        requirements.append(
            {
                "name": "Group Volume",
                "current": gv,
                "required": gv_req,
                "progress": gv_progress,
                "met": gv >= gv_req,
            }
        )
        total_progress += gv_progress

    avg_progress = total_progress / len(requirements) if requirements else 0

    return {
        "current_rank": current_rank,
        "next_rank": next_rank_data["rank_name"],
        "progress_percent": round(avg_progress, 1),
        "requirements": requirements,
        "bonus_at_next_rank": next_rank_data.get("bonus_percent"),
    }


@router.get("/compensation-estimate")
async def get_compensation_estimate(current_user=Depends(get_current_user)):
    """Einfache Provisionsschätzung."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    settings = (
        supabase.table("user_settings")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not settings.data:
        return {
            "personal_volume": 0,
            "team_volume": 0,
            "estimated_commission": 0,
            "breakdown": [],
        }

    pv = float(settings.data.get("personal_volume_monthly") or 0)
    gv = float(settings.data.get("team_volume_monthly") or 0)
    current_rank = settings.data.get("current_rank", "Starter")

    rank = (
        supabase.table("rank_definitions")
        .select("bonus_percent")
        .eq("user_id", user_id)
        .eq("rank_name", current_rank)
        .single()
        .execute()
    )

    bonus_percent = (
        float(rank.data.get("bonus_percent") or 5) if rank.data else 5
    )

    personal_commission = pv * 0.25
    team_commission = gv * (bonus_percent / 100)
    total = personal_commission + team_commission

    return {
        "personal_volume": pv,
        "team_volume": gv,
        "estimated_commission": round(total, 2),
        "breakdown": [
            {"name": "Personal (25%)", "amount": round(personal_commission, 2)},
            {"name": f"Team ({bonus_percent}%)", "amount": round(team_commission, 2)},
        ],
        "current_rank": current_rank,
        "rank_bonus_percent": bonus_percent,
    }


@router.get("/tree")
async def get_team_tree(current_user=Depends(get_current_user)):
    """Hole die Teamstruktur als Baum."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    team = (
        supabase.table("team_members")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    members: List[Dict[str, Any]] = team.data or []

    def build_tree(parent_id=None):
        children = []
        for member in members:
            if member.get("sponsor_id") == parent_id:
                node = {
                    "id": member["id"],
                    "name": member["member_name"],
                    "rank": member.get("rank", "Starter"),
                    "status": member.get("status", "active"),
                    "pv": float(member.get("personal_volume") or 0),
                    "gv": float(member.get("group_volume") or 0),
                    "children": build_tree(member["id"]),
                }
                children.append(node)
        return children

    direct = [
        m for m in members if m.get("sponsor_id") is None or m.get("level") == 1
    ]

    tree = []
    for member in direct:
        tree.append(
            {
                "id": member["id"],
                "name": member["member_name"],
                "rank": member.get("rank", "Starter"),
                "status": member.get("status", "active"),
                "pv": float(member.get("personal_volume") or 0),
                "gv": float(member.get("group_volume") or 0),
                "children": build_tree(member["id"]),
            }
        )

    return {"tree": tree, "total_members": len(members)}


@router.post("/setup")
async def setup_network(data: NetworkSetup, user=Depends(get_current_user)):
    """Initial setup from onboarding flow (Mock placeholder)."""
    return {
        "success": True,
        "message": "Network settings saved",
        "data": data.dict(),
    }


@router.get("/settings")
async def get_network_settings(user=Depends(get_current_user)):
    """Get user's network settings (Mock placeholder)."""
    return {
        "current_rank": 4,
        "pcp": 8,
        "personal_credits": 45,
        "left_leg_credits": 380,
        "right_leg_credits": 240,
        "z4f_customers": 2,
        "company": "zinzino",
    }


@router.put("/settings")
async def update_network_settings(data: NetworkSetup, user=Depends(get_current_user)):
    """Update network settings manually (Mock placeholder)."""
    return {"success": True, "message": "Settings updated", "data": data.dict()}


@router.post("/import")
async def import_team_csv(data: ImportRequest, user=Depends(get_current_user)):
    """Import team members from CSV (Mock placeholder)."""
    try:
        imported = 0
        errors = []

        for member in data.team_members:
            if not member.name:
                errors.append("Zeile übersprungen: Kein Name")
                continue
            imported += 1

        return {"success": len(errors) == 0, "imported": imported, "errors": errors}
    except Exception as e:  # pragma: no cover - defensive
        return {"success": False, "imported": 0, "errors": [str(e)]}


@router.get("/has-setup")
async def check_has_setup(user=Depends(get_current_user)):
    """Check if user has completed network setup (Mock placeholder)."""
    return {"has_setup": False}

