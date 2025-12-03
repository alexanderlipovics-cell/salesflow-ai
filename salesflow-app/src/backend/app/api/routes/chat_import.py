# backend/app/api/routes/chat_import.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHAT IMPORT ROUTER V2                                                     ║
║  API Endpoints für Chat-Import und Conversation Intelligence               ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /chat-import/analyze - Chat analysieren (V2)
- POST /chat-import/save - Analysiertes Ergebnis speichern (V2)
- POST /chat-import/quick - Analyze + Save in einem Schritt
- GET /chat-import/contact-plans/today - Heutige Contact Plans
- GET /chat-import/contact-plans/overdue - Überfällige Contact Plans
- POST /chat-import/contact-plans/{id}/complete - Plan abschließen
- POST /chat-import/contact-plans/{id}/reschedule - Plan verschieben
- GET /chat-import/templates - Extrahierte Templates
- Legacy: /leads/import-from-chat für Abwärtskompatibilität
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from datetime import datetime, date, timedelta
from typing import Optional, List
from uuid import UUID

from ..schemas.chat_import import (
    # V2 Schemas
    ChatImportRequest,
    ChatImportResult,
    SaveImportRequest,
    SaveImportResponse,
    ContactPlanResponse,
    TemplateResponse,
    # Legacy Schemas
    ImportFromChatRequest,
    ImportFromChatResponse,
    SaveImportedLeadRequest,
)
from ...services.chat_import.service import ChatImportService, get_chat_import_service_v2
from ...services.chat_import_service import ChatImportService as LegacyChatImportService, get_chat_import_service
from ...db.deps import get_db, get_current_user, CurrentUser


# ═══════════════════════════════════════════════════════════════════════════
# V2 ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(
    prefix="/chat-import",
    tags=["chat-import"],
)


# =============================================================================
# ANALYZE (V2)
# =============================================================================

@router.post("/analyze", response_model=ChatImportResult)
async def analyze_chat_v2(
    request: ChatImportRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> ChatImportResult:
    """
    Analysiert einen Chatverlauf mit Claude.
    Gibt strukturierte Daten zurück (Lead, Status, Next Action, Templates).
    
    Features:
    - Lead-Extraktion (Name, Kontakt, Status)
    - Deal-State-Erkennung (pending_payment!)
    - Template Extraction
    - Objection Detection
    - Seller Style Analysis
    - Next Action Planning
    """
    if not request.raw_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Chat darf nicht leer sein"
        )
    
    service = get_chat_import_service_v2(db)
    
    try:
        result = service.analyze_chat(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei Chat-Analyse: {str(e)}"
        )


# =============================================================================
# SAVE (V2)
# =============================================================================

