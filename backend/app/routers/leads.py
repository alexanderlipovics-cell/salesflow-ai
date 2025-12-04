"""
Leads Router
API endpoints for lead management and tracking
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/leads", tags=["Leads"])

# Try to initialize Supabase client
supabase = None
try:
    from app.config import get_settings
    from supabase import create_client
    settings = get_settings()
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized for leads")
except Exception as e:
    logger.warning(f"Supabase not available for leads: {e}")


# --- MODELS ---

class LeadModel(BaseModel):
    """Lead model"""
    id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str = "new"  # new, contacted, qualified, converted, lost
    source: Optional[str] = None
    industry: Optional[str] = None
    notes: Optional[str] = None
    score: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class LeadSearchResponse(BaseModel):
    """Lead search response"""
    count: int
    leads: List[dict]


# --- DEMO DATA ---

_demo_leads = [
    {
        "id": "lead_001",
        "name": "Max Mustermann",
        "email": "max@example.com",
        "phone": "+49 171 1234567",
        "status": "qualified",
        "source": "WhatsApp",
        "industry": "IT",
        "notes": "Interessiert an Premium-Paket",
        "score": 85,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    },
    {
        "id": "lead_002",
        "name": "Anna Schmidt",
        "email": "anna@example.com",
        "phone": "+49 172 2345678",
        "status": "contacted",
        "source": "Website",
        "industry": "Marketing",
        "notes": "Hat Infomaterial angefordert",
        "score": 70,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    },
    {
        "id": "lead_003",
        "name": "Lisa Müller",
        "email": "lisa@example.com",
        "phone": "+49 173 3456789",
        "status": "new",
        "source": "Empfehlung",
        "industry": "Gesundheit",
        "notes": "Termin vereinbaren",
        "score": 60,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    },
    {
        "id": "lead_004",
        "name": "Thomas Weber",
        "email": "thomas@example.com",
        "phone": "+49 174 4567890",
        "status": "converted",
        "source": "Event",
        "industry": "Finance",
        "notes": "Kunde seit 3 Monaten",
        "score": 95,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    },
    {
        "id": "lead_005",
        "name": "Peter Bauer",
        "email": "peter@example.com",
        "phone": "+49 175 5678901",
        "status": "contacted",
        "source": "Social Media",
        "industry": "Retail",
        "notes": "Follow-up nächste Woche",
        "score": 55,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    },
]


# --- ENDPOINTS ---

@router.get("/", response_model=LeadSearchResponse)
@router.get("", response_model=LeadSearchResponse)
async def get_leads(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    query: Optional[str] = Query(None, description="Search in name, email, phone"),
    status: Optional[str] = Query(None, description="Filter by status"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    limit: int = Query(50, ge=1, le=200, description="Max results")
):
    """
    Get all leads with optional filters.
    Returns demo data when database is unavailable.
    """
    # Try Supabase first
    if supabase:
        try:
            db_query = supabase.table('leads').select('*')
            
            if user_id:
                db_query = db_query.eq('user_id', user_id)
            
            if query:
                db_query = db_query.or_(f'name.ilike.%{query}%,email.ilike.%{query}%,phone.ilike.%{query}%')
            
            if status:
                db_query = db_query.eq('status', status)
            
            if industry:
                db_query = db_query.eq('industry', industry)
            
            result = db_query.order('created_at', desc=True).limit(limit).execute()
            
            return {
                "count": len(result.data),
                "leads": result.data
            }
            
        except Exception as e:
            logger.warning(f"Supabase query failed, using demo data: {e}")
    
    # Fallback to demo data
    leads = _demo_leads.copy()
    
    # Apply filters to demo data
    if status:
        leads = [l for l in leads if l.get("status") == status]
    
    if industry:
        leads = [l for l in leads if l.get("industry") == industry]
    
    if query:
        query_lower = query.lower()
        leads = [l for l in leads if 
                 query_lower in l.get("name", "").lower() or 
                 query_lower in l.get("email", "").lower() or
                 query_lower in l.get("phone", "").lower()]
    
    return {
        "count": len(leads[:limit]),
        "leads": leads[:limit]
    }


@router.get("/search", response_model=LeadSearchResponse)
async def search_leads(
    query: Optional[str] = Query(None, description="Search in name, email, phone"),
    status: Optional[str] = Query(None, description="Filter by status"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    limit: int = Query(50, ge=1, le=200, description="Max results")
):
    """Search leads - same as get_leads but without user filter."""
    return await get_leads(user_id=None, query=query, status=status, industry=industry, limit=limit)


@router.get("/stats")
async def get_lead_stats():
    """Get lead statistics."""
    leads = _demo_leads
    
    return {
        "total": len(leads),
        "by_status": {
            "new": len([l for l in leads if l["status"] == "new"]),
            "contacted": len([l for l in leads if l["status"] == "contacted"]),
            "qualified": len([l for l in leads if l["status"] == "qualified"]),
            "converted": len([l for l in leads if l["status"] == "converted"]),
            "lost": len([l for l in leads if l["status"] == "lost"]),
        },
        "avg_score": sum(l.get("score", 0) for l in leads) / len(leads) if leads else 0,
        "high_score_count": len([l for l in leads if l.get("score", 0) >= 70]),
    }


@router.get("/{lead_id}")
async def get_lead(lead_id: str):
    """Get a single lead by ID."""
    # Try Supabase first
    if supabase:
        try:
            result = supabase.table('leads').select('*').eq('id', lead_id).single().execute()
            if result.data:
                return result.data
        except Exception as e:
            logger.warning(f"Supabase query failed: {e}")
    
    # Fallback to demo data
    lead = next((l for l in _demo_leads if l["id"] == lead_id), None)
    if lead:
        return lead
    
    raise HTTPException(status_code=404, detail="Lead nicht gefunden")


@router.post("/", response_model=dict)
async def create_lead(lead: LeadModel):
    """Create a new lead."""
    lead_data = lead.model_dump(exclude_none=True)
    lead_data["id"] = f"lead_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    lead_data["created_at"] = datetime.now().isoformat()
    lead_data["updated_at"] = datetime.now().isoformat()
    
    # Try Supabase first
    if supabase:
        try:
            result = supabase.table('leads').insert(lead_data).execute()
            return {"success": True, "lead": result.data[0] if result.data else lead_data}
        except Exception as e:
            logger.warning(f"Supabase insert failed: {e}")
    
    # Demo mode
    _demo_leads.append(lead_data)
    return {"success": True, "lead": lead_data, "message": "Demo-Modus - Lead nicht persistent gespeichert"}


@router.put("/{lead_id}")
async def update_lead(lead_id: str, lead: LeadModel):
    """Update an existing lead."""
    lead_data = lead.model_dump(exclude_none=True)
    lead_data["updated_at"] = datetime.now().isoformat()
    
    # Try Supabase first
    if supabase:
        try:
            result = supabase.table('leads').update(lead_data).eq('id', lead_id).execute()
            if result.data:
                return {"success": True, "lead": result.data[0]}
        except Exception as e:
            logger.warning(f"Supabase update failed: {e}")
    
    # Demo mode
    for i, l in enumerate(_demo_leads):
        if l["id"] == lead_id:
            _demo_leads[i].update(lead_data)
            return {"success": True, "lead": _demo_leads[i], "message": "Demo-Modus"}
    
    raise HTTPException(status_code=404, detail="Lead nicht gefunden")


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str):
    """Delete a lead."""
    # Try Supabase first
    if supabase:
        try:
            supabase.table('leads').delete().eq('id', lead_id).execute()
            return {"success": True, "message": "Lead gelöscht"}
        except Exception as e:
            logger.warning(f"Supabase delete failed: {e}")
    
    # Demo mode
    global _demo_leads
    _demo_leads = [l for l in _demo_leads if l["id"] != lead_id]
    return {"success": True, "message": "Lead gelöscht (Demo-Modus)"}


# --- ADDITIONAL ENDPOINTS FOR FRONTEND ---

@router.get("/needs-action")
async def get_leads_needs_action(
    user_id: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get leads that need immediate action.
    Prioritized by score, days since last contact, etc.
    """
    if supabase:
        try:
            result = supabase.table('leads').select('*').order('lead_score', desc=True).limit(limit).execute()
            return {"leads": result.data, "count": len(result.data)}
        except Exception as e:
            logger.warning(f"Supabase query failed: {e}")
    
    # Demo data - return highest scored leads
    sorted_leads = sorted(_demo_leads, key=lambda x: x.get("score", 0), reverse=True)
    return {
        "leads": sorted_leads[:limit],
        "count": len(sorted_leads[:limit])
    }


