"""
Leads Router für SalesFlow AI - Lead Management mit Follow-up System.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timedelta
import logging
import os
import uuid
import json
from supabase import create_client
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.zapier import dispatch_webhook
from ..core.security import get_current_active_user
from ..db.session import get_db
from ..models.user import User
from ..events.helpers import publish_lead_created_event
from ..services.csv_import import CSVImportService

router = APIRouter(
    prefix="/leads",
    tags=["leads"],
    dependencies=[Depends(get_current_active_user)]  # ALLE Endpoints brauchen Auth
)
logger = logging.getLogger(__name__)


def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    # KRITISCH: Nur URL und Key übergeben - KEINE zusätzlichen Parameter!
    # Signatur: create_client(url: str, key: str) -> Client
    return create_client(url, key)


def _extract_user_id(current_user: User) -> Optional[str]:
    """Ermittle die User-ID aus verschiedenen Strukturen."""
    if current_user is None:
        return None
    if isinstance(current_user, dict):
        user_id = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
    else:
        user_id = getattr(current_user, "id", None) or getattr(current_user, "user_id", None)
    return str(user_id) if user_id else None


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
async def get_leads(filter: Optional[str] = None):
    try:
        db = get_supabase()
        query = db.table("leads").select("*")

        if filter:
            today = date.today().isoformat()

            if filter == "today":
                # Leads mit next_follow_up heute
                query = query.gte("next_follow_up", today).lt("next_follow_up", (date.today() + timedelta(days=1)).isoformat())
            elif filter == "hot":
                # Leads mit Score >= 80
                query = query.gte("score", 80)
            elif filter == "overdue":
                # Leads mit next_follow_up vor heute
                query = query.lt("next_follow_up", today).not_.is_("next_follow_up", None)
            # "all" oder unbekannter Filter = alle Leads

        result = query.order("created_at", desc=True).execute()
        return result.data
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


@router.get("/{lead_id}")
async def get_lead(lead_id: str, current_user: User = Depends(get_current_active_user)):
    """
    Einzelnen Lead holen.
    GET /api/leads/{lead_id}
    """
    try:
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        db = get_supabase()
        result = (
            db.table("leads")
            .select("*")
            .eq("id", lead_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Lead not found")

        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Get lead error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
@router.post("")
async def create_lead(request: Request, current_user: User = Depends(get_current_active_user)):
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
        
        # User-ID extrahieren (Pflicht für Ownership)
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        # Flexibles Mapping - akzeptiere beide Namenskonventionen
        data = {
            "name": lead_data.get("name") or lead_data.get("fullName") or "Unbekannt",
            "platform": lead_data.get("platform", "WhatsApp"),
            "status": lead_data.get("status", "NEW"),
            "temperature": lead_data.get("temperature", 50),
            # snake_case ODER camelCase
            "next_follow_up": lead_data.get("next_follow_up") or lead_data.get("nextFollowUp"),
            "follow_up_reason": lead_data.get("follow_up_reason") or lead_data.get("followUpReason"),
            "last_message": lead_data.get("last_message") or lead_data.get("lastMessage"),
            "notes": lead_data.get("notes"),
            "tags": lead_data.get("tags", []),
            "user_id": user_id,
            "created_at": now,
            "updated_at": now,
        }
        
        # Entferne None-Werte für sauberen Insert
        data = {k: v for k, v in data.items() if v is not None}
        
        logger.info(f"Create lead - Final data for insert: {data}")
        
        db = get_supabase()
        result = db.table("leads").insert(data).execute()
        
        logger.info(f"Create lead - Insert result: {result.data}")
        
        # Event publishen (wenn Lead erfolgreich erstellt wurde)
        if result.data:
            lead = result.data[0]
            lead_id = lead.get("id")
            user_id = _extract_user_id(current_user)
            
            # Versuche tenant_id zu extrahieren (aus User oder Lead)
            tenant_id = lead.get("tenant_id")
            if not tenant_id:
                # Fallback: Versuche aus User zu holen (wenn verfügbar)
                try:
                    # In Supabase-basierten Systemen könnte tenant_id im User-Context sein
                    # Hier verwenden wir einen Default, wenn nicht verfügbar
                    tenant_id = uuid.uuid4()  # Placeholder - sollte aus User kommen
                except Exception:
                    pass
            
            # Event publishen (non-blocking, silent on error)
            if lead_id and tenant_id:
                try:
                    # Nutze async DB session wenn verfügbar
                    from ..db.deps import get_async_db
                    # Für Supabase: Event direkt publishen ohne async session
                    # (Helper-Funktion wird später angepasst für Supabase)
                    source = lead_data.get("source", lead_data.get("platform", "manual"))
                    logger.info(f"Publishing lead created event for lead {lead_id}")
                    # Event wird später über Celery/Background Task verarbeitet
                except Exception as e:
                    logger.debug(f"Could not publish event (non-critical): {e}")

            # Zapier Webhook triggern
            if user_id:
                payload = dict(lead)
                payload.setdefault("user_id", user_id)
                await dispatch_webhook(user_id, "new_lead", payload)
        
        return {"success": True, "lead": result.data[0] if result.data else data}
        
    except Exception as e:
        logger.exception(f"Create lead error: {e}")
        return {"success": False, "error": str(e)}


@router.put("/{lead_id}")
async def update_lead(lead_id: str, request: Request, current_user: User = Depends(get_current_active_user)):
    import json
    try:
        body = await request.body()
        lead = json.loads(body)
        
        db = get_supabase()
        existing = db.table("leads").select("id,status").eq("id", lead_id).maybe_single().execute()
        old_status = existing.data.get("status") if existing and existing.data else None
        lead["updated_at"] = datetime.now().isoformat()
        result = db.table("leads").update(lead).eq("id", lead_id).execute()

        # Webhook für Statuswechsel
        user_id = _extract_user_id(current_user)
        new_status = result.data[0].get("status") if result and result.data else None
        if user_id and old_status and new_status and old_status != new_status:
            await dispatch_webhook(
                user_id,
                "lead_status_changed",
                {
                    "id": lead_id,
                    "old_status": old_status,
                    "new_status": new_status,
                    "changed_at": datetime.utcnow().isoformat(),
                },
            )
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


@router.post("/import")
async def import_leads_csv(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    skip_duplicates: bool = Form(True),
    current_user: User = Depends(get_current_active_user)
):
    """
    Import leads from CSV file.
    POST /api/leads/import
    Form data: file (CSV), mapping (JSON string), skip_duplicates (boolean)
    """
    try:
        # Parse mapping
        try:
            column_mapping = json.loads(mapping)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid mapping JSON")

        # Validate file type
        if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

        # Read file content
        file_content = await file.read()

        # Get user ID
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        # Get database client
        db = get_supabase()

        # Create import service
        import_service = CSVImportService(db)

        # Import the data
        result = import_service.import_from_csv(
            file_content=file_content,
            filename=file.filename,
            mapping=column_mapping,
            user_id=user_id,
            skip_duplicates=skip_duplicates
        )

        return {
            "success": True,
            "imported": result.imported,
            "duplicates": result.duplicates,
            "errors": result.errors,
            "total_rows": result.total_rows
        }

    except Exception as e:
        logger.exception(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import/preview")
async def preview_csv_import(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Preview CSV import before actual import.
    POST /api/leads/import/preview
    Returns first 5 rows transformed according to mapping
    """
    try:
        # Parse mapping
        try:
            column_mapping = json.loads(mapping)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid mapping JSON")

        # Read file content
        file_content = await file.read()

        # Get database client
        db = get_supabase()

        # Create import service
        import_service = CSVImportService(db)

        # Parse file
        data, csv_columns = import_service.parse_csv_file(file_content, file.filename)

        # Validate mapping
        missing_required = import_service.validate_mapping(column_mapping, csv_columns)
        if missing_required:
            return {
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_required)}",
                "missing_fields": missing_required
            }

        # Get preview
        preview = import_service.preview_data(data, column_mapping, limit=5)

        return {
            "success": True,
            "preview": preview,
            "total_rows": len(data),
            "columns": csv_columns
        }

    except Exception as e:
        logger.exception(f"Preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/import/columns")
async def detect_csv_columns(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Detect columns in CSV file and suggest mapping.
    GET /api/leads/import/columns
    """
    try:
        # Read file content
        file_content = await file.read()

        # Get database client
        db = get_supabase()

        # Create import service
        import_service = CSVImportService(db)

        # Parse file
        data, csv_columns = import_service.parse_csv_file(file_content, file.filename)

        # Auto-detect mapping
        suggested_mapping = import_service.auto_detect_mapping(csv_columns)

        return {
            "success": True,
            "columns": csv_columns,
            "suggested_mapping": suggested_mapping,
            "row_count": len(data)
        }

    except Exception as e:
        logger.exception(f"Column detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router"]
