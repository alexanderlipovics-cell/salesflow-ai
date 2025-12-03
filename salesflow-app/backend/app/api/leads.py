"""
Sales Flow AI - Leads API
CRUD Operationen für Leads.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

from app.core.database import get_supabase
from app.core.auth import get_current_user, User

router = APIRouter()


# ===========================================
# ENUMS & MODELS
# ===========================================

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    WON = "won"
    LOST = "lost"
    DORMANT = "dormant"
    ON_HOLD = "on_hold"


class LeadPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class LeadCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    priority: LeadPriority = LeadPriority.MEDIUM
    notes: Optional[str] = None
    source: Optional[str] = "manual"


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[LeadStatus] = None
    priority: Optional[LeadPriority] = None
    notes: Optional[str] = None


class LeadResponse(BaseModel):
    id: str
    name: str
    company: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    status: str
    priority: str
    notes: Optional[str]
    source: Optional[str]
    last_contact: Optional[str]
    created_at: str
    updated_at: str


# ===========================================
# ENDPOINTS
# ===========================================

@router.get("")
async def get_leads(
    user_id: Optional[str] = Query(None),
    status: Optional[LeadStatus] = None,
    priority: Optional[LeadPriority] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    user: Optional[User] = Depends(get_current_user)
):
    """
    Alle Leads abrufen.
    Filtert automatisch nach User/Workspace.
    """
    supabase = get_supabase()
    
    # Build query
    query = supabase.table("leads").select("*")
    
    # Filter by user_id (from query param or auth)
    if user:
        query = query.eq("user_id", user.id)
    elif user_id:
        query = query.eq("user_id", user_id)
    
    # Apply filters
    if status:
        query = query.eq("status", status.value)
    if priority:
        query = query.eq("priority", priority.value)
    
    # Pagination
    query = query.range(offset, offset + limit - 1)
    query = query.order("created_at", desc=True)
    
    try:
        result = query.execute()
        return {"leads": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{lead_id}")
async def get_lead(
    lead_id: str,
    user: Optional[User] = Depends(get_current_user)
):
    """Einzelnen Lead abrufen."""
    supabase = get_supabase()
    
    try:
        result = supabase.table("leads").select("*").eq("id", lead_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Lead nicht gefunden")
        
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_lead(
    lead: LeadCreate,
    user: Optional[User] = Depends(get_current_user)
):
    """Neuen Lead erstellen."""
    supabase = get_supabase()
    
    data = lead.model_dump()
    if user:
        data["user_id"] = user.id
    
    try:
        result = supabase.table("leads").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{lead_id}")
async def update_lead(
    lead_id: str,
    lead: LeadUpdate,
    user: Optional[User] = Depends(get_current_user)
):
    """Lead aktualisieren."""
    supabase = get_supabase()
    
    # Only include non-None values
    data = {k: v for k, v in lead.model_dump().items() if v is not None}
    data["updated_at"] = datetime.utcnow().isoformat()
    
    try:
        result = supabase.table("leads").update(data).eq("id", lead_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Lead nicht gefunden")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    user: Optional[User] = Depends(get_current_user)
):
    """Lead löschen (Soft Delete)."""
    supabase = get_supabase()
    
    try:
        # Soft delete
        result = supabase.table("leads").update({
            "deleted_at": datetime.utcnow().isoformat()
        }).eq("id", lead_id).execute()
        
        return {"success": True, "id": lead_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

