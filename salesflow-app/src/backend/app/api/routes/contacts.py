"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CONTACTS API v2                                                           ║
║  /api/v2/contacts/* Endpoints                                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET / - Alle Kontakte
- POST / - Kontakt erstellen
- GET /{id} - Kontakt Details
- PATCH /{id} - Kontakt aktualisieren
- DELETE /{id} - Kontakt löschen
- GET /{id}/timeline - Kontakt Timeline
- POST /{id}/disc-analyze - DISC analysieren
"""

from typing import Optional, List
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr
from supabase import Client
import uuid

from ...db.deps import get_db, get_current_user, CurrentUser


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/contacts", tags=["contacts"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ContactCreate(BaseModel):
    """Schema für Kontakt erstellen."""
    name: str = Field(..., min_length=1, max_length=200)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    
    # Social Media
    instagram_handle: Optional[str] = None
    facebook_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    tiktok_handle: Optional[str] = None
    
    # Kategorisierung
    contact_type: str = Field(default="prospect")
    relationship_level: str = Field(default="cold")
    pipeline_stage: str = Field(default="lead")
    
    # Source
    source: Optional[str] = None
    source_details: Optional[str] = None
    
    # Notizen
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class ContactUpdate(BaseModel):
    """Schema für Kontakt aktualisieren."""
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    
    instagram_handle: Optional[str] = None
    facebook_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    tiktok_handle: Optional[str] = None
    
    contact_type: Optional[str] = None
    relationship_level: Optional[str] = None
    pipeline_stage: Optional[str] = None
    disc_type: Optional[str] = None
    
    next_follow_up_at: Optional[datetime] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class ContactResponse(BaseModel):
    """Response Schema für Kontakt."""
    id: str
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    
    instagram_handle: Optional[str] = None
    facebook_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    tiktok_handle: Optional[str] = None
    
    contact_type: str
    relationship_level: str
    pipeline_stage: str
    disc_type: Optional[str] = None
    disc_confidence: Optional[float] = None
    
    first_contact_at: Optional[datetime] = None
    last_contact_at: Optional[datetime] = None
    next_follow_up_at: Optional[datetime] = None
    total_interactions: int = 0
    
    source: Optional[str] = None
    source_details: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ContactListResponse(BaseModel):
    """Response für Kontakt-Liste."""
    contacts: List[ContactResponse]
    total: int
    page: int
    page_size: int


class TimelineEntry(BaseModel):
    """Ein Eintrag in der Timeline."""
    id: str
    type: str  # contact, note, call, meeting, message
    title: str
    description: Optional[str] = None
    created_at: datetime


class TimelineResponse(BaseModel):
    """Response für Timeline."""
    contact_id: str
    entries: List[TimelineEntry]


class DISCAnalysisRequest(BaseModel):
    """Request für DISC Analyse."""
    messages: List[str] = Field(
        ...,
        min_items=1,
        description="Nachrichten des Kontakts zur Analyse"
    )


class DISCAnalysisResponse(BaseModel):
    """Response für DISC Analyse."""
    disc_type: str  # D, I, S, G
    confidence: float
    signals: List[str]
    communication_tips: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ContactListResponse)
async def list_contacts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    contact_type: Optional[str] = None,
    pipeline_stage: Optional[str] = None,
    relationship_level: Optional[str] = None,
    search: Optional[str] = None,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Liste aller Kontakte.
    
    ## Filter
    
    - `contact_type`: prospect, customer, partner, etc.
    - `pipeline_stage`: lead, contacted, interested, etc.
    - `relationship_level`: cold, warm, hot, customer, partner
    - `search`: Suche in Name, Email, Phone
    """
    # Query aufbauen
    query = db.table("contacts").select("*", count="exact").eq(
        "user_id", current_user.id
    )
    
    # Filter anwenden
    if contact_type:
        query = query.eq("contact_type", contact_type)
    if pipeline_stage:
        query = query.eq("pipeline_stage", pipeline_stage)
    if relationship_level:
        query = query.eq("relationship_level", relationship_level)
    if search:
        query = query.or_(
            f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%"
        )
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)
    
    result = query.execute()
    
    contacts = [ContactResponse(**c) for c in result.data]
    total = result.count or len(contacts)
    
    return ContactListResponse(
        contacts=contacts,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=ContactResponse, status_code=201)
async def create_contact(
    payload: ContactCreate,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Erstellt einen neuen Kontakt.
    """
    contact_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    data = {
        "id": contact_id,
        "user_id": current_user.id,
        "company_id": current_user.company_id,
        **payload.model_dump(exclude_unset=True),
        "created_at": now,
        "updated_at": now,
    }
    
    # Tags als JSONB
    if "tags" in data:
        data["tags"] = data["tags"]  # Supabase handles list to jsonb
    
    result = db.table("contacts").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Kontakt konnte nicht erstellt werden")
    
    return ContactResponse(**result.data[0])


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt einen einzelnen Kontakt zurück.
    """
    result = db.table("contacts").select("*").eq(
        "id", contact_id
    ).eq("user_id", current_user.id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    
    return ContactResponse(**result.data)


@router.patch("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Aktualisiert einen Kontakt.
    """
    # Prüfen ob Kontakt existiert und gehört dem User
    existing = db.table("contacts").select("id").eq(
        "id", contact_id
    ).eq("user_id", current_user.id).single().execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    
    # Update durchführen
    update_data = payload.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = db.table("contacts").update(update_data).eq(
        "id", contact_id
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Update fehlgeschlagen")
    
    return ContactResponse(**result.data[0])


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: str,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Löscht einen Kontakt.
    """
    result = db.table("contacts").delete().eq(
        "id", contact_id
    ).eq("user_id", current_user.id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    
    return None


@router.get("/{contact_id}/timeline", response_model=TimelineResponse)
async def get_contact_timeline(
    contact_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt die Timeline eines Kontakts zurück.
    
    Enthält alle Interaktionen, Notizen, Calls, etc.
    """
    # Prüfen ob Kontakt existiert
    contact = db.table("contacts").select("id, name").eq(
        "id", contact_id
    ).eq("user_id", current_user.id).single().execute()
    
    if not contact.data:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    
    entries = []
    
    # Aktivitäten laden (wenn activities table existiert)
    try:
        activities = db.table("activities").select("*").eq(
            "contact_id", contact_id
        ).order("created_at", desc=True).limit(limit).execute()
        
        for act in activities.data or []:
            entries.append(TimelineEntry(
                id=act["id"],
                type=act.get("type", "activity"),
                title=act.get("title", "Aktivität"),
                description=act.get("description"),
                created_at=act["created_at"],
            ))
    except:
        pass  # Table might not exist
    
    # Nachrichten laden (wenn messages table existiert)
    try:
        messages = db.table("outreach_messages").select("*").eq(
            "lead_id", contact_id  # Oder contact_id je nach Schema
        ).order("created_at", desc=True).limit(limit).execute()
        
        for msg in messages.data or []:
            entries.append(TimelineEntry(
                id=msg["id"],
                type="message",
                title="Nachricht gesendet",
                description=msg.get("message_text", "")[:100],
                created_at=msg["created_at"],
            ))
    except:
        pass
    
    # Nach Datum sortieren
    entries.sort(key=lambda x: x.created_at, reverse=True)
    
    return TimelineResponse(
        contact_id=contact_id,
        entries=entries[:limit],
    )


@router.post("/{contact_id}/disc-analyze", response_model=DISCAnalysisResponse)
async def analyze_disc(
    contact_id: str,
    payload: DISCAnalysisRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Analysiert den DISC-Typ eines Kontakts basierend auf Nachrichten.
    
    ## DISC-Typen
    
    - **D (Dominant)**: Direkt, ergebnisorientiert, ungeduldig
    - **I (Initiativ)**: Enthusiastisch, beziehungsorientiert
    - **S (Stetig)**: Geduldig, sicherheitsorientiert
    - **G (Gewissenhaft)**: Analytisch, faktenorientiert
    """
    from ...services.llm_client import get_llm_client
    import json
    
    # Prüfen ob Kontakt existiert
    contact = db.table("contacts").select("id").eq(
        "id", contact_id
    ).eq("user_id", current_user.id).single().execute()
    
    if not contact.data:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    
    # LLM für Analyse
    llm = get_llm_client()
    
    messages_text = "\n\n".join([f"- {m}" for m in payload.messages])
    
    try:
        response = await llm.chat(
            messages=[
                {
                    "role": "system",
                    "content": """Du bist ein Experte für Verhaltensanalyse nach dem DISG-Modell.

Analysiere die Nachrichten und bestimme den Kommunikationsstil:
- D (Dominant): Direkt, ergebnisorientiert, ungeduldig
- I (Initiativ): Enthusiastisch, gesprächig, optimistisch  
- S (Stetig): Geduldig, loyal, teamorientiert
- G (Gewissenhaft): Analytisch, präzise, qualitätsorientiert

Antworte NUR mit validem JSON:
{
  "disc_type": "D" | "I" | "S" | "G",
  "confidence": 0.0-1.0,
  "signals": ["signal1", "signal2"],
  "communication_tips": ["tip1", "tip2"]
}"""
                },
                {
                    "role": "user",
                    "content": f"Analysiere diese Nachrichten:\n\n{messages_text}"
                }
            ],
            temperature=0.3,
            json_mode=True,
        )
        
        result = json.loads(response)
        
        # DISC in DB speichern
        db.table("contacts").update({
            "disc_type": result["disc_type"],
            "disc_confidence": result["confidence"],
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", contact_id).execute()
        
        return DISCAnalysisResponse(
            disc_type=result["disc_type"],
            confidence=result["confidence"],
            signals=result.get("signals", []),
            communication_tips=result.get("communication_tips", []),
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"DISC Analyse fehlgeschlagen: {str(e)}"
        )


@router.get("/stats")
async def get_contacts_stats(
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt Statistiken der Kontakte zurück.
    Kompatibel mit Frontend-Erwartungen.
    """
    # Total Contacts
    total = db.table("contacts").select("*", count="exact").eq(
        "user_id", current_user.id
    ).execute()
    
    # By Type
    by_type = {}
    for ctype in ["prospect", "customer", "partner"]:
        result = db.table("contacts").select("*", count="exact").eq(
            "user_id", current_user.id
        ).eq("contact_type", ctype).execute()
        by_type[ctype] = result.count or 0
    
    # By Stage
    by_stage = {}
    for stage in ["lead", "contacted", "interested", "presented", "won", "lost"]:
        result = db.table("contacts").select("*", count="exact").eq(
            "user_id", current_user.id
        ).eq("pipeline_stage", stage).execute()
        by_stage[stage] = result.count or 0
    
    # Follow-ups fällig
    today = date.today().isoformat()
    overdue = db.table("contacts").select("*", count="exact").eq(
        "user_id", current_user.id
    ).lt("next_follow_up_at", today).execute()
    
    # Score-Statistiken (falls vorhanden)
    avg_score_result = db.table("contacts").select("lead_score").eq(
        "user_id", current_user.id
    ).not_.is_("lead_score", "null").execute()
    
    avg_score = 0
    if avg_score_result.data and len(avg_score_result.data) > 0:
        scores = [c.get("lead_score", 0) for c in avg_score_result.data if c.get("lead_score")]
        if scores:
            avg_score = round(sum(scores) / len(scores))
    
    return {
        "total": total.count or 0,
        "by_type": by_type,
        "by_stage": by_stage,
        "overdue_followups": overdue.count or 0,
        "avg_score": avg_score,
    }


@router.get("/stats/summary")
async def get_contacts_summary(
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt eine Zusammenfassung der Kontakte zurück.
    """
    # Total Contacts
    total = db.table("contacts").select("*", count="exact").eq(
        "user_id", current_user.id
    ).execute()
    
    # By Type
    by_type = {}
    for ctype in ["prospect", "customer", "partner"]:
        result = db.table("contacts").select("*", count="exact").eq(
            "user_id", current_user.id
        ).eq("contact_type", ctype).execute()
        by_type[ctype] = result.count or 0
    
    # By Stage
    by_stage = {}
    for stage in ["lead", "contacted", "interested", "presented", "won", "lost"]:
        result = db.table("contacts").select("*", count="exact").eq(
            "user_id", current_user.id
        ).eq("pipeline_stage", stage).execute()
        by_stage[stage] = result.count or 0
    
    # Follow-ups fällig
    today = date.today().isoformat()
    overdue = db.table("contacts").select("*", count="exact").eq(
        "user_id", current_user.id
    ).lt("next_follow_up_at", today).execute()
    
    return {
        "total": total.count or 0,
        "by_type": by_type,
        "by_stage": by_stage,
        "overdue_followups": overdue.count or 0,
    }

