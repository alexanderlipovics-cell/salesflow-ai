"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ALERTS API v2                                                              ║
║  /api/v2/alerts/* Endpoints                                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET /contact/{id} - Alerts für einen Kontakt
- GET /team - Team-Übersicht mit Alerts
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.alerts import PredictiveAlertEngine, analyze_team


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/alerts", tags=["alerts", "predictive"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class AlertResponse(BaseModel):
    """Ein einzelner Alert."""
    type: str
    severity: str
    title: str
    message: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    action_required: bool = False
    suggested_action: Optional[str] = None
    deadline: Optional[str] = None
    confidence: float = 0.0
    data: dict = Field(default_factory=dict)


class ContactAlertsResponse(BaseModel):
    """Alerts für einen Kontakt."""
    contact_id: str
    contact_name: Optional[str] = None
    alerts: List[AlertResponse] = Field(default_factory=list)
    total_alerts: int = 0
    critical_count: int = 0
    high_count: int = 0
    warning_count: int = 0
    info_count: int = 0


class TeamAlertsResponse(BaseModel):
    """Team-Übersicht mit Alerts."""
    total_contacts: int = 0
    total_alerts: int = 0
    alerts_by_severity: dict = Field(default_factory=dict)
    critical_alerts: List[AlertResponse] = Field(default_factory=list)
    at_risk_contacts: List[dict] = Field(default_factory=list)
    opportunities: List[dict] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def _get_company_id(db: Client, user_id: str) -> Optional[str]:
    """Holt Company ID für User."""
    try:
        result = db.table("users").select("company_id").eq("id", user_id).single().execute()
        if result.data:
            return result.data.get("company_id")
    except Exception:
        pass
    return None


def _get_company_name(company_id: str) -> str:
    """Konvertiert Company ID zu Company Name für Engine."""
    # Mapping von Company IDs zu Company Names
    company_map = {
        "doterra": "doterra",
        "herbalife": "herbalife",
        "zinzino": "zinzino",
        "pm-international": "pm-international",
    }
    # Falls company_id direkt der Name ist
    if company_id in company_map:
        return company_map[company_id]
    # Falls es eine UUID ist, versuche es aus der DB zu holen
    # Für jetzt: Fallback auf company_id
    return company_id.lower() if company_id else "doterra"


def _contact_to_dict(contact_row: dict) -> dict:
    """Konvertiert Supabase Contact Row zu Dict für Alert Engine."""
    return {
        "id": contact_row.get("id"),
        "first_name": contact_row.get("first_name"),
        "last_name": contact_row.get("last_name"),
        "rank": contact_row.get("rank"),
        "is_supervisor": contact_row.get("is_supervisor", False),
        "ov": contact_row.get("ov", 0) or 0,
        "pv": contact_row.get("pv", 0) or 0,
        "tv": contact_row.get("tv", 0) or 0,
        "gv": contact_row.get("gv", 0) or 0,
        "vp": contact_row.get("vp", 0) or 0,
        "credits": contact_row.get("credits", 0) or 0,
        "team_credits": contact_row.get("team_credits", 0) or 0,
        "volume_points": contact_row.get("volume_points", 0) or 0,
        "ro": contact_row.get("ro", 0) or 0,
        "legs": contact_row.get("legs", 0) or 0,
        "annual_vp_accumulated": contact_row.get("annual_vp_accumulated", 0) or 0,
        "lrp_active": contact_row.get("lrp_active", True),
        "subscription_active": contact_row.get("subscription_active", True),
        "retail_customers_count": contact_row.get("retail_customers_count", 0) or 0,
        "last_activity_date": contact_row.get("last_activity_date"),
        # Last month values (falls vorhanden)
        "ov_last_month": contact_row.get("ov_last_month", 0) or 0,
        "pv_last_month": contact_row.get("pv_last_month", 0) or 0,
        "tv_last_month": contact_row.get("tv_last_month", 0) or 0,
        "gv_last_month": contact_row.get("gv_last_month", 0) or 0,
        "vp_last_month": contact_row.get("vp_last_month", 0) or 0,
        "credits_last_month": contact_row.get("credits_last_month", 0) or 0,
        "points_last_month": contact_row.get("points_last_month", 0) or 0,
    }


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/contact/{contact_id}", response_model=ContactAlertsResponse)
async def get_contact_alerts(
    contact_id: str,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt alle Alerts für einen spezifischen Kontakt zurück.
    
    ## Alert-Typen
    
    - `rank_loss`: Risiko für Rang-Verlust
    - `requalification`: Re-Qualifikation Deadline (Herbalife)
    - `churn_risk`: Churn/Abwanderungs-Risiko
    - `inactivity`: Inaktivität erkannt
    - `opportunity`: Positive Opportunity (z.B. nah am nächsten Rang)
    - `compliance`: Compliance-Verstoß
    
    ## Severity-Levels
    
    - `critical`: Sofortiges Handeln erforderlich
    - `high`: Wichtig, sollte bald behandelt werden
    - `warning`: Aufmerksamkeit nötig
    - `info`: Informativ
    
    ## Beispiel Response
    
    ```json
    {
      "contact_id": "123",
      "contact_name": "Max Mustermann",
      "alerts": [
        {
          "type": "requalification",
          "severity": "critical",
          "title": "🚨 RE-QUALIFIKATION KRITISCH!",
          "message": "Noch 1.500 VP bis 31.01.2025 (14 Tage)...",
          "action_required": true,
          "suggested_action": "Kontaktiere den Partner SOFORT...",
          "deadline": "2025-01-31",
          "confidence": 0.95
        }
      ],
      "total_alerts": 1,
      "critical_count": 1
    }
    ```
    """
    # Hole Company ID
    company_id = _get_company_id(db, current_user.id)
    company_name = _get_company_name(company_id) if company_id else "doterra"
    
    # Hole Kontakt
    try:
        result = db.table("contacts").select("*").eq("id", contact_id).eq("user_id", current_user.id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
        
        contact_data = _contact_to_dict(result.data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Laden des Kontakts: {str(e)}")
    
    # Analysiere Kontakt
    try:
        engine = PredictiveAlertEngine(company=company_name)
        alerts = engine.analyze_contact(contact_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei Alert-Analyse: {str(e)}")
    
    # Konvertiere zu Response
    alert_responses = [AlertResponse(**alert.to_dict()) for alert in alerts]
    
    # Zähle nach Severity
    severity_counts = {
        "critical": len([a for a in alerts if a.severity.value == "critical"]),
        "high": len([a for a in alerts if a.severity.value == "high"]),
        "warning": len([a for a in alerts if a.severity.value == "warning"]),
        "info": len([a for a in alerts if a.severity.value == "info"]),
    }
    
    return ContactAlertsResponse(
        contact_id=contact_id,
        contact_name=f"{contact_data.get('first_name', '')} {contact_data.get('last_name', '')}".strip() or None,
        alerts=alert_responses,
        total_alerts=len(alerts),
        critical_count=severity_counts["critical"],
        high_count=severity_counts["high"],
        warning_count=severity_counts["warning"],
        info_count=severity_counts["info"],
    )


@router.get("/team", response_model=TeamAlertsResponse)
async def get_team_alerts(
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt Team-Übersicht mit allen Alerts zurück.
    
    ## Features
    
    - Aggregierte Alerts für alle Team-Kontakte
    - Kritische Alerts hervorgehoben
    - At-Risk Kontakte identifiziert
    - Opportunities (positive Alerts)
    
    ## Beispiel Response
    
    ```json
    {
      "total_contacts": 25,
      "total_alerts": 12,
      "alerts_by_severity": {
        "critical": 3,
        "high": 4,
        "warning": 3,
        "info": 2
      },
      "critical_alerts": [...],
      "at_risk_contacts": [...],
      "opportunities": [...]
    }
    ```
    """
    # Hole Company ID
    company_id = _get_company_id(db, current_user.id)
    company_name = _get_company_name(company_id) if company_id else "doterra"
    
    # Hole alle Kontakte des Users (Team)
    try:
        result = db.table("contacts").select("*").eq("user_id", current_user.id).execute()
        contacts = result.data if result.data else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Laden der Kontakte: {str(e)}")
    
    # Konvertiere zu Dict-Format
    contacts_data = [_contact_to_dict(c) for c in contacts]
    
    # Analysiere Team
    try:
        team_analysis = analyze_team(contacts_data, company_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei Team-Analyse: {str(e)}")
    
    # Konvertiere Critical Alerts
    critical_alerts = [
        AlertResponse(**alert) for alert in team_analysis.get("critical_alerts", [])
    ]
    
    return TeamAlertsResponse(
        total_contacts=team_analysis.get("total_contacts", 0),
        total_alerts=team_analysis.get("total_alerts", 0),
        alerts_by_severity=team_analysis.get("alerts_by_severity", {}),
        critical_alerts=critical_alerts,
        at_risk_contacts=team_analysis.get("at_risk_contacts", []),
        opportunities=team_analysis.get("opportunities", []),
    )

