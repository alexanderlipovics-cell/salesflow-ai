"""
Vision Router - Claude Vision API for Screenshot Analysis

Uses Anthropic's Claude Vision API to analyze screenshots and extract contact information.
Supports Instagram, WhatsApp, LinkedIn, business cards, and other social media.
"""

from fastapi import APIRouter, Depends, UploadFile, File, Request, HTTPException, status
from anthropic import Anthropic
import base64
import json
import logging
from typing import Optional, List
from pydantic import BaseModel
from app.core.security import get_user_id_from_token
from app.core.deps import get_current_user as get_current_user_headers, get_supabase
from app.routers.smart_import import is_bulk_list as detect_bulk_list
from ..core.ai_router import get_model_for_task, get_max_tokens_for_task

router = APIRouter(prefix="/vision", tags=["vision"])
logger = logging.getLogger(__name__)

VISION_PROMPT = """
Analysiere diesen Screenshot und extrahiere ALLE sichtbaren Kontakte/Personen.

ERKENNE DIESE SCREENSHOT-TYPEN:

1. INSTAGRAM PROFIL:
   - Username (@handle) - IMMER extrahieren!
   - Name
   - Bio-Text
   - Follower-Anzahl
   - Verifiziert (ja/nein - blaues Häkchen)
   - Location (falls sichtbar)
   - Website/Link in Bio

2. INSTAGRAM DM LISTE / MESSENGER:
   - ALLE Namen in der Liste
   - Instagram Handles (@username) für jeden Kontakt
   - Letzte Nachricht (falls sichtbar)
   - Zeitstempel
   - Profilbild-Erkennung (mehrere Profile = Liste)

3. WHATSAPP CHAT / KONTAKT:
   - Name
   - Telefonnummer
   - Status/Bio

4. LINKEDIN PROFIL:
   - Name
   - Jobtitel
   - Firma
   - Location

5. FACEBOOK PROFIL/MESSENGER:
   - Name
   - Alle sichtbaren Infos

6. KONTAKTLISTE (beliebig):
   - Alle sichtbaren Namen
   - Alle sichtbaren Nummern/Emails
   - Social Media Handles

WICHTIG:
- Extrahiere JEDEN sichtbaren Kontakt, auch wenn keine Email/Telefon vorhanden
- Instagram/Facebook/LinkedIn Username ist ein gültiger Kontakt!
- Bei Listen: Extrahiere ALLE Einträge, nicht nur den ersten
- Gib Verifizierungs-Status an (blaues Häkchen = verified: true)

ANTWORT FORMAT (JSON):
{
  "screenshot_type": "instagram_dm_list | instagram_profile | whatsapp_contact | linkedin_profile | facebook_messenger | contact_list | unknown",
  "contacts": [
    {
      "name": "Vollständiger Name",
      "instagram": "@username oder null",
      "facebook": "username oder null",
      "linkedin": "url oder null",
      "email": "email oder null",
      "phone": "nummer oder null",
      "company": "firma oder null",
      "job_title": "jobtitel oder null",
      "location": "ort oder null",
      "notes": "zusätzliche infos aus bio/status",
      "verified": true/false,
      "last_message": "letzte nachricht falls sichtbar oder null"
    }
  ],
  "total_found": 5
}

Wenn KEINE Kontakte gefunden werden:
{
  "screenshot_type": "unknown",
  "contacts": [],
  "total_found": 0,
  "error": "Keine Kontakte im Bild erkannt"
}

Antworte NUR mit dem JSON, kein anderer Text.
"""

COMBINED_VISION_PROMPT = VISION_PROMPT


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
    job_title: Optional[str] = None  # Alias für position
    city: Optional[str] = None
    country: Optional[str] = None
    location: Optional[str] = None  # Alias für city/country kombiniert
    notes: Optional[str] = None
    verified: Optional[bool] = False  # Verifizierungs-Status
    last_message: Optional[str] = None  # Letzte Nachricht bei Messenger-Listen
    source: str = "screenshot_ai"
    platform: Optional[str] = None  # instagram, whatsapp, linkedin, business_card, other
    confidence: float = 0.0


