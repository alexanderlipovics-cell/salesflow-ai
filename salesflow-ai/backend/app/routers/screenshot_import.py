"""
Screenshot Import Router - Magic Screenshot-to-Lead API

Das Killer-Feature für Networker:
Screenshot hochladen → AI analysiert → Lead erstellt → Icebreaker bereit!
"""

from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import JSONResponse

from app.services.image_processing_service import (
    get_image_processing_service,
    ImageProcessingService,
)
from app.schemas.vision_schemas import (
    ScreenshotUploadResponse,
    ScreenshotAnalysisError,
    LeadFromImageSchema,
)

router = APIRouter(prefix="/screenshot", tags=["Screenshot Import"])


# ============================================
# ENDPOINTS
# ============================================

@router.post(
    "/analyze",
    response_model=LeadFromImageSchema,
    summary="Analysiert einen Screenshot (ohne Lead zu erstellen)",
    description="""
    Analysiert einen Social-Media-Screenshot und extrahiert strukturierte Daten.
    
    **Unterstützte Plattformen:**
    - Instagram Profile
    - LinkedIn Profile
    - Facebook Profile
    - TikTok Profile
    - WhatsApp Chat
    
    **Bildanforderungen:**
    - Formate: JPEG, PNG, WebP, GIF
    - Max. Größe: 10MB
    - Empfohlen: Klarer Screenshot ohne Unschärfe
    
    **Was wird extrahiert:**
    - Name und Handle
    - Bio/Beschreibung
    - Keywords für Ansprache
    - Business-Signale
    - Icebreaker-Vorschläge
    """
)
async def analyze_screenshot(
    file: UploadFile = File(..., description="Der Screenshot als Bilddatei"),
    service: ImageProcessingService = Depends(get_image_processing_service),
):
    """
    Analysiert einen Screenshot ohne einen Lead zu erstellen.
    Nützlich für Preview/Vorschau.
    """
    try:
        analysis = await service.analyze_screenshot(file)
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during analysis: {str(e)}"
        )


@router.post(
    "/import",
    response_model=ScreenshotUploadResponse,
    summary="Screenshot importieren und Lead erstellen",
    description="""
    **Magic Import Flow:**
    
    1. 📱 User macht Screenshot auf Instagram/LinkedIn/etc.
    2. 📤 Screenshot wird hochgeladen
    3. 🤖 AI analysiert das Bild (GPT-4o Vision)
    4. 📇 Lead wird automatisch erstellt
    5. 💬 Icebreaker-Nachricht wird vorgeschlagen
    
    **Dauer:** ~3-5 Sekunden
    
    **Kosten:** ~$0.01-0.02 pro Screenshot (OpenAI Vision)
    
    **Tipps für beste Ergebnisse:**
    - Ganzes Profil im Screenshot
    - Bio sollte sichtbar sein
    - Gute Bildqualität (keine Unschärfe)
    """
)
async def import_screenshot(
    file: UploadFile = File(..., description="Der Screenshot als Bilddatei"),
    auto_create: bool = Query(True, description="Lead automatisch erstellen?"),
    service: ImageProcessingService = Depends(get_image_processing_service),
):
    """
    Importiert einen Screenshot und erstellt automatisch einen Lead.
    """
    # TODO: User-ID aus Auth Token extrahieren
    user_id = str(uuid4())  # Placeholder
    
    try:
        result = await service.process_screenshot_and_create_lead(
            user_id=user_id,
            file=file,
            auto_create=auto_create,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during import: {str(e)}"
        )


@router.get(
    "/supported-platforms",
    summary="Zeigt unterstützte Plattformen",
)
async def get_supported_platforms():
    """
    Gibt alle unterstützten Social-Media-Plattformen zurück.
    """
    return {
        "platforms": [
            {
                "id": "instagram",
                "name": "Instagram",
                "icon": "📸",
                "tips": [
                    "Profil-Screenshot machen (nicht Story)",
                    "Bio sollte komplett sichtbar sein",
                    "Business-Badge wird erkannt"
                ]
            },
            {
                "id": "linkedin",
                "name": "LinkedIn",
                "icon": "💼",
                "tips": [
                    "Profil-Header mit Headline sichtbar",
                    "About-Section wenn möglich",
                    "Connections-Anzahl hilfreich"
                ]
            },
            {
                "id": "tiktok",
                "name": "TikTok",
                "icon": "🎵",
                "tips": [
                    "Profil-Ansicht, nicht Video",
                    "Bio und Follower sichtbar"
                ]
            },
            {
                "id": "facebook",
                "name": "Facebook",
                "icon": "👤",
                "tips": [
                    "Profil-Intro Section",
                    "Öffentliche Infos"
                ]
            },
            {
                "id": "whatsapp",
                "name": "WhatsApp",
                "icon": "💬",
                "tips": [
                    "Chat-Header mit Name",
                    "Status-Info wenn sichtbar"
                ]
            },
        ],
        "supported_formats": ["JPEG", "PNG", "WebP", "GIF"],
        "max_file_size_mb": 10,
        "avg_processing_time_seconds": 4,
    }


@router.get(
    "/tips",
    summary="Tipps für beste Ergebnisse",
)
async def get_screenshot_tips():
    """
    Gibt Tipps für optimale Screenshot-Qualität zurück.
    """
    return {
        "do": [
            "✅ Ganzes Profil im Bild",
            "✅ Bio/Beschreibung sichtbar",
            "✅ Gute Bildqualität",
            "✅ Hell genug (kein Dark Mode)",
            "✅ Keine Überlagerungen (Notifications etc.)",
        ],
        "dont": [
            "❌ Unscharfe Bilder",
            "❌ Abgeschnittene Profile",
            "❌ Screenshots von Videos",
            "❌ Mehrere Profile in einem Bild",
            "❌ Zu kleine Auflösung",
        ],
        "best_practices": [
            "📱 iPhone: Power + Volume Up",
            "🤖 Android: Power + Volume Down",
            "💡 Am besten direkt aus der App teilen",
        ]
    }


# ============================================
# BATCH IMPORT (Future Feature)
# ============================================

@router.post(
    "/batch",
    summary="Mehrere Screenshots auf einmal importieren (Coming Soon)",
    include_in_schema=False,  # Hidden for now
)
async def batch_import_screenshots():
    """
    Batch-Import für mehrere Screenshots.
    (Coming Soon)
    """
    return JSONResponse(
        status_code=501,
        content={
            "status": "not_implemented",
            "message": "Batch import coming soon! Use /import for single screenshots.",
        }
    )


__all__ = ["router"]

