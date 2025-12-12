"""
Vision Router - Claude Vision API for Screenshot Analysis

Uses Anthropic's Claude Vision API to analyze screenshots and extract contact information.
Supports Instagram, WhatsApp, LinkedIn, business cards, and other social media.
"""

from fastapi import APIRouter, Depends, UploadFile, File
from anthropic import Anthropic
import base64
import json
from typing import Optional, List
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.security import get_current_active_user
from app.routers.smart_import import BULK_LIST_PROMPT, is_bulk_list as detect_bulk_list
from ..core.ai_router import get_model_for_task, get_max_tokens_for_task

router = APIRouter(prefix="/vision", tags=["vision"])

SINGLE_CONTACT_PROMPT = """Analyze this screenshot and extract contact information.

Return ONLY valid JSON (no markdown, no explanation):
{
    "platform": "instagram|whatsapp|linkedin|facebook|business_card|email|other",
    "name": "Full name if visible",
    "first_name": "First name",
    "last_name": "Last name",
    "email": "email@example.com",
    "phone": "+43...",
    "instagram": "@handle (without @)",
    "linkedin": "linkedin.com/in/... or just the username",
    "whatsapp": "phone number",
    "facebook": "facebook profile",
    "company": "Company name",
    "position": "Job title",
    "city": "City",
    "country": "Country",
    "notes": "Bio, description, or other relevant info",
    "confidence": 0.0-1.0
}

Rules:
- Only include fields you can clearly see
- For Instagram: extract @handle, name from profile, bio as notes
- For WhatsApp: extract phone number, name
- For LinkedIn: extract name, company, position, linkedin URL
- For business cards: extract all visible info
- Set confidence based on how clear the information is
- If you can't find any contact info, return {"platform": "unknown", "confidence": 0}
"""

COMBINED_VISION_PROMPT = f"""
Du bist Screenshot AI. Erkenne zuerst, ob das Bild eine LISTE von Kontakten zeigt
(Instagram Follower/Following, WhatsApp Kontaktliste, LinkedIn Connections oder Telefonkontakte).

1) Wenn es eine Bulk-Liste ist, antworte genau nach diesem Schema:
{BULK_LIST_PROMPT}

2) Wenn es KEINE Liste ist, sondern ein einzelnes Profil/Visitenkarte/Chat-Header,
nutze das Einzelkontakt-Schema:
{SINGLE_CONTACT_PROMPT}

Antwort NUR mit JSON, ohne Markdown oder Zusatztext.
"""


class ExtractedContact(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    facebook: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    source: str = "screenshot_ai"
    platform: Optional[str] = None  # instagram, whatsapp, linkedin, business_card, other
    confidence: float = 0.0


class BulkContact(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    platform: Optional[str] = None
    warm_score: Optional[int] = None
    import_priority: Optional[str] = None


class VisionResponse(BaseModel):
    success: bool
    contact: Optional[ExtractedContact] = None
    contacts: Optional[List[BulkContact]] = None
    is_bulk_list: bool = False
    platform: Optional[str] = None
    total_found: Optional[int] = None
    scroll_hint: Optional[str] = None
    raw_text: Optional[str] = None
    error: Optional[str] = None


def calculate_warm_score(contact: dict, platform_hint: Optional[str] = None) -> int:
    """Scoring gemäß Vorgabe."""
    score = 0
    name = contact.get("name") or contact.get("first_name")
    if name:
        score += 30
    if contact.get("company"):
        score += 30
    if contact.get("title") or contact.get("position"):
        score += 20
    if contact.get("bio") or contact.get("notes") or contact.get("status"):
        score += 10
    if contact.get("phone") or contact.get("whatsapp"):
        score += 10

    platform = (contact.get("platform") or platform_hint or "").lower()
    if platform == "linkedin":
        score += 20
    elif platform in {"whatsapp", "phone_contacts", "phone"}:
        score += 30
    elif platform == "instagram":
        score += 0

    return max(0, min(score, 100))


def derive_import_priority(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def normalize_contacts(contacts: list, platform_hint: Optional[str]) -> List[BulkContact]:
    normalized = []
    for contact in contacts or []:
        if not isinstance(contact, dict):
            continue
        platform = contact.get("platform") or platform_hint
        warm_score = calculate_warm_score(contact, platform)
        normalized.append(
            BulkContact(
                **contact,
                platform=platform,
                warm_score=warm_score,
                import_priority=derive_import_priority(warm_score),
            )
        )
    return normalized


@router.post("/analyze-screenshot", response_model=VisionResponse)
async def analyze_screenshot(
    file: UploadFile = File(...),
    current_user=Depends(get_current_active_user),
):
    """
    Analyze screenshot using Claude Vision to extract contact information.
    Supports: Instagram profiles, WhatsApp chats, LinkedIn profiles, business cards
    """
    try:
        contents = await file.read()
        base64_image = base64.standard_b64encode(contents).decode("utf-8")

        media_type = file.content_type or "image/jpeg"

        client = Anthropic()

        model = get_model_for_task("vision_extraction")
        max_tokens = get_max_tokens_for_task("vision_extraction")
        message = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_image,
                            },
                        },
                        {
                            "type": "text",
                            "text": COMBINED_VISION_PROMPT,
                        },
                    ],
                }
            ],
        )

        response_text = message.content[0].text.strip()

        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        contact_data = json.loads(response_text)
        bulk_detected = bool(contact_data.get("is_bulk_list")) or (
            isinstance(contact_data.get("contacts"), list)
            and len(contact_data.get("contacts") or []) > 1
        )

        if not bulk_detected:
            bulk_detected = detect_bulk_list(response_text)

        if bulk_detected:
            platform = contact_data.get("platform")
            contacts = normalize_contacts(contact_data.get("contacts", []), platform)
            total_found = contact_data.get("total_found") or len(contacts)
            scroll_hint = contact_data.get("scroll_hint") or (
                "Mehr Kontakte sichtbar - scrolle für weitere"
                if total_found and total_found > len(contacts)
                else None
            )

            return VisionResponse(
                success=True,
                is_bulk_list=True,
                platform=platform,
                contacts=contacts,
                total_found=total_found,
                scroll_hint=scroll_hint,
                raw_text=response_text,
            )

        contact_data["source"] = "screenshot_ai"

        return VisionResponse(
            success=True,
            contact=ExtractedContact(**contact_data),
            raw_text=response_text,
        )

    except json.JSONDecodeError as e:
        return VisionResponse(
            success=False,
            error=f"Could not parse response: {str(e)}",
            raw_text=response_text if "response_text" in locals() else None,
        )
    except Exception as e:
        return VisionResponse(
            success=False,
            error=str(e),
        )

