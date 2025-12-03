# ============================================================================
# FILE: app/services/ocr_service.py
# DESCRIPTION: OCR Service - SCREENSHOT-REACTIVATOR Implementation
# ============================================================================

"""
OCR Service for automatic lead import from screenshots
Uses Google Cloud Vision API for text extraction
"""

from __future__ import annotations

import base64
import re
from typing import Dict, List
import time

from app.config import get_settings
from app.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class OcrService:
    """Service for OCR and text extraction from images"""

    def __init__(self):
        self.google_vision_client = None
        self._init_vision_client()

    def _init_vision_client(self):
        """Initialize Google Cloud Vision client if credentials available"""
        try:
            # Try to import Google Vision
            from google.cloud import vision
            import os
            
            # Check if credentials are set
            if hasattr(settings, 'GOOGLE_CREDENTIALS_PATH'):
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = settings.GOOGLE_CREDENTIALS_PATH
                self.google_vision_client = vision.ImageAnnotatorClient()
                logger.info("Google Vision API initialized")
            else:
                logger.warning("Google Vision credentials not found - using fallback OCR")
        except ImportError:
            logger.warning("google-cloud-vision not installed - using fallback OCR")
        except Exception as e:
            logger.error(f"Failed to initialize Google Vision: {e}")

    async def extract_text_from_image(
        self, 
        image_base64: str
    ) -> Dict[str, any]:
        """
        Extract text from base64 encoded image
        
        Args:
            image_base64: Base64 encoded image data
            
        Returns:
            {
                "text": str,
                "confidence": float,
                "processing_time_ms": int
            }
        """
        start_time = time.time()
        
        try:
            # Decode base64
            image_bytes = base64.b64decode(image_base64)
            
            # Use Google Vision if available
            if self.google_vision_client:
                text = await self._extract_with_google_vision(image_bytes)
                confidence = 0.9  # Google Vision is generally accurate
            else:
                # Fallback: Simple pattern matching (for testing)
                text = await self._extract_with_fallback(image_bytes)
                confidence = 0.5
            
            processing_time = int((time.time() - start_time) * 1000)
            
            logger.info(
                "OCR extraction completed",
                extra={
                    "text_length": len(text),
                    "processing_time_ms": processing_time
                }
            )
            
            return {
                "text": text,
                "confidence": confidence,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            raise

    async def _extract_with_google_vision(self, image_bytes: bytes) -> str:
        """Extract text using Google Cloud Vision API"""
        from google.cloud import vision
        
        image = vision.Image(content=image_bytes)
        response = self.google_vision_client.text_detection(image=image)
        
        if response.error.message:
            raise Exception(f"Google Vision error: {response.error.message}")
        
        texts = response.text_annotations
        if texts:
            return texts[0].description
        return ""

    async def _extract_with_fallback(self, image_bytes: bytes) -> str:
        """Fallback OCR (for testing without Google Vision)"""
        # This is a placeholder - in production, use Google Vision
        # For testing, we can return dummy data
        logger.warning("Using fallback OCR - install google-cloud-vision for production")
        return "Max Mustermann\n+49 123 456789\nmax@example.com\n\nAnna Schmidt\n+49 987 654321"

    def parse_leads_from_text(self, text: str) -> List[Dict[str, str]]:
        """
        Parse leads from extracted text
        
        Looks for patterns like:
        - Name (2-3 words)
        - Phone (various formats)
        - Email
        
        Returns list of lead dictionaries
        """
        leads = []
        
        # Split text into blocks (separated by double newline or >3 spaces)
        blocks = re.split(r'\n\n+|\s{4,}', text)
        
        for block in blocks:
            lead = self._extract_lead_from_block(block)
            if lead.get("name") or lead.get("phone") or lead.get("email"):
                leads.append(lead)
        
        logger.info(f"Parsed {len(leads)} leads from OCR text")
        return leads

    def _extract_lead_from_block(self, block: str) -> Dict[str, str]:
        """Extract lead data from a text block"""
        lead = {"name": "", "phone": "", "email": "", "notes": ""}
        
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        
        for line in lines:
            # Email pattern
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', line)
            if email_match and not lead["email"]:
                lead["email"] = email_match.group(0)
                continue
            
            # Phone pattern (german/international)
            phone_match = re.search(
                r'(\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,5}',
                line
            )
            if phone_match and not lead["phone"]:
                lead["phone"] = phone_match.group(0)
                continue
            
            # Name pattern (2-3 words, capitalized)
            name_match = re.match(r'^([A-ZÄÖÜ][a-zäöüß]+\s){1,2}[A-ZÄÖÜ][a-zäöüß]+$', line)
            if name_match and not lead["name"]:
                lead["name"] = line
                continue
            
            # Everything else goes to notes
            if line and not lead["name"]:
                lead["name"] = line  # First line is likely the name
            else:
                lead["notes"] += line + " "
        
        lead["notes"] = lead["notes"].strip()
        return lead


# Singleton instance
ocr_service = OcrService()

