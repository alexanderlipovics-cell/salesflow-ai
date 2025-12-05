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
    """
    Gibt alle Leads zurück, deren next_follow_up heute oder früher ist.
    GET /api/leads/pending
    """
    try:
        db = get_supabase()
        today = date.today().isoformat()
        logger.info(f"Fetching pending leads for date: {today}")
        result = db.table("leads").select("*").lte("next_follow_up", today).order("next_follow_up").execute()
        logger.info(f"Found {len(result.data)} pending leads")
        return {"leads": result.data, "count": len(result.data)}
    except Exception as e:
        logger.exception(f"Get pending leads error: {e}")
        # Return empty list statt 500 error für bessere UX
        return {"leads": [], "count": 0, "error": str(e)}


@router.post("/")
@router.post("")
async def create_lead(request: Request):
    """
    Create a new lead - flexible schema.
    POST /api/leads oder POST /api/leads/
    
    Akzeptiert sowohl snake_case (last_message) als auch camelCase (lastMessage).
    """
    import json
    try:
        body = await request.body()
        logger.info(f"Create lead - Raw body: {body[:500] if body else 'empty'}")
        
        if not body:
            return {"success": False, "error": "Empty request body"}
        
        try:
            lead_data = json.loads(body)
        except json.JSONDecodeError as je:
            logger.error(f"JSON decode error: {je}")
            return {"success": False, "error": f"Invalid JSON: {str(je)}"}
        
        logger.info(f"Create lead - Parsed data: {lead_data}")
        
        # Timestamps setzen
        now = datetime.now().isoformat()
        
        # Flexibles Mapping - akzeptiere beide Namenskonventionen
        data = {
            "name": lead_data.get("name", "Unbekannt"),
            "platform": lead_data.get("platform", "WhatsApp"),
            "status": lead_data.get("status", "NEW"),
            "temperature": lead_data.get("temperature", 50),
            # snake_case ODER camelCase
            "next_follow_up": lead_data.get("next_follow_up") or lead_data.get("nextFollowUp"),
            "follow_up_reason": lead_data.get("follow_up_reason") or lead_data.get("followUpReason"),
            "last_message": lead_data.get("last_message") or lead_data.get("lastMessage"),
            "notes": lead_data.get("notes"),
            "tags": lead_data.get("tags", []),
            "created_at": now,
            "updated_at": now,
        }
        
        # Entferne None-Werte für sauberen Insert
        data = {k: v for k, v in data.items() if v is not None}
        
        logger.info(f"Create lead - Final data for insert: {data}")
        
        db = get_supabase()
        result = db.table("leads").insert(data).execute()
        
        logger.info(f"Create lead - Insert result: {result.data}")
        return {"success": True, "lead": result.data[0] if result.data else data}
        
    except Exception as e:
        logger.exception(f"Create lead error: {e}")
        return {"success": False, "error": str(e)}


@router.put("/{lead_id}")
async def update_lead(lead_id: str, request: Request):
    import json
    try:
        body = await request.body()
        lead = json.loads(body)
        
        db = get_supabase()
        lead["updated_at"] = datetime.now().isoformat()
        result = db.table("leads").update(lead).eq("id", lead_id).execute()
        return {"lead": result.data[0], "success": True}
    except Exception as e:
        logger.exception(f"Update lead error: {e}")
        return {"error": str(e), "success": False}


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
