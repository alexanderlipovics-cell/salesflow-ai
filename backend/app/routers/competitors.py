from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.supabase_client import get_supabase_client


router = APIRouter(prefix="/competitors", tags=["competitors"])


class CompetitorCardCreate(BaseModel):
    competitor_name: str
    aliases: List[str] = []
    weaknesses: List[dict] = []
    advantages: List[dict] = []
    quick_response: str = ""
    pricing_comparison: Optional[str] = None
    industry: Optional[str] = None


def _extract_user_id(current_user: Any) -> str:
    """Ermittle die user_id unabhängig vom Format."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Kein Benutzerkontext gefunden")

    if isinstance(current_user, dict):
        user_id = current_user.get("user_id") or current_user.get("id")
    else:
        user_id = getattr(current_user, "id", None) or getattr(current_user, "user_id", None)

    if not user_id:
        raise HTTPException(status_code=401, detail="Kein Benutzerkontext gefunden")

    return str(user_id)


@router.get("/")
async def list_competitors(current_user=Depends(get_current_user)):
    """Alle Competitor Battle Cards des Nutzers auflisten."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("competitor_cards")
        .select("*")
        .eq("user_id", user_id)
        .order("times_used", desc=True)
        .execute()
    )

    return {"competitors": result.data or []}


@router.get("/match")
async def match_competitor(
    text: str = Query(..., min_length=1, description="Freitext, in dem nach Wettbewerbern gesucht wird"),
    current_user=Depends(get_current_user),
):
    """Finde eine Competitor Battle Card, wenn Name oder Alias im Text vorkommt."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    result = supabase.table("competitor_cards").select("*").eq("user_id", user_id).execute()
    text_lower = text.lower()

    for card in result.data or []:
        names_to_check = [card.get("competitor_name", "").lower()]
        aliases = card.get("competitor_aliases") or []
        names_to_check.extend([alias.lower() for alias in aliases if alias])

        if any(name and name in text_lower for name in names_to_check):
            new_times_used = (card.get("times_used") or 0) + 1
            supabase.table("competitor_cards").update({"times_used": new_times_used}).eq("id", card["id"]).execute()

            matched_card = dict(card)
            matched_card["times_used"] = new_times_used
            return {"found": True, "card": matched_card}

    return {"found": False, "card": None}


@router.post("/")
async def create_competitor_card(
    request: CompetitorCardCreate,
    current_user=Depends(get_current_user),
):
    """Neue Competitor Battle Card anlegen."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    card = {
        "user_id": user_id,
        "competitor_name": request.competitor_name,
        "competitor_aliases": request.aliases,
        "weaknesses": request.weaknesses,
        "our_advantages": request.advantages,
        "quick_response": request.quick_response,
        "pricing_comparison": request.pricing_comparison,
        "industry": request.industry,
        "created_at": datetime.now().isoformat(),
    }

    result = supabase.table("competitor_cards").insert(card).execute()
    return {"success": True, "card": result.data[0] if result.data else None}

