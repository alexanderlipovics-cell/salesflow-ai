# backend/app/api/routes/phoenix.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  🔥 PHOENIX ROUTER                                                          ║
║  API Endpoints für Außendienst-Reaktivierungs-System                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /phoenix/im-early           → "Bin zu früh beim Termin!"
- POST /phoenix/nearby             → Leads in der Nähe finden
- GET  /phoenix/appointments       → Leads nahe heutiger Termine
- POST /phoenix/sessions/start     → Außendienst-Session starten
- POST /phoenix/sessions/{id}/update-location
- POST /phoenix/sessions/{id}/end
- POST /phoenix/visits             → Besuch protokollieren
- GET  /phoenix/alerts             → Offene Alerts
- POST /phoenix/alerts/{id}/respond
- GET  /phoenix/territories        → User Territories
- POST /phoenix/territories        → Territory erstellen
- GET  /phoenix/reactivation       → Reaktivierungs-Kandidaten
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from typing import List, Optional
from datetime import date

from ..schemas.phoenix import (
    # Requests
    NearbyLeadsRequest,
    ImEarlyRequest,
    StartSessionRequest,
    LogVisitRequest,
    CreateTerritoryRequest,
    AlertResponseRequest,
    LocationUpdate,
    # Responses
    NearbyLeadResponse,
    ImEarlyResponse,
    SessionResponse,
    SessionSummaryResponse,
    VisitResponse,
    TerritoryResponse,
    AlertResponse,
    AppointmentOpportunityResponse,
    ReactivationCandidateResponse,
)
from ...services.phoenix import PhoenixService, get_phoenix_service
from ...db.deps import get_db, get_current_user, CurrentUser


# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter(
    prefix="/phoenix",
    tags=["phoenix", "field-sales"],
)


# =============================================================================
# "BIN ZU FRÜH" - HAUPTFEATURE
# =============================================================================

