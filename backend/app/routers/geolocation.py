"""
Geolocation Router
Provides nearby contact search + mobile check-ins.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.auth_helper import get_current_user_id
from app.core.supabase import get_supabase_client

router = APIRouter(tags=["geolocation"])


class CheckInPayload(BaseModel):
    workspace_id: str
    contact_id: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    notes: Optional[str] = None


@router.get("/api/contacts/nearby")
async def get_nearby_contacts(
    workspace_id: str = Query(..., alias="workspace_id"),
    lat: float = Query(..., alias="lat"),
    lon: float = Query(..., alias="lon"),
    radius: float = Query(10, alias="radius"),
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001
):
    """
    Returns contacts near the provided coordinates (km radius).
    """
    if radius <= 0:
        radius = 10

    supabase = get_supabase_client()
    try:
        response = supabase.rpc(
            "get_contacts_within_radius",
            {
                "p_workspace_id": workspace_id,
                "p_lat": lat,
                "p_lon": lon,
                "p_radius_km": radius,
            },
        ).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Nearby Search fehlgeschlagen: {exc}") from exc

    return {"contacts": response.data or []}


@router.post("/api/check-ins", status_code=status.HTTP_201_CREATED)
async def create_check_in(
    payload: CheckInPayload,
    user_id: str = Depends(get_current_user_id),
):
    """
    Stores a field check-in snapshot.
    """
    supabase = get_supabase_client()
    record = {
        "workspace_id": payload.workspace_id,
        "user_id": user_id,
        "contact_id": payload.contact_id,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "address": payload.address,
        "notes": payload.notes,
    }

    try:
        response = supabase.table("check_ins").insert(record).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Check-in konnte nicht gespeichert werden: {exc}") from exc

    if not response.data:
        raise HTTPException(status_code=500, detail="Check-in wurde nicht gespeichert.")

    return response.data[0]