@router.get("/daily-command")
async def get_daily_command_leads(
    user_id: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=50)
):
    """
    Get leads for Daily Command - prioritized task list for today.
    """
    if supabase:
        try:
            # Get leads with pending follow-ups
            result = supabase.table('leads').select('*, lead_tasks(*)').order('lead_score', desc=True).limit(limit).execute()
            return {"leads": result.data, "count": len(result.data)}
        except Exception as e:
            logger.warning(f"Supabase query failed: {e}")
    
    # Demo data
    return {
        "leads": _demo_leads[:limit],
        "count": len(_demo_leads[:limit]),
        "tasks": [
            {"id": "task_1", "lead_id": "lead_001", "action": "follow_up", "priority": "high", "description": "Follow-up nach Präsentation"},
            {"id": "task_2", "lead_id": "lead_002", "action": "call", "priority": "medium", "description": "Rückruf vereinbaren"},
            {"id": "task_3", "lead_id": "lead_003", "action": "email", "priority": "low", "description": "Info-Material senden"},
        ]
    }


@router.post("/from-hunter")
async def create_lead_from_hunter(lead_data: dict):
    """
    Create a new lead from Lead Hunter AI.
    """
    lead = LeadModel(
        name=lead_data.get("name", "Unbekannt"),
        email=lead_data.get("email"),
        phone=lead_data.get("phone"),
        status="new",
        source="Lead Hunter AI",
        notes=lead_data.get("notes", ""),
        score=lead_data.get("score", 50)
    )
    return await create_lead(lead)