@router.post("/im-early", response_model=ImEarlyResponse)
async def im_early_for_meeting(
    request: ImEarlyRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    🔥 "Ich bin zu früh beim Termin!"
    
    Gibt kontextsensitive Vorschläge basierend auf:
    - Verfügbare Zeit
    - Leads in der Nähe
    - Reaktivierungs-Potenzial
    """
    service = get_phoenix_service(db)
    
    result = service.im_early_for_meeting(
        user_id=current_user.id,
        latitude=request.latitude,
        longitude=request.longitude,
        minutes_available=request.minutes_available,
        appointment_id=request.appointment_id,
    )
    
    return result


# =============================================================================
# NEARBY LEADS
# =============================================================================

@router.post("/nearby", response_model=List[NearbyLeadResponse])
async def find_nearby_leads(
    request: NearbyLeadsRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Findet Leads in der Nähe einer Position.
    """
    service = get_phoenix_service(db)
    
    leads = service.find_nearby_leads(
        user_id=current_user.id,
        latitude=request.latitude,
        longitude=request.longitude,
        radius_meters=request.radius_meters,
        min_days_since_contact=request.min_days_since_contact,
        limit=request.limit,
        include_cold=request.include_cold,
    )
    
    return [
        NearbyLeadResponse(
            lead_id=l.lead_id,
            name=l.name,
            status=l.status,
            phone=l.phone,
            address=l.address,
            city=l.city,
            distance_meters=l.distance_meters,
            distance_km=l.distance_km,
            travel_time_minutes=l.travel_time_minutes,
            days_since_contact=l.days_since_contact,
            last_contact_at=l.last_contact_at,
            priority_score=l.priority_score,
            suggested_action=l.suggested_action,
            suggested_message=l.suggested_message,
        )
        for l in leads
    ]


# =============================================================================
# APPOINTMENT OPPORTUNITIES
# =============================================================================

@router.get("/appointments", response_model=List[AppointmentOpportunityResponse])
async def get_appointment_opportunities(
    radius_meters: int = Query(default=3000, ge=500, le=10000),
    min_days_since_contact: int = Query(default=14, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Findet Leads in der Nähe von heutigen Terminen.
    
    "Du hast um 14 Uhr einen Termin bei X. 
    In der Nähe ist Y, den du seit 45 Tagen nicht kontaktiert hast."
    """
    service = get_phoenix_service(db)
    
    opportunities = service.get_appointment_opportunities(
        user_id=current_user.id,
        radius_meters=radius_meters,
        min_days_since_contact=min_days_since_contact,
    )
    
    return [
        AppointmentOpportunityResponse(**opp)
        for opp in opportunities
    ]


# =============================================================================
# FIELD SESSIONS
# =============================================================================

@router.post("/sessions/start", response_model=SessionResponse)
async def start_field_session(
    request: StartSessionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Startet eine Außendienst-Session.
    
    Session Types:
    - field_day: Normaler Außendienst-Tag
    - territory_sweep: Gebiet systematisch abarbeiten
    - appointment_buffer: Zwischen Terminen
    - reactivation_blitz: Fokus auf Reaktivierung
    """
    service = get_phoenix_service(db)
    
    session = service.start_field_session(
        user_id=current_user.id,
        session_type=request.session_type.value,
        latitude=request.latitude,
        longitude=request.longitude,
        settings=request.settings,
    )
    
    return SessionResponse(
        id=session.id,
        session_type=request.session_type,
        started_at=session.started_at,
        current_latitude=session.current_latitude,
        current_longitude=session.current_longitude,
        leads_suggested=session.leads_suggested,
        leads_visited=session.leads_visited,
        leads_contacted=session.leads_contacted,
        leads_reactivated=session.leads_reactivated,
        settings=session.settings,
    )


@router.post("/sessions/{session_id}/update-location", response_model=List[NearbyLeadResponse])
async def update_session_location(
    session_id: str,
    request: LocationUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Aktualisiert Position und gibt neue Lead-Vorschläge.
    """
    service = get_phoenix_service(db)
    
    leads = service.update_session_location(
        session_id=session_id,
        user_id=current_user.id,
        latitude=request.latitude,
        longitude=request.longitude,
    )
    
    return [
        NearbyLeadResponse(
            lead_id=l.lead_id,
            name=l.name,
            status=l.status,
            phone=l.phone,
            address=l.address,
            city=l.city,
            distance_meters=l.distance_meters,
            distance_km=l.distance_km,
            travel_time_minutes=l.travel_time_minutes,
            days_since_contact=l.days_since_contact,
            last_contact_at=l.last_contact_at,
            priority_score=l.priority_score,
            suggested_action=l.suggested_action,
            suggested_message=l.suggested_message,
        )
        for l in leads
    ]


@router.post("/sessions/{session_id}/end", response_model=SessionSummaryResponse)
async def end_field_session(
    session_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Beendet eine Session und gibt Zusammenfassung.
    """
    service = get_phoenix_service(db)
    
    summary = service.end_field_session(
        session_id=session_id,
        user_id=current_user.id,
    )
    
    return SessionSummaryResponse(**summary)


@router.get("/sessions/active", response_model=Optional[SessionResponse])
async def get_active_session(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt aktive Session (falls vorhanden).
    """
    result = db.table("phoenix_sessions").select("*").eq(
        "user_id", current_user.id
    ).eq("is_active", True).order("started_at", desc=True).limit(1).execute()
    
    if not result.data:
        return None
    
    session = result.data[0]
    return SessionResponse(
        id=session["id"],
        session_type=session["session_type"],
        started_at=session["started_at"],
        current_latitude=session.get("current_latitude"),
        current_longitude=session.get("current_longitude"),
        leads_suggested=session.get("leads_suggested", 0),
        leads_visited=session.get("leads_visited", 0),
        leads_contacted=session.get("leads_contacted", 0),
        leads_reactivated=session.get("leads_reactivated", 0),
        settings=session.get("settings", {}),
    )


# =============================================================================
# FIELD VISITS
# =============================================================================

@router.post("/visits", response_model=VisitResponse)
async def log_field_visit(
    request: LogVisitRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Protokolliert einen Außendienst-Besuch.
    """
    service = get_phoenix_service(db)
    
    result = service.log_field_visit(
        user_id=current_user.id,
        lead_id=request.lead_id,
        latitude=request.latitude,
        longitude=request.longitude,
        visit_type=request.visit_type.value,
        outcome=request.outcome.value,
        notes=request.notes,
        next_action_type=request.next_action_type,
        next_action_date=request.next_action_date,
        session_id=request.session_id,
    )
    
    return VisitResponse(
        visit_id=result["visit_id"],
        xp_earned=result["xp_earned"],
    )


@router.get("/visits/history")
async def get_visit_history(
    lead_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt Besuchs-Historie.
    """
    query = db.table("field_visits").select(
        "*, leads(first_name, last_name, address)"
    ).eq("user_id", current_user.id)
    
    if lead_id:
        query = query.eq("lead_id", lead_id)
    
    result = query.order("started_at", desc=True).limit(limit).execute()
    
    return result.data or []


# =============================================================================
# ALERTS
# =============================================================================

@router.get("/alerts", response_model=List[AlertResponse])
async def get_pending_alerts(
    limit: int = Query(default=10, le=50),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt offene Proximity Alerts.
    """
    service = get_phoenix_service(db)
    
    alerts = service.get_pending_alerts(
        user_id=current_user.id,
        limit=limit,
    )
    
    return [
        AlertResponse(
            id=a["id"],
            lead_id=a["lead_id"],
            lead_name=f"{a.get('leads', {}).get('first_name', '')} {a.get('leads', {}).get('last_name', '')}".strip() or "Unbekannt",
            alert_type=a["alert_type"],
            title=a["title"],
            message=a["message"],
            distance_meters=a.get("distance_meters", 0),
            priority=a["priority"],
            appointment_id=a.get("trigger_appointment_id"),
            appointment_title=None,
        )
        for a in alerts
    ]


@router.post("/alerts/{alert_id}/respond")
async def respond_to_alert(
    alert_id: str,
    request: AlertResponseRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Reagiert auf einen Alert.
    """
    service = get_phoenix_service(db)
    
    service.respond_to_alert(
        alert_id=alert_id,
        user_id=current_user.id,
        action=request.action,
        action_taken=request.action_taken,
        action_outcome=request.action_outcome,
    )
    
    return {"success": True}


@router.post("/alerts/scan")
async def trigger_proximity_scan(
    request: LocationUpdate,
    radius_meters: int = Query(default=2000, ge=500, le=10000),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Triggert einen Proximity Scan und erstellt Alerts.
    """
    service = get_phoenix_service(db)
    
    alerts = service.create_proximity_alerts(
        user_id=current_user.id,
        latitude=request.latitude,
        longitude=request.longitude,
        radius_meters=radius_meters,
        triggered_by="manual_scan",
    )
    
    return {
        "alerts_created": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "lead_name": a.lead_name,
                "title": a.title,
                "priority": a.priority,
            }
            for a in alerts
        ],
    }


# =============================================================================
# TERRITORIES
# =============================================================================

@router.get("/territories", response_model=List[TerritoryResponse])
async def get_territories(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt User Territories.
    """
    service = get_phoenix_service(db)
    
    territories = service.get_territories(current_user.id)
    
    return [
        TerritoryResponse(
            id=t.id,
            name=t.name,
            lead_count=t.lead_count,
            active_leads=t.active_leads,
            cold_leads=t.cold_leads,
            reactivation_candidates=t.reactivation_candidates,
            last_sweep_at=t.last_sweep_at,
        )
        for t in territories
    ]


@router.post("/territories")
async def create_territory(
    request: CreateTerritoryRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Erstellt ein neues Territory.
    """
    service = get_phoenix_service(db)
    
    territory_id = service.create_territory(
        user_id=current_user.id,
        name=request.name,
        center_latitude=request.center_latitude,
        center_longitude=request.center_longitude,
        radius_km=request.radius_km,
        postal_codes=request.postal_codes,
    )
    
    return {"id": territory_id, "name": request.name}


# =============================================================================
# REACTIVATION
# =============================================================================

@router.get("/reactivation", response_model=List[ReactivationCandidateResponse])
async def get_reactivation_candidates(
    territory_id: Optional[str] = None,
    min_days_inactive: int = Query(default=60, ge=14),
    limit: int = Query(default=50, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt Reaktivierungs-Kandidaten.
    """
    service = get_phoenix_service(db)
    
    candidates = service.get_reactivation_candidates(
        user_id=current_user.id,
        territory_id=territory_id,
        min_days_inactive=min_days_inactive,
        limit=limit,
    )
    
    return [
        ReactivationCandidateResponse(
            lead_id=c["lead_id"],
            lead_name=c.get("lead_name", "Unbekannt"),
            lead_status=c.get("lead_status", "unknown"),
            deal_state=c.get("deal_state"),
            lead_phone=c.get("lead_phone"),
            lead_address=c.get("lead_address"),
            city=c.get("city"),
            days_inactive=c.get("days_inactive", 0),
            last_contact_at=c.get("last_contact_at"),
            field_visit_count=c.get("field_visit_count", 0),
            reactivation_priority=c.get("reactivation_priority", "LOW"),
        )
        for c in candidates
    ]


# =============================================================================
# DASHBOARD / STATS
# =============================================================================

@router.get("/stats")
async def get_phoenix_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt Phoenix Statistiken.
    """
    
    # Visits this week
    visits_result = db.table("field_visits").select(
        "id", count="exact"
    ).eq("user_id", current_user.id).gte(
        "started_at", (date.today() - timedelta(days=7)).isoformat()
    ).execute()
    
    # Pending alerts
    alerts_result = db.table("phoenix_alerts").select(
        "id", count="exact"
    ).eq("user_id", current_user.id).eq("status", "pending").execute()
    
    # Reactivation candidates
    from datetime import timedelta
    candidates = db.table("leads").select(
        "id", count="exact"
    ).eq("user_id", current_user.id).not_.in_(
        "status", ["lost", "customer"]
    ).lt(
        "last_contact_at", (date.today() - timedelta(days=60)).isoformat()
    ).execute()
    
    # Active sessions
    sessions_result = db.table("phoenix_sessions").select("*").eq(
        "user_id", current_user.id
    ).eq("is_active", True).execute()
    
    return {
        "visits_this_week": visits_result.count or 0,
        "pending_alerts": alerts_result.count or 0,
        "reactivation_candidates": candidates.count or 0,
        "active_session": sessions_result.data[0] if sessions_result.data else None,
    }


# Import für timedelta
from datetime import timedelta


# =============================================================================
# ANALYTICS (PRODUCTION)
# =============================================================================

@router.get("/analytics/visits")
async def get_visit_analytics(
    days: int = Query(default=30, ge=7, le=365),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt detaillierte Besuchs-Analytik.
    """
    from ...services.phoenix import get_phoenix_analytics
    
    analytics = get_phoenix_analytics(db)
    stats = analytics.get_visit_stats(current_user.id, days)
    
    return {
        "total_visits": stats.total_visits,
        "successful_visits": stats.successful_visits,
        "conversion_rate": stats.conversion_rate,
        "avg_visits_per_day": stats.avg_visits_per_day,
        "total_time_minutes": stats.total_time_minutes,
    }


@router.get("/analytics/best-times")
async def get_best_times(
    days: int = Query(default=90, ge=30, le=365),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Analysiert die besten Zeiten für Besuche.
    """
    from ...services.phoenix import get_phoenix_analytics
    
    analytics = get_phoenix_analytics(db)
    times = analytics.get_best_times(current_user.id, days)
    
    return [
        {
            "time_slot": t.time_slot,
            "visit_count": t.visit_count,
            "success_rate": t.success_rate,
            "avg_duration": t.avg_visit_duration_minutes,
        }
        for t in times
    ]


@router.get("/analytics/insights")
async def get_insights(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Generiert personalisierte Insights.
    """
    from ...services.phoenix import get_phoenix_analytics
    
    analytics = get_phoenix_analytics(db)
    insights = analytics.generate_insights(current_user.id)
    
    return [
        {
            "type": i.type,
            "title": i.title,
            "message": i.message,
            "icon": i.icon,
            "priority": i.priority,
        }
        for i in insights
    ]


@router.get("/analytics/heatmap")
async def get_heatmap(
    days: int = Query(default=30, ge=7, le=90),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Generiert Heatmap-Daten für Kartenvisualisierung.
    """
    from ...services.phoenix import get_phoenix_analytics
    
    analytics = get_phoenix_analytics(db)
    return analytics.get_heatmap_data(current_user.id, days)


# =============================================================================
# ROUTE OPTIMIZATION (PRODUCTION)
# =============================================================================

@router.post("/optimize-route")
async def optimize_route(
    request: LocationUpdate,
    lead_ids: str = Query(..., description="Komma-separierte Lead-IDs"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Optimiert die Route für mehrere Leads.
    
    Nutzt Nearest Neighbor + 2-Opt für effiziente Routen.
    """
    from ...services.phoenix import RouteOptimizer
    from ...services.phoenix.optimizer import VisitStop
    
    # Parse Lead IDs
    ids = [lid.strip() for lid in lead_ids.split(",") if lid.strip()]
    
    if not ids:
        return {"error": "Keine Lead-IDs angegeben"}
    
    # Hole Lead-Daten
    result = db.table("leads").select(
        "id, first_name, last_name, latitude, longitude, status"
    ).in_("id", ids).not_.is_("latitude", "null").execute()
    
    if not result.data:
        return {"error": "Keine Leads mit GPS-Daten gefunden"}
    
    # Erstelle Stops
    stops = []
    for lead in result.data:
        priority = {"hot": 90, "warm": 60, "cold": 30}.get(lead.get("status"), 50)
        stops.append(VisitStop(
            lead_id=lead["id"],
            name=f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip(),
            latitude=float(lead["latitude"]),
            longitude=float(lead["longitude"]),
            priority=priority,
        ))
    
    # Optimiere Route
    optimizer = RouteOptimizer()
    route = optimizer.optimize_route(
        start_lat=request.latitude,
        start_lon=request.longitude,
        stops=stops,
    )
    
    return {
        "optimized_order": [
            {
                "lead_id": s.lead_id,
                "name": s.name,
                "priority": s.priority,
            }
            for s in route.stops
        ],
        "total_distance_km": route.total_distance_km,
        "total_travel_minutes": route.total_travel_minutes,
        "savings_percent": route.savings_vs_original_percent,
        "efficiency_score": route.route_efficiency_score,
    }


@router.post("/smart-suggestions")
async def get_smart_suggestions(
    request: LocationUpdate,
    minutes_available: int = Query(default=30, ge=5, le=180),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Generiert intelligente Lead-Vorschläge.
    """
    from ...services.phoenix import SmartSuggestionEngine
    
    # Hole nearby leads
    service = get_phoenix_service(db)
    nearby = service.find_nearby_leads(
        user_id=current_user.id,
        latitude=request.latitude,
        longitude=request.longitude,
        radius_meters=5000,
        min_days_since_contact=7,
        limit=15,
    )
    
    # Konvertiere zu Dict
    nearby_dicts = [
        {
            "lead_id": l.lead_id,
            "name": l.name,
            "status": l.status,
            "phone": l.phone,
            "distance_meters": l.distance_meters,
            "distance_km": l.distance_km,
            "travel_time_minutes": l.travel_time_minutes,
            "days_since_contact": l.days_since_contact,
        }
        for l in nearby
    ]
    
    # Generiere Suggestions
    engine = SmartSuggestionEngine()
    suggestions = engine.generate_suggestions(
        user_id=current_user.id,
        latitude=request.latitude,
        longitude=request.longitude,
        available_minutes=minutes_available,
        nearby_leads=nearby_dicts,
        user_stats={},  # Könnte aus Analytics kommen
    )
    
    return suggestions