class BulkContact(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    title: Optional[str] = None
    job_title: Optional[str] = None  # Alias für title
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    notes: Optional[str] = None  # Alias für bio
    verified: Optional[bool] = False  # Verifizierungs-Status
    last_message: Optional[str] = None  # Letzte Nachricht bei Messenger-Listen
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
    """Scoring gemäß Vorgabe - Social Media Namen zählen als Kontaktmöglichkeit."""
    score = 0
    name = contact.get("name") or contact.get("first_name")
    if name:
        score += 30
    if contact.get("company"):
        score += 30
    if contact.get("title") or contact.get("position") or contact.get("job_title"):
        score += 20
    if contact.get("bio") or contact.get("notes") or contact.get("status"):
        score += 10
    # Kontaktmöglichkeiten: Telefon, Email ODER Social Media
    if contact.get("phone") or contact.get("whatsapp"):
        score += 10
    if contact.get("email"):
        score += 10
    # Social Media Handles zählen auch als Kontaktmöglichkeit!
    if contact.get("instagram") or contact.get("facebook") or contact.get("linkedin"):
        score += 10
    # Verifizierte Profile = höhere Qualität
    if contact.get("verified"):
        score += 5

    platform = (contact.get("platform") or platform_hint or "").lower()
    if platform == "linkedin":
        score += 20
    elif platform in {"whatsapp", "phone_contacts", "phone"}:
        score += 30
    elif platform == "instagram":
        score += 5  # Instagram mit Handle ist auch wertvoll

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
        
        # Platform bestimmen
        platform = contact.get("platform") or platform_hint
        
        # Felder mappen (title <-> job_title, bio <-> notes)
        if "job_title" in contact and "title" not in contact:
            contact["title"] = contact["job_title"]
        if "notes" in contact and "bio" not in contact:
            contact["bio"] = contact["notes"]
        if "location" in contact and not contact.get("city"):
            # Location könnte "City, Country" Format sein
            contact["city"] = contact["location"]
        
        # Warm Score berechnen
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


async def _analyze_single_image(file: UploadFile) -> dict:
    """
    Helper-Funktion: Analysiert ein einzelnes Bild und gibt die Kontaktdaten zurück.
    
    Returns:
        dict mit keys: contact_data, response_text, error
    """
    try:
        contents = await file.read()
        base64_image = base64.standard_b64encode(contents).decode("utf-8")
        logger.debug(f"[Vision] Image encoded, size: {len(base64_image)} chars")

        media_type = file.content_type or "image/jpeg"
        logger.debug(f"[Vision] Media type: {media_type}")

        client = Anthropic()
        model = "claude-sonnet-4-20250514"
        max_tokens = 4096
        logger.info(f"[Vision] Calling Anthropic API with model: {model}, max_tokens: {max_tokens}")
        
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
        logger.info(f"[Vision] API response received successfully, content length: {len(message.content) if message.content else 0}")

        response_text = message.content[0].text.strip()
        logger.debug(f"[Vision] Response text extracted, length: {len(response_text)}")

        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        logger.debug(f"[Vision] Parsing JSON response")
        contact_data = json.loads(response_text)
        logger.info(f"[Vision] JSON parsed successfully, screenshot_type: {contact_data.get('screenshot_type')}, contacts found: {contact_data.get('total_found', 0)}")
        
        return {
            "contact_data": contact_data,
            "response_text": response_text,
            "error": None
        }
    except json.JSONDecodeError as json_err:
        logger.error(f"[Vision] JSON decode error: {str(json_err)}, response_text preview: {response_text[:200] if 'response_text' in locals() else 'N/A'}")
        return {
            "contact_data": None,
            "response_text": response_text if 'response_text' in locals() else None,
            "error": f"Could not parse response: {str(json_err)}"
        }
    except Exception as e:
        logger.error(f"[Vision] Error analyzing image {file.filename}: {str(e)}", exc_info=True)
        return {
            "contact_data": None,
            "response_text": None,
            "error": str(e)
        }


@router.post("/analyze-screenshot", response_model=VisionResponse)
async def analyze_screenshot(
    file: UploadFile = File(...),
    request: Request = None,
):
    """
    Analyze screenshot using Claude Vision to extract contact information.
    Supports: Instagram profiles, WhatsApp chats, LinkedIn profiles, business cards
    
    **Single Image Mode (default):**
    - Send one image file
    - Returns contacts from that image
    
    **Multi-Image Support:**
    - Use /analyze-screenshots endpoint for multiple images
    """
    # Auth: akzeptiere Bearer Token oder X-User-Id Header (legacy)
    user_id = None
    auth_header = request.headers.get("Authorization") if request else None
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            user_id = get_user_id_from_token(token)
        except Exception:
            user_id = None

    if not user_id and request:
        # Legacy Header-basierte Auth
        legacy_user = get_current_user_headers(
            x_org_id=request.headers.get("X-Org-Id"),
            x_user_id=request.headers.get("X-User-Id"),
            x_user_role=request.headers.get("X-User-Role"),
            x_user_name=request.headers.get("X-User-Name"),
        )
        user_id = legacy_user.get("user_id") if isinstance(legacy_user, dict) else None

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: missing or invalid token",
        )

    try:
        logger.info(f"[Vision] Starting screenshot analysis, user_id: {user_id}, model: claude-sonnet-4-20250514")
        
        # Analysiere einzelnes Bild
        result = await _analyze_single_image(file)
        
        if result["error"]:
            return VisionResponse(
                success=False,
                error=result["error"],
                raw_text=result["response_text"],
            )
        
        contact_data = result["contact_data"]
        
        # Neues Format: screenshot_type + contacts Array
        screenshot_type = contact_data.get("screenshot_type", "unknown")
        contacts_list = contact_data.get("contacts", [])
        total_found = contact_data.get("total_found", len(contacts_list))
        
        # Bestimme ob Bulk-Liste oder einzelner Kontakt
        is_bulk = len(contacts_list) > 1 or screenshot_type in [
            "instagram_dm_list", "contact_list", "facebook_messenger"
        ]
        
        # Platform aus screenshot_type ableiten
        platform_map = {
            "instagram_profile": "instagram",
            "instagram_dm_list": "instagram",
            "whatsapp_contact": "whatsapp",
            "linkedin_profile": "linkedin",
            "facebook_messenger": "facebook",
            "contact_list": "other",
        }
        platform = platform_map.get(screenshot_type, contact_data.get("platform", "unknown"))
        
        if is_bulk or len(contacts_list) > 1:
            # Mehrere Kontakte - Bulk-Liste
            contacts = normalize_contacts(contacts_list, platform)
            scroll_hint = (
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
                raw_text=result["response_text"],
            )
        elif len(contacts_list) == 1:
            # Einzelner Kontakt - als ExtractedContact zurückgeben
            contact_dict = contacts_list[0]
            contact_dict["platform"] = platform
            contact_dict["source"] = "screenshot_ai"
            # Position/job_title mapping
            if "job_title" in contact_dict and not "position" in contact_dict:
                contact_dict["position"] = contact_dict["job_title"]
            # Location mapping
            if "location" in contact_dict and not "city" in contact_dict:
                contact_dict["city"] = contact_dict["location"]
            
            return VisionResponse(
                success=True,
                contact=ExtractedContact(**contact_dict),
                raw_text=result["response_text"],
            )
        else:
            # Keine Kontakte gefunden
            return VisionResponse(
                success=False,
                error=contact_data.get("error", "Keine Kontakte im Screenshot erkannt"),
                raw_text=result["response_text"],
            )

    except Exception as e:
        logger.error(f"[Vision] Unexpected error: {str(e)}", exc_info=True)
        return VisionResponse(
            success=False,
            error=str(e),
        )


