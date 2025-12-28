"""
Leads Router für Al Sales Solutions - Lead Management mit Follow-up System.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Query
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
from app.services.activity_logger import ActivityLogger
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
async def get_leads(
    filter: Optional[str] = None,
    status: Optional[str] = None,
    period: Optional[str] = None,
    customers: bool = Query(default=False, description="Wenn true → nur Kunden (status='won')"),
    current_user: User = Depends(get_current_active_user),
):
    try:
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        db = get_supabase()
        query = db.table("leads").select("*").eq("user_id", user_id)

        # Kundenfilter
        if customers:
            query = query.eq("status", "won")
        elif status:
            query = query.eq("status", status)

        # Perioden-Filter (z.B. period=this_month)
        if period == "this_month":
            start_of_month = date.today().replace(day=1).isoformat()
            query = query.gte("created_at", start_of_month)

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

        if customers:
            # Kunden nach customer_since (falls vorhanden) absteigend
            query = query.order("customer_since", desc=True).order("created_at", desc=True)
        else:
            query = query.order("created_at", desc=True)

        result = query.execute()
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
        # DEBUG: Authorization Header prüfen
        auth_header = request.headers.get("Authorization")
        logger.info(f"🔍 DEBUG create_lead - Authorization header: {auth_header}")

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
        logger.info(f"🔍 DEBUG create_lead - current_user: {current_user}")
        logger.info(f"🔍 DEBUG create_lead - extracted user_id: {user_id}")
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

            # Social Media Felder - direkt aus lead_data übernehmen
            "email": lead_data.get("email"),
            "phone": lead_data.get("phone"),
            "whatsapp": lead_data.get("whatsapp"),
            "instagram": lead_data.get("instagram"),  # ← WICHTIG: Muss aus Frontend kommen
            "instagram_handle": lead_data.get("instagram_handle"),  # ← ALLE Felder speichern
            "instagram_url": lead_data.get("instagram_url"),        # ← ALLE Felder speichern
            "facebook": lead_data.get("facebook"),
            "linkedin": lead_data.get("linkedin"),

            "user_id": user_id,
            "created_at": now,
            "updated_at": now,
        }

        logger.info(f"🔍 DEBUG create_lead - Social fields: instagram={data.get('instagram')}, instagram_handle={data.get('instagram_handle')}, instagram_url={data.get('instagram_url')}, whatsapp={data.get('whatsapp')}")
        
        # Entferne None-Werte für sauberen Insert
        data = {k: v for k, v in data.items() if v is not None}
        
        logger.info(f"Create lead - Final data for insert: {data}")
        
        db = get_supabase()
        
        # Duplikat-Check vor dem Speichern
        from app.utils.lead_duplicate_check import create_lead_if_not_exists
        
        lead, was_created = await create_lead_if_not_exists(
            db=db,
            lead_data=data,
            user_id=user_id,
        )
        
        logger.info(f"Create lead - {'Created new' if was_created else 'Already exists'}: {lead.get('id')} - {lead.get('name')}")
        
        result_data = [lead]  # Für Kompatibilität mit altem Code
        
        # Event publishen (wenn Lead erfolgreich erstellt wurde)
        if result_data:
            lead_obj = result_data[0]
            lead_id = lead_obj.get("id")
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

            # Zapier Webhook triggern (nur wenn neu erstellt)
            if user_id and was_created:
                payload = dict(lead_obj)
                payload.setdefault("user_id", user_id)
                await dispatch_webhook(user_id, "new_lead", payload)

                # Activity Logging
                activity = ActivityLogger(db, user_id)
                await activity.log(
                    action_type="created" if was_created else "accessed",
                    entity_type="lead",
                    entity_id=lead_id,
                    entity_name=lead_obj.get("name"),
                    details={"source": "api", "was_created": was_created},
                    source="ui",
                )
        
        return {
            "success": True,
            "lead": lead_obj,
            "was_created": was_created,
            "message": f"{lead_obj.get('name')} wurde {'neu angelegt' if was_created else 'ist bereits gespeichert'}."
        }
        
    except Exception as e:
        logger.exception(f"Create lead error: {e}")
        return {"success": False, "error": str(e)}


@router.put("/{lead_id}")
@router.patch("/{lead_id}")
async def update_lead(lead_id: str, request: Request, current_user: User = Depends(get_current_active_user)):
    import json
    try:
        body = await request.body()
        lead = json.loads(body)

        # Leere/Null-Felder bereinigen, insbesondere für UNIQUE-Felder
        lead = {k: v for k, v in lead.items() if v is not None}

        # E-Mail leer/null entfernen, um UNIQUE-Constraint-Probleme zu vermeiden
        if "email" in lead and (lead["email"] is None or lead["email"] == ""):
            lead.pop("email")

        # Weitere Felder von Leerstrings befreien
        fields_to_clean = ["email", "phone", "whatsapp", "instagram", "linkedin"]
        for field in fields_to_clean:
            if field in lead and lead[field] == "":
                lead[field] = None
        
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

        if user_id:
            activity = ActivityLogger(db, user_id)
            updated_lead = result.data[0] if result and result.data else {}
            update_data = lead
            await activity.log(
                action_type="updated",
                entity_type="lead",
                entity_id=lead_id,
                entity_name=updated_lead.get("name"),
                details={"fields_changed": list(update_data.keys())},
                source="ui",
            )
            if update_data.get("status") == "won":
                await activity.log(
                    action_type="converted",
                    entity_type="lead",
                    entity_id=lead_id,
                    entity_name=updated_lead.get("name"),
                    details={"conversion_type": "sale"},
                    source="ui",
                )
        return {"lead": result.data[0], "success": True}
    except Exception as e:
        logger.exception(f"Update lead error: {e}")
        return {"error": str(e), "success": False}


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, current_user: User = Depends(get_current_active_user)):
    try:
        db = get_supabase()
        db.table("leads").delete().eq("id", lead_id).execute()
        user_id = _extract_user_id(current_user)
        if user_id:
            activity = ActivityLogger(db, user_id)
            await activity.log(
                action_type="deleted",
                entity_type="lead",
                entity_id=lead_id,
                source="ui",
            )
        return {"message": "Lead gelöscht"}
    except Exception as e:
        logger.exception(f"Delete lead error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
async def import_leads(
    request: Request,
    file: UploadFile = File(None),
    mapping: str = Form(None),
    skip_duplicates: bool = Form(True),
    current_user: User = Depends(get_current_active_user),
):
    """
    Bulk-Import für Leads.

    Unterstützt:
    - JSON Body: { "leads": [ ... ] }
    - Multipart Upload wie bisher (file + mapping)
    """
    try:
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        content_type = request.headers.get("content-type", "")

        # JSON-basierter Import (neues Verhalten für UI)
        if content_type.startswith("application/json"):
            try:
                data = await request.json()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid JSON body")

            leads = data.get("leads", [])
            if not isinstance(leads, list):
                raise HTTPException(status_code=400, detail="Leads payload must be a list")

            db = get_supabase()
            imported = 0
            errors = 0

            for lead in leads:
                try:
                    lead_data = {
                        "user_id": user_id,
                        "name": lead.get("name", "Unbekannt"),
                        "email": lead.get("email"),
                        "phone": lead.get("phone"),
                        "company": lead.get("company"),
                        "status": lead.get("status", "new"),
                        "temperature": lead.get("temperature", "warm"),
                        "notes": lead.get("notes"),
                        "source": lead.get("source", "csv_import"),
                    }
                    lead_data = {k: v for k, v in lead_data.items() if v is not None}
                    db.table("leads").insert(lead_data).execute()
                    imported += 1
                except Exception as e:
                    logger.debug(f"Lead import skipped: {e}")
                    errors += 1
                    continue

            return {"imported": imported, "errors": errors, "total": len(leads)}

        # Fallback: bestehender CSV-Upload (multipart)
        if not file or not mapping:
            raise HTTPException(status_code=400, detail="File and mapping are required for CSV import")

        try:
            column_mapping = json.loads(mapping)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid mapping JSON")

        if not file.filename.lower().endswith((".csv", ".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

        file_content = await file.read()
        db = get_supabase()
        import_service = CSVImportService(db)
        result = import_service.import_from_csv(
            file_content=file_content,
            filename=file.filename,
            mapping=column_mapping,
            user_id=user_id,
            skip_duplicates=skip_duplicates,
        )

        return {
            "success": True,
            "imported": result.imported,
            "duplicates": result.duplicates,
            "errors": result.errors,
            "total_rows": result.total_rows,
        }

    except HTTPException:
        raise
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


class MessageSentBody(BaseModel):
    """Request body für message-sent Endpoint"""
    message: Optional[str] = None
    channel: str = "instagram"


@router.post("/{lead_id}/message-sent")
async def mark_message_sent(
    lead_id: str,
    body: MessageSentBody,
    current_user: User = Depends(get_current_active_user),
):
    """
    Markiert dass eine Nachricht an einen Lead gesendet wurde.
    Setzt automatisch den Lead-Status auf "contacted" und loggt die Interaktion.
    """
    try:
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        db = get_supabase()
        now = datetime.utcnow()

        # Prüfe ob Lead existiert und dem User gehört
        lead_result = (
            db.table("leads")
            .select("*")
            .eq("id", lead_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not lead_result.data:
            raise HTTPException(status_code=404, detail="Lead nicht gefunden")

        lead = lead_result.data

        # 1. Lead-Status auf "contacted" setzen
        db.table("leads").update({
            "status": "contacted",
            "last_contact": now.isoformat(),
            "last_outreach_at": now.isoformat(),
        }).eq("id", lead_id).eq("user_id", user_id).execute()

        # 2. Interaktion loggen
        try:
            db.table("lead_interactions").insert({
                "id": str(uuid.uuid4()),
                "lead_id": lead_id,
                "user_id": user_id,
                "interaction_type": "message_sent",
                "channel": body.channel.lower(),
                "notes": f"Nachricht gesendet via {body.channel}",
                "interaction_at": now.isoformat(),
                "raw_notes": (body.message or "")[:500],
            }).execute()
        except Exception as e:
            logger.warning(f"Could not log interaction: {e}")

        # 3. Follow-up für 3 Tage später erstellen (falls noch keins existiert)
        try:
            existing_followup = (
                db.table("followup_suggestions")
                .select("id")
                .eq("lead_id", lead_id)
                .eq("user_id", user_id)
                .eq("status", "pending")
                .limit(1)
                .execute()
            )

            if not existing_followup.data:
                followup_date = now + timedelta(days=3)
                db.table("followup_suggestions").insert({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "lead_id": lead_id,
                    "flow": "ERSTKONTAKT",
                    "stage": 1,
                    "template_key": "FIRST_CONTACT_FOLLOWUP",
                    "channel": body.channel.upper(),
                    "suggested_message": f"Hey {lead.get('name', '').split()[0] if lead.get('name') else 'du'}, ich wollte nochmal kurz nachhaken - hast du meine Nachricht gesehen? 🙂",
                    "reason": "Auto-Follow-up nach Erstnachricht",
                    "due_at": followup_date.isoformat(),
                    "status": "pending",
                    "title": f"Follow-up: {lead.get('name', 'Lead')}",
                    "priority": "medium",
                    "source": "auto_after_message_sent",
                    "created_at": now.isoformat(),
                }).execute()
        except Exception as e:
            logger.warning(f"Could not create follow-up: {e}")

        return {
            "success": True,
            "lead_id": lead_id,
            "lead_name": lead.get("name"),
            "status": "contacted",
            "message": "Nachricht protokolliert und Status aktualisiert"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error marking message as sent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{lead_id}/interactions")
async def get_lead_interactions(
    lead_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Holt alle Interaktionen für einen Lead.
    GET /api/leads/{lead_id}/interactions
    """
    try:
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        db = get_supabase()
        
        # Prüfe ob Lead existiert und dem User gehört
        lead_check = (
            db.table("leads")
            .select("id")
            .eq("id", lead_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        
        if not lead_check.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Versuche lead_interactions Tabelle
        try:
            result = (
                db.table("lead_interactions")
                .select("*")
                .eq("lead_id", lead_id)
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            
            return result.data or []
        except Exception as e:
            # Falls Tabelle nicht existiert, return leere Liste
            logger.warning(f"Error loading interactions: {e}")
            return []

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting lead interactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# EXCEL/CSV BULK IMPORT
# ============================================================================

STATUS_MAP = {
    "interessiert": ("qualified", "warm", 60),
    "termin vereinbart": ("meeting", "hot", 90),
    "kein interesse": ("lost", "cold", 0),
    "neu": ("new", "cold", 20),
    "kontaktiert": ("contacted", "warm", 40),
    # Englische Varianten
    "interested": ("qualified", "warm", 60),
    "appointment scheduled": ("meeting", "hot", 90),
    "not interested": ("lost", "cold", 0),
    "new": ("new", "cold", 20),
    "contacted": ("contacted", "warm", 40),
}


def map_status_to_internal(status_string: str) -> tuple[str, str, int]:
    """Map Excel/CSV Status to internal status, temperature and score."""
    if not status_string:
        return "new", "cold", 20

    status_lower = str(status_string).lower().strip()

    # Exact match
    if status_lower in STATUS_MAP:
        return STATUS_MAP[status_lower]

    # Partial match
    for key, (status, temp, score) in STATUS_MAP.items():
        if key in status_lower:
            return status, temp, score

    # Default fallback
    return "new", "cold", 20


def parse_date(date_string: str) -> Optional[str]:
    """Parse various date formats to ISO string."""
    if not date_string:
        return None

    try:
        # Try common German/English formats
        from datetime import datetime
        formats = [
            "%d.%m.%Y",  # 25.12.2023
            "%d/%m/%Y",  # 25/12/2023
            "%Y-%m-%d",  # 2023-12-25
            "%d.%m.%y",  # 25.12.23
            "%m/%d/%Y",  # 12/25/2023
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(str(date_string).strip(), fmt)
                return dt.isoformat()
            except ValueError:
                continue

        return None
    except Exception:
        return None


@router.post("/bulk-import")
async def bulk_import_leads(
    request: Request,
    current_user: User = Depends(get_current_active_user)
):
    """
    Bulk import leads from Excel/CSV data.
    POST /api/leads/bulk-import

    Expected format:
    {
        "leads": [
            {
                "name": "Max Müller",
                "email": "max@example.com",
                "phone": "+49123456",
                "company": "Firma GmbH",
                "status": "Interessiert",  // German status
                "notes": "Bestehender Kunde",
                "last_contact_at": "25.12.2023",
                "instagram": "@maxmueller",
                "whatsapp": "+49123456"
            }
        ],
        "merge_duplicates": true,  // Merge statt überschreiben bei Duplikaten
        "update_existing": false   // Nur neue Leads erstellen
    }
    """
    try:
        body = await request.body()
        logger.info(f"Bulk import - Raw body length: {len(body) if body else 0}")

        if not body:
            return {"success": False, "error": "Empty request body"}

        data = json.loads(body)
        leads_data = data.get("leads", [])
        merge_duplicates = data.get("merge_duplicates", True)
        update_existing = data.get("update_existing", False)

        if not leads_data:
            return {"success": False, "error": "No leads data provided"}

        logger.info(f"Bulk import - Processing {len(leads_data)} leads, merge: {merge_duplicates}")

        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        db = get_supabase()

        results = {
            "total_processed": len(leads_data),
            "created": 0,
            "updated": 0,
            "duplicates_skipped": 0,
            "errors": 0,
            "leads": []
        }

        for idx, lead_data in enumerate(leads_data):
            try:
                logger.debug(f"Processing lead {idx + 1}: {lead_data.get('name', 'Unknown')}")

                # Basic validation - Name is required
                name = lead_data.get("name") or lead_data.get("fullName") or lead_data.get("Name")
                if not name or str(name).strip() == "":
                    results["errors"] += 1
                    continue

                # Map status to internal format
                status_string = lead_data.get("status") or lead_data.get("Status") or ""
                internal_status, temperature, score = map_status_to_internal(status_string)

                # Parse dates
                last_contact_at = parse_date(lead_data.get("last_contact_at") or lead_data.get("last_contact"))
                created_at = parse_date(lead_data.get("created_at") or lead_data.get("created")) or datetime.now().isoformat()

                # Prepare lead data
                lead = {
                    "user_id": user_id,
                    "name": str(name).strip(),
                    "email": lead_data.get("email") or lead_data.get("Email"),
                    "phone": lead_data.get("phone") or lead_data.get("Phone") or lead_data.get("Telefon"),
                    "whatsapp": lead_data.get("whatsapp") or lead_data.get("WhatsApp"),
                    "instagram": lead_data.get("instagram") or lead_data.get("Instagram"),
                    "company": lead_data.get("company") or lead_data.get("Company") or lead_data.get("Firma"),
                    "status": internal_status,
                    "temperature": temperature,
                    "score": score,
                    "notes": lead_data.get("notes") or lead_data.get("Notes") or lead_data.get("Bemerkungen"),
                    "last_message": lead_data.get("last_message") or lead_data.get("letzte_nachricht"),
                    "last_contact_at": last_contact_at,
                    "created_at": created_at,
                    "updated_at": datetime.now().isoformat(),
                }

                # Remove None values and empty strings
                lead = {k: v for k, v in lead.items() if v is not None and str(v).strip() != ""}

                # Duplicate check
                duplicate_found = False
                duplicate_id = None

                if merge_duplicates:
                    # Check by email first
                    if lead.get("email"):
                        existing = db.table("leads").select("id").eq("email", lead["email"]).eq("user_id", user_id).maybe_single().execute()
                        if existing.data:
                            duplicate_found = True
                            duplicate_id = existing.data["id"]

                    # Check by phone if no email match
                    if not duplicate_found and lead.get("phone"):
                        existing = db.table("leads").select("id").eq("phone", lead["phone"]).eq("user_id", user_id).maybe_single().execute()
                        if existing.data:
                            duplicate_found = True
                            duplicate_id = existing.data["id"]

                    # Check by name + company if available
                    if not duplicate_found and lead.get("company"):
                        existing = (
                            db.table("leads")
                            .select("id")
                            .eq("name", lead["name"])
                            .eq("company", lead["company"])
                            .eq("user_id", user_id)
                            .maybe_single()
                            .execute()
                        )
                        if existing.data:
                            duplicate_found = True
                            duplicate_id = existing.data["id"]

                if duplicate_found and duplicate_id:
                    if update_existing:
                        # Update existing lead (merge notes)
                        existing_notes = ""
                        try:
                            existing_lead = db.table("leads").select("notes").eq("id", duplicate_id).maybe_single().execute()
                            if existing_lead.data and existing_lead.data.get("notes"):
                                existing_notes = existing_lead.data["notes"] + "\n\n"
                        except:
                            pass

                        # Merge notes
                        if lead.get("notes"):
                            lead["notes"] = existing_notes + "IMPORT UPDATE: " + lead["notes"]

                        # Update without changing created_at
                        lead.pop("created_at", None)

                        db.table("leads").update(lead).eq("id", duplicate_id).execute()
                        results["updated"] += 1
                        results["leads"].append({"id": duplicate_id, "action": "updated", "name": lead["name"]})
                        logger.info(f"Updated duplicate lead: {lead['name']}")
                    else:
                        results["duplicates_skipped"] += 1
                        logger.info(f"Skipped duplicate lead: {lead['name']}")
                else:
                    # Create new lead
                    result = db.table("leads").insert(lead).execute()
                    if result.data:
                        results["created"] += 1
                        results["leads"].append({"id": result.data[0]["id"], "action": "created", "name": lead["name"]})
                        logger.info(f"Created new lead: {lead['name']}")
                    else:
                        results["errors"] += 1
                        logger.error(f"Failed to create lead: {lead['name']}")

            except Exception as e:
                results["errors"] += 1
                logger.error(f"Error processing lead {idx + 1}: {e}")
                continue

        logger.info(f"Bulk import completed: {results}")
        return results

    except Exception as e:
        logger.exception(f"Bulk import error: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk import failed: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Get lead interactions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router"]
