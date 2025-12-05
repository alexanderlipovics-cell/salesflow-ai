"""
Leads Router für FELLO - Lead Management mit Follow-up System.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import logging
import os
from supabase import create_client

router = APIRouter(prefix="/leads", tags=["leads"])
logger = logging.getLogger(__name__)


def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    return create_client(url, key)


class LeadCreate(BaseModel):
    name: str
    platform: str = "WhatsApp"
    status: str
    temperature: int = 50
    tags: List[str] = []
    last_message: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up: Optional[str] = None
    follow_up_reason: Optional[str] = None


@router.get("")
async def get_leads():
    try:
        db = get_supabase()
        result = db.table("leads").select("*").order("created_at", desc=True).execute()
        return {"leads": result.data}
    except Exception as e:
        logger.exception(f"Get leads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending")
async def get_pending_leads():
    try:
        db = get_supabase()
        today = date.today().isoformat()
        result = db.table("leads").select("*").lte("next_follow_up", today).order("next_follow_up").execute()
        return {"leads": result.data, "count": len(result.data)}
    except Exception as e:
        logger.exception(f"Get pending error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_lead(request: Request):
    """Lead erstellen - flexibles Schema"""
    try:
        lead = await request.json()
        db = get_supabase()
        
        if not lead.get("name"):
            raise HTTPException(status_code=400, detail="Name ist Pflichtfeld")
        
        data = {
            "name": lead.get("name"),
            "platform": lead.get("platform", "WhatsApp"),
            "status": lead.get("status", "NEW"),
            "temperature": lead.get("temperature", 50),
            "tags": lead.get("tags", []),
            "last_message": lead.get("last_message"),
            "notes": lead.get("notes"),
            "next_follow_up": lead.get("next_follow_up"),
            "follow_up_reason": lead.get("follow_up_reason"),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        
        result = db.table("leads").insert(data).execute()
        return {"lead": result.data[0], "message": "Lead erstellt"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Create lead error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{lead_id}")
async def update_lead(lead_id: str, lead: dict):
    try:
        db = get_supabase()
        lead["updated_at"] = datetime.now().isoformat()
        result = db.table("leads").update(lead).eq("id", lead_id).execute()
        return {"lead": result.data[0], "message": "Lead aktualisiert"}
    except Exception as e:
        logger.exception(f"Update lead error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str):
    try:
        db = get_supabase()
        db.table("leads").delete().eq("id", lead_id).execute()
        return {"message": "Lead gelöscht"}
    except Exception as e:
        logger.exception(f"Delete lead error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router"]