class MultiScreenshotResponse(BaseModel):
    """Response für Multi-Screenshot-Analyse"""
    success: bool
    total_images: int
    total_contacts: int
    contacts: List[BulkContact]
    results_per_image: List[dict]  # Details pro Bild
    errors: Optional[List[str]] = None
    platform: Optional[str] = None


@router.post("/analyze-screenshots", response_model=MultiScreenshotResponse)
async def analyze_multiple_screenshots(
    files: List[UploadFile] = File(...),
    request: Request = None,
):
    """
    Analysiert mehrere Screenshots gleichzeitig und sammelt alle Kontakte.
    
    **Multi-Image Support:**
    - Send multiple image files (max 10 recommended)
    - Each image is analyzed separately
    - All contacts from all images are collected
    - Returns combined results with per-image details
    
    **Use Cases:**
    - Multiple Instagram profile screenshots
    - WhatsApp contact list (multiple screenshots)
    - LinkedIn profile collection
    - Batch import from social media
    
    **Response Format:**
    - total_images: Anzahl verarbeiteter Bilder
    - total_contacts: Gesamtanzahl gefundener Kontakte
    - contacts: Alle Kontakte aus allen Bildern (dedupliziert)
    - results_per_image: Details pro Bild (für Debugging)
    - errors: Liste von Fehlern (falls welche auftraten)
    """
    # Auth: akzeptiere Bearer Token oder X-User-Id Header (legacy)
    user_id = None
    auth_header = request.headers.get("Authorization") if request else None
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            user_id = get_user_id_from_token(token)
        except Exception:
            user_id = None

    if not user_id and request:
        # Legacy Header-basierte Auth
        legacy_user = get_current_user_headers(
            x_org_id=request.headers.get("X-Org-Id"),
            x_user_id=request.headers.get("X-User-Id"),
            x_user_role=request.headers.get("X-User-Role"),
            x_user_name=request.headers.get("X-User-Name"),
        )
        user_id = legacy_user.get("user_id") if isinstance(legacy_user, dict) else None

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: missing or invalid token",
        )
    
    # Limit: Max 10 Bilder pro Request (um API-Limits zu respektieren)
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images per request. Please split into multiple requests."
        )
    
    if len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one image file is required."
        )
    
    logger.info(f"[Vision] Starting multi-screenshot analysis, user_id: {user_id}, images: {len(files)}")
    
    all_contacts = []
    results_per_image = []
    errors = []
    platforms_found = set()
    
    # Verarbeite jedes Bild
    for idx, file in enumerate(files):
        logger.info(f"[Vision] Processing image {idx + 1}/{len(files)}: {file.filename}")
        
        try:
            result = await _analyze_single_image(file)
            
            if result["error"]:
                errors.append(f"Image {idx + 1} ({file.filename}): {result['error']}")
                results_per_image.append({
                    "image_index": idx + 1,
                    "filename": file.filename,
                    "success": False,
                    "error": result["error"],
                    "contacts_found": 0
                })
                continue
            
            contact_data = result["contact_data"]
            screenshot_type = contact_data.get("screenshot_type", "unknown")
            contacts_list = contact_data.get("contacts", [])
            total_found = contact_data.get("total_found", len(contacts_list))
            
            # Platform bestimmen
            platform_map = {
                "instagram_profile": "instagram",
                "instagram_dm_list": "instagram",
                "whatsapp_contact": "whatsapp",
                "linkedin_profile": "linkedin",
                "facebook_messenger": "facebook",
                "contact_list": "other",
            }
            platform = platform_map.get(screenshot_type, contact_data.get("platform", "unknown"))
            if platform != "unknown":
                platforms_found.add(platform)
            
            # Kontakte normalisieren und hinzufügen
            normalized = normalize_contacts(contacts_list, platform)
            all_contacts.extend(normalized)
            
            results_per_image.append({
                "image_index": idx + 1,
                "filename": file.filename,
                "success": True,
                "screenshot_type": screenshot_type,
                "platform": platform,
                "contacts_found": len(normalized),
                "total_found": total_found
            })
            
            logger.info(f"[Vision] Image {idx + 1} processed: {len(normalized)} contacts found")
            
        except Exception as e:
            error_msg = f"Image {idx + 1} ({file.filename}): {str(e)}"
            logger.error(f"[Vision] {error_msg}", exc_info=True)
            errors.append(error_msg)
            results_per_image.append({
                "image_index": idx + 1,
                "filename": file.filename,
                "success": False,
                "error": str(e),
                "contacts_found": 0
            })
    
    # Hauptplatform bestimmen (am häufigsten vorkommend)
    main_platform = None
    if platforms_found:
        # Zähle Platform-Vorkommen in Kontakten
        platform_counts = {}
        for contact in all_contacts:
            if contact.platform:
                platform_counts[contact.platform] = platform_counts.get(contact.platform, 0) + 1
        if platform_counts:
            main_platform = max(platform_counts.items(), key=lambda x: x[1])[0]
    
    # Erfolg wenn mindestens ein Bild erfolgreich war
    success = len([r for r in results_per_image if r.get("success")]) > 0
    
    logger.info(f"[Vision] Multi-screenshot analysis complete: {len(all_contacts)} total contacts from {len(files)} images")
    
    return MultiScreenshotResponse(
        success=success,
        total_images=len(files),
        total_contacts=len(all_contacts),
        contacts=all_contacts,
        results_per_image=results_per_image,
        errors=errors if errors else None,
        platform=main_platform
    )


