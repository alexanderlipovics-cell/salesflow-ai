"""
Mobile API Bridge Router
==========================
Dieser Router stellt die Endpunkte bereit, die die React Native Mobile App erwartet.
Er agiert als Bridge zwischen Mobile-App-Konventionen und dem bestehenden Backend.

Endpoints:
- GET  /api/leads          → Alle Leads des Users
- POST /api/leads          → Neuen Lead erstellen
- PUT  /api/leads/:id      → Lead aktualisieren
- GET  /api/follow-ups     → Alle Follow-ups des Users
- POST /api/follow-ups     → Neues Follow-up erstellen
- PUT  /api/follow-ups/:id → Follow-up aktualisieren (z.B. completed toggle)
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging
import os

from supabase import create_client, Client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Mobile API"])

# ═══════════════════════════════════════════════════════════════════════════════
# SUPABASE CLIENT
# ═══════════════════════════════════════════════════════════════════════════════

def get_supabase() -> Client:
    """Erstellt Supabase Client"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        logger.error("Supabase Konfiguration fehlt")
        raise HTTPException(status_code=500, detail="Database configuration missing")
    
    return create_client(url, key)

# ═══════════════════════════════════════════════════════════════════════════════
# MODELS - LEADS
# ═══════════════════════════════════════════════════════════════════════════════

class LeadBase(BaseModel):
    """Basis Lead Model"""
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    status: str = "new"
    priority: str = "medium"
    source: Optional[str] = None
    notes: Optional[str] = None
    personality_type: Optional[str] = None  # D, I, S, C
    estimated_value: Optional[float] = None

class LeadCreate(LeadBase):
    """Lead erstellen"""
    user_id: str

class LeadUpdate(BaseModel):
    """Lead aktualisieren"""
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    personality_type: Optional[str] = None
    estimated_value: Optional[float] = None

class LeadResponse(LeadBase):
    """Lead Response"""
    id: str
    user_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True

class LeadsListResponse(BaseModel):
    """Liste von Leads"""
    leads: List[LeadResponse]
    total: int

# ═══════════════════════════════════════════════════════════════════════════════
# MODELS - FOLLOW-UPS
# ═══════════════════════════════════════════════════════════════════════════════

class FollowUpBase(BaseModel):
    """Basis Follow-up Model"""
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    action: str = "call"  # call, email, meeting, message, follow_up
    description: str
    due_date: str  # YYYY-MM-DD
    priority: str = "medium"  # low, medium, high

class FollowUpCreate(FollowUpBase):
    """Follow-up erstellen"""
    user_id: str
    completed: bool = False

class FollowUpUpdate(BaseModel):
    """Follow-up aktualisieren"""
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    action: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None

class FollowUpResponse(FollowUpBase):
    """Follow-up Response"""
    id: str
    user_id: Optional[str] = None
    completed: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True

class FollowUpsListResponse(BaseModel):
    """Liste von Follow-ups"""
    follow_ups: List[FollowUpResponse]
    total: int

# ═══════════════════════════════════════════════════════════════════════════════
# LEADS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/api/leads", response_model=LeadsListResponse)
async def get_leads(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=500, description="Max results")
):
    """
    Alle Leads abrufen.
    
    - **user_id**: Nur Leads dieses Users (optional)
    - **status**: Filter nach Status (optional)
    - **limit**: Maximale Anzahl Ergebnisse
    """
    try:
        supabase = get_supabase()
        
        query = supabase.table('leads').select('*')
        
        # Filter by user_id if provided
        if user_id:
            query = query.eq('user_id', user_id)
        
        # Filter by status if provided
        if status:
            query = query.eq('status', status)
        
        # Order and limit
        result = query.order('created_at', desc=True).limit(limit).execute()
        
        leads = result.data or []
        
        return LeadsListResponse(
            leads=leads,
            total=len(leads)
        )
        
    except Exception as e:
        logger.error(f"Error fetching leads: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/leads", response_model=LeadResponse, status_code=201)
