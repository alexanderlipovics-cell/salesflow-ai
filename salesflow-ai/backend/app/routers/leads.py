"""
Leads Router für FELLO - Lead Management mit Follow-up System.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import logging

from ..core.deps import get_supabase

router = APIRouter(prefix="/leads", tags=["leads"])
logger = logging.getLogger(__name__)


class LeadCreate(BaseModel):
    name: str
    platform: str = "WhatsApp"
    status: str  # PFLICHT
    temperature: int = 50
    tags: List[str] = []
    last_message: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up: Optional[date] = None  # PFLICHT bei Import
    follow_up_reason: Optional[str] = None


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    temperature: Optional[int] = None
    last_message: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up: Optional[date] = None
    follow_up_reason: Optional[str] = None
    last_contact: Optional[date] = None


@router.get("")
async def get_leads(db=Depends(get_supabase)):
    """Alle Leads abrufen"""
    try:
        result = db.table("leads").select("*").order("next_follow_up").execute()
        return {"leads": result.data}
    except Exception as e:
        logger.exception(f"Get leads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending")
async def get_pending_leads(db=Depends(get_supabase)):
    """Leads mit fälligen Follow-ups (heute oder überfällig)"""
    try:
        today = date.today().isoformat()
        result = db.table("leads").select("*").lte("next_follow_up", today).order("next_follow_up").execute()
        return {"leads": result.data, "count": len(result.data)}
    except Exception as e:
        logger.exception(f"Get pending leads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_lead(lead: LeadCreate, db=Depends(get_supabase)):
    """Neuen Lead erstellen"""
    try:
        # Validierung: Status und Follow-up sind Pflicht
        if not lead.status:
            raise HTTPException(status_code=400, detail="Status ist Pflichtfeld")
        if not lead.next_follow_up:
            raise HTTPException(status_code=400, detail="Follow-up Datum ist Pflichtfeld")
        
        data = lead.model_dump()
        data["next_follow_up"] = data["next_follow_up"].isoformat() if data["next_follow_up"] else None
        
        result = db.table("leads").insert(data).execute()
        return {"lead": result.data[0], "message": "Lead erstellt"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Create lead error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{lead_id}")
async def update_lead(lead_id: str, lead: LeadUpdate, db=Depends(get_supabase)):
    """Lead aktualisieren (nach Kontakt)"""
    try:
        data = {k: v for k, v in lead.model_dump().items() if v is not None}
        if "next_follow_up" in data and data["next_follow_up"]:
            data["next_follow_up"] = data["next_follow_up"].isoformat()
        if "last_contact" in data and data["last_contact"]:
            data["last_contact"] = data["last_contact"].isoformat()
        data["updated_at"] = datetime.now().isoformat()
        
        result = db.table("leads").update(data).eq("id", lead_id).execute()
        return {"lead": result.data[0], "message": "Lead aktualisiert"}
    except Exception as e:
        logger.exception(f"Update lead error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, db=Depends(get_supabase)):
    """Lead löschen"""
    try:
        db.table("leads").delete().eq("id", lead_id).execute()
        return {"message": "Lead gelöscht"}
    except Exception as e:
        logger.exception(f"Delete lead error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router"]

