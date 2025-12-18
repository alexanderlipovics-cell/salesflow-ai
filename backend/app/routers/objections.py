from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import json
from anthropic import Anthropic
from ..core.ai_router import get_model_for_task, get_max_tokens_for_task
from ..core.cache import cache_key, get_cached, set_cached

router = APIRouter(prefix="/objections", tags=["objections"])

from app.core.deps import get_current_user
from ..core.deps import get_supabase


class ObjectionQuery(BaseModel):
    objection_text: str
    context: Optional[str] = None  # Product, situation, etc.
    lead_name: Optional[str] = None


class ObjectionResponse(BaseModel):
    objection: str
    category: str
    responses: List[dict]
    tips: str
    ai_suggestion: Optional[str] = None


class SaveObjectionRequest(BaseModel):
    objection_text: str
    best_response: str
    category: Optional[str] = None
    notes: Optional[str] = None


def _extract_user_id(current_user) -> str:
    """User-ID unabhängig von Objektstruktur extrahieren."""
    if current_user is None:
        raise ValueError("Kein Benutzerkontext gefunden")
    if isinstance(current_user, dict):
        user_id = current_user.get("user_id") or current_user.get("id")
    else:
        user_id = getattr(current_user, "id", None) or getattr(current_user, "user_id", None)
    if not user_id:
        raise ValueError("Kein Benutzerkontext gefunden")
    return str(user_id)


@router.get("/templates")
async def get_objection_templates(current_user=Depends(get_current_user)):
    """Get all predefined objection templates (mit Caching)."""
    supabase = get_supabase()
    user_id = _extract_user_id(current_user)

    key = cache_key("objection_templates", user_id)
    cached = get_cached(key)
    if cached is not None:
        return {"templates": cached, "cached": True}

    result = (
        supabase.table("objection_templates")
        .select("*")
        .or_(f"user_id.eq.{user_id},is_system.eq.true")
        .order("times_used", desc=True)
        .execute()
    )

    set_cached(key, result.data or [], ttl_seconds=3600)
    return {"templates": result.data or [], "cached": False}


@router.post("/handle", response_model=ObjectionResponse)
async def handle_objection(
    query: ObjectionQuery,
    current_user=Depends(get_current_user),
):
    """Get responses for an objection - matches templates + AI suggestion."""
    supabase = get_supabase()
    user_id = _extract_user_id(current_user)

    objection = query.objection_text.lower().strip()

    # Try to match a template
    templates = supabase.table("objection_templates").select("*").execute()

    matched_template = None
    for t in templates.data or []:
        if any(keyword in objection for keyword in t["objection_text"].lower().split()):
            matched_template = t
            break

    # Check user's custom objections
    user_objections = (
        supabase.table("user_objections")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    user_match = None
    for uo in user_objections.data or []:
        if objection in uo["objection_text"].lower() or uo["objection_text"].lower() in objection:
            user_match = uo
            break

    # Generate AI suggestion
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    context_info = f"\nKontext: {query.context}" if query.context else ""
    lead_info = f"\nLead: {query.lead_name}" if query.lead_name else ""

    prompt = f"""Ein Kunde/Lead sagt: "{query.objection_text}"{context_info}{lead_info}

Gib eine empathische, professionelle Antwort die:
1. Den Einwand anerkennt (nicht abwehrt)
2. Eine Frage stellt ODER den Wert neu rahmt
3. Kurz und natürlich klingt (max 2 Sätze)
4. In Du-Form ist

Antworte NUR mit dem Antwort-Text, keine Erklärung."""

    # Use Claude Haiku for faster, cheaper objection handling
    model = "claude-haiku-4-5-20251001"
    max_tokens = 200
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )

    ai_suggestion = message.content[0].text.strip()

    # Update usage count
    if matched_template:
        supabase.table("objection_templates").update(
            {"times_used": (matched_template.get("times_used") or 0) + 1}
        ).eq("id", matched_template["id"]).execute()

    # Build response
    if matched_template:
        response_text = matched_template.get("response_template") or ""
        responses = [{"text": response_text, "type": "template"}] if response_text else []

        return ObjectionResponse(
            objection=query.objection_text,
            category=matched_template.get("objection_category", "other"),
            responses=responses,
            tips=matched_template.get("response_strategy", ""),
            ai_suggestion=ai_suggestion,
        )
    elif user_match:
        return ObjectionResponse(
            objection=query.objection_text,
            category=user_match.get("category", "other"),
            responses=[{"text": user_match["best_response"], "type": "custom"}],
            tips="Deine eigene bewährte Antwort",
            ai_suggestion=ai_suggestion,
        )
    else:
        return ObjectionResponse(
            objection=query.objection_text,
            category="other",
            responses=[],
            tips="Neuer Einwand - speichere deine beste Antwort für später!",
            ai_suggestion=ai_suggestion,
        )


@router.post("/save")
async def save_custom_objection(
    data: SaveObjectionRequest,
    current_user=Depends(get_current_user),
):
    """Save a custom objection with response."""
    supabase = get_supabase()
    user_id = _extract_user_id(current_user)

    objection_data = {
        "user_id": user_id,
        "objection_text": data.objection_text,
        "best_response": data.best_response,
        "category": data.category or "other",
        "notes": data.notes,
        "created_at": datetime.now().isoformat(),
    }

    result = supabase.table("user_objections").insert(objection_data).execute()

    return {"success": True, "objection": result.data[0] if result.data else None}


@router.get("/my-objections")
async def get_my_objections(
    current_user=Depends(get_current_user),
):
    """Get user's saved objections."""
    supabase = get_supabase()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("user_objections")
        .select("*")
        .eq("user_id", user_id)
        .order("success_count", desc=True)
        .execute()
    )

    return {"objections": result.data or []}


@router.post("/track-result/{objection_id}")
async def track_objection_result(
    objection_id: str,
    success: bool,
    current_user=Depends(get_current_user),
):
    """Track if an objection response worked."""
    supabase = get_supabase()

    # Get current counts
    result = (
        supabase.table("user_objections")
        .select("success_count, fail_count")
        .eq("id", objection_id)
        .eq("user_id", str(current_user["id"]))
        .single()
        .execute()
    )

    if result.data:
        if success:
            supabase.table("user_objections").update(
                {"success_count": result.data["success_count"] + 1}
            ).eq("id", objection_id).execute()
        else:
            supabase.table("user_objections").update(
                {"fail_count": result.data["fail_count"] + 1}
            ).eq("id", objection_id).execute()

    return {"success": True}

