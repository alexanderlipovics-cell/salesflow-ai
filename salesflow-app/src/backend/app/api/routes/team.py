"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TEAM API v2                                                               ║
║  /api/v2/team/* Endpoints                                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Team Management für Network Marketing:
- Team-Mitglieder verwalten
- Onboarding tracken
- Team-Performance analysieren

Endpoints:
- GET / - Alle Team-Mitglieder
- POST / - Mitglied hinzufügen
- GET /{id} - Mitglied Details
- PATCH /{id} - Mitglied aktualisieren
- DELETE /{id} - Mitglied entfernen
- GET /stats - Team Statistiken
- POST /{id}/invite - Einladung senden
"""

from typing import Optional, List
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr
from supabase import Client
import uuid

from ...db.deps import get_db, get_current_user, CurrentUser


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/team", tags=["team"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class TeamMemberCreate(BaseModel):
    """Schema für Team-Mitglied erstellen."""
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    
    role: str = Field(default="partner")
    custom_role: Optional[str] = None
    rank_level: int = Field(default=1, ge=1, le=20)
    
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class TeamMemberUpdate(BaseModel):
    """Schema für Team-Mitglied aktualisieren."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    
    role: Optional[str] = None
    custom_role: Optional[str] = None
    rank_level: Optional[int] = None
    status: Optional[str] = None
    
    personal_volume: Optional[float] = None
    group_volume: Optional[float] = None
    qualification_status: Optional[str] = None
    
    monthly_goal: Optional[float] = None
    disc_type: Optional[str] = None
    preferred_channel: Optional[str] = None
    
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class TeamMemberResponse(BaseModel):
    """Response Schema für Team-Mitglied."""
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    
    role: str
    custom_role: Optional[str] = None
    rank_level: int
    status: str
    
    personal_volume: float = 0
    group_volume: float = 0
    qualification_status: Optional[str] = None
    
    onboarding_step: int = 0
    onboarding_completed: bool = False
    
    last_activity_at: Optional[datetime] = None
    activities_this_week: int = 0
    activities_this_month: int = 0
    
    monthly_goal: Optional[float] = None
    monthly_achieved: float = 0
    streak_days: int = 0
    total_recruits: int = 0
    total_customers: int = 0
    
    disc_type: Optional[str] = None
    preferred_channel: Optional[str] = None
    
    notes: Optional[str] = None
    tags: List[str] = []
    
    joined_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class TeamListResponse(BaseModel):
    """Response für Team-Liste."""
    members: List[TeamMemberResponse]
    total: int
    page: int
    page_size: int


class TeamStatsResponse(BaseModel):
    """Team Statistiken."""
    total_members: int
    active_members: int
    inactive_members: int
    onboarding_members: int
    
    total_personal_volume: float
    total_group_volume: float
    
    avg_activities_per_member: float
    top_performers: List[dict]
    
    by_role: dict
    by_status: dict


class InviteRequest(BaseModel):
    """Request für Einladung."""
    channel: str = Field(
        default="email",
        pattern="^(email|whatsapp|sms)$"
    )
    custom_message: Optional[str] = None


class InviteResponse(BaseModel):
    """Response für Einladung."""
    success: bool
    channel: str
    message: str


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=TeamListResponse)
async def list_team_members(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Liste aller Team-Mitglieder.
    
    ## Filter
    
    - `status`: pending_invite, onboarding, active, inactive, churned
    - `role`: partner, associate, manager, director, diamond, etc.
    - `search`: Suche in Name, Email
    """
    query = db.table("team_members").select("*", count="exact").eq(
        "leader_id", current_user.id
    )
    
    if status:
        query = query.eq("status", status)
    if role:
        query = query.eq("role", role)
    if search:
        query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%")
    
    offset = (page - 1) * page_size
    query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)
    
    result = query.execute()
    
    members = [TeamMemberResponse(**m) for m in result.data]
    total = result.count or len(members)
    
    return TeamListResponse(
        members=members,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=TeamMemberResponse, status_code=201)
async def create_team_member(
    payload: TeamMemberCreate,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Fügt ein neues Team-Mitglied hinzu.
    """
    member_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    data = {
        "id": member_id,
        "leader_id": current_user.id,
        "status": "pending_invite",
        **payload.model_dump(exclude_unset=True),
        "joined_at": now,
        "created_at": now,
        "updated_at": now,
    }
    
    result = db.table("team_members").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Mitglied konnte nicht erstellt werden")
    
    return TeamMemberResponse(**result.data[0])


@router.get("/{member_id}", response_model=TeamMemberResponse)
async def get_team_member(
    member_id: str,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt ein einzelnes Team-Mitglied zurück.
    """
    result = db.table("team_members").select("*").eq(
        "id", member_id
    ).eq("leader_id", current_user.id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    
    return TeamMemberResponse(**result.data)


@router.patch("/{member_id}", response_model=TeamMemberResponse)
async def update_team_member(
    member_id: str,
    payload: TeamMemberUpdate,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Aktualisiert ein Team-Mitglied.
    """
    existing = db.table("team_members").select("id").eq(
        "id", member_id
    ).eq("leader_id", current_user.id).single().execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    
    update_data = payload.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    # Onboarding Status tracken
    if "onboarding_step" in update_data:
        if update_data["onboarding_step"] >= 5:  # Annahme: 5 Steps
            update_data["onboarding_completed"] = True
            update_data["onboarding_completed_at"] = datetime.utcnow().isoformat()
            update_data["status"] = "active"
    
    result = db.table("team_members").update(update_data).eq(
        "id", member_id
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Update fehlgeschlagen")
    
    return TeamMemberResponse(**result.data[0])


@router.delete("/{member_id}", status_code=204)
async def delete_team_member(
    member_id: str,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Entfernt ein Team-Mitglied.
    """
    result = db.table("team_members").delete().eq(
        "id", member_id
    ).eq("leader_id", current_user.id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    
    return None


@router.get("/stats/summary", response_model=TeamStatsResponse)
async def get_team_stats(
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt Team-Statistiken zurück.
    """
    # Alle Mitglieder laden
    result = db.table("team_members").select("*").eq(
        "leader_id", current_user.id
    ).execute()
    
    members = result.data or []
    
    # Basis Stats
    total = len(members)
    active = len([m for m in members if m.get("status") == "active"])
    inactive = len([m for m in members if m.get("status") == "inactive"])
    onboarding = len([m for m in members if m.get("status") == "onboarding"])
    
    # Volumes
    total_pv = sum(m.get("personal_volume", 0) or 0 for m in members)
    total_gv = sum(m.get("group_volume", 0) or 0 for m in members)
    
    # Activities
    total_activities = sum(m.get("activities_this_month", 0) or 0 for m in members)
    avg_activities = total_activities / total if total > 0 else 0
    
    # Top Performers (by personal volume)
    sorted_members = sorted(
        members,
        key=lambda m: m.get("personal_volume", 0) or 0,
        reverse=True
    )
    top_performers = [
        {
            "id": m["id"],
            "name": m["name"],
            "personal_volume": m.get("personal_volume", 0),
            "activities": m.get("activities_this_month", 0),
        }
        for m in sorted_members[:5]
    ]
    
    # By Role
    by_role = {}
    for m in members:
        role = m.get("role", "partner")
        by_role[role] = by_role.get(role, 0) + 1
    
    # By Status
    by_status = {}
    for m in members:
        status = m.get("status", "active")
        by_status[status] = by_status.get(status, 0) + 1
    
    return TeamStatsResponse(
        total_members=total,
        active_members=active,
        inactive_members=inactive,
        onboarding_members=onboarding,
        total_personal_volume=total_pv,
        total_group_volume=total_gv,
        avg_activities_per_member=round(avg_activities, 1),
        top_performers=top_performers,
        by_role=by_role,
        by_status=by_status,
    )


@router.post("/{member_id}/invite", response_model=InviteResponse)
async def send_invite(
    member_id: str,
    payload: InviteRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Sendet eine Einladung an ein Team-Mitglied.
    
    ## Kanäle
    
    - `email`: Einladung per E-Mail
    - `whatsapp`: Einladungslink per WhatsApp
    - `sms`: Einladung per SMS
    """
    member = db.table("team_members").select("*").eq(
        "id", member_id
    ).eq("leader_id", current_user.id).single().execute()
    
    if not member.data:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    
    member_data = member.data
    
    # Validierung je nach Kanal
    if payload.channel == "email" and not member_data.get("email"):
        raise HTTPException(status_code=400, detail="Keine E-Mail-Adresse hinterlegt")
    if payload.channel in ["whatsapp", "sms"] and not member_data.get("phone"):
        raise HTTPException(status_code=400, detail="Keine Telefonnummer hinterlegt")
    
    # Status updaten
    db.table("team_members").update({
        "status": "pending_invite",
        "invited_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", member_id).execute()
    
    # TODO: Hier würde die tatsächliche Einladung gesendet werden
    # z.B. über Messaging Service
    
    return InviteResponse(
        success=True,
        channel=payload.channel,
        message=f"Einladung an {member_data['name']} per {payload.channel} gesendet",
    )


@router.get("/leaderboard")
async def get_team_leaderboard(
    period: str = Query("month", pattern="^(week|month|all)$"),
    limit: int = Query(10, ge=1, le=50),
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Team Leaderboard.
    
    ## Perioden
    
    - `week`: Diese Woche
    - `month`: Dieser Monat
    - `all`: Gesamt
    """
    # Mitglieder laden
    result = db.table("team_members").select("*").eq(
        "leader_id", current_user.id
    ).eq("status", "active").execute()
    
    members = result.data or []
    
    # Nach relevanter Metrik sortieren
    if period == "week":
        sorted_members = sorted(
            members,
            key=lambda m: m.get("activities_this_week", 0) or 0,
            reverse=True
        )
    elif period == "month":
        sorted_members = sorted(
            members,
            key=lambda m: m.get("activities_this_month", 0) or 0,
            reverse=True
        )
    else:
        sorted_members = sorted(
            members,
            key=lambda m: m.get("personal_volume", 0) or 0,
            reverse=True
        )
    
    leaderboard = []
    for i, m in enumerate(sorted_members[:limit]):
        leaderboard.append({
            "rank": i + 1,
            "id": m["id"],
            "name": m["name"],
            "avatar_url": m.get("avatar_url"),
            "role": m.get("role", "partner"),
            "activities_this_week": m.get("activities_this_week", 0),
            "activities_this_month": m.get("activities_this_month", 0),
            "personal_volume": m.get("personal_volume", 0),
            "streak_days": m.get("streak_days", 0),
        })
    
    return {
        "period": period,
        "leaderboard": leaderboard,
    }

