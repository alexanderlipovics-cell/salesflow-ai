"""
SALES FLOW AI - DASHBOARD ANALYTICS API ENDPOINTS

FastAPI Endpoints für Dashboard Analytics mit Supabase RPC Integration
Version: 1.0.0
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID

# Auth temporarily disabled for demo
# from app.core.auth import get_current_user, get_workspace_access
# from app.core.supabase import get_supabase_client

# Dummy auth functions for demo
async def get_current_user():
    return {"id": "demo-user", "email": "demo@example.com"}

async def get_workspace_access(workspace_id: str):
    return {"workspace_id": workspace_id, "role": "admin"}

# ============================================================================
# ROUTER SETUP
# ============================================================================

router = APIRouter(
    prefix="/api/analytics/dashboard",
    tags=["Analytics Dashboard"],
)

# ============================================================================
# RESPONSE MODELS
# ============================================================================

class TodayOverviewResponse(BaseModel):
    """Response Model für Today Overview"""
    tasks_due_today: int
    tasks_done_today: int
    leads_created_today: int
    first_messages_today: int
    signups_today: int
    revenue_today: float

class TodayTaskResponse(BaseModel):
    """Response Model für einzelnen Task"""
    task_id: UUID
    contact_id: UUID
    contact_name: Optional[str]
    contact_status: str
    contact_lead_score: int
    task_type: str
    task_due_at: datetime
    task_status: str
    assigned_user_id: Optional[UUID]
    priority: str

class WeekOverviewResponse(BaseModel):
    """Response Model für Week Overview"""
    leads_this_week: int
    first_messages_this_week: int
    signups_this_week: int
    revenue_this_week: float

class WeekTimeseriesPointResponse(BaseModel):
    """Response Model für Timeseries Datenpunkt"""
    day: str  # ISO date string
    leads: int
    signups: int
    first_messages: int

class TopTemplateResponse(BaseModel):
    """Response Model für Top Template"""
    template_id: UUID
    title: str
    purpose: str
    channel: str
    contacts_contacted: int
    contacts_signed: int
    conversion_rate_percent: float

class FunnelStatsResponse(BaseModel):
    """Response Model für Funnel Stats"""
    avg_days_to_signup: float
    median_days_to_signup: float
    min_days_to_signup: float
    max_days_to_signup: float
    contacts_with_signup: int

class TopNetworkerResponse(BaseModel):
    """Response Model für Top Networker"""
    user_id: UUID
    email: str
    name: str
    contacts_contacted: int
    contacts_signed: int
    conversion_rate_percent: float
    active_days: int
    current_streak: int

class NeedsHelpRepResponse(BaseModel):
    """Response Model für Needs Help Rep"""
    user_id: UUID
    email: str
    name: str
    contacts_contacted: int
    contacts_signed: int
    conversion_rate_percent: float
    active_days: int

class DashboardResponse(BaseModel):
    """Aggregiertes Dashboard Response Model"""
    today_overview: Optional[TodayOverviewResponse]
    today_tasks: List[TodayTaskResponse]
    week_overview: Optional[WeekOverviewResponse]
    week_timeseries: List[WeekTimeseriesPointResponse]
    top_templates: List[TopTemplateResponse]
    funnel_stats: Optional[FunnelStatsResponse]
    top_networkers: List[TopNetworkerResponse]
    needs_help: List[NeedsHelpRepResponse]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/today/overview", response_model=TodayOverviewResponse)
async def get_today_overview(
    workspace_id: UUID = Depends(get_workspace_access),
    current_user: dict = Depends(get_current_user),
):
    """
    Heute Dashboard Overview: Tasks, Leads, Signups, Revenue
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.rpc(
            'dashboard_today_overview',
            {'p_workspace_id': str(workspace_id)}
        ).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="No data found")
        
        return TodayOverviewResponse(**result.data[0])
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching today overview: {str(e)}")


@router.get("/today/tasks", response_model=List[TodayTaskResponse])
async def get_today_tasks(
    workspace_id: UUID = Depends(get_workspace_access),
    current_user: dict = Depends(get_current_user),
    limit: int = Query(default=100, ge=1, le=500),
):
    """
    Heute fällige Tasks mit Kontaktdaten
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.rpc(
            'dashboard_today_tasks',
            {
                'p_workspace_id': str(workspace_id),
                'p_limit': limit
            }
        ).execute()
        
        return [TodayTaskResponse(**task) for task in (result.data or [])]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching today tasks: {str(e)}")


@router.get("/week/overview", response_model=WeekOverviewResponse)
async def get_week_overview(
    workspace_id: UUID = Depends(get_workspace_access),
    current_user: dict = Depends(get_current_user),
):
    """
    Wochen Dashboard Overview: Leads, Messages, Signups, Revenue
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.rpc(
            'dashboard_week_overview',
            {'p_workspace_id': str(workspace_id)}
        ).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="No data found")
        
        return WeekOverviewResponse(**result.data[0])
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching week overview: {str(e)}")


