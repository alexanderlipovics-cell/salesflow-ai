"""
Image Processing Service - Screenshot-to-Lead Magic

Das Killer-Feature für Networker:
Screenshot machen → Lead erstellen → Fertig!

Unterstützt:
- Instagram Profile
- LinkedIn Profile
- WhatsApp Chats
- TikTok Profile
- Facebook Profile
"""

import base64
import json
import logging
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime

from fastapi import UploadFile, HTTPException
from openai import AsyncOpenAI

from app.schemas.vision_schemas import (
    LeadFromImageSchema,
    DetectedPlatform,
    LeadIntent,
    ScreenshotUploadResponse,
)
from app.ai.prompts.vision_prompts import VISION_SCREENSHOT_PROMPT
from app.config import get_settings

logger = logging.getLogger(__name__)


class ImageProcessingService:
    """
    Service für die Screenshot-to-Lead Pipeline.
    
    Flow:
    1. Bild empfangen (Base64 oder File)
    2. An GPT-4o Vision senden
    3. Strukturierte Daten extrahieren
    4. Lead erstellen
    5. Icebreaker generieren
    """
    
    SUPPORTED_FORMATS = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MIN_CONFIDENCE = 0.6  # Minimum confidence score für Lead-Erstellung
    
    def __init__(
        self, 
        openai_api_key: Optional[str] = None,
    ):
        """
        Initialisiert den Image Processing Service.
        
        Args:
            openai_api_key: OpenAI API Key (oder aus Settings)
        """
        settings = get_settings()
        self._api_key = openai_api_key or settings.openai_api_key
        
        if not self._api_key:
            logger.warning("No OpenAI API key configured for Vision features")
            self._client = None
        else:
            self._client = AsyncOpenAI(api_key=self._api_key)
    
    async def _encode_image_to_base64(self, file: UploadFile) -> str:
        """
        Konvertiert ein UploadFile in einen Base64 String.
        
        Args:
            file: Das hochgeladene Bild
            
        Returns:
            Base64-kodierter String
        """
        content = await file.read()
        await file.seek(0)  # Reset für potentielles erneutes Lesen
        return base64.b64encode(content).decode('utf-8')
    
    def _validate_image(self, file: UploadFile) -> None:
        """
        Validiert das hochgeladene Bild.
        
        Args:
            file: Das zu validierende Bild
            
        Raises:
            HTTPException: Bei ungültigem Bild
        """
        # Content Type prüfen
        if file.content_type not in self.SUPPORTED_FORMATS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image format: {file.content_type}. "
                       f"Supported: {', '.join(self.SUPPORTED_FORMATS)}"
            )
        
        # Größe prüfen (falls verfügbar)
        if hasattr(file, 'size') and file.size and file.size > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Image too large. Maximum size: {self.MAX_FILE_SIZE // 1024 // 1024}MB"
            )
    
    async def analyze_screenshot(
        self,
        file: UploadFile,
        custom_prompt: Optional[str] = None,
    ) -> LeadFromImageSchema:
        """
        Analysiert einen Screenshot mit GPT-4o Vision.
        
        Args:
            file: Das Screenshot-Bild
            custom_prompt: Optionaler custom Prompt
            
        Returns:
            Strukturierte Lead-Daten
            
        Raises:
            HTTPException: Bei Fehlern
        """
        if not self._client:
            raise HTTPException(
                status_code=503,
                detail="Vision service not configured. Please set OPENAI_API_KEY."
            )
        
        # Validierung
        self._validate_image(file)
        
        # Bild kodieren
        base64_image = await self._encode_image_to_base64(file)
        
        logger.info(f"Analyzing screenshot: {file.filename}, type: {file.content_type}")
        
        try:
            # GPT-4o Vision Request
            response = await self._client.chat.completions.create(
                model="gpt-4o",  # Vision-fähiges Modell
                messages=[
                    {
                        "role": "system",
                        "content": custom_prompt or VISION_SCREENSHOT_PROMPT
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Analysiere diesen Screenshot und extrahiere die Lead-Daten als JSON."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{file.content_type};base64,{base64_image}",
                                    "detail": "high"  # Bessere OCR, mehr Tokens
                                }
                            }
                        ]
                    }
                ],
                temperature=0.1,  # Niedrig für faktische Korrektheit
                max_tokens=2000,
                response_format={"type": "json_object"}  # Erzwingt JSON
            )
            
            # Tokens loggen für Monitoring
            usage = response.usage
            logger.info(
                f"Vision API usage: prompt={usage.prompt_tokens}, "
                f"completion={usage.completion_tokens}, total={usage.total_tokens}"
            )
            
        except Exception as e:
            logger.error(f"OpenAI Vision API error: {e}")
            raise HTTPException(
                status_code=503,
                detail="AI Vision service temporarily unavailable. Please try again."
            )
        
        # Response parsen
        ai_content = response.choices[0].message.content
        
        try:
            data_dict = json.loads(ai_content)
            validated_data = LeadFromImageSchema(**data_dict)
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse Vision response: {e}. Raw: {ai_content[:500]}")
            raise HTTPException(
                status_code=422,
                detail="Could not parse profile data. Please try a clearer screenshot."
            )
        
        logger.info(
            f"Screenshot analyzed: platform={validated_data.platform}, "
            f"name={validated_data.display_name}, confidence={validated_data.confidence_score}"
        )
        
        return validated_data
    
    async def process_screenshot_and_create_lead(
        self,
        user_id: str,
        file: UploadFile,
        auto_create: bool = True,
    ) -> ScreenshotUploadResponse:
        """
        Komplette Pipeline: Screenshot → Analyse → Lead erstellen.
        
        Args:
            user_id: ID des Users der den Screenshot hochlädt
            file: Das Screenshot-Bild
            auto_create: Lead automatisch erstellen?
            
        Returns:
            ScreenshotUploadResponse mit Lead-Daten
        """
        # 1. Screenshot analysieren
        analysis = await self.analyze_screenshot(file)
        
        # 2. Confidence Check
        if analysis.confidence_score < self.MIN_CONFIDENCE:
            raise HTTPException(
                status_code=422,
                detail=f"Screenshot quality too low (confidence: {analysis.confidence_score:.0%}). "
                       "Please try a clearer screenshot."
            )
        
        # 3. Lead-Daten vorbereiten
        lead_name = analysis.display_name or analysis.username_handle or "Unbekannt"
        
        lead_data = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": lead_name,
            "first_name": lead_name.split()[0] if lead_name else "Unbekannt",
            "last_name": " ".join(lead_name.split()[1:]) if len(lead_name.split()) > 1 else "",
            "handle": analysis.username_handle,
            "platform": analysis.platform.value,
            "source": f"Screenshot Import ({analysis.platform.value})",
            "email": analysis.email_detected,
            "phone": analysis.phone_detected,
            "website": analysis.website_link,
            "bio": analysis.bio_text_raw,
            "location": analysis.location,
            "tags": analysis.detected_keywords,
            "notes": self._build_lead_notes(analysis),
            "status": "new",
            "mlm_interest_type": self._map_intent_to_mlm_type(analysis.lead_intent),
            "lead_score": int(analysis.confidence_score * 100),
            "custom_fields": {
                "import_method": "screenshot",
                "import_date": datetime.now().isoformat(),
                "platform": analysis.platform.value,
                "follower_estimate": analysis.follower_count_estimate,
                "is_business_account": analysis.is_business_account,
                "is_creator_account": analysis.is_creator_account,
                "industry": analysis.industry_guess,
                "nm_signals": analysis.network_marketing_signals,
            },
            "created_at": datetime.now().isoformat(),
        }
        
        # 4. Lead erstellen (falls auto_create)
        if auto_create:
            from app.db.supabase_client import get_supabase_client
            try:
                supabase = get_supabase_client()
                result = await supabase.table("leads").insert({
                    "id": lead_data["id"],
                    "user_id": user_id,
                    "first_name": lead_data["first_name"],
                    "last_name": lead_data["last_name"],
                    "email": lead_data.get("email"),
                    "phone": lead_data.get("phone"),
                    "source": lead_data["source"],
                    "status": lead_data["status"],
                    "tags": lead_data["tags"],
                    "notes": lead_data["notes"],
                    "lead_score": lead_data["lead_score"],
                    "custom_fields": lead_data["custom_fields"],
                    # Lead Status System: Screenshot-Import = definitiv neu
                    "contact_status": "never_contacted",
                    "contact_count": 0,
                }).execute()
                logger.info(f"Lead saved to database: {lead_name} ({analysis.platform.value})")
            except Exception as db_error:
                logger.warning(f"Could not save lead to DB (continuing anyway): {db_error}")
            logger.info(f"Lead created from screenshot: {lead_name} ({analysis.platform.value})")
        
        # 5. Response erstellen
        return ScreenshotUploadResponse(
            status="success",
            lead_id=lead_data["id"],
            lead_name=lead_name,
            platform=analysis.platform.value,
            icebreaker=analysis.suggested_icebreaker_topic,
            suggested_message=analysis.suggested_first_message,
            confidence=analysis.confidence_score,
            message=f"Lead '{lead_name}' erfolgreich aus {analysis.platform.value} Screenshot erstellt!"
        )
    
    def _build_lead_notes(self, analysis: LeadFromImageSchema) -> str:
        """Baut informative Notes für den Lead."""
        notes_parts = []
        
        if analysis.suggested_icebreaker_topic:
            notes_parts.append(f"💡 Icebreaker: {analysis.suggested_icebreaker_topic}")
        
        if analysis.suggested_first_message:
            notes_parts.append(f"📝 Vorschlag: {analysis.suggested_first_message}")
        
        if analysis.network_marketing_signals:
            notes_parts.append(f"🎯 NM-Signale: {', '.join(analysis.network_marketing_signals)}")
        
        if analysis.industry_guess:
            notes_parts.append(f"🏢 Branche: {analysis.industry_guess}")
        
        if analysis.follower_count_estimate:
            notes_parts.append(f"👥 Follower: {analysis.follower_count_estimate}")
        
        return "\n".join(notes_parts) if notes_parts else "Importiert via Screenshot"
    
    def _map_intent_to_mlm_type(self, intent: LeadIntent) -> str:
        """Mappt LeadIntent auf MLM Interest Type."""
        mapping = {
            LeadIntent.BUSINESS: "business",
            LeadIntent.PRODUCT: "product",
            LeadIntent.BOTH: "both",
            LeadIntent.UNCLEAR: "none",
        }
        return mapping.get(intent, "none")


# ============================================
# SINGLETON & FACTORY
# ============================================

_image_service: Optional[ImageProcessingService] = None


def get_image_processing_service() -> ImageProcessingService:
    """Gibt die Image Processing Service Instanz zurück."""
    global _image_service
    if _image_service is None:
        _image_service = ImageProcessingService()
    return _image_service


__all__ = [
    "ImageProcessingService",
    "get_image_processing_service",
]

