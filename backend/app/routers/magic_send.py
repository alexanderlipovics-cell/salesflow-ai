from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from urllib.parse import quote

router = APIRouter(prefix="/magic-send", tags=["magic-send"])

from ..core.deps import get_current_user, get_supabase


class MagicLinkRequest(BaseModel):
    platform: str  # whatsapp, instagram, email, telegram
    message: str
    phone: Optional[str] = None
    email: Optional[str] = None
    instagram_handle: Optional[str] = None
    telegram_handle: Optional[str] = None


class MagicLinkResponse(BaseModel):
    success: bool
    platform: str
    deep_link: Optional[str] = None
    fallback_link: Optional[str] = None
    instructions: Optional[str] = None
    error: Optional[str] = None


@router.post("/generate-link", response_model=MagicLinkResponse)
async def generate_magic_link(
    request: MagicLinkRequest,
    current_user = Depends(get_current_user)
):
    """Generate deep links for different platforms."""

    encoded_message = quote(request.message)

    if request.platform == "whatsapp":
        if not request.phone:
            return MagicLinkResponse(
                success=False,
                platform="whatsapp",
                error="Phone number required for WhatsApp"
            )

        # Clean phone number (remove spaces, +, etc)
        clean_phone = request.phone.replace(" ", "").replace("-", "").replace("+", "")
        if not clean_phone.startswith("43") and not clean_phone.startswith("49"):
            # Assume Austrian if no country code
            if clean_phone.startswith("0"):
                clean_phone = "43" + clean_phone[1:]
            else:
                clean_phone = "43" + clean_phone

        return MagicLinkResponse(
            success=True,
            platform="whatsapp",
            deep_link=f"https://wa.me/{clean_phone}?text={encoded_message}",
            fallback_link=f"https://web.whatsapp.com/send?phone={clean_phone}&text={encoded_message}",
            instructions="Klick öffnet WhatsApp mit vorausgefüllter Nachricht. Nur noch 'Senden' drücken!"
        )

    elif request.platform == "instagram":
        if not request.instagram_handle:
            return MagicLinkResponse(
                success=False,
                platform="instagram",
                error="Instagram handle required"
            )

        handle = request.instagram_handle.replace("@", "")

        return MagicLinkResponse(
            success=True,
            platform="instagram",
            deep_link=f"instagram://user?username={handle}",
            fallback_link=f"https://instagram.com/{handle}",
            instructions="Öffnet Instagram-Profil. Klicke auf 'Nachricht' und füge Text ein."
        )

    elif request.platform == "email":
        if not request.email:
            return MagicLinkResponse(
                success=False,
                platform="email",
                error="Email address required"
            )

        subject = quote("Hallo!")

        return MagicLinkResponse(
            success=True,
            platform="email",
            deep_link=f"mailto:{request.email}?subject={subject}&body={encoded_message}",
            fallback_link=f"mailto:{request.email}?subject={subject}&body={encoded_message}",
            instructions="Öffnet dein Email-Programm mit vorausgefüllter Nachricht."
        )

    elif request.platform == "telegram":
        if not request.telegram_handle:
            return MagicLinkResponse(
                success=False,
                platform="telegram",
                error="Telegram handle required"
            )

        handle = request.telegram_handle.replace("@", "")

        return MagicLinkResponse(
            success=True,
            platform="telegram",
            deep_link=f"https://t.me/{handle}",
            fallback_link=f"https://t.me/{handle}",
            instructions="Öffnet Telegram-Chat."
        )

    else:
        return MagicLinkResponse(
            success=False,
            platform=request.platform,
            error=f"Unknown platform: {request.platform}"
        )


@router.post("/send-and-save")
async def send_and_save_lead(
    lead_data: dict,
    platform: str,
    message: str,
    current_user = Depends(get_current_user)
):
    """Generate magic link AND save lead to CRM in one call."""
    from datetime import datetime, timedelta

    db = get_supabase()

    # 1. Save lead
    lead_record = {
        "user_id": current_user["user_id"],
        "name": lead_data.get("name"),
        "first_name": lead_data.get("first_name"),
        "last_name": lead_data.get("last_name"),
        "phone": lead_data.get("phone"),
        "email": lead_data.get("email"),
        "instagram": lead_data.get("instagram"),
        "whatsapp": lead_data.get("whatsapp") or lead_data.get("phone"),
        "company": lead_data.get("company"),
        "platform": lead_data.get("source_platform", "manual"),
        "channel": platform,
        "source": "lead_hunter_ai",
        "status": "active",
        "temperature": "cold",
        "notes": lead_data.get("notes"),
        "last_message": message,
        "last_contact": datetime.now().isoformat(),
        "next_follow_up": (datetime.now() + timedelta(days=3)).date().isoformat(),
        "follow_up_reason": "Erste Nachricht - Antwort abwarten",
    }

    # Remove None values
    lead_record = {k: v for k, v in lead_record.items() if v is not None}

    result = db.table("leads").insert(lead_record).execute()
    saved_lead = result.data[0] if result.data else None

    # 2. Generate magic link
    encoded_message = quote(message)
    deep_link = None

    if platform == "whatsapp" and lead_data.get("phone"):
        clean_phone = lead_data["phone"].replace(" ", "").replace("-", "").replace("+", "")
        if clean_phone.startswith("0"):
            clean_phone = "43" + clean_phone[1:]
        deep_link = f"https://wa.me/{clean_phone}?text={encoded_message}"

    elif platform == "instagram" and lead_data.get("instagram"):
        handle = lead_data["instagram"].replace("@", "")
        deep_link = f"instagram://user?username={handle}"

    elif platform == "email" and lead_data.get("email"):
        deep_link = f"mailto:{lead_data['email']}?body={encoded_message}"

    return {
        "success": True,
        "lead_id": saved_lead["id"] if saved_lead else None,
        "lead": saved_lead,
        "deep_link": deep_link,
        "platform": platform
    }