@router.get("/week/timeseries", response_model=List[WeekTimeseriesPointResponse])
async def get_week_timeseries(
    workspace_id: UUID = Depends(get_workspace_access),
    current_user: dict = Depends(get_current_user),
):
    """
    Wochen Timeseries: Tägliche Aufschlüsselung Leads, Signups, Messages
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.rpc(
            'dashboard_week_timeseries',
            {'p_workspace_id': str(workspace_id)}
        ).execute()
        
        return [WeekTimeseriesPointResponse(**point) for point in (result.data or [])]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching week timeseries: {str(e)}")


@router.get("/templates/top", response_model=List[TopTemplateResponse])
async def get_top_templates(
    workspace_id: UUID = Depends(get_workspace_access),
    current_user: dict = Depends(get_current_user),
    days_back: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=20, ge=1, le=100),
):
    """
    Top Templates nach Conversion Rate
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.rpc(
            'dashboard_top_templates',
            {
                'p_workspace_id': str(workspace_id),
                'p_days_back': days_back,
                'p_limit': limit
            }
        ).execute()
        
        return [TopTemplateResponse(**template) for template in (result.data or [])]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching top templates: {str(e)}")


@router.get("/funnel/stats", response_model=FunnelStatsResponse)
async def get_funnel_stats(
    workspace_id: UUID = Depends(get_workspace_access),
    current_user: dict = Depends(get_current_user),
):
    """
    Funnel Stats: Zeit von Erstkontakt bis Signup
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.rpc(
            'dashboard_funnel_stats',
            {'p_workspace_id': str(workspace_id)}
        ).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="No funnel data found")
        
        return FunnelStatsResponse(**result.data[0])
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching funnel stats: {str(e)}")


@router.get("/team/top-networkers", response_model=List[TopNetworkerResponse])
async def get_top_networkers(
    workspace_id: UUID = Depends(get_workspace_access),
    current_user: dict = Depends(get_current_user),
    days_back: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=5, ge=1, le=50),
):
    """
    Squad Coach: Top Networkers nach Conversion Rate
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.rpc(
            'dashboard_top_networkers',
            {
                'p_workspace_id': str(workspace_id),
                'p_days_back': days_back,
                'p_limit': limit
            }
        ).execute()
        
        return [TopNetworkerResponse(**networker) for networker in (result.data or [])]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching top networkers: {str(e)}")


@router.get("/team/needs-help", response_model=List[NeedsHelpRepResponse])
async def get_needs_help(
    workspace_id: UUID = Depends(get_workspace_access),
    current_user: dict = Depends(get_current_user),
    days_back: int = Query(default=30, ge=1, le=365),
    min_contacts: int = Query(default=10, ge=1, le=1000),
    limit: int = Query(default=5, ge=1, le=50),
):
    """
    Squad Coach: Reps mit hoher Aktivität aber niedriger Conversion
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.rpc(
            'dashboard_needs_help',
            {
                'p_workspace_id': str(workspace_id),
                'p_days_back': days_back,
                'p_min_contacts': min_contacts,
                'p_limit': limit
            }
        ).execute()
        
        return [NeedsHelpRepResponse(**rep) for rep in (result.data or [])]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching needs help: {str(e)}")


@router.get("/complete", response_model=DashboardResponse)
async def get_complete_dashboard(
    workspace_id: UUID = Depends(get_workspace_access),
    current_user: dict = Depends(get_current_user),
):
    """
    Komplettes Dashboard: Alle Daten in einem Request
    Optimal für initiales Page Load
    """
    try:
        # Alle Daten parallel laden
        today_overview = await get_today_overview(workspace_id, current_user)
        today_tasks = await get_today_tasks(workspace_id, current_user)
        week_overview = await get_week_overview(workspace_id, current_user)
        week_timeseries = await get_week_timeseries(workspace_id, current_user)
        top_templates = await get_top_templates(workspace_id, current_user)
        funnel_stats = await get_funnel_stats(workspace_id, current_user)
        top_networkers = await get_top_networkers(workspace_id, current_user)
        needs_help = await get_needs_help(workspace_id, current_user)
        
        return DashboardResponse(
            today_overview=today_overview,
            today_tasks=today_tasks,
            week_overview=week_overview,
            week_timeseries=week_timeseries,
            top_templates=top_templates,
            funnel_stats=funnel_stats,
            top_networkers=top_networkers,
            needs_help=needs_help,
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching complete dashboard: {str(e)}")


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """
    Health Check für Dashboard Analytics API
    """
    return {
        "status": "healthy",
        "service": "dashboard-analytics",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