class BulkLeadCreateRequest(BaseModel):
    contacts: List[dict]
    screenshot_type: Optional[str] = None


class BulkLeadCreateResponse(BaseModel):
    success: bool
    created: int
    leads: List[dict]
    errors: Optional[List[str]] = None


@router.post("/leads/bulk", response_model=BulkLeadCreateResponse)
async def create_bulk_leads(
    request_data: BulkLeadCreateRequest,
    request: Request = None,
):
    """
    Erstellt mehrere Leads aus einem Screenshot-Bulk-Import.
    
    Erwartet:
    - contacts: Array von Kontakt-Daten (aus Vision-Analyse)
    - screenshot_type: Optional, Typ des Screenshots
    """
    # Auth
    user_id = None
    auth_header = request.headers.get("Authorization") if request else None
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            user_id = get_user_id_from_token(token)
        except Exception:
            user_id = None

    if not user_id and request:
        legacy_user = get_current_user_headers(
            x_org_id=request.headers.get("X-Org-Id"),
            x_user_id=request.headers.get("X-User-Id"),
            x_user_role=request.headers.get("X-User-Role"),
            x_user_name=request.headers.get("X-User-Name"),
        )
        user_id = legacy_user.get("user_id") if isinstance(legacy_user, dict) else None

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: missing or invalid token",
        )

    try:
        db = get_supabase()
        created = []
        errors = []
        
        for contact in request_data.contacts:
            try:
                # Name aufteilen falls vorhanden
                name = contact.get("name", "Unbekannt")
                name_parts = name.split(" ", 1) if name else ["Unbekannt"]
                first_name = name_parts[0] if name_parts else "Unbekannt"
                last_name = name_parts[1] if len(name_parts) > 1 else ""
                
                lead_data = {
                    "user_id": user_id,
                    "name": name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": contact.get("email"),
                    "phone": contact.get("phone"),
                    "instagram": contact.get("instagram"),
                    "facebook": contact.get("facebook"),
                    "linkedin": contact.get("linkedin"),
                    "whatsapp": contact.get("whatsapp") or contact.get("phone"),
                    "company": contact.get("company"),
                    "position": contact.get("position") or contact.get("job_title"),
                    "city": contact.get("city") or contact.get("location"),
                    "notes": contact.get("notes") or contact.get("bio"),
                    "source": f"Screenshot Import ({request_data.screenshot_type or 'unknown'})",
                    "status": "new",
                }
                
                # Entferne None-Werte
                lead_data = {k: v for k, v in lead_data.items() if v is not None}
                
                # Insert in database
                result = db.table("leads").insert(lead_data).execute()
                if result.data:
                    created.append(result.data[0])
            except Exception as e:
                errors.append(f"Fehler bei {contact.get('name', 'Unbekannt')}: {str(e)}")
                continue
        
        return BulkLeadCreateResponse(
            success=True,
            created=len(created),
            leads=created,
            errors=errors if errors else None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Bulk-Import: {str(e)}"
        )

