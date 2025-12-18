"""
Sales Flow AI - Cold Call Assistant Router

Gesprächsleitfaden, Einwand-Bibliothek, Übungsmodus
"""

import json
import re
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from supabase import Client

from app.core.deps import get_current_user, get_supabase
from app.ai_client import chat_completion
from app.prompts.cold_call_prompts import get_cold_call_gpt_prompt
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/cold-call", tags=["Cold Call Assistant"])


# ============================================================================
# SCHEMAS
# ============================================================================


class ScriptSection(BaseModel):
    section_type: str  # 'opener', 'objection_response', 'close', etc.
    title: str
    script: str
    tips: Optional[List[str]] = None


class PersonalizedScript(BaseModel):
    contact_name: str
    company_name: Optional[str] = None
    goal: str  # 'book_meeting', 'qualify', 'identify_decision_maker'
    sections: List[ScriptSection]
    suggested_objections: List[str] = []


class ColdCallSession(BaseModel):
    id: UUID
    user_id: UUID
    contact_id: Optional[UUID] = None
    lead_id: Optional[UUID] = None
    session_type: str  # 'real' or 'practice'
    practice_scenario: Optional[str] = None
    personalized_script: Optional[dict] = None
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None
    user_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# SCRIPT GENERATION
# ============================================================================


async def generate_personalized_script(contact_data: dict, goal: str = "book_meeting") -> PersonalizedScript:
    """
    Generiert personalisierten Gesprächsleitfaden mit LLM.
    """
    # Prüfe ob OpenAI Key vorhanden
    if not settings.openai_api_key:
        # Fallback auf einfache Logik
        contact_name = contact_data.get("name", "Herr/Frau")
        company_name = contact_data.get("company")
        
        sections = [
            ScriptSection(
                section_type="opener",
                title="Opener (Erste 10 Sekunden)",
                script=f"Guten Tag {contact_name}, hier ist [Ihr Name] von [Firma]. Ich rufe an, weil wir Unternehmen wie {company_name or 'Ihnen'} helfen, [Nutzen]. Haben Sie kurz 2 Minuten?",
                tips=["Kurz und prägnant", "Nutzen erwähnen", "Zeitfrage stellen"]
            ),
        ]
        
        return PersonalizedScript(
            contact_name=contact_name,
            company_name=company_name,
            goal=goal,
            sections=sections,
            suggested_objections=["Keine Zeit", "Kein Interesse", "Schicken Sie Unterlagen"]
        )
    
    try:
        # Prompt generieren
        prompt_messages = get_cold_call_gpt_prompt(contact_data, goal)
        
        # LLM aufrufen
        response_text = await chat_completion(
            messages=prompt_messages,
            model="gpt-4",
            max_tokens=2000,
            temperature=0.3,
        )
        
        # JSON parsen
        try:
            result_data = json.loads(response_text)
        except json.JSONDecodeError:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result_data = json.loads(json_match.group())
            else:
                raise ValueError("No valid JSON found in LLM response")
        
        # Konvertiere zu PersonalizedScript
        sections = [
            ScriptSection(**section) for section in result_data.get("sections", [])
        ]
        
        return PersonalizedScript(
            contact_name=result_data.get("contact_name", contact_data.get("name", "Herr/Frau")),
            company_name=result_data.get("company_name", contact_data.get("company")),
            goal=result_data.get("goal", goal),
            sections=sections,
            suggested_objections=result_data.get("suggested_objections", [])
        )
        
    except Exception as e:
        logger.error(f"LLM Error in generate_personalized_script: {e}")
        # Fallback
        contact_name = contact_data.get("name", "Herr/Frau")
        return PersonalizedScript(
            contact_name=contact_name,
            company_name=contact_data.get("company"),
            goal=goal,
            sections=[],
            suggested_objections=[]
        )


# ============================================================================
# ROUTES
# ============================================================================


@router.post("/generate-script/{contact_id}", response_model=PersonalizedScript)
async def generate_script(
    contact_id: UUID,
    goal: str = Query("book_meeting", description="Call goal: book_meeting, qualify, identify_decision_maker"),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Generiere personalisierten Gesprächsleitfaden für einen Kontakt."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    # Hole Kontakt
    result = (
        supabase.table("contacts")
        .select("*")
        .eq("id", str(contact_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact = result.data[0]

    # Generiere Script (async!)
    script = await generate_personalized_script(contact, goal)

    return script


@router.post("/session", response_model=ColdCallSession)
async def create_session(
    contact_id: Optional[UUID] = None,
    lead_id: Optional[UUID] = None,
    session_type: str = Query("real", description="real or practice"),
    practice_scenario: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Erstelle eine neue Cold Call Session."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    if session_type == "practice" and not practice_scenario:
        raise HTTPException(status_code=400, detail="practice_scenario required for practice sessions")

    # Generiere Script wenn real session
    personalized_script = None
    if session_type == "real" and contact_id:
        contact_result = (
            supabase.table("contacts")
            .select("*")
            .eq("id", str(contact_id))
            .single()
            .execute()
        )
        if contact_result.data:
            script = await generate_personalized_script(contact_result.data[0])
            personalized_script = script.model_dump()

    data = {
        "user_id": user_id,
        "contact_id": str(contact_id) if contact_id else None,
        "lead_id": str(lead_id) if lead_id else None,
        "session_type": session_type,
        "practice_scenario": practice_scenario,
        "personalized_script": personalized_script,
    }

    result = supabase.table("cold_call_sessions").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create session")

    return ColdCallSession(**result.data[0])


@router.get("/sessions", response_model=List[ColdCallSession])
async def list_sessions(
    session_type: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Liste alle Cold Call Sessions."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    query = (
        supabase.table("cold_call_sessions")
        .select("*")
        .eq("user_id", user_id)
    )

    if session_type:
        query = query.eq("session_type", session_type)

    result = query.order("created_at", desc=True).execute()

    return [ColdCallSession(**row) for row in result.data]


@router.post("/session/{session_id}/start")
async def start_session(
    session_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Starte eine Cold Call Session."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    result = (
        supabase.table("cold_call_sessions")
        .update({"started_at": datetime.now().isoformat()})
        .eq("id", str(session_id))
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Session started", "session_id": session_id}


@router.post("/session/{session_id}/complete")
async def complete_session(
    session_id: UUID,
    outcome: str = Query(..., description="meeting_booked, follow_up, not_interested, practice_completed"),
    notes: Optional[str] = None,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Schließe eine Cold Call Session ab."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    # Hole Session für Dauer-Berechnung
    session_result = (
        supabase.table("cold_call_sessions")
        .select("started_at")
        .eq("id", str(session_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    started_at = session_result.data.get("started_at")
    duration_seconds = None
    if started_at:
        started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        duration_seconds = int((datetime.now(started.tzinfo) - started).total_seconds())

    result = (
        supabase.table("cold_call_sessions")
        .update({
            "ended_at": datetime.now().isoformat(),
            "duration_seconds": duration_seconds,
            "outcome": outcome,
            "outcome_notes": notes,
        })
        .eq("id", str(session_id))
        .execute()
    )

    return {"message": "Session completed", "session_id": session_id, "duration_seconds": duration_seconds}