async def create_lead(lead: LeadCreate):
    """
    Neuen Lead erstellen.
    """
    try:
        supabase = get_supabase()
        
        lead_data = lead.model_dump(exclude_unset=True)
        
        result = supabase.table('leads').insert(lead_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create lead")
        
        return result.data[0]
        
    except Exception as e:
        logger.error(f"Error creating lead: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, lead: LeadUpdate):
    """
    Lead aktualisieren.
    """
    try:
        supabase = get_supabase()
        
        # Only include fields that were actually set
        update_data = lead.model_dump(exclude_unset=True, exclude_none=True)
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        result = supabase.table('leads').update(update_data).eq('id', lead_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lead: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/leads/{lead_id}", status_code=204)
async def delete_lead(lead_id: str):
    """
    Lead löschen.
    """
    try:
        supabase = get_supabase()
        
        result = supabase.table('leads').delete().eq('id', lead_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lead: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
# FOLLOW-UPS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/api/follow-ups", response_model=FollowUpsListResponse)
async def get_follow_ups(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    limit: int = Query(100, ge=1, le=500, description="Max results")
):
    """
    Alle Follow-ups abrufen.
    
    - **user_id**: Nur Follow-ups dieses Users (optional)
    - **completed**: Filter nach Status (optional)
    - **limit**: Maximale Anzahl Ergebnisse
    """
    try:
        supabase = get_supabase()
        
        query = supabase.table('follow_up_tasks').select('*')
        
        # Filter by user_id if provided
        if user_id:
            query = query.eq('user_id', user_id)
        
        # Filter by completed if provided
        if completed is not None:
            query = query.eq('completed', completed)
        
        # Order by due_date
        result = query.order('due_date', desc=False).limit(limit).execute()
        
        follow_ups = result.data or []
        
        return FollowUpsListResponse(
            follow_ups=follow_ups,
            total=len(follow_ups)
        )
        
    except Exception as e:
        logger.error(f"Error fetching follow-ups: {e}")
        # Fallback: Versuche alternative Tabelle
        try:
            supabase = get_supabase()
            query = supabase.table('tasks').select('*')
            if user_id:
                query = query.eq('user_id', user_id)
            result = query.order('due_date', desc=False).limit(limit).execute()
            return FollowUpsListResponse(
                follow_ups=result.data or [],
                total=len(result.data or [])
            )
        except:
            # Return empty list if table doesn't exist
            return FollowUpsListResponse(follow_ups=[], total=0)


@router.post("/api/follow-ups", response_model=FollowUpResponse, status_code=201)
async def create_follow_up(follow_up: FollowUpCreate):
    """
    Neues Follow-up erstellen.
    """
    try:
        supabase = get_supabase()
        
        follow_up_data = follow_up.model_dump(exclude_unset=True)
        follow_up_data['created_at'] = datetime.utcnow().isoformat()
        
        result = supabase.table('follow_up_tasks').insert(follow_up_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create follow-up")
        
        return result.data[0]
        
    except Exception as e:
        logger.error(f"Error creating follow-up: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/follow-ups/{follow_up_id}", response_model=FollowUpResponse)
async def update_follow_up(follow_up_id: str, follow_up: FollowUpUpdate):
    """
    Follow-up aktualisieren.
    Wird z.B. zum Toggling von 'completed' verwendet.
    """
    try:
        supabase = get_supabase()
        
        # Only include fields that were actually set
        update_data = follow_up.model_dump(exclude_unset=True, exclude_none=True)
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        result = supabase.table('follow_up_tasks').update(update_data).eq('id', follow_up_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Follow-up not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating follow-up: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/follow-ups/{follow_up_id}", status_code=204)
async def delete_follow_up(follow_up_id: str):
    """
    Follow-up löschen.
    """
    try:
        supabase = get_supabase()
        
        result = supabase.table('follow_up_tasks').delete().eq('id', follow_up_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Follow-up not found")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting follow-up: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD STATS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/api/dashboard/stats")
async def get_dashboard_stats(user_id: str = Query(..., description="User ID")):
    """
    Dashboard Statistiken für die Mobile App.
    """
    try:
        supabase = get_supabase()
        
        # Leads count
        leads_result = supabase.table('leads').select('id', count='exact').eq('user_id', user_id).execute()
        total_leads = leads_result.count or 0
        
        # Open follow-ups
        try:
            follow_ups_result = supabase.table('follow_up_tasks').select('id', count='exact')\
                .eq('user_id', user_id)\
                .eq('completed', False)\
                .execute()
            open_follow_ups = follow_ups_result.count or 0
        except:
            open_follow_ups = 0
        
        # Today's tasks
        today = datetime.utcnow().strftime('%Y-%m-%d')
        try:
            today_result = supabase.table('follow_up_tasks').select('id', count='exact')\
                .eq('user_id', user_id)\
                .eq('due_date', today)\
                .eq('completed', False)\
                .execute()
            today_tasks = today_result.count or 0
        except:
            today_tasks = 0
        
        # Leads by status for conversion rate
        won_result = supabase.table('leads').select('id', count='exact')\
            .eq('user_id', user_id)\
            .eq('status', 'won')\
            .execute()
        won_leads = won_result.count or 0
        
        conversion_rate = round((won_leads / total_leads * 100) if total_leads > 0 else 0)
        
        return {
            "totalLeads": total_leads,
            "openFollowUps": open_follow_ups,
            "todayTasks": today_tasks,
            "conversionRate": conversion_rate
        }
        
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

