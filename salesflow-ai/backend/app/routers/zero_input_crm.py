"""
Zero-Input CRM Router für SALESFLOW AI.

Endpoints für automatische Zusammenfassungen und Task-Generierung.

Endpoints:
- POST /crm/zero-input/summarize - Zusammenfassung + Task erstellen
- GET /crm/notes - CRM Notes auflisten
- GET /crm/notes/{note_id} - Einzelne Note laden
- DELETE /crm/notes/{note_id} - Note löschen
"""

from __future__ import annotations

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.deps import get_current_user, get_supabase
from app.schemas.zero_input_crm import (
    ZeroInputRequest,
    ZeroInputResponse,
    CRMNote,
    CRMNoteCreate,
    CRMNotesListResponse,
)
from app.services.zero_input_crm import (
    summarize_conversation_and_suggest_next_step,
    get_notes_for_lead,
    delete_note,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crm", tags=["Zero-Input CRM"])


# ============================================================================
# ZERO-INPUT SUMMARIZE
# ============================================================================


@router.post("/zero-input/summarize", response_model=ZeroInputResponse)
async def zero_input_summarize(
    payload: ZeroInputRequest,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    Triggert die automatische Zusammenfassung + nächsten Schritt
    für einen bestimmten Lead/Kontakt.
    
    Workflow:
    1. Lädt die letzten N message_events
    2. Generiert AI-Zusammenfassung
    3. Erstellt CRM Note
    4. Erstellt optional Task für nächsten Schritt
    
    Args:
        payload: ZeroInputRequest mit lead_id/contact_id etc.
        
    Returns:
        ZeroInputResponse mit note_id, task_id, summary, next_step
    """
    user_id = current_user["team_member_id"]
    org_id = current_user["org_id"]
    
    logger.info(
        f"Zero-Input Summarize: user_id={user_id}, "
        f"lead_id={payload.lead_id}, contact_id={payload.contact_id}"
    )
    
    # Validierung: Mindestens lead_id oder contact_id muss gesetzt sein
    if not payload.lead_id and not payload.contact_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entweder lead_id oder contact_id muss angegeben werden."
        )
    
    try:
        result = await summarize_conversation_and_suggest_next_step(
            db=supabase,
            user_id=user_id,
            org_id=org_id,
            lead_id=payload.lead_id,
            contact_id=payload.contact_id,
            deal_id=payload.deal_id,
            message_limit=payload.message_limit,
            create_task=payload.create_task,
        )
        
        return result
        
    except Exception as e:
        logger.exception(f"Error in zero_input_summarize: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler bei der Zusammenfassung: {str(e)}"
        )


# ============================================================================
# CRM NOTES CRUD
# ============================================================================


@router.get("/notes", response_model=CRMNotesListResponse)
async def list_crm_notes(
    lead_id: Optional[str] = Query(None, description="Filter nach Lead-UUID"),
    contact_id: Optional[str] = Query(None, description="Filter nach Contact-UUID"),
    deal_id: Optional[str] = Query(None, description="Filter nach Deal-UUID"),
    note_type: Optional[str] = Query(None, description="Filter nach Note-Typ"),
    limit: int = Query(50, ge=1, le=100, description="Max. Anzahl Notes"),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    Listet CRM Notes für den aktuellen User.
    
    Optional filterbar nach lead_id, contact_id, deal_id, note_type.
    """
    user_id = current_user["team_member_id"]
    
    # Query aufbauen
    query = (
        supabase.table("crm_notes")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    
    # Optionale Filter
    if lead_id:
        query = query.eq("lead_id", lead_id)
    if contact_id:
        query = query.eq("contact_id", contact_id)
    if deal_id:
        query = query.eq("deal_id", deal_id)
    if note_type:
        query = query.eq("note_type", note_type)
    
    try:
        result = query.execute()
        notes = [CRMNote(**row) for row in (result.data or [])]
        
        return CRMNotesListResponse(
            success=True,
            notes=notes,
            count=len(notes),
        )
        
    except Exception as e:
        logger.exception(f"Error listing CRM notes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Laden der Notes: {str(e)}"
        )


@router.get("/notes/{note_id}", response_model=CRMNote)
async def get_crm_note(
    note_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    Lädt eine einzelne CRM Note.
    """
    user_id = current_user["team_member_id"]
    
    try:
        result = (
            supabase.table("crm_notes")
            .select("*")
            .eq("id", str(note_id))
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note nicht gefunden"
            )
        
        return CRMNote(**result.data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting CRM note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Laden der Note: {str(e)}"
        )


@router.post("/notes", response_model=CRMNote, status_code=status.HTTP_201_CREATED)
async def create_crm_note(
    payload: CRMNoteCreate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    Erstellt eine neue CRM Note (manuell).
    """
    user_id = current_user["team_member_id"]
    
    note_data = {
        "user_id": user_id,
        "content": payload.content,
        "note_type": payload.note_type.value if hasattr(payload.note_type, 'value') else payload.note_type,
        "source": "user",
        "metadata": payload.metadata or {},
    }
    
    if payload.lead_id:
        note_data["lead_id"] = payload.lead_id
    if payload.contact_id:
        note_data["contact_id"] = payload.contact_id
    if payload.deal_id:
        note_data["deal_id"] = payload.deal_id
    
    try:
        result = supabase.table("crm_notes").insert(note_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Fehler beim Erstellen der Note"
            )
        
        return CRMNote(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error creating CRM note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Erstellen der Note: {str(e)}"
        )


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crm_note(
    note_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    Löscht eine CRM Note.
    """
    user_id = current_user["team_member_id"]
    
    try:
        result = (
            supabase.table("crm_notes")
            .delete()
            .eq("id", str(note_id))
            .eq("user_id", user_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note nicht gefunden"
            )
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting CRM note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Löschen der Note: {str(e)}"
        )


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = ["router"]

