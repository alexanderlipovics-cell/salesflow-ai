"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TEAM LEADER API ROUTES                                                    ║
║  Dashboard & Tools für Uplines und Team Manager                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET  /team                    → Team-Übersicht
- GET  /team/dashboard          → Performance-Dashboard
- GET  /team/members/{id}       → Member-Details
- GET  /team/alerts             → Alerts (Attention Needed)
- POST /team/members/{id}/nudge → Team-Member pushen
- GET  /team/agenda             → Meeting-Agenda generieren
- GET  /team/templates          → Team-weite Success-Templates
- POST /team/templates/share    → Template ans Team teilen
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta, date
import logging

from ...db.deps import get_db, get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...config.prompts.chief_team_leader import (
    TeamMember,
    TeamPerformance,
    TeamAlert,
    AlertPriority,
    generate_team_dashboard,
    generate_member_analysis,
    generate_team_alerts,
    generate_meeting_agenda,
    generate_coaching_suggestion,
    extract_success_patterns,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/team", tags=["team-leader"])


# =============================================================================
# Pydantic Models
# =============================================================================

class TeamMemberResponse(BaseModel):
    """Team-Member Response."""
    id: str
    name: str
    email: str
    role: str
    joined_at: str
    is_active: bool
    last_active_at: Optional[str]
    level: str
    outreach_today: int
    outreach_week: int
    follow_ups_due: int
    conversion_rate: float
    streak_days: int
    needs_attention: bool
    attention_reason: Optional[str]


class TeamDashboardResponse(BaseModel):
    """Team-Dashboard Response."""
    total_members: int
    active_today: int
    total_outreach_today: int
    total_outreach_week: int
    team_conversion_rate: float
    top_performer: Optional[dict]
    needs_attention: List[dict]
    team_momentum: str
    dashboard_text: str


class MemberDetailResponse(BaseModel):
    """Detaillierte Member-Infos."""
    id: str
    name: str
    email: str
    role: str
    level: str
    stats: dict
    activity_log: List[dict]
    coaching_suggestions: List[str]
    next_actions: List[str]
    analysis_text: str


class TeamAlertResponse(BaseModel):
    """Team Alert."""
    id: str
    member_id: str
    member_name: str
    priority: str
    alert_type: str
    message: str
    action: str
    created_at: str


class NudgeRequest(BaseModel):
    """Request zum Pushen eines Team-Members."""
    nudge_type: str = Field(..., description="gentle, direct, motivational")
    custom_message: Optional[str] = None


class NudgeResponse(BaseModel):
    """Nudge Response."""
    success: bool
    message_sent: str
    nudge_type: str
    member_id: str


class MeetingAgendaResponse(BaseModel):
    """Meeting-Agenda Response."""
    meeting_date: str
    team_summary: str
    agenda_items: List[dict]
    wins_to_celebrate: List[str]
    challenges_to_address: List[str]
    focus_for_next_week: str
    agenda_text: str


class TeamTemplateResponse(BaseModel):
    """Team-Template Response."""
    id: str
    title: str
    template_type: str
    content: str
    created_by: str
    success_rate: float
    used_count: int
    tags: List[str]


class ShareTemplateRequest(BaseModel):
    """Request zum Teilen eines Templates."""
    template_id: str
    message: Optional[str] = None


# =============================================================================
# Helper Functions
# =============================================================================

def _is_team_leader(user) -> bool:
    """Prüft ob User Team-Leader-Rechte hat."""
    return user.role in ["team_leader", "upline", "manager", "admin"]


async def _get_team_members(supabase, team_id: str) -> List[TeamMember]:
    """Lädt alle Team-Mitglieder."""
    result = supabase.table("users").select(
        "id, name, email, role, created_at, last_active_at, level"
    ).eq("team_id", team_id).execute()
    
    members = []
    for data in (result.data or []):
        # Stats für Member laden
        user_id = data["id"]
        today = date.today().isoformat()
        week_ago = (date.today() - timedelta(days=7)).isoformat()
        
        outreach_today = supabase.table("outreach_messages").select(
            "id", count="exact"
        ).eq("user_id", user_id).gte("created_at", today).execute()
        
        outreach_week = supabase.table("outreach_messages").select(
            "id", count="exact"
        ).eq("user_id", user_id).gte("created_at", week_ago).execute()
        
        followups_due = supabase.table("followups").select(
            "id", count="exact"
        ).eq("user_id", user_id).lte("due_at", datetime.utcnow().isoformat()).execute()
        
        # Conversion berechnen
        total_outreach = supabase.table("outreach_messages").select(
            "id", count="exact"
        ).eq("user_id", user_id).execute()
        
        converted = supabase.table("outreach_messages").select(
            "id", count="exact"
        ).eq("user_id", user_id).eq("status", "converted").execute()
        
        conversion_rate = 0
        if total_outreach.count and total_outreach.count > 0:
            conversion_rate = (converted.count or 0) / total_outreach.count
        
        # Streak berechnen (vereinfacht)
        streak = supabase.table("user_streaks").select(
            "current_streak"
        ).eq("user_id", user_id).single().execute()
        streak_days = streak.data.get("current_streak", 0) if streak.data else 0
        
        # Attention needed?
        is_inactive = False
        attention_reason = None
        
        if data.get("last_active_at"):
            last_active = datetime.fromisoformat(data["last_active_at"].replace("Z", "+00:00"))
            if (datetime.utcnow() - last_active.replace(tzinfo=None)).days > 2:
                is_inactive = True
                attention_reason = f"Seit {(datetime.utcnow() - last_active.replace(tzinfo=None)).days} Tagen inaktiv"
        
        if followups_due.count and followups_due.count > 5:
            is_inactive = True
            attention_reason = f"{followups_due.count} überfällige Follow-ups"
        
        members.append(TeamMember(
            id=user_id,
            name=data.get("name", "Unknown"),
            email=data.get("email", ""),
            role=data.get("role", "member"),
            joined_at=data.get("created_at", ""),
            is_active=not is_inactive,
            last_active_at=data.get("last_active_at"),
            level=data.get("level", "starter"),
            outreach_today=outreach_today.count or 0,
            outreach_week=outreach_week.count or 0,
            follow_ups_due=followups_due.count or 0,
            conversion_rate=conversion_rate,
            streak_days=streak_days,
            needs_attention=is_inactive,
            attention_reason=attention_reason,
        ))
    
    return members


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/", response_model=List[TeamMemberResponse])
async def list_team_members(
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Liste aller Team-Mitglieder.
    
    Nur für Team-Leader/Uplines/Manager.
    """
    if not _is_team_leader(current_user):
        raise HTTPException(status_code=403, detail="Nur für Team-Leader")
    
    team_id = current_user.team_id
    if not team_id:
        return []
    
    members = await _get_team_members(supabase, team_id)
    
    return [
        TeamMemberResponse(
            id=m.id,
            name=m.name,
            email=m.email,
            role=m.role,
            joined_at=m.joined_at,
            is_active=m.is_active,
            last_active_at=m.last_active_at,
            level=m.level,
            outreach_today=m.outreach_today,
            outreach_week=m.outreach_week,
            follow_ups_due=m.follow_ups_due,
            conversion_rate=m.conversion_rate,
            streak_days=m.streak_days,
            needs_attention=m.needs_attention,
            attention_reason=m.attention_reason,
        )
        for m in members
    ]


@router.get("/dashboard", response_model=TeamDashboardResponse)
async def get_team_dashboard(
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Team-Performance Dashboard.
    
    Zeigt:
    - Aggregierte Metriken
    - Top-Performer
    - Members die Attention brauchen
    - Team-Momentum
    """
    if not _is_team_leader(current_user):
        raise HTTPException(status_code=403, detail="Nur für Team-Leader")
    
    team_id = current_user.team_id
    if not team_id:
        return TeamDashboardResponse(
            total_members=0,
            active_today=0,
            total_outreach_today=0,
            total_outreach_week=0,
            team_conversion_rate=0,
            top_performer=None,
            needs_attention=[],
            team_momentum="Kein Team",
            dashboard_text="Noch kein Team eingerichtet.",
        )
    
    members = await _get_team_members(supabase, team_id)
    
    if not members:
        return TeamDashboardResponse(
            total_members=0,
            active_today=0,
            total_outreach_today=0,
            total_outreach_week=0,
            team_conversion_rate=0,
            top_performer=None,
            needs_attention=[],
            team_momentum="Leeres Team",
            dashboard_text="Noch keine Team-Mitglieder.",
        )
    
    # Aggregate berechnen
    total_outreach_today = sum(m.outreach_today for m in members)
    total_outreach_week = sum(m.outreach_week for m in members)
    active_today = len([m for m in members if m.outreach_today > 0])
    
    total_conversion = sum(m.conversion_rate for m in members)
    team_conversion_rate = total_conversion / len(members) if members else 0
    
    # Top Performer
    top = max(members, key=lambda m: m.outreach_week)
    top_performer = {
        "id": top.id,
        "name": top.name,
        "outreach_week": top.outreach_week,
        "conversion_rate": top.conversion_rate,
    }
    
    # Needs Attention
    needs_attention = [
        {"id": m.id, "name": m.name, "reason": m.attention_reason}
        for m in members if m.needs_attention
    ]
    
    # Momentum bestimmen
    momentum = "🔥 Stark" if active_today > len(members) * 0.7 else (
        "📈 Wächst" if active_today > len(members) * 0.4 else "⚠️ Aufmerksamkeit nötig"
    )
    
    # Dashboard-Text generieren
    performance = TeamPerformance(
        members=members,
        total_outreach_today=total_outreach_today,
        total_outreach_week=total_outreach_week,
        team_conversion_rate=team_conversion_rate,
    )
    dashboard_text = generate_team_dashboard(performance)
    
    return TeamDashboardResponse(
        total_members=len(members),
        active_today=active_today,
        total_outreach_today=total_outreach_today,
        total_outreach_week=total_outreach_week,
        team_conversion_rate=team_conversion_rate,
        top_performer=top_performer,
        needs_attention=needs_attention,
        team_momentum=momentum,
        dashboard_text=dashboard_text,
    )


@router.get("/members/{member_id}", response_model=MemberDetailResponse)
async def get_member_detail(
    member_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Detaillierte Infos zu einem Team-Member.
    
    Enthält:
    - Stats & Aktivitäten
    - Coaching-Vorschläge
    - Nächste empfohlene Aktionen
    """
    if not _is_team_leader(current_user):
        raise HTTPException(status_code=403, detail="Nur für Team-Leader")
    
    # Member laden
    result = supabase.table("users").select("*").eq("id", member_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Member not found")
    
    data = result.data
    
    # Prüfen ob im gleichen Team
    if data.get("team_id") != current_user.team_id:
        raise HTTPException(status_code=403, detail="Nicht in deinem Team")
    
    # Activity Log (letzte 7 Tage)
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    activities = supabase.table("activity_log").select(
        "action, created_at, details"
    ).eq("user_id", member_id).gte("created_at", week_ago).order(
        "created_at", desc=True
    ).limit(20).execute()
    
    activity_log = [
        {
            "action": a.get("action"),
            "timestamp": a.get("created_at"),
            "details": a.get("details"),
        }
        for a in (activities.data or [])
    ]
    
    # Stats
    today = date.today().isoformat()
    outreach_today = supabase.table("outreach_messages").select(
        "id", count="exact"
    ).eq("user_id", member_id).gte("created_at", today).execute()
    
    total_outreach = supabase.table("outreach_messages").select(
        "id", count="exact"
    ).eq("user_id", member_id).execute()
    
    converted = supabase.table("outreach_messages").select(
        "id", count="exact"
    ).eq("user_id", member_id).eq("status", "converted").execute()
    
    stats = {
        "outreach_today": outreach_today.count or 0,
        "total_outreach": total_outreach.count or 0,
        "converted": converted.count or 0,
        "conversion_rate": (converted.count or 0) / (total_outreach.count or 1),
        "level": data.get("level", "starter"),
    }
    
    # Coaching Suggestions generieren
    member = TeamMember(
        id=member_id,
        name=data.get("name", "Unknown"),
        email=data.get("email", ""),
        role=data.get("role", "member"),
        level=data.get("level", "starter"),
        outreach_today=stats["outreach_today"],
        conversion_rate=stats["conversion_rate"],
    )
    coaching = generate_coaching_suggestion(member)
    
    # Analysis Text
    analysis = generate_member_analysis(member)
    
    return MemberDetailResponse(
        id=member_id,
        name=data.get("name", "Unknown"),
        email=data.get("email", ""),
        role=data.get("role", "member"),
        level=data.get("level", "starter"),
        stats=stats,
        activity_log=activity_log,
        coaching_suggestions=coaching.get("suggestions", []),
        next_actions=coaching.get("next_actions", []),
        analysis_text=analysis,
    )


@router.get("/alerts", response_model=List[TeamAlertResponse])
async def get_team_alerts(
    priority: Optional[str] = Query(None, description="critical, high, medium, low"),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Team-Alerts: Members die Aufmerksamkeit brauchen.
    
    Alert-Typen:
    - inactivity: Keine Aktivität seit X Tagen
    - overdue_followups: Zu viele überfällige Follow-ups
    - dropping_performance: Leistung sinkt
    - streak_broken: Streak unterbrochen
    """
    if not _is_team_leader(current_user):
        raise HTTPException(status_code=403, detail="Nur für Team-Leader")
    
    team_id = current_user.team_id
    if not team_id:
        return []
    
    members = await _get_team_members(supabase, team_id)
    alerts = generate_team_alerts(members)
    
    # Filter nach Priorität
    if priority:
        try:
            prio = AlertPriority(priority)
            alerts = [a for a in alerts if a.priority == prio]
        except ValueError:
            pass
    
    return [
        TeamAlertResponse(
            id=f"alert-{a.member_id}-{a.alert_type}",
            member_id=a.member_id,
            member_name=a.member_name,
            priority=a.priority.value,
            alert_type=a.alert_type,
            message=a.message,
            action=a.suggested_action,
            created_at=datetime.utcnow().isoformat(),
        )
        for a in alerts
    ]


@router.post("/members/{member_id}/nudge", response_model=NudgeResponse)
async def nudge_member(
    member_id: str,
    data: NudgeRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Schickt einen Nudge/Push an ein Team-Mitglied.
    
    Nudge-Types:
    - gentle: Freundliche Erinnerung
    - direct: Direkter Push mit Erwartung
    - motivational: Motivation & Ermutigung
    """
    if not _is_team_leader(current_user):
        raise HTTPException(status_code=403, detail="Nur für Team-Leader")
    
    # Member laden
    result = supabase.table("users").select("name, email, team_id").eq(
        "id", member_id
    ).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if result.data.get("team_id") != current_user.team_id:
        raise HTTPException(status_code=403, detail="Nicht in deinem Team")
    
    member_name = result.data.get("name", "Team-Member")
    
    # Nudge-Nachricht generieren
    nudge_templates = {
        "gentle": f"Hey {member_name}! 👋 Wollte kurz checken ob alles okay ist. Lass mich wissen wenn du Support brauchst!",
        "direct": f"Hey {member_name}, mir ist aufgefallen dass du heute noch nichts geloggt hast. Lass uns zusammen schauen was dich blockiert.",
        "motivational": f"Hey {member_name}! 🚀 Du hast letzte Woche mega abgeliefert. Ich weiß du kannst das wieder schaffen - was hält dich gerade ab?",
    }
    
    message = data.custom_message or nudge_templates.get(
        data.nudge_type, nudge_templates["gentle"]
    )
    
    # Nudge loggen
    supabase.table("team_nudges").insert({
        "from_user_id": str(current_user.id),
        "to_user_id": member_id,
        "nudge_type": data.nudge_type,
        "message": message,
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
    
    # TODO: Notification an Member senden
    
    return NudgeResponse(
        success=True,
        message_sent=message,
        nudge_type=data.nudge_type,
        member_id=member_id,
    )


@router.get("/agenda", response_model=MeetingAgendaResponse)
async def get_meeting_agenda(
    meeting_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Generiert eine Meeting-Agenda für das Team.
    
    Enthält:
    - Team-Summary der Woche
    - Agenda-Punkte
    - Wins zum Feiern
    - Challenges
    - Fokus für nächste Woche
    """
    if not _is_team_leader(current_user):
        raise HTTPException(status_code=403, detail="Nur für Team-Leader")
    
    team_id = current_user.team_id
    if not team_id:
        raise HTTPException(status_code=400, detail="Kein Team")
    
    members = await _get_team_members(supabase, team_id)
    
    if not members:
        raise HTTPException(status_code=400, detail="Keine Team-Mitglieder")
    
    # Meeting-Datum
    if meeting_date:
        m_date = meeting_date
    else:
        m_date = date.today().isoformat()
    
    # Performance für die Woche
    performance = TeamPerformance(
        members=members,
        total_outreach_today=sum(m.outreach_today for m in members),
        total_outreach_week=sum(m.outreach_week for m in members),
        team_conversion_rate=sum(m.conversion_rate for m in members) / len(members),
    )
    
    agenda = generate_meeting_agenda(performance, m_date)
    
    return MeetingAgendaResponse(
        meeting_date=m_date,
        team_summary=agenda.get("summary", ""),
        agenda_items=agenda.get("items", []),
        wins_to_celebrate=agenda.get("wins", []),
        challenges_to_address=agenda.get("challenges", []),
        focus_for_next_week=agenda.get("focus", ""),
        agenda_text=agenda.get("full_text", ""),
    )


@router.get("/templates", response_model=List[TeamTemplateResponse])
async def get_team_templates(
    template_type: Optional[str] = Query(None, description="dm, followup, objection, etc."),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Team-weite Success-Templates.
    
    Templates die von Top-Performern geteilt wurden.
    """
    if not _is_team_leader(current_user):
        raise HTTPException(status_code=403, detail="Nur für Team-Leader")
    
    team_id = current_user.team_id
    if not team_id:
        return []
    
    query = supabase.table("team_templates").select(
        "*, creator:users(name)"
    ).eq("team_id", team_id).eq("is_active", True)
    
    if template_type:
        query = query.eq("template_type", template_type)
    
    result = query.order("success_rate", desc=True).execute()
    
    return [
        TeamTemplateResponse(
            id=t.get("id"),
            title=t.get("title", "Unbenannt"),
            template_type=t.get("template_type", "other"),
            content=t.get("content", ""),
            created_by=t.get("creator", {}).get("name", "Unknown") if t.get("creator") else "Unknown",
            success_rate=t.get("success_rate", 0),
            used_count=t.get("used_count", 0),
            tags=t.get("tags", []),
        )
        for t in (result.data or [])
    ]


@router.post("/templates/share")
async def share_template(
    data: ShareTemplateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Teilt ein eigenes Template ans Team.
    """
    user_id = str(current_user.id)
    team_id = current_user.team_id
    
    if not team_id:
        raise HTTPException(status_code=400, detail="Kein Team")
    
    # Template laden
    result = supabase.table("templates").select("*").eq(
        "id", data.template_id
    ).eq("user_id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = result.data
    
    # Ans Team teilen
    supabase.table("team_templates").insert({
        "team_id": team_id,
        "original_template_id": data.template_id,
        "title": template.get("title"),
        "template_type": template.get("template_type", "other"),
        "content": template.get("content"),
        "created_by": user_id,
        "success_rate": template.get("success_rate", 0),
        "tags": template.get("tags", []),
        "share_message": data.message,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
    
    return {
        "success": True,
        "message": f"Template '{template.get('title')}' ans Team geteilt!",
    }

