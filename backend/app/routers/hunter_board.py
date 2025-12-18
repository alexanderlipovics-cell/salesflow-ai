from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.supabase_client import get_supabase_client
from app.core.deps import get_current_user

router = APIRouter(prefix="/hunter-board", tags=["hunter-board"])


class LeadIntelligence(BaseModel):
    id: str
    name: str
    first_name: Optional[str]
    company: Optional[str]
    position: Optional[str]

    # AI Intelligence
    ai_score: int  # 0-100
    score_trend: str  # up, down, stable
    health_status: str  # hot, warm, cold

    # Deal Info
    deal_size: Optional[float]
    win_probability: int  # 0-100

    # Activity
    last_activity: str
    days_since_contact: int

    # Next Action
    next_action: str
    next_action_type: str  # call, email, linkedin, meeting, follow_up
    urgency: str  # high, medium, low

    # Context
    tags: List[str]
    ai_insight: Optional[str]

    # Contact
    phone: Optional[str]
    email: Optional[str]
    instagram: Optional[str]
    linkedin: Optional[str]
    whatsapp: Optional[str]


class BoardStats(BaseModel):
    total_leads: int
    pipeline_value: float
    hot_leads: int
    tasks_due_today: int
    avg_response_days: float


class HunterBoardResponse(BaseModel):
    stats: BoardStats
    leads: List[LeadIntelligence]


@router.get("/data", response_model=HunterBoardResponse)
async def get_hunter_board_data(
    filter_status: Optional[str] = None,  # hot, warm, cold, all
    sort_by: str = "ai_score",  # ai_score, deal_size, days_since_contact
    limit: int = 50,
    current_user=Depends(get_current_user),
):
    """Alle Daten für das Hunter Board abrufen."""
    supabase = get_supabase_client()

    # Aktive Leads abrufen
    query = (
        supabase.table("leads")
        .select("*")
        .eq("user_id", str(current_user["id"]))
        .eq("status", "active")
    )

    if filter_status and filter_status != "all":
        query = query.eq("temperature", filter_status)

    result = query.limit(limit).execute()
    leads_raw = result.data or []

    today = datetime.now().date()
    leads_intel: List[LeadIntelligence] = []

    total_pipeline = 0.0
    hot_count = 0
    tasks_today = 0
    total_days = 0

    for lead in leads_raw:
        score = 50  # Basisscore

        # Days since contact
        last_contact = lead.get("last_contact")
        if last_contact:
            last_date = datetime.fromisoformat(last_contact.replace("Z", "")).date()
            days_since = (today - last_date).days
        else:
            days_since = 999

        # Score-Anpassungen
        if days_since > 14:
            score -= 30
        elif days_since > 7:
            score -= 15
        elif days_since < 3:
            score += 10

        temperature = lead.get("temperature", "cold")
        if temperature == "hot":
            score += 20
            hot_count += 1
        elif temperature == "warm":
            score += 10

        next_follow_up = lead.get("next_follow_up")
        follow_up_overdue = False
        if next_follow_up:
            follow_up_date = datetime.fromisoformat(next_follow_up).date()
            if follow_up_date <= today:
                follow_up_overdue = True
                tasks_today += 1
                score -= 10

        deal_size = lead.get("deal_value") or lead.get("potential_value") or 0
        total_pipeline += deal_size

        # Gewinnwahrscheinlichkeit
        if temperature == "hot" and days_since < 3:
            win_prob = 80
        elif temperature == "hot":
            win_prob = 60
        elif temperature == "warm":
            win_prob = 40
        else:
            win_prob = 15

        # Trend
        if days_since < 3 and temperature in ["hot", "warm"]:
            trend = "up"
        elif days_since > 10:
            trend = "down"
        else:
            trend = "stable"

        # Next Action
        if follow_up_overdue:
            next_action = "Follow-up überfällig!"
            action_type = "follow_up"
            urgency = "high"
        elif temperature == "hot" and days_since < 3:
            next_action = "Demo buchen / Closing"
            action_type = "meeting"
            urgency = "high"
        elif temperature == "hot":
            next_action = "Jetzt anrufen"
            action_type = "call"
            urgency = "high"
        elif temperature == "warm":
            next_action = "Nachfassen per Mail"
            action_type = "email"
            urgency = "medium"
        elif days_since > 14:
            next_action = "Re-Engagement starten"
            action_type = "email"
            urgency = "medium"
        else:
            next_action = "LinkedIn Connect"
            action_type = "linkedin"
            urgency = "low"

        last_message = lead.get("last_message", "")
        if last_message:
            last_activity = (
                f'Letzte Nachricht: "{last_message[:30]}..."'
                if len(last_message) > 30
                else f'Letzte Nachricht: "{last_message}"'
            )
        elif days_since < 999:
            last_activity = f"Kontakt vor {days_since} Tagen"
        else:
            last_activity = "Noch kein Kontakt"

        insights = []
        if temperature == "hot" and deal_size > 10000:
            insights.append("High-Value Opportunity")
        if days_since < 2 and temperature == "hot":
            insights.append("Momentum nutzen!")
        if follow_up_overdue:
            insights.append("Dringend: Follow-up überfällig")

        ai_insight = " • ".join(insights) if insights else None

        tags = []
        if lead.get("company"):
            tags.append(lead["company"][:15])
        if temperature:
            tags.append(temperature.upper())
        if deal_size > 50000:
            tags.append("High Value")

        # Score begrenzen
        score = max(0, min(100, score))

        if score >= 70:
            health = "hot"
        elif score >= 40:
            health = "warm"
        else:
            health = "cold"

        total_days += days_since if days_since < 999 else 0

        leads_intel.append(
            LeadIntelligence(
                id=lead["id"],
                name=lead.get("name", "Unbekannt"),
                first_name=lead.get("first_name"),
                company=lead.get("company"),
                position=lead.get("position"),
                ai_score=score,
                score_trend=trend,
                health_status=health,
                deal_size=deal_size,
                win_probability=win_prob,
                last_activity=last_activity,
                days_since_contact=days_since if days_since < 999 else -1,
                next_action=next_action,
                next_action_type=action_type,
                urgency=urgency,
                tags=tags,
                ai_insight=ai_insight,
                phone=lead.get("phone"),
                email=lead.get("email"),
                instagram=lead.get("instagram"),
                linkedin=lead.get("linkedin"),
                whatsapp=lead.get("whatsapp") or lead.get("phone"),
            )
        )

    if sort_by == "ai_score":
        leads_intel.sort(key=lambda x: x.ai_score, reverse=True)
    elif sort_by == "deal_size":
        leads_intel.sort(key=lambda x: x.deal_size or 0, reverse=True)
    elif sort_by == "days_since_contact":
        leads_intel.sort(
            key=lambda x: x.days_since_contact if x.days_since_contact >= 0 else 999
        )

    avg_days = total_days / len(leads_intel) if leads_intel else 0

    stats = BoardStats(
        total_leads=len(leads_intel),
        pipeline_value=total_pipeline,
        hot_leads=hot_count,
        tasks_due_today=tasks_today,
        avg_response_days=round(avg_days, 1),
    )

    return HunterBoardResponse(stats=stats, leads=leads_intel)

