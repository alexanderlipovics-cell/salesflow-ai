"""
Vision Router - Claude Vision API for Screenshot Analysis

Uses Anthropic's Claude Vision API to analyze screenshots and extract contact information.
Supports Instagram, WhatsApp, LinkedIn, business cards, and other social media.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from anthropic import Anthropic
import base64
from typing import Optional
from pydantic import BaseModel
from app.core.deps import get_current_user

router = APIRouter(prefix="/vision", tags=["vision"])


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


class VisionResponse(BaseModel):
    success: bool
    contact: Optional[ExtractedContact] = None
    raw_text: Optional[str] = None
    error: Optional[str] = None


@router.post("/analyze-screenshot", response_model=VisionResponse)
async def analyze_screenshot(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Analyze screenshot using Claude Vision to extract contact information.
    Supports: Instagram profiles, WhatsApp chats, LinkedIn profiles, business cards
    """
    try:
        # Read and encode image
        contents = await file.read()
        base64_image = base64.standard_b64encode(contents).decode("utf-8")

        # Determine media type
        media_type = file.content_type or "image/jpeg"

        # Claude Vision API call
        client = Anthropic()

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
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
                            "text": """Analyze this screenshot and extract contact information.



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

                        }

                    ],

                }

            ],

        )

        # Parse response
        import json
        response_text = message.content[0].text.strip()

        # Clean potential markdown
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        contact_data = json.loads(response_text)
        contact_data["source"] = "screenshot_ai"

        return VisionResponse(
            success=True,
            contact=ExtractedContact(**contact_data),
            raw_text=response_text
        )

    except json.JSONDecodeError as e:
        return VisionResponse(
            success=False,
            error=f"Could not parse response: {str(e)}",
            raw_text=response_text if 'response_text' in locals() else None
        )
    except Exception as e:
        return VisionResponse(
            success=False,
            error=str(e)
        )
