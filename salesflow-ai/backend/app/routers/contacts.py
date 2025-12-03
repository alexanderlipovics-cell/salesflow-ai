"""
Sales Flow AI - Contacts Router

Full CRUD + Search + Bulk Operations
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.deps import get_current_user, get_supabase
from app.schemas.crm import (
    Contact,
    ContactCreate,
    ContactUpdate,
    ContactListItem,
    ContactFilter,
    ContactsResponse,
    ContactStatus,
    LifecycleStage,
    Vertical,
    Activity,
    ActivityCreate,
    ActivityType,
)

router = APIRouter(prefix="/contacts", tags=["Contacts"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def apply_contact_filters(query, filters: ContactFilter):
    """Apply filters to contact query"""

    if filters.search:
        # Full-text search on name, company, email
        query = query.or_(
            f"name.ilike.%{filters.search}%,"
            f"company.ilike.%{filters.search}%,"
            f"email.ilike.%{filters.search}%"
        )

    if filters.status:
        query = query.in_("status", [s.value for s in filters.status])

    if filters.lifecycle_stage:
        query = query.in_("lifecycle_stage", [s.value for s in filters.lifecycle_stage])

    if filters.vertical:
        query = query.in_("vertical", [v.value for v in filters.vertical])

    if filters.tags:
        query = query.contains("tags", filters.tags)

    if filters.owner_id:
        query = query.eq("owner_id", str(filters.owner_id))

    if filters.city:
        query = query.ilike("city", f"%{filters.city}%")

    if filters.min_score is not None:
        query = query.gte("score", filters.min_score)

    if filters.max_score is not None:
        query = query.lte("score", filters.max_score)

    if filters.has_phone:
        query = query.not_.is_("phone", "null")

    if filters.has_email:
        query = query.not_.is_("email", "null")

    if filters.followup_overdue:
        query = query.lt("next_followup_at", datetime.utcnow().isoformat())

    if filters.created_after:
        query = query.gte("created_at", filters.created_after.isoformat())

    if filters.created_before:
        query = query.lte("created_at", filters.created_before.isoformat())

    return query


# ============================================================================
# LIST & SEARCH
# ============================================================================


@router.get("", response_model=ContactsResponse)
async def list_contacts(
    # Pagination
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    sort_by: str = Query("created_at", regex="^(name|created_at|updated_at|last_contact_at|score|status)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),

    # Filters
    search: Optional[str] = None,
    status: Optional[List[ContactStatus]] = Query(None),
    lifecycle_stage: Optional[List[LifecycleStage]] = Query(None),
    vertical: Optional[List[Vertical]] = Query(None),
    tags: Optional[List[str]] = Query(None),
    owner_id: Optional[UUID] = None,
    city: Optional[str] = None,
    min_score: Optional[int] = Query(None, ge=0, le=100),
    max_score: Optional[int] = Query(None, ge=0, le=100),
    has_phone: Optional[bool] = None,
    has_email: Optional[bool] = None,
    followup_overdue: Optional[bool] = None,

    # Dependencies
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    List contacts with filtering, search, and pagination.
    """
    org_id = current_user["org_id"]

    # Build filter object
    filters = ContactFilter(
        search=search,
        status=status,
        lifecycle_stage=lifecycle_stage,
        vertical=vertical,
        tags=tags,
        owner_id=owner_id,
        city=city,
        min_score=min_score,
        max_score=max_score,
        has_phone=has_phone,
        has_email=has_email,
        followup_overdue=followup_overdue,
    )

    # Base query
    query = supabase.table("contacts").select(
        "id, name, email, phone, company, city, status, score, vertical, tags, "
        "last_contact_at, next_followup_at, owner_id",
        count="exact"
    ).eq("org_id", org_id)

    # Apply filters
    query = apply_contact_filters(query, filters)

    # Sorting
    query = query.order(sort_by, desc=(sort_order == "desc"))

    # Pagination
    offset = (page - 1) * per_page
    query = query.range(offset, offset + per_page - 1)

    # Execute
    result = query.execute()

    total = result.count or 0
    pages = (total + per_page - 1) // per_page

    return ContactsResponse(
        items=[ContactListItem(**item) for item in result.data],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/search")
async def search_contacts(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    Quick search for contact picker / autocomplete.
    Returns minimal data for fast responses.
    """
    org_id = current_user["org_id"]

    result = supabase.table("contacts").select(
        "id, name, company, phone, email, city, vertical"
    ).eq("org_id", org_id).or_(
        f"name.ilike.%{q}%,company.ilike.%{q}%,email.ilike.%{q}%"
    ).limit(limit).execute()

    return result.data


# ============================================================================
# CRUD
# ============================================================================


@router.post("", response_model=Contact, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact: ContactCreate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Create a new contact."""
    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]

    data = contact.model_dump(exclude_none=True)
    data["org_id"] = org_id
    data["created_by"] = user_id

    # Set owner to creator if not specified
    if not data.get("owner_id"):
        data["owner_id"] = user_id

    # Convert enums to strings
    if "status" in data:
        data["status"] = data["status"].value if hasattr(data["status"], "value") else data["status"]
    if "lifecycle_stage" in data:
        data["lifecycle_stage"] = data["lifecycle_stage"].value if hasattr(data["lifecycle_stage"], "value") else data["lifecycle_stage"]
    if "vertical" in data and data["vertical"]:
        data["vertical"] = data["vertical"].value if hasattr(data["vertical"], "value") else data["vertical"]
    if "preferred_channel" in data:
        data["preferred_channel"] = data["preferred_channel"].value if hasattr(data["preferred_channel"], "value") else data["preferred_channel"]

    result = supabase.table("contacts").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create contact")

    # Log creation activity
    supabase.table("activities").insert({
        "org_id": org_id,
        "contact_id": result.data[0]["id"],
        "user_id": user_id,
        "type": "created",
        "metadata": {"source": "manual"}
    }).execute()

    return Contact(**result.data[0])


@router.get("/{contact_id}", response_model=Contact)
async def get_contact(
    contact_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Get a single contact by ID."""
    org_id = current_user["org_id"]

    result = supabase.table("contacts").select("*").eq(
        "id", str(contact_id)
    ).eq("org_id", org_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    return Contact(**result.data)


@router.patch("/{contact_id}", response_model=Contact)
async def update_contact(
    contact_id: UUID,
    contact: ContactUpdate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Update a contact."""
    org_id = current_user["org_id"]

    # Check contact exists
    existing = supabase.table("contacts").select("id").eq(
        "id", str(contact_id)
    ).eq("org_id", org_id).single().execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Prepare update data
    data = contact.model_dump(exclude_none=True)

    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Convert enums to strings
    for field in ["status", "lifecycle_stage", "vertical", "preferred_channel"]:
        if field in data and data[field] is not None:
            data[field] = data[field].value if hasattr(data[field], "value") else data[field]

    # Convert UUID to string
    if "owner_id" in data and data["owner_id"]:
        data["owner_id"] = str(data["owner_id"])

    result = supabase.table("contacts").update(data).eq(
        "id", str(contact_id)
    ).eq("org_id", org_id).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update contact")

    return Contact(**result.data[0])


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Delete a contact."""
    org_id = current_user["org_id"]

    result = supabase.table("contacts").delete().eq(
        "id", str(contact_id)
    ).eq("org_id", org_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    return None


# ============================================================================
# BULK OPERATIONS
# ============================================================================


@router.post("/bulk", response_model=List[Contact], status_code=status.HTTP_201_CREATED)
async def create_contacts_bulk(
    contacts: List[ContactCreate],
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Create multiple contacts at once."""
    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]

    if len(contacts) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 contacts per request")

    data_list = []
    for contact in contacts:
        data = contact.model_dump(exclude_none=True)
        data["org_id"] = org_id
        data["created_by"] = user_id
        if not data.get("owner_id"):
            data["owner_id"] = user_id

        # Convert enums
        for field in ["status", "lifecycle_stage", "vertical", "preferred_channel"]:
            if field in data and data[field] is not None:
                data[field] = data[field].value if hasattr(data[field], "value") else data[field]

        data_list.append(data)

    result = supabase.table("contacts").insert(data_list).execute()

    return [Contact(**item) for item in result.data]


@router.patch("/bulk/status")
async def update_contacts_status_bulk(
    contact_ids: List[UUID],
    status: ContactStatus,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Update status for multiple contacts."""
    org_id = current_user["org_id"]

    if len(contact_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 contacts per request")

    result = supabase.table("contacts").update({
        "status": status.value
    }).in_("id", [str(id) for id in contact_ids]).eq("org_id", org_id).execute()

    return {"updated": len(result.data)}


@router.patch("/bulk/owner")
async def update_contacts_owner_bulk(
    contact_ids: List[UUID],
    owner_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Reassign multiple contacts to a different owner."""
    org_id = current_user["org_id"]

    if len(contact_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 contacts per request")

    result = supabase.table("contacts").update({
        "owner_id": str(owner_id)
    }).in_("id", [str(id) for id in contact_ids]).eq("org_id", org_id).execute()

    return {"updated": len(result.data)}


@router.patch("/bulk/tags")
async def add_tags_bulk(
    contact_ids: List[UUID],
    tags: List[str],
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Add tags to multiple contacts."""
    org_id = current_user["org_id"]

    if len(contact_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 contacts per request")

    # Get current contacts
    contacts = supabase.table("contacts").select("id, tags").in_(
        "id", [str(id) for id in contact_ids]
    ).eq("org_id", org_id).execute()

    # Update each with merged tags
    updated = 0
    for contact in contacts.data:
        current_tags = contact.get("tags", []) or []
        new_tags = list(set(current_tags + tags))

        supabase.table("contacts").update({
            "tags": new_tags
        }).eq("id", contact["id"]).execute()
        updated += 1

    return {"updated": updated}


@router.delete("/bulk")
async def delete_contacts_bulk(
    contact_ids: List[UUID],
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Delete multiple contacts."""
    org_id = current_user["org_id"]

    if len(contact_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 contacts per request")

    result = supabase.table("contacts").delete().in_(
        "id", [str(id) for id in contact_ids]
    ).eq("org_id", org_id).execute()

    return {"deleted": len(result.data)}


# ============================================================================
# ACTIVITIES (Contact Timeline)
# ============================================================================


@router.get("/{contact_id}/activities", response_model=List[Activity])
async def get_contact_activities(
    contact_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Get activity timeline for a contact."""
    org_id = current_user["org_id"]

    result = supabase.table("activities").select("*").eq(
        "contact_id", str(contact_id)
    ).eq("org_id", org_id).order(
        "occurred_at", desc=True
    ).range(offset, offset + limit - 1).execute()

    return [Activity(**item) for item in result.data]


@router.post("/{contact_id}/activities", response_model=Activity, status_code=status.HTTP_201_CREATED)
async def create_contact_activity(
    contact_id: UUID,
    activity: ActivityCreate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Log an activity for a contact."""
    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]

    # Verify contact exists
    contact = supabase.table("contacts").select("id").eq(
        "id", str(contact_id)
    ).eq("org_id", org_id).single().execute()

    if not contact.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    data = activity.model_dump(exclude_none=True)
    data["org_id"] = org_id
    data["contact_id"] = str(contact_id)
    data["user_id"] = user_id

    # Convert enums
    if "type" in data:
        data["type"] = data["type"].value if hasattr(data["type"], "value") else data["type"]
    if "direction" in data and data["direction"]:
        data["direction"] = data["direction"].value if hasattr(data["direction"], "value") else data["direction"]

    result = supabase.table("activities").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create activity")

    return Activity(**result.data[0])


# ============================================================================
# SPECIAL ENDPOINTS
# ============================================================================


@router.get("/{contact_id}/suggested-actions")
async def get_suggested_actions(
    contact_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    Get AI-suggested next actions for a contact.
    Based on status, last activity, and vertical.
    """
    org_id = current_user["org_id"]

    # Get contact with recent activities
    contact = supabase.table("contacts").select("*").eq(
        "id", str(contact_id)
    ).eq("org_id", org_id).single().execute()

    if not contact.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact_data = contact.data

    # Get last 5 activities
    activities = supabase.table("activities").select("type, occurred_at").eq(
        "contact_id", str(contact_id)
    ).order("occurred_at", desc=True).limit(5).execute()

    # Generate suggestions based on context
    suggestions = []

    # No activity yet
    if not activities.data:
        suggestions.append({
            "action": "first_contact",
            "title": "Erstkontakt herstellen",
            "description": f"Noch kein Kontakt mit {contact_data['name']}. Jetzt Erstnachricht senden.",
            "priority": "high",
            "type": "whatsapp"
        })

    # Long time no contact
    last_contact = contact_data.get("last_contact_at")
    if last_contact:
        from datetime import datetime, timedelta
        last_dt = datetime.fromisoformat(last_contact.replace("Z", "+00:00"))
        days_since = (datetime.now(last_dt.tzinfo) - last_dt).days

        if days_since > 14:
            suggestions.append({
                "action": "reactivate",
                "title": "Kontakt reaktivieren",
                "description": f"Letzter Kontakt vor {days_since} Tagen. Zeit für ein Follow-up.",
                "priority": "medium",
                "type": "followup"
            })

    # Based on status
    status = contact_data.get("status")
    if status == "lead":
        suggestions.append({
            "action": "qualify",
            "title": "Lead qualifizieren",
            "description": "Bedarf und Budget klären, um Lead zu qualifizieren.",
            "priority": "high",
            "type": "call"
        })
    elif status == "qualified":
        suggestions.append({
            "action": "schedule_meeting",
            "title": "Termin vereinbaren",
            "description": "Qualifizierter Lead – jetzt Termin für Präsentation vereinbaren.",
            "priority": "high",
            "type": "meeting"
        })
    elif status == "proposal":
        suggestions.append({
            "action": "follow_up_proposal",
            "title": "Angebot nachfassen",
            "description": "Angebot wurde gesendet. Feedback einholen.",
            "priority": "high",
            "type": "call"
        })

    # Overdue followup
    next_followup = contact_data.get("next_followup_at")
    if next_followup:
        followup_dt = datetime.fromisoformat(next_followup.replace("Z", "+00:00"))
        if followup_dt < datetime.now(followup_dt.tzinfo):
            suggestions.insert(0, {
                "action": "overdue_followup",
                "title": "Überfälliges Follow-up!",
                "description": f"Follow-up war geplant für {followup_dt.strftime('%d.%m.%Y')}",
                "priority": "urgent",
                "type": "followup"
            })

    return {
        "contact_id": contact_id,
        "contact_name": contact_data["name"],
        "suggestions": suggestions[:5]  # Max 5 suggestions
    }


@router.get("/nearby")
async def get_nearby_contacts(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(5, ge=0.1, le=50),
    limit: int = Query(10, ge=1, le=50),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    Get contacts near a location (for Phoenix).
    Uses simple distance calculation.
    """
    org_id = current_user["org_id"]

    # Get contacts with location
    result = supabase.table("contacts").select(
        "id, name, company, phone, city, district, lat, lng, status, last_contact_at"
    ).eq("org_id", org_id).not_.is_("lat", "null").not_.is_("lng", "null").execute()

    # Calculate distances and filter
    from math import radians, cos, sin, sqrt, atan2

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371  # Earth radius in km

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        return R * c

    nearby = []
    for contact in result.data:
        contact_lat = float(contact["lat"])
        contact_lng = float(contact["lng"])
        distance = haversine(lat, lng, contact_lat, contact_lng)

        if distance <= radius_km:
            contact["distance_km"] = round(distance, 2)
            nearby.append(contact)

    # Sort by distance
    nearby.sort(key=lambda x: x["distance_km"])

    return nearby[:limit]
