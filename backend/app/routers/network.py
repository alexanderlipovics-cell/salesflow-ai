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
    """
    Holt alle Netzwerk-Daten für das Dashboard aus echten MLM-Tabellen:
    - Aktueller Rank aus mlm_downline_structure
    - PV / GV aus mlm_downline_structure
    - Team Größe aus mlm_downline_structure (Downline)
    - Erwartete Provision aus mlm_orders
    - Team Aktivität aus mlm_downline_structure
    """
    user_id = _extract_user_id(user)
    
    # 1. User's MLM Profil holen
    # Versuche zuerst nach user_id (kann mehrere Einträge haben, nimm den ersten)
    profile_result = supabase.table("mlm_downline_structure").select("*").eq(
        "user_id", user_id
    ).limit(1).execute()
    
    profile = profile_result.data[0] if profile_result.data else None
    
    if not profile:
        # Kein MLM Profil - return defaults
        return {
            "rank": "Starter",
            "rank_progress": 0,
            "next_rank": "Partner",
            "next_rank_gv_required": 100,
            "personal_volume": 0,
            "group_volume": 0,
            "team_size": 0,
            "active_partners": 0,
            "inactive_partners": 0,
            "new_this_month": 0,
            "left_credits": 0,
            "right_credits": 0,
            "balanced_credits": 0,
            "expected_commission": 0,
            "team_commission": 0,
            "cash_commission": 0,
            "recent_activity": [],
            "recruitment_pipeline": {
                "contacts": 0,
                "presentations": 0,
                "followups": 0,
                "ready_to_close": 0
            }
        }
    
    # 2. Downline (Team) holen
    my_mlm_id = profile["id"]
    
    # Direkte Downline
    downline_result = supabase.table("mlm_downline_structure").select("*").eq(
        "sponsor_id", my_mlm_id
    ).execute()
    
    downline = downline_result.data or []
    
    # Rekursiv alle Downline zählen (vereinfacht - nur 1 Level tief hier)
    total_team = len(downline)
    active_partners = len([d for d in downline if d.get("is_active", False)])
    inactive_partners = total_team - active_partners
    
    # Neue diesen Monat
    first_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = len([
        d for d in downline 
        if d.get("created_at") and 
        datetime.fromisoformat(d["created_at"].replace("Z", "+00:00")) >= first_of_month
    ])
    
    # 3. Rank Progress berechnen
    gv = profile.get("monthly_gv", 0) or 0
    current_rank = profile.get("rank", "Starter")
    
    # Zinzino-ähnliche Rank-Schwellen
    rank_thresholds = [
        ("Starter", 0),
        ("Partner", 100),
        ("Manager", 500),
        ("Bronze", 1000),
        ("Silver", 2500),
        ("Gold", 5000),
        ("Platinum", 10000),
        ("Diamond", 25000),
        ("Ambassador", 50000),
        ("Crown Ambassador", 100000),
    ]
    
    # Finde nächsten Rank
    next_rank = "Crown Ambassador"
    next_rank_gv = 100000
    rank_progress = 100
    
    for i, (rank_name, threshold) in enumerate(rank_thresholds):
        if gv < threshold:
            next_rank = rank_name
            next_rank_gv = threshold
            # Progress zum nächsten Rank
            prev_threshold = rank_thresholds[i-1][1] if i > 0 else 0
            range_size = threshold - prev_threshold
            progress_in_range = gv - prev_threshold
            rank_progress = int((progress_in_range / range_size) * 100) if range_size > 0 else 0
            break
    
    # 4. Orders diesen Monat (für Provision)
    # Prüfe ob mlm_orders Tabelle existiert, sonst verwende Fallback
    try:
        orders_result = supabase.table("mlm_orders").select("*").eq(
            "user_id", user_id
        ).gte("order_date", first_of_month.date().isoformat()).execute()
        
        orders = orders_result.data or []
        total_order_amount = sum(o.get("order_amount", 0) or 0 for o in orders)
    except Exception:
        # Falls mlm_orders nicht existiert, verwende GV als Basis
        orders = []
        total_order_amount = gv
    
    # Vereinfachte Provisions-Berechnung (10% vom GV als Beispiel)
    expected_commission = round(gv * 0.10, 2)
    
    # 5. Letzte Team-Aktivitäten
    # (Vereinfacht - könnte aus activity_log oder orders kommen)
    recent_activity = []
    
    for d in downline[:5]:  # Letzte 5
        recent_activity.append({
            "member_name": d.get("company_name", "Partner"),
            "action": "joined" if d.get("created_at") else "active",
            "timestamp": d.get("created_at"),
            "pv": d.get("monthly_pv", 0)
        })
    
    # 6. Recruitment Pipeline (aus Leads mit MLM-Status)
    leads_result = supabase.table("leads").select("status").eq(
        "user_id", user_id
    ).execute()
    
    leads = leads_result.data or []
    
    status_counts = {}
    for lead in leads:
        status = lead.get("status", "new")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    recruitment_pipeline = {
        "contacts": status_counts.get("new", 0) + status_counts.get("contacted", 0),
        "presentations": status_counts.get("engaged", 0),
        "followups": status_counts.get("meeting", 0),
        "ready_to_close": status_counts.get("qualified", 0)
    }
    
    # Binary Credits (Links/Rechts) - vereinfacht aus Downline
    # In echten MLM-Systemen würde das aus der Binary-Struktur berechnet
    left_credits = profile.get("left_credits", 0) or 0
    right_credits = profile.get("right_credits", 0) or 0
    balanced_credits = min(left_credits, right_credits) * 2
    
    return {
        "rank": current_rank,
        "rank_progress": min(rank_progress, 100),
        "next_rank": next_rank,
        "next_rank_gv_required": next_rank_gv,
        "personal_volume": profile.get("monthly_pv", 0) or 0,
        "group_volume": gv,
        "team_size": total_team,
        "active_partners": active_partners,
        "inactive_partners": inactive_partners,
        "new_this_month": new_this_month,
        "left_credits": left_credits,
        "right_credits": right_credits,
        "balanced_credits": balanced_credits,
        "expected_commission": expected_commission,
        "team_commission": round(expected_commission * 0.7, 2),
        "cash_commission": round(expected_commission * 0.3, 2),
        "recent_activity": recent_activity,
        "recruitment_pipeline": recruitment_pipeline
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
    """Holt alle Team-Mitglieder (Downline) aus mlm_downline_structure"""
    user_id = _extract_user_id(user)
    
    # User's MLM ID finden
    profile_result = supabase.table("mlm_downline_structure").select("id").eq(
        "user_id", user_id
    ).limit(1).execute()
    
    if not profile_result.data:
        return {"team": []}
    
    my_mlm_id = profile_result.data[0]["id"]
    
    # Downline holen
    query = supabase.table("mlm_downline_structure").select("*").eq(
        "sponsor_id", my_mlm_id
    )
    
    if active_only:
        query = query.eq("is_active", True)
    
    result = query.order("monthly_gv", desc=True).execute()
    
    team = []
    for member in (result.data or []):
        team.append({
            "id": member["id"],
            "name": member.get("company_name", "Partner"),
            "rank": member.get("rank", "Starter"),
            "pv": member.get("monthly_pv", 0),
            "gv": member.get("monthly_gv", 0),
            "is_active": member.get("is_active", False),
            "joined_at": member.get("created_at")
        })
    
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

