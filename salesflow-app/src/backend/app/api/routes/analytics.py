# backend/app/api/routes/analytics.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ANALYTICS ROUTER                                                          ║
║  API Endpoints für Template-Performance & Learning Analytics               ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET /analytics/dashboard - Dashboard mit KPIs
- GET /analytics/templates - Top Templates
- GET /analytics/templates/{id} - Template Performance
- POST /learning/events - Event tracken
- GET /learning/events - Events abrufen
"""

from datetime import date, timedelta
from typing import Optional
import math
from fastapi import APIRouter, HTTPException, Depends, Query

from ..schemas.learning import (
    LearningEventCreate,
    LearningEventResponse,
    TemplateCategory,
    TopTemplatesResponse,
    TemplatePerformanceStats,
    AnalyticsDashboardResponse,
    LearningAggregateResponse,
    AggregateType,
)
from ...services.learning.service import LearningService, get_learning_service


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(
    prefix="/analytics",
    tags=["analytics", "learning"],
)


# ═══════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════

async def get_current_user():
    """Placeholder für User-Authentifizierung."""
    return {
        "id": "demo_user",
        "name": "Demo User",
        "company_id": "demo_company",
        "role": "admin",
    }


async def get_db():
    """Placeholder für Datenbankverbindung."""
    from ...db.supabase import get_supabase
    return get_supabase()


# ═══════════════════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/dashboard",
    response_model=AnalyticsDashboardResponse,
    summary="Analytics Dashboard",
    description="Lädt das Analytics Dashboard mit allen KPIs und Metriken.",
)
async def get_dashboard(
    period: str = Query(
        default="last_30d",
        description="Zeitraum: last_7d, last_30d, this_month"
    ),
    user_id: Optional[str] = Query(
        default=None,
        description="Nach User filtern (nur für Admins)"
    ),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
) -> AnalyticsDashboardResponse:
    """
    Lädt das Analytics Dashboard.
    
    **Enthält:**
    - KPIs (Response Rate, Conversion Rate, etc.)
    - Top Templates
    - Channel Breakdown
    - Category Breakdown
    
    **Zeiträume:**
    - `last_7d` - Letzte 7 Tage
    - `last_30d` - Letzte 30 Tage (Standard)
    - `this_month` - Aktueller Monat
    """
    company_id = current_user["company_id"]
    
    # User-Filter nur für Admins/Leader
    if user_id and current_user["role"] not in ["admin", "leader"]:
        user_id = None
    
    service = get_learning_service(db)
    
    try:
        return await service.get_dashboard(
            company_id=company_id,
            period=period,
            user_id=user_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden des Dashboards: {str(e)}"
        )


@router.get(
    "/templates",
    response_model=TopTemplatesResponse,
    summary="Top Templates",
    description="Lädt die bestperformenden Templates.",
)
async def get_top_templates(
    category: Optional[TemplateCategory] = Query(
        default=None,
        description="Nach Kategorie filtern"
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
        description="Anzahl Templates"
    ),
    days: int = Query(
        default=30,
        ge=1,
        le=365,
        description="Zeitraum in Tagen"
    ),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
) -> TopTemplatesResponse:
    """
    Lädt die Top-performenden Templates.
    
    Sortiert nach Quality Score:
    - Response Rate
    - Conversion Rate
    - Nutzungshäufigkeit
    """
    company_id = current_user["company_id"]
    
    service = get_learning_service(db)
    
    try:
        return await service.get_top_templates(
            company_id=company_id,
            category=category,
            limit=limit,
            days=days,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Templates: {str(e)}"
        )


@router.get(
    "/templates/{template_id}",
    response_model=TemplatePerformanceStats,
    summary="Template Performance",
    description="Lädt Performance-Statistiken für ein einzelnes Template.",
)
async def get_template_performance(
    template_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
) -> TemplatePerformanceStats:
    """
    Lädt detaillierte Performance-Daten für ein Template.
    
    **Enthält:**
    - Lifetime Statistiken
    - Letzte 30 Tage Statistiken
    - Quality Score
    - Trend
    """
    company_id = current_user["company_id"]
    
    service = get_learning_service(db)
    
    result = await service.get_template_performance(
        company_id=company_id,
        template_id=template_id,
    )
    
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Template {template_id} nicht gefunden"
        )
    
    return result


@router.get(
    "/aggregates",
    response_model=LearningAggregateResponse,
    summary="Learning Aggregate",
    description="Lädt aggregierte Metriken für einen Zeitraum.",
)
async def get_aggregate(
    aggregate_type: AggregateType = Query(
        default=AggregateType.weekly,
        description="Aggregations-Typ"
    ),
    start_date: Optional[date] = Query(
        default=None,
        description="Start-Datum (YYYY-MM-DD)"
    ),
    end_date: Optional[date] = Query(
        default=None,
        description="End-Datum (YYYY-MM-DD)"
    ),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
) -> LearningAggregateResponse:
    """
    Lädt aggregierte Learning-Metriken.
    
    Wenn kein Datum angegeben, wird die aktuelle Woche/Monat verwendet.
    """
    company_id = current_user["company_id"]
    today = date.today()
    
    # Defaults setzen
    if not start_date or not end_date:
        if aggregate_type == AggregateType.daily:
            start_date = today
            end_date = today
        elif aggregate_type == AggregateType.weekly:
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
        else:  # monthly
            start_date = today.replace(day=1)
            # Letzter Tag des Monats
            next_month = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1)
            end_date = next_month - timedelta(days=1)
    
    service = get_learning_service(db)
    
    try:
        return await service.compute_aggregate(
            company_id=company_id,
            aggregate_type=aggregate_type,
            period_start=start_date,
            period_end=end_date,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Berechnen des Aggregats: {str(e)}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# LEARNING EVENTS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post(
    "/events",
    response_model=LearningEventResponse,
    summary="Event tracken",
    description="Zeichnet ein Learning Event auf.",
)
async def record_event(
    payload: LearningEventCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
) -> LearningEventResponse:
    """
    Trackt ein Learning Event.
    
    **Event Types:**
    - `template_used` - Template wurde verwendet
    - `template_edited` - Template wurde angepasst
    - `response_received` - Antwort erhalten
    - `positive_outcome` - Positives Ergebnis
    - `negative_outcome` - Negatives Ergebnis
    - `objection_handled` - Einwand bearbeitet
    - `follow_up_sent` - Follow-up gesendet
    
    **Beispiel:**
    ```json
    {
        "event_type": "template_used",
        "template_id": "abc123",
        "lead_id": "lead456",
        "channel": "instagram"
    }
    ```
    """
    company_id = current_user["company_id"]
    user_id = current_user["id"]
    
    service = get_learning_service(db)
    
    try:
        return await service.record_event(
            company_id=company_id,
            user_id=user_id,
            event=payload,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Tracken des Events: {str(e)}"
        )


@router.get(
    "/events",
    summary="Events abrufen",
    description="Lädt Learning Events mit Filtern.",
)
async def get_events(
    template_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Lädt Learning Events.
    
    Kann nach Template gefiltert werden.
    """
    company_id = current_user["company_id"]
    
    service = get_learning_service(db)
    
    try:
        events = await service.get_events(
            company_id=company_id,
            template_id=template_id,
            limit=limit,
        )
        return {"events": events, "count": len(events)}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Events: {str(e)}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# QUICK ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post(
    "/track/template-used",
    summary="Quick: Template verwendet",
    description="Shortcut zum Tracken einer Template-Nutzung.",
)
async def track_template_used(
    template_id: str = Query(..., description="Template ID"),
    lead_id: Optional[str] = Query(default=None),
    channel: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Quick-Endpoint zum Tracken einer Template-Nutzung.
    
    Einfacher als der generische POST /events Endpoint.
    """
    from ..schemas.learning import LearningEventType
    
    event = LearningEventCreate(
        event_type=LearningEventType.template_used,
        template_id=template_id,
        lead_id=lead_id,
        channel=channel,
    )
    
    return await record_event(event, current_user, db)


@router.post(
    "/track/response",
    summary="Quick: Antwort erhalten",
    description="Shortcut zum Tracken einer erhaltenen Antwort.",
)
async def track_response(
    template_id: str = Query(..., description="Template ID"),
    lead_id: Optional[str] = Query(default=None),
    response_time_hours: Optional[float] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Quick-Endpoint zum Tracken einer Antwort.
    """
    from ..schemas.learning import LearningEventType
    
    event = LearningEventCreate(
        event_type=LearningEventType.response_received,
        template_id=template_id,
        lead_id=lead_id,
        response_received=True,
        response_time_hours=response_time_hours,
    )
    
    return await record_event(event, current_user, db)


@router.post(
    "/track/outcome",
    summary="Quick: Outcome tracken",
    description="Shortcut zum Tracken eines Outcomes (Termin, Abschluss, etc.).",
)
async def track_outcome(
    template_id: str = Query(..., description="Template ID"),
    outcome: str = Query(..., description="Outcome: appointment_booked, deal_closed, etc."),
    lead_id: Optional[str] = Query(default=None),
    outcome_value: Optional[float] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Quick-Endpoint zum Tracken eines Outcomes.
    
    **Outcomes:**
    - `appointment_booked` - Termin gebucht
    - `deal_closed` - Abschluss
    - `info_sent` - Infos geschickt
    - `rejected` - Abgelehnt
    """
    from ..schemas.learning import LearningEventType, OutcomeType
    
    # Outcome Type bestimmen
    is_positive = outcome in ["appointment_booked", "deal_closed", "objection_overcome"]
    event_type = LearningEventType.positive_outcome if is_positive else LearningEventType.negative_outcome
    
    event = LearningEventCreate(
        event_type=event_type,
        template_id=template_id,
        lead_id=lead_id,
        outcome=OutcomeType(outcome) if outcome in [o.value for o in OutcomeType] else None,
        outcome_value=outcome_value,
        converted_to_next_stage=is_positive,
    )
    
    return await record_event(event, current_user, db)


# ═══════════════════════════════════════════════════════════════════════════
# CHANNEL ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/channels",
    summary="Channel Analytics",
    description="Lädt Performance-Statistiken pro Kommunikationskanal.",
)
async def get_channel_analytics(
    from_date: Optional[date] = Query(default=None, description="Start-Datum"),
    to_date: Optional[date] = Query(default=None, description="End-Datum"),
    vertical_id: Optional[str] = Query(default=None, description="Nach Vertical filtern"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Lädt Channel-Analytics.
    
    **Enthält pro Kanal:**
    - Events gesendet
    - Reply-Rate
    - Win-Rate
    - Vergleich zum Durchschnitt
    """
    from ..schemas.analytics import ChannelAnalyticsQuery
    from ...services.analytics.service import AnalyticsService
    
    company_id = current_user["company_id"]
    
    query = ChannelAnalyticsQuery(
        from_date=from_date or (date.today() - timedelta(days=30)),
        to_date=to_date or date.today(),
        vertical_id=vertical_id,
    )
    
    service = AnalyticsService(db)
    
    try:
        return service.get_channel_analytics(company_id=company_id, query=query)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Channel-Analytics: {str(e)}"
        )


@router.get(
    "/timeseries",
    summary="Time Series Analytics",
    description="Lädt Zeitreihen-Daten für Trend-Analysen.",
)
async def get_timeseries_analytics(
    from_date: Optional[date] = Query(default=None, description="Start-Datum"),
    to_date: Optional[date] = Query(default=None, description="End-Datum"),
    granularity: str = Query(default="day", description="Granularität: day, week, month"),
    vertical_id: Optional[str] = Query(default=None),
    channel: Optional[str] = Query(default=None),
    template_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Lädt Zeitreihen für Trend-Analyse.
    
    **Granularität:**
    - `day` - Tägliche Datenpunkte
    - `week` - Wöchentliche Datenpunkte  
    - `month` - Monatliche Datenpunkte
    
    **Enthält:**
    - Events pro Periode
    - Rates pro Periode
    - Trend-Richtung
    """
    from ..schemas.analytics import TimeSeriesQuery, AggGranularity
    from ...services.analytics.service import AnalyticsService
    
    company_id = current_user["company_id"]
    
    # Granularity mappen
    granularity_map = {
        "day": AggGranularity.day,
        "week": AggGranularity.week,
        "month": AggGranularity.month,
    }
    
    query = TimeSeriesQuery(
        from_date=from_date or (date.today() - timedelta(days=30)),
        to_date=to_date or date.today(),
        granularity=granularity_map.get(granularity, AggGranularity.day),
        vertical_id=vertical_id,
        channel=channel,
        template_id=template_id,
    )
    
    service = AnalyticsService(db)
    
    try:
        return service.get_time_series(company_id=company_id, query=query)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Zeitreihen: {str(e)}"
        )


@router.get(
    "/summary",
    summary="Performance Summary",
    description="Lädt eine Zusammenfassung der Performance mit Periodenvergleich.",
)
async def get_performance_summary(
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    compare_previous: bool = Query(default=True, description="Mit Vorperiode vergleichen"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Lädt Performance-Zusammenfassung.
    
    **Enthält:**
    - Totals (Sent, Replied, Deals)
    - Rates (Reply, Win)
    - Änderung zur Vorperiode
    - Best Channel & Template
    """
    from ...services.analytics.service import AnalyticsService
    
    company_id = current_user["company_id"]
    
    service = AnalyticsService(db)
    
    try:
        return service.get_performance_summary(
            company_id=company_id,
            from_date=from_date,
            to_date=to_date,
            compare_previous=compare_previous,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Zusammenfassung: {str(e)}"
        )


@router.get(
    "/dashboard-metrics",
    summary="Dashboard Metrics",
    description="Lädt alle KPIs für das Analytics Dashboard.",
)
async def get_dashboard_metrics(
    days: int = Query(default=30, ge=1, le=365, description="Zeitraum in Tagen"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Lädt alle Dashboard-Metriken auf einen Blick.
    
    Optimiert für schnelle Darstellung im Frontend.
    """
    from ...services.analytics.service import AnalyticsService
    
    company_id = current_user["company_id"]
    
    service = AnalyticsService(db)
    
    try:
        return service.get_dashboard_metrics(company_id=company_id, days=days)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Dashboard-Metriken: {str(e)}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# PULSE TRACKER ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/pulse/compliance",
    summary="Check-in Compliance",
    description="Lädt Check-in Compliance-Daten über Zeit.",
)
async def get_pulse_checkin_compliance(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Check-in Compliance über Zeit.
    
    Zeigt wie viele Check-ins abgeschlossen, übersprungen oder stale wurden.
    """
    user_id = current_user["id"]
    
    try:
        result = db.table("pulse_outreach_messages")\
            .select("sent_at, status, check_in_completed, check_in_skipped")\
            .eq("user_id", user_id)\
            .gte("sent_at", f"now() - interval '{days} days'")\
            .execute()
        
        # Gruppiere nach Datum
        from collections import defaultdict
        daily_stats = defaultdict(lambda: {
            "total_sent": 0,
            "checked_in": 0,
            "skipped": 0,
            "stale": 0,
        })
        
        for row in result.data or []:
            sent_date = row["sent_at"][:10] if row.get("sent_at") else None
            if not sent_date:
                continue
            
            daily_stats[sent_date]["total_sent"] += 1
            
            if row.get("check_in_completed"):
                daily_stats[sent_date]["checked_in"] += 1
            elif row.get("check_in_skipped"):
                daily_stats[sent_date]["skipped"] += 1
            elif row.get("status") == "stale":
                daily_stats[sent_date]["stale"] += 1
        
        # Completion Rate berechnen
        compliance = []
        for date_str, stats in sorted(daily_stats.items(), reverse=True):
            total = stats["total_sent"]
            completion_rate = round(stats["checked_in"] / total * 100, 1) if total > 0 else 0
            
            compliance.append({
                "date": date_str,
                **stats,
                "completion_rate": completion_rate,
            })
        
        return compliance
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Compliance-Daten: {str(e)}"
        )


@router.get(
    "/pulse/ghost-buster-effectiveness",
    summary="Ghost-Buster Effektivität",
    description="Lädt Erfolgsraten der Ghost-Buster Strategien.",
)
async def get_ghost_buster_effectiveness(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Ghost-Buster Erfolgsraten nach Strategie.
    
    Zeigt welche Reaktivierungs-Strategien am besten funktionieren.
    """
    user_id = current_user["id"]
    
    try:
        result = db.table("pulse_outreach_messages")\
            .select("suggested_strategy, status")\
            .eq("user_id", user_id)\
            .eq("message_type", "ghost_buster")\
            .gte("sent_at", f"now() - interval '{days} days'")\
            .execute()
        
        # Gruppiere nach Strategie
        from collections import defaultdict
        strategy_stats = defaultdict(lambda: {"times_used": 0, "successful": 0})
        
        for row in result.data or []:
            strategy = row.get("suggested_strategy") or "unknown"
            strategy_stats[strategy]["times_used"] += 1
            
            if row.get("status") == "replied":
                strategy_stats[strategy]["successful"] += 1
        
        # Success Rate berechnen
        effectiveness = []
        for strategy, stats in strategy_stats.items():
            success_rate = round(stats["successful"] / stats["times_used"] * 100, 1) if stats["times_used"] > 0 else 0
            
            effectiveness.append({
                "strategy": strategy,
                "times_used": stats["times_used"],
                "successful": stats["successful"],
                "success_rate": success_rate,
            })
        
        # Sortiere nach Success Rate
        effectiveness.sort(key=lambda x: x["success_rate"], reverse=True)
        
        return effectiveness
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Ghost-Buster Effektivität: {str(e)}"
        )


@router.get(
    "/pulse/intent-distribution",
    summary="Intent Distribution",
    description="Lädt Verteilung der erkannten Intents.",
)
async def get_intent_distribution(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Intent Distribution für Live Assist Queries.
    
    Zeigt welche Intent-Typen am häufigsten vorkommen.
    """
    try:
        # Try to get from live_assist_queries if exists
        result = db.table("live_assist_queries")\
            .select("detected_intent")\
            .gte("created_at", f"now() - interval '{days} days'")\
            .limit(1000)\
            .execute()
        
        if not result.data:
            return []
        
        # Zähle Intents
        from collections import Counter
        intent_counts = Counter(row.get("detected_intent") for row in result.data if row.get("detected_intent"))
        
        total = sum(intent_counts.values())
        
        distribution = [
            {
                "intent": intent,
                "count": count,
                "percentage": round(count / total * 100, 1) if total > 0 else 0,
            }
            for intent, count in intent_counts.most_common(10)
        ]
        
        return distribution
        
    except Exception as e:
        # Table might not exist yet
        return []


@router.get(
    "/pulse/objection-heatmap",
    summary="Objection Heatmap",
    description="Lädt Verteilung der erkannten Einwände.",
)
async def get_objection_heatmap(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Objection Heatmap.
    
    Zeigt welche Einwand-Typen am häufigsten vorkommen
    und wie effektiv sie beantwortet werden.
    """
    try:
        result = db.table("live_assist_queries")\
            .select("detected_objection_type, was_helpful")\
            .eq("detected_intent", "objection")\
            .gte("created_at", f"now() - interval '{days} days'")\
            .limit(1000)\
            .execute()
        
        if not result.data:
            return []
        
        # Gruppiere nach Objection Type
        from collections import defaultdict
        objection_stats = defaultdict(lambda: {"total": 0, "helpful": 0})
        
        for row in result.data:
            obj_type = row.get("detected_objection_type") or "unknown"
            objection_stats[obj_type]["total"] += 1
            
            if row.get("was_helpful") is True:
                objection_stats[obj_type]["helpful"] += 1
        
        # Berechne Effectiveness
        heatmap = []
        for obj_type, stats in objection_stats.items():
            helpful_rate = round(stats["helpful"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
            
            heatmap.append({
                "objection_type": obj_type,
                "count": stats["total"],
                "helpful_count": stats["helpful"],
                "helpful_rate": helpful_rate,
            })
        
        # Sortiere nach Count
        heatmap.sort(key=lambda x: x["count"], reverse=True)
        
        return heatmap
        
    except Exception as e:
        return []


# ═══════════════════════════════════════════════════════════════════════════
# VISUAL CFO ENDPOINTS - Revenue, Pipeline, Forecast
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/v2/revenue",
    summary="Revenue Analytics",
    description="Lädt Umsatz-Daten für die letzten 30 Tage.",
)
async def get_revenue_analytics(
    days: int = Query(default=30, ge=7, le=90, description="Anzahl Tage"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Lädt Revenue-Daten für Visual CFO Dashboard.
    
    **Enthält:**
    - Tägliche Umsatz-Daten
    - Aktueller vs. Ziel-Umsatz
    - Run-Rate Berechnung
    """
    user_id = current_user["id"]
    company_id = current_user.get("company_id")
    
    try:
        # Hole Kontakte mit Deal-Werten (vereinfacht: aus contacts Tabelle)
        # In Produktion: Separate deals/transactions Tabelle verwenden
        result = db.table("contacts")\
            .select("id, pipeline_stage, created_at, updated_at")\
            .eq("user_id", user_id)\
            .in_("pipeline_stage", ["qualified", "proposal_sent", "negotiation", "closed_won"])\
            .gte("created_at", f"now() - interval '{days} days'")\
            .execute()
        
        # Demo: Generiere tägliche Revenue-Daten
        # In Produktion: Aus transactions/orders Tabelle
        from collections import defaultdict
        daily_revenue = defaultdict(float)
        
        # Simuliere Deal-Werte (in Produktion: aus deals Tabelle)
        for contact in result.data or []:
            # Vereinfacht: Zufälliger Deal-Wert basierend auf Stage
            stage_values = {
                "qualified": 500,
                "proposal_sent": 1000,
                "negotiation": 2000,
                "closed_won": 5000,
            }
            value = stage_values.get(contact.get("pipeline_stage"), 0)
            
            # Gruppiere nach Datum
            created_date = contact.get("created_at", "")[:10] if contact.get("created_at") else None
            if created_date:
                daily_revenue[created_date] += value
        
        # Erstelle Zeitreihe
        revenue_data = []
        today = date.today()
        for i in range(days - 1, -1, -1):
            d = today - timedelta(days=i)
            date_str = d.isoformat()
            revenue_data.append({
                "date": date_str,
                "revenue": daily_revenue.get(date_str, 0),
            })
        
        # Berechne Gesamt
        total_revenue = sum(d["revenue"] for d in revenue_data)
        daily_average = total_revenue / days if days > 0 else 0
        
        # Ziel (vereinfacht: 30k pro Monat)
        goal = 30000
        monthly_goal = goal
        
        return {
            "data": revenue_data,
            "current": total_revenue,
            "goal": monthly_goal,
            "daily_average": daily_average,
            "percentage": round((total_revenue / monthly_goal) * 100, 1) if monthly_goal > 0 else 0,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Revenue-Daten: {str(e)}"
        )


@router.get(
    "/v2/pipeline",
    summary="Pipeline Analytics",
    description="Lädt Pipeline-Wert und Deal-Statistiken.",
)
async def get_pipeline_analytics(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Lädt Pipeline-Analytics.
    
    **Enthält:**
    - Gesamter Pipeline-Wert
    - Gewichteter Pipeline-Wert (nach Wahrscheinlichkeit)
    - Durchschnittliche Deal-Größe
    - Deals nach Stage
    """
    user_id = current_user["id"]
    
    try:
        # Hole alle offenen Deals
        result = db.table("contacts")\
            .select("id, pipeline_stage, name")\
            .eq("user_id", user_id)\
            .in_("pipeline_stage", ["lead", "contacted", "qualified", "proposal_sent", "negotiation"])\
            .execute()
        
        # Stage-Wahrscheinlichkeiten
        stage_probabilities = {
            "lead": 10,
            "contacted": 20,
            "qualified": 40,
            "proposal_sent": 60,
            "negotiation": 80,
        }
        
        # Stage-Werte (vereinfacht: Demo-Werte)
        stage_values = {
            "lead": 1000,
            "contacted": 2000,
            "qualified": 5000,
            "proposal_sent": 10000,
            "negotiation": 15000,
        }
        
        deals = []
        for contact in result.data or []:
            stage = contact.get("pipeline_stage", "lead")
            value = stage_values.get(stage, 1000)
            probability = stage_probabilities.get(stage, 10)
            
            deals.append({
                "id": contact.get("id"),
                "name": contact.get("name", "Unbekannt"),
                "stage": stage,
                "value": value,
                "probability": probability,
            })
        
        return {
            "deals": deals,
            "total_value": sum(d["value"] for d in deals),
            "weighted_value": sum(d["value"] * (d["probability"] / 100) for d in deals),
            "avg_deal_size": sum(d["value"] for d in deals) / len(deals) if deals else 0,
            "deal_count": len(deals),
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Pipeline-Daten: {str(e)}"
        )


@router.get(
    "/v2/forecast",
    summary="Forecast Analytics",
    description="Lädt AI-basierte Prognose und Empfehlungen.",
)
async def get_forecast_analytics(
    goal: float = Query(default=30000, description="Monatsziel in €"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Lädt Forecast-Analytics.
    
    **Enthält:**
    - Prognostiziertes Ziel-Datum
    - Benötigte Deals pro Woche
    - AI-Empfehlungen
    - Run-Rate Analyse
    """
    user_id = current_user["id"]
    
    try:
        # Hole aktuelle Revenue-Daten
        revenue_result = await get_revenue_analytics(days=30, current_user=current_user, db=db)
        
        current = revenue_result["current"]
        daily_average = revenue_result["daily_average"]
        
        # Berechne Forecast
        remaining = goal - current
        days_needed = math.ceil(remaining / daily_average) if daily_average > 0 else 999
        
        from datetime import datetime
        target_date = (datetime.now() + timedelta(days=days_needed)).isoformat() if daily_average > 0 else None
        
        # Berechne benötigte Deals
        # Annahme: Durchschnittlicher Deal-Wert = 5000€
        avg_deal_value = 5000
        deals_needed = math.ceil(remaining / avg_deal_value) if avg_deal_value > 0 else 0
        
        # AI-Empfehlungen (vereinfacht)
        recommendations = []
        if daily_average < (goal / 30):
            recommendations.append(
                f"Täglicher Umsatz muss um {((goal / 30) - daily_average):.0f}€ steigen"
            )
        if deals_needed > 0:
            recommendations.append(
                f"Fokussiere auf {math.ceil(deals_needed / 4)} Deals pro Woche"
            )
        if current < goal * 0.5:
            recommendations.append(
                "Pipeline erweitern: Mehr Leads qualifizieren"
            )
        
        return {
            "current": current,
            "goal": goal,
            "daily_average": daily_average,
            "deals_needed": deals_needed,
            "target_date": target_date,
            "recommendations": recommendations,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Berechnen der Forecast: {str(e)}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# NEU v2.1: INTENT-BASIERTES FUNNEL ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/pulse/funnel-by-intent",
    summary="NEU v2.1: Funnel by Message Intent",
    description="Lädt Funnel-Metriken aufgeschlüsselt nach Message Intent.",
)
async def get_funnel_by_intent(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    NEU v2.1: Intent-basiertes Funnel Analytics.
    
    Zeigt Reply-Rate, Ghost-Rate etc. aufgeschlüsselt nach Intent:
    - INTRO: Erste Kontaktaufnahme
    - DISCOVERY: Bedarfsermittlung
    - PITCH: Produkt/Opportunity präsentieren
    - SCHEDULING: Termin vereinbaren
    - CLOSING: Abschluss-Versuch
    - FOLLOW_UP: Nach-fassen
    - REACTIVATION: Ghost reaktivieren
    
    Ermöglicht Intent-basiertes Coaching:
    "Deine CLOSING Messages performen schlecht. Teste kürzere Fragen."
    """
    user_id = current_user["id"]
    
    try:
        result = db.table("pulse_outreach_messages")\
            .select("intent, status")\
            .eq("user_id", user_id)\
            .gte("sent_at", f"now() - interval '{days} days'")\
            .not_.is_("intent", "null")\
            .execute()
        
        if not result.data:
            return {"intents": [], "total_sent": 0, "overall_reply_rate": 0}
        
        # Aggregiere nach Intent
        from collections import defaultdict
        intent_stats = defaultdict(lambda: {"sent": 0, "seen": 0, "replied": 0, "ghosted": 0})
        
        for row in result.data:
            intent = row.get("intent", "follow_up")
            status = row.get("status", "sent")
            
            intent_stats[intent]["sent"] += 1
            if status in ("seen", "replied", "ghosted"):
                intent_stats[intent]["seen"] += 1
            if status == "replied":
                intent_stats[intent]["replied"] += 1
            if status == "ghosted":
                intent_stats[intent]["ghosted"] += 1
        
        # Berechne Rates und baue Response
        intents = []
        total_sent = 0
        total_replied = 0
        
        for intent, stats in intent_stats.items():
            sent = stats["sent"]
            seen = stats["seen"]
            replied = stats["replied"]
            ghosted = stats["ghosted"]
            
            reply_rate = round(replied / seen * 100, 1) if seen > 0 else 0
            ghost_rate = round(ghosted / seen * 100, 1) if seen > 0 else 0
            
            total_sent += sent
            total_replied += replied
            
            intents.append({
                "intent": intent,
                "sent_count": sent,
                "seen_count": seen,
                "replied_count": replied,
                "ghosted_count": ghosted,
                "reply_rate": reply_rate,
                "ghost_rate": ghost_rate,
            })
        
        # Sortiere nach sent_count
        intents.sort(key=lambda x: x["sent_count"], reverse=True)
        
        # Best/Worst Intent bestimmen (min 5 Sends für Signifikanz)
        valid_intents = [i for i in intents if i["sent_count"] >= 5]
        best_intent = max(valid_intents, key=lambda x: x["reply_rate"])["intent"] if valid_intents else None
        worst_intent = min(valid_intents, key=lambda x: x["reply_rate"])["intent"] if valid_intents else None
        
        return {
            "intents": intents,
            "total_sent": total_sent,
            "overall_reply_rate": round(total_replied / total_sent * 100, 1) if total_sent > 0 else 0,
            "best_intent": best_intent,
            "worst_intent": worst_intent,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden des Intent-Funnels: {str(e)}"
        )


@router.get(
    "/pulse/ghost-stats-by-type",
    summary="NEU v2.1: Ghost Stats by Type",
    description="Lädt Ghost-Statistiken nach Soft vs Hard.",
)
async def get_ghost_stats_by_type(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    NEU v2.1: Ghost-Statistiken nach Typ.
    
    SOFT GHOST: Kürzlich gesehen, evtl. busy
    HARD GHOST: Lange her, ignoriert aktiv
    
    Zeigt:
    - Anzahl Soft vs Hard Ghosts
    - Reaktivierungs-Rate pro Typ
    """
    user_id = current_user["id"]
    
    try:
        result = db.table("pulse_outreach_messages")\
            .select("ghost_type, status, follow_up_sent, follow_up_message_id")\
            .eq("user_id", user_id)\
            .eq("status", "ghosted")\
            .gte("sent_at", f"now() - interval '{days} days'")\
            .execute()
        
        soft_ghosts = 0
        hard_ghosts = 0
        soft_reactivated = 0
        hard_reactivated = 0
        
        for row in result.data or []:
            ghost_type = row.get("ghost_type")
            
            if ghost_type == "soft":
                soft_ghosts += 1
            elif ghost_type == "hard":
                hard_ghosts += 1
            else:
                # Fallback: Klassifiziere basierend auf anderen Kriterien
                soft_ghosts += 1
        
        # Prüfe Reactivation
        for row in result.data or []:
            if row.get("follow_up_sent") and row.get("follow_up_message_id"):
                # Check if follow-up got reply
                follow_up = db.table("pulse_outreach_messages")\
                    .select("status")\
                    .eq("id", row["follow_up_message_id"])\
                    .single()\
                    .execute()
                
                if follow_up.data and follow_up.data.get("status") == "replied":
                    if row.get("ghost_type") == "soft":
                        soft_reactivated += 1
                    elif row.get("ghost_type") == "hard":
                        hard_reactivated += 1
        
        return {
            "soft_ghosts": soft_ghosts,
            "hard_ghosts": hard_ghosts,
            "soft_reactivation_rate": round(soft_reactivated / soft_ghosts * 100, 1) if soft_ghosts > 0 else 0,
            "hard_reactivation_rate": round(hard_reactivated / hard_ghosts * 100, 1) if hard_ghosts > 0 else 0,
            "soft_reactivated": soft_reactivated,
            "hard_reactivated": hard_reactivated,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Ghost-Stats: {str(e)}"
        )