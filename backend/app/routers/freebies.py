"""
Freebie/Lead Magnet Router
Handles freebie creation, landing pages, and lead capture.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import HTMLResponse
from app.supabase_client import get_supabase_client
from app.core.security import get_current_user_dict
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/freebies", tags=["freebies"])


def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    slug = title.lower()
    slug = re.sub(r'[äöüß]', lambda m: {'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss'}[m.group()], slug)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return f"{slug}-{uuid.uuid4().hex[:6]}"


def _extract_user_id(user) -> str:
    if isinstance(user, dict):
        return str(user.get("sub") or user.get("user_id") or user.get("id"))
    return str(user)


# ============ AUTHENTICATED ENDPOINTS ============

@router.post("")
async def create_freebie(
    request: Request,
    current_user: dict = Depends(get_current_user_dict)
):
    """Create a new freebie/lead magnet"""
    user_id = _extract_user_id(current_user)
    data = await request.json()
    
    title = data.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    
    slug = generate_slug(title)
    
    supabase = get_supabase_client()
    
    freebie_data = {
        "user_id": user_id,
        "title": title,
        "description": data.get("description", ""),
        "file_url": data.get("file_url", ""),
        "file_type": data.get("file_type", "pdf"),
        "thumbnail_url": data.get("thumbnail_url", ""),
        "slug": slug,
        "headline": data.get("headline", title),
        "subheadline": data.get("subheadline", "Trage deine Daten ein und erhalte sofort Zugang."),
        "button_text": data.get("button_text", "Jetzt herunterladen"),
        "thank_you_message": data.get("thank_you_message", "Danke! Check deine Emails."),
        "collect_phone": data.get("collect_phone", False),
        "collect_company": data.get("collect_company", False),
        "follow_up_enabled": data.get("follow_up_enabled", True),
        "follow_up_delay_hours": data.get("follow_up_delay_hours", 24),
        "follow_up_message": data.get("follow_up_message", ""),
        "is_active": True,
        "view_count": 0,
        "download_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = supabase.table("freebies").insert(freebie_data).execute()
    
    if result.data:
        freebie = result.data[0]
        logger.info(f"User {user_id} created freebie: {title} (slug: {slug})")
        return {
            "success": True,
            "freebie": freebie,
            "landing_page_url": f"https://alsales.ai/f/{slug}"
        }
    
    raise HTTPException(status_code=500, detail="Failed to create freebie")


@router.get("")
async def list_freebies(current_user: dict = Depends(get_current_user_dict)):
    """List all freebies for current user"""
    user_id = _extract_user_id(current_user)
    
    supabase = get_supabase_client()
    result = supabase.table("freebies").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    
    return {"freebies": result.data or []}


@router.get("/{freebie_id}")
async def get_freebie(freebie_id: str, current_user: dict = Depends(get_current_user_dict)):
    """Get freebie details with stats"""
    user_id = _extract_user_id(current_user)
    
    supabase = get_supabase_client()
    result = supabase.table("freebies").select("*").eq("id", freebie_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Freebie not found")
    
    freebie = result.data[0]
    
    # Get leads for this freebie
    leads_result = supabase.table("freebie_leads").select("*").eq("freebie_id", freebie_id).order("downloaded_at", desc=True).execute()
    
    return {
        "freebie": freebie,
        "leads": leads_result.data or [],
        "stats": {
            "views": freebie.get("view_count", 0),
            "downloads": freebie.get("download_count", 0),
            "conversion_rate": round((freebie.get("download_count", 0) / max(freebie.get("view_count", 1), 1)) * 100, 1)
        }
    }


@router.put("/{freebie_id}")
async def update_freebie(
    freebie_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_dict)
):
    """Update freebie settings"""
    user_id = _extract_user_id(current_user)
    data = await request.json()
    
    supabase = get_supabase_client()
    
    # Verify ownership
    check = supabase.table("freebies").select("id").eq("id", freebie_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Freebie not found")
    
    # Update allowed fields
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    allowed_fields = ["title", "description", "file_url", "thumbnail_url", "headline", 
                      "subheadline", "button_text", "thank_you_message", "collect_phone",
                      "collect_company", "follow_up_enabled", "follow_up_delay_hours",
                      "follow_up_message", "is_active"]
    
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
    
    result = supabase.table("freebies").update(update_data).eq("id", freebie_id).execute()
    
    return {"success": True, "freebie": result.data[0] if result.data else None}


@router.delete("/{freebie_id}")
async def delete_freebie(freebie_id: str, current_user: dict = Depends(get_current_user_dict)):
    """Delete a freebie"""
    user_id = _extract_user_id(current_user)
    
    supabase = get_supabase_client()
    
    # Verify ownership
    check = supabase.table("freebies").select("id").eq("id", freebie_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Freebie not found")
    
    supabase.table("freebies").delete().eq("id", freebie_id).execute()
    
    logger.info(f"User {user_id} deleted freebie {freebie_id}")
    return {"success": True}


# ============ PUBLIC ENDPOINTS (No Auth) ============

@router.get("/public/{slug}")
async def get_public_freebie(slug: str, request: Request):
    """Get public freebie data for landing page"""
    supabase = get_supabase_client()
    
    result = supabase.table("freebies").select("*").eq("slug", slug).eq("is_active", True).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Freebie not found")
    
    freebie = result.data[0]
    
    # Increment view count
    supabase.table("freebies").update({
        "view_count": freebie.get("view_count", 0) + 1
    }).eq("id", freebie["id"]).execute()
    
    # Return only public data
    return {
        "id": freebie["id"],
        "title": freebie["title"],
        "description": freebie["description"],
        "thumbnail_url": freebie["thumbnail_url"],
        "headline": freebie["headline"],
        "subheadline": freebie["subheadline"],
        "button_text": freebie["button_text"],
        "collect_phone": freebie["collect_phone"],
        "collect_company": freebie["collect_company"]
    }


@router.post("/public/{slug}/capture")
async def capture_lead(slug: str, request: Request):
    """Capture lead from freebie landing page (PUBLIC - no auth)"""
    supabase = get_supabase_client()
    
    # Get freebie
    freebie_result = supabase.table("freebies").select("*").eq("slug", slug).eq("is_active", True).execute()
    
    if not freebie_result.data:
        raise HTTPException(status_code=404, detail="Freebie not found")
    
    freebie = freebie_result.data[0]
    
    # Get form data
    data = await request.json()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    company = data.get("company", "").strip()
    
    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required")
    
    # Get tracking data
    utm_source = data.get("utm_source", "")
    utm_medium = data.get("utm_medium", "")
    utm_campaign = data.get("utm_campaign", "")
    referrer = request.headers.get("referer", "")
    user_agent = request.headers.get("user-agent", "")
    
    # Get client IP
    forwarded = request.headers.get("x-forwarded-for")
    ip_address = forwarded.split(",")[0] if forwarded else request.client.host if request.client else ""
    
    # Check if lead already exists for this freebie
    existing = supabase.table("freebie_leads").select("id").eq("freebie_id", freebie["id"]).eq("email", email).execute()
    
    if existing.data:
        # Already captured, just return success with file
        return {
            "success": True,
            "message": freebie["thank_you_message"],
            "file_url": freebie["file_url"],
            "already_subscribed": True
        }
    
    # Create freebie_lead record
    freebie_lead_data = {
        "freebie_id": freebie["id"],
        "name": name,
        "email": email,
        "phone": phone,
        "company": company,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "referrer": referrer,
        "downloaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    supabase.table("freebie_leads").insert(freebie_lead_data).execute()
    
    # Update download count
    supabase.table("freebies").update({
        "download_count": freebie.get("download_count", 0) + 1
    }).eq("id", freebie["id"]).execute()
    
    # Create lead in CRM for the freebie owner
    try:
        # Split name into first/last
        name_parts = name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        lead_data = {
            "user_id": freebie["user_id"],
            "name": name,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "company": company,
            "source": f"Freebie: {freebie['title']}",
            "status": "new",
            "notes": f"Lead captured via Freebie Landing Page.\nUTM Source: {utm_source}\nUTM Campaign: {utm_campaign}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        lead_result = supabase.table("leads").insert(lead_data).execute()
        
        if lead_result.data:
            # Link lead to freebie_lead
            supabase.table("freebie_leads").update({
                "lead_id": lead_result.data[0]["id"]
            }).eq("freebie_id", freebie["id"]).eq("email", email).execute()
            
            logger.info(f"Created lead from freebie: {name} ({email}) for user {freebie['user_id']}")
    
    except Exception as e:
        logger.error(f"Failed to create lead from freebie: {e}")
        # Don't fail the request, lead capture is still successful
    
    logger.info(f"Freebie lead captured: {email} for freebie {freebie['title']}")
    
    return {
        "success": True,
        "message": freebie["thank_you_message"],
        "file_url": freebie["file_url"]
    }