@router.post("/save", response_model=SaveImportResponse)
async def save_import_v2(
    request: SaveImportRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> SaveImportResponse:
    """
    Speichert das analysierte Ergebnis in der Datenbank.
    Erstellt Lead, Conversation, Contact Plan, Templates, etc.
    """
    service = get_chat_import_service_v2(db)
    
    try:
        response = service.save_import(current_user.id, request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Speichern: {str(e)}"
        )


# =============================================================================
# QUICK IMPORT (Analyze + Save)
# =============================================================================

@router.post("/quick", response_model=SaveImportResponse)
async def quick_import(
    request: ChatImportRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> SaveImportResponse:
    """
    Schneller Import: Analysiert und speichert in einem Schritt.
    Für Power-User die keinen Preview brauchen.
    """
    service = get_chat_import_service_v2(db)
    
    # Analyze
    result = service.analyze_chat(request)
    
    # Save
    save_request = SaveImportRequest(
        import_result=result,
        raw_text=request.raw_text,
        create_lead=True,
        create_contact_plan=request.create_contact_plan,
        save_templates=request.extract_templates,
        save_objections=request.extract_objections,
        save_as_learning_case=request.save_as_learning_case,
        learning_case_goal=request.learning_case_goal,
        learning_case_outcome=request.learning_case_outcome,
    )
    
    return service.save_import(current_user.id, save_request)


# =============================================================================
# CONTACT PLANS
# =============================================================================

@router.get("/contact-plans/today")
async def get_todays_contact_plans(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Holt heutige Kontaktpläne"""
    try:
        # Use RPC function
        result = db.rpc("get_todays_contact_plan", {"p_user_id": current_user.id}).execute()
        return result.data or []
    except Exception as e:
        # Fallback to direct query
        try:
            today = date.today().isoformat()
            result = db.table("contact_plans").select(
                "*, leads(first_name, last_name)"
            ).eq(
                "user_id", current_user.id
            ).lte(
                "planned_at", today
            ).eq(
                "status", "open"
            ).order(
                "priority", desc=True
            ).order(
                "planned_at"
            ).execute()
            
            # Format response
            plans = []
            for plan in result.data or []:
                lead = plan.get("leads", {}) or {}
                plans.append({
                    "id": plan["id"],
                    "lead_id": plan["lead_id"],
                    "lead_name": f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip() or "Unbekannt",
                    "action_type": plan["action_type"],
                    "action_description": plan.get("action_description"),
                    "suggested_message": plan.get("suggested_message"),
                    "suggested_channel": plan.get("suggested_channel"),
                    "priority": plan.get("priority", 50),
                    "is_urgent": plan.get("is_urgent", False),
                })
            return plans
        except Exception as e2:
            raise HTTPException(status_code=500, detail=str(e2))


@router.get("/contact-plans/overdue")
async def get_overdue_contact_plans(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Holt überfällige Kontaktpläne"""
    try:
        result = db.rpc("get_overdue_contact_plans", {"p_user_id": current_user.id}).execute()
        return result.data or []
    except Exception as e:
        # Fallback
        try:
            today = date.today().isoformat()
            result = db.table("contact_plans").select(
                "*, leads(first_name, last_name)"
            ).eq(
                "user_id", current_user.id
            ).lt(
                "planned_at", today
            ).eq(
                "status", "open"
            ).order("planned_at").execute()
            
            plans = []
            for plan in result.data or []:
                lead = plan.get("leads", {}) or {}
                planned = datetime.fromisoformat(plan["planned_at"]).date() if plan.get("planned_at") else date.today()
                days_overdue = (date.today() - planned).days
                
                plans.append({
                    "id": plan["id"],
                    "lead_id": plan["lead_id"],
                    "lead_name": f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip() or "Unbekannt",
                    "action_type": plan["action_type"],
                    "planned_at": plan["planned_at"],
                    "days_overdue": days_overdue,
                })
            return plans
        except Exception as e2:
            raise HTTPException(status_code=500, detail=str(e2))


@router.get("/contact-plans/upcoming")
async def get_upcoming_contact_plans(
    days: int = Query(default=7, ge=1, le=30),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Holt kommende Kontaktpläne für die nächsten X Tage"""
    try:
        today = date.today()
        end_date = (today + timedelta(days=days)).isoformat()
        
        result = db.table("contact_plans").select(
            "*, leads(first_name, last_name)"
        ).eq(
            "user_id", current_user.id
        ).gte(
            "planned_at", today.isoformat()
        ).lte(
            "planned_at", end_date
        ).eq(
            "status", "open"
        ).order("planned_at").execute()
        
        plans = []
        for plan in result.data or []:
            lead = plan.get("leads", {}) or {}
            plans.append({
                "id": plan["id"],
                "lead_id": plan["lead_id"],
                "lead_name": f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip() or "Unbekannt",
                "action_type": plan["action_type"],
                "action_description": plan.get("action_description"),
                "planned_at": plan["planned_at"],
                "suggested_message": plan.get("suggested_message"),
                "priority": plan.get("priority", 50),
            })
        return plans
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contact-plans/{plan_id}/complete")
async def complete_contact_plan(
    plan_id: str,
    note: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Markiert Kontaktplan als erledigt"""
    try:
        db.table("contact_plans").update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "completion_note": note,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", plan_id).eq("user_id", current_user.id).execute()
        
        return {"success": True, "message": "Kontaktplan abgeschlossen"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contact-plans/{plan_id}/skip")
async def skip_contact_plan(
    plan_id: str,
    reason: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Überspringt Kontaktplan"""
    try:
        db.table("contact_plans").update({
            "status": "skipped",
            "completed_at": datetime.utcnow().isoformat(),
            "completion_note": reason,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", plan_id).eq("user_id", current_user.id).execute()
        
        return {"success": True, "message": "Kontaktplan übersprungen"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contact-plans/{plan_id}/reschedule")
async def reschedule_contact_plan(
    plan_id: str,
    new_date: date,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Verschiebt Kontaktplan auf neues Datum"""
    try:
        # Get current plan
        current = db.table("contact_plans").select("planned_at, reschedule_count").eq(
            "id", plan_id
        ).eq("user_id", current_user.id).single().execute()
        
        if not current.data:
            raise HTTPException(status_code=404, detail="Kontaktplan nicht gefunden")
        
        original_date = current.data.get("original_planned_at") or current.data.get("planned_at")
        reschedule_count = current.data.get("reschedule_count", 0) + 1
        
        db.table("contact_plans").update({
            "planned_at": new_date.isoformat(),
            "original_planned_at": original_date,
            "reschedule_count": reschedule_count,
            "status": "open",  # Reset to open
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", plan_id).eq("user_id", current_user.id).execute()
        
        return {"success": True, "message": f"Verschoben auf {new_date.isoformat()}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# TEMPLATES
# =============================================================================

@router.get("/templates")
async def get_extracted_templates(
    use_case: Optional[str] = None,
    channel: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Holt extrahierte Templates"""
    try:
        query = db.table("message_templates").select("*").or_(
            f"user_id.eq.{current_user.id},is_team_shared.eq.true"
        ).eq("is_active", True)
        
        if use_case:
            query = query.eq("use_case", use_case)
        
        if channel:
            query = query.or_(f"channel.eq.{channel},channel.eq.all")
        
        result = query.order("times_used", desc=True).order("created_at", desc=True).limit(limit).execute()
        
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/templates/{template_id}/use")
async def use_template(
    template_id: str,
    success: bool = True,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Markiert Template als verwendet (für Analytics)"""
    try:
        # Get current stats
        current = db.table("message_templates").select(
            "times_used, times_successful"
        ).eq("id", template_id).single().execute()
        
        if not current.data:
            raise HTTPException(status_code=404, detail="Template nicht gefunden")
        
        times_used = current.data.get("times_used", 0) + 1
        times_successful = current.data.get("times_successful", 0) + (1 if success else 0)
        success_rate = times_successful / times_used if times_used > 0 else None
        
        db.table("message_templates").update({
            "times_used": times_used,
            "times_successful": times_successful,
            "success_rate": success_rate,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", template_id).execute()
        
        return {"success": True, "times_used": times_used}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/use-cases")
async def get_template_use_cases(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Holt alle verfügbaren Use-Cases"""
    return [
        {"id": "opening_cold", "label": "Erstkontakt (kalt)", "icon": "❄️"},
        {"id": "opening_warm", "label": "Erstkontakt (warm)", "icon": "🌤️"},
        {"id": "follow_up_after_silence", "label": "Nach Funkstille", "icon": "🔕"},
        {"id": "follow_up_after_interest", "label": "Nach Interesse", "icon": "✨"},
        {"id": "objection_price", "label": "Einwand: Preis", "icon": "💰"},
        {"id": "objection_time", "label": "Einwand: Zeit", "icon": "⏰"},
        {"id": "objection_think_about_it", "label": "Einwand: Überlegen", "icon": "🤔"},
        {"id": "reactivation_on_hold", "label": "Reaktivierung", "icon": "🔄"},
        {"id": "appointment_proposal", "label": "Terminvorschlag", "icon": "📅"},
        {"id": "closing_soft", "label": "Sanfter Abschluss", "icon": "🎯"},
        {"id": "closing_direct", "label": "Direkter Abschluss", "icon": "🚀"},
        {"id": "check_payment", "label": "Zahlungs-Check", "icon": "💳"},
    ]


# ═══════════════════════════════════════════════════════════════════════════
# LEGACY ROUTER (Abwärtskompatibilität)
# ═══════════════════════════════════════════════════════════════════════════

legacy_router = APIRouter(
    prefix="/leads",
    tags=["leads", "chat-import"],
)


@legacy_router.post(
    "/import-from-chat",
    response_model=ImportFromChatResponse,
    summary="Chat analysieren (Legacy)",
)
async def analyze_chat_legacy(
    payload: ImportFromChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Analysiert einen Chat-Verlauf aus Social Media (Legacy V1).
    """
    if not payload.raw_chat.strip():
        raise HTTPException(
            status_code=400,
            detail="Chat darf nicht leer sein"
        )
    
    service = get_chat_import_service()
    
    try:
        result = await service.analyze_chat(payload)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei Chat-Analyse: {str(e)}"
        )


@legacy_router.post(
    "/import-from-chat/save",
    summary="Analysierten Lead speichern (Legacy)",
)
async def save_imported_lead_legacy(
    payload: SaveImportedLeadRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Speichert einen aus dem Chat extrahierten Lead (Legacy V1).
    """
    if not payload.first_name:
        raise HTTPException(
            status_code=400,
            detail="Vorname ist erforderlich"
        )
    
    try:
        # Lead erstellen
        lead_data = {
            "user_id": current_user.id,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "channel": payload.channel.value,
            "social_handle": payload.social_handle,
            "social_url": payload.social_url,
            "email": payload.email,
            "phone": payload.phone,
            "status": payload.status,
            "temperature": payload.temperature.value,
            "notes": payload.notes,
            "tags": payload.tags,
        }
        
        if current_user.company_id:
            lead_data["company_id"] = current_user.company_id
        
        if current_user.vertical_id:
            lead_data["vertical_id"] = current_user.vertical_id
        
        lead_result = db.table("leads").insert(lead_data).execute()
        
        if not lead_result.data:
            raise HTTPException(status_code=500, detail="Lead konnte nicht gespeichert werden")
        
        lead = lead_result.data[0]
        lead_id = lead.get("id")
        
        # Follow-up erstellen
        if payload.next_contact_in_days and payload.next_contact_in_days > 0:
            due_date = (datetime.utcnow() + timedelta(days=payload.next_contact_in_days)).date().isoformat()
            
            followup_data = {
                "user_id": current_user.id,
                "lead_id": lead_id,
                "due_date": due_date,
                "message": payload.next_step_message or f"Follow-up mit {payload.first_name}",
                "type": "follow_up",
                "completed": False,
            }
            
            db.table("follow_ups").insert(followup_data).execute()
        
        # Original Chat speichern
        if payload.original_chat:
            chat_data = {
                "user_id": current_user.id,
                "lead_id": lead_id,
                "channel": payload.channel.value,
                "raw_chat": payload.original_chat,
                "word_count": len(payload.original_chat.split()),
            }
            
            db.table("imported_chats").insert(chat_data).execute()
        
        return {
            "success": True,
            "lead_id": lead_id,
            "message": f"Lead '{payload.first_name}' erfolgreich importiert",
            "next_step": {
                "scheduled": payload.next_contact_in_days is not None and payload.next_contact_in_days > 0,
                "in_days": payload.next_contact_in_days,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Speichern: {str(e)}"
        )


@legacy_router.get(
    "/import-from-chat/channels",
    summary="Verfügbare Chat-Channels",
)
async def get_channels():
    """Listet alle unterstützten Chat-Channels."""
    return [
        {"id": "instagram", "label": "Instagram DM", "icon": "📸"},
        {"id": "facebook", "label": "Facebook Messenger", "icon": "💬"},
        {"id": "whatsapp", "label": "WhatsApp", "icon": "📱"},
        {"id": "telegram", "label": "Telegram", "icon": "✈️"},
        {"id": "linkedin", "label": "LinkedIn", "icon": "💼"},
        {"id": "other", "label": "Andere", "icon": "💭"},
    ]


@legacy_router.get(
    "/import-from-chat/history",
    summary="Import-Historie",
)
async def get_import_history(
    limit: int = 10,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Listet die letzten Chat-Imports des Users."""
    try:
        result = db.table("conversations").select(
            "id, channel, message_count, summary, created_at, leads(id, first_name, last_name)"
        ).eq(
            "user_id", current_user.id
        ).order(
            "created_at", desc=True
        ).limit(limit).execute()
        
        return {
            "imports": result.data or [],
            "total": len(result.data or []),
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Laden der Historie: {str(e)}"
        )
