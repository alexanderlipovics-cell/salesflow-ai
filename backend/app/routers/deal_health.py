from datetime import datetime, date
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.deps import get_current_user
from ..core.deps import get_supabase


router = APIRouter(prefix="/deal-health", tags=["deal-health"])


class DealHealth(BaseModel):
    lead_id: str
    lead_name: str
    health_score: int  # 0-100
    health_status: str  # healthy, warning, critical
    days_since_contact: int
    follow_up_overdue: bool
    follow_up_days_overdue: int
    temperature: str
    warnings: List[str]
    recommendation: str


class DealHealthSummary(BaseModel):
    total_leads: int
    healthy: int
    warning: int
    critical: int
    leads: List[DealHealth]


def _parse_iso_date(value: str) -> date | None:
    """Parse ISO date strings and tolerate trailing Z values."""
    try:
        clean_value = value.replace("Z", "")
        return datetime.fromisoformat(clean_value).date()
    except Exception:
        return None


@router.get("/check", response_model=DealHealthSummary)
async def check_deal_health(current_user=Depends(get_current_user)):
    """Check health of all active deals."""
    supabase = get_supabase()

    result = (
        supabase.table("leads")
        .select("*")
        .eq("user_id", str(current_user["id"]))
        .eq("status", "active")
        .execute()
    )

    leads = result.data or []
    health_results: List[DealHealth] = []

    today = datetime.now().date()

    for lead in leads:
        warnings: List[str] = []
        score = 100

        last_contact = lead.get("last_contact")
        last_contact_date = _parse_iso_date(last_contact) if last_contact else None
        if last_contact_date:
            days_since = (today - last_contact_date).days
        else:
            days_since = 999  # never contacted

        next_follow_up = lead.get("next_follow_up")
        follow_up_overdue = False
        follow_up_days_overdue = 0

        if next_follow_up:
            follow_up_date = _parse_iso_date(next_follow_up)
            if follow_up_date and follow_up_date < today:
                follow_up_overdue = True
                follow_up_days_overdue = (today - follow_up_date).days

        temperature = lead.get("temperature", "cold")

        # Days since contact penalty
        if days_since > 14:
            score -= 40
            warnings.append(f"⚠️ Kein Kontakt seit {days_since} Tagen!")
        elif days_since > 7:
            score -= 20
            warnings.append(f"⏰ {days_since} Tage seit letztem Kontakt")
        elif days_since > 3:
            score -= 10

        # Follow-up overdue penalty
        if follow_up_overdue:
            if follow_up_days_overdue > 7:
                score -= 30
                warnings.append(f"🔴 Follow-up {follow_up_days_overdue} Tage überfällig!")
            elif follow_up_days_overdue > 3:
                score -= 20
                warnings.append(f"⚠️ Follow-up {follow_up_days_overdue} Tage überfällig")
            else:
                score -= 10
                warnings.append("📅 Follow-up überfällig")

        # Temperature bonus/penalty
        if temperature == "hot":
            score += 10
            if days_since > 3:
                warnings.append("🔥 Heißer Lead braucht schnelle Reaktion!")
        elif temperature == "cold" and days_since > 7:
            score -= 10
            warnings.append("❄️ Kalter Lead droht zu erkalten")

        # No message sent yet
        if not lead.get("last_message"):
            score -= 20
            warnings.append("📝 Noch keine Nachricht gesendet")

        score = max(0, min(100, score))

        if score >= 70:
            status = "healthy"
            recommendation = "Alles gut! Weiter so."
        elif score >= 40:
            status = "warning"
            recommendation = "Kontaktiere diesen Lead bald."
        else:
            status = "critical"
            recommendation = "DRINGEND: Dieser Deal braucht sofortige Aufmerksamkeit!"

        health_results.append(
            DealHealth(
                lead_id=str(lead.get("id", "")),
                lead_name=lead.get("name", "Unbekannt"),
                health_score=score,
                health_status=status,
                days_since_contact=days_since,
                follow_up_overdue=follow_up_overdue,
                follow_up_days_overdue=follow_up_days_overdue,
                temperature=temperature,
                warnings=warnings,
                recommendation=recommendation,
            )
        )

    health_results.sort(key=lambda x: x.health_score)

    healthy = len([h for h in health_results if h.health_status == "healthy"])
    warning = len([h for h in health_results if h.health_status == "warning"])
    critical = len([h for h in health_results if h.health_status == "critical"])

    return DealHealthSummary(
        total_leads=len(health_results),
        healthy=healthy,
        warning=warning,
        critical=critical,
        leads=health_results,
    )


@router.get("/alerts")
async def get_health_alerts(current_user=Depends(get_current_user)):
    """Get only critical and warning alerts for notifications."""
    health = await check_deal_health(current_user=current_user)

    alerts = []
    for lead in health.leads:
        if lead.health_status in ["critical", "warning"]:
            alerts.append(
                {
                    "lead_id": lead.lead_id,
                    "lead_name": lead.lead_name,
                    "status": lead.health_status,
                    "score": lead.health_score,
                    "main_warning": lead.warnings[0] if lead.warnings else None,
                    "recommendation": lead.recommendation,
                }
            )

    return {"alerts": alerts, "count": len(alerts)}

