"""
Intent Detection Service - Classifies user messages for model routing
Uses Groq (llama-3.1-8b-instant) for ultra-fast classification.
"""

import logging
import os
from typing import Optional
from groq import AsyncGroq
from .model_router import ModelTier

logger = logging.getLogger(__name__)

class IntentDetector:
    """Detects user intent for intelligent model routing."""

    INTENT_CLASSIFICATION_PROMPT = """Classify this user message into exactly ONE category:

CATEGORIES:
- QUERY: Asking for data, information, lists, or status (e.g., "zeig leads", "wie läuft's", "wer ist das")
- ACTION: Wants to create, update, or perform an action (e.g., "erstelle task", "markiere als kontaktiert")
- CONTENT: Needs generated text, messages, scripts, or creative content (e.g., "schreib nachricht", "hilf mit einwand")
- CHAT: General conversation or questions (e.g., "wie geht's", "erzähl mir")

IMPORTANT:
- Return ONLY the category name (QUERY/ACTION/CONTENT/CHAT)
- No explanation, no punctuation
- Be precise: if unsure, default to CHAT

Message: {message}
Category:"""

    INTENT_TO_MODEL = {
        "QUERY": ModelTier.MINI,      # Data lookups, status checks
        "ACTION": ModelTier.MINI,     # CRUD operations
        "CONTENT": ModelTier.MINI,    # Content generation - Mini ist gut genug!
        "CHAT": ModelTier.MINI        # General conversation
    }

    def __init__(self, ai_client=None):
        # Groq für ultra-schnelle Intent Detection
        self.groq_client = None
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                self.groq_client = AsyncGroq(api_key=groq_key)
            except Exception as e:
                logger.warning(f"Groq client init failed: {e}, falling back to OpenAI")
        # Fallback zu OpenAI wenn Groq nicht verfügbar
        self.ai_client = ai_client

    async def detect_intent(self, message: str) -> str:
        """
        Detect user intent using Groq (ultra-fast) or OpenAI fallback.

        Returns: "QUERY", "ACTION", "CONTENT", or "CHAT"
        """
        try:
            # Try Groq first (ultra-fast)
            if self.groq_client:
                try:
                    response = await self.groq_client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=[{
                            "role": "user",
                            "content": self.INTENT_CLASSIFICATION_PROMPT.format(message=message)
                        }],
                        max_tokens=10,
                        temperature=0.1
                    )
                    intent = response.choices[0].message.content.strip().upper()
                    logger.debug(f"Groq intent detection: {intent}")
                except Exception as e:
                    logger.warning(f"Groq intent detection failed: {e}, falling back to OpenAI")
                    # Fallback zu OpenAI
                    if self.ai_client:
                        response = await self.ai_client.chat.completions.create(
                            model=ModelTier.MINI.value,
                            messages=[{
                                "role": "user",
                                "content": self.INTENT_CLASSIFICATION_PROMPT.format(message=message)
                            }],
                            max_tokens=10,
                            temperature=0.1
                        )
                        intent = response.choices[0].message.content.strip().upper()
                    else:
                        return "CHAT"  # Safe default
            elif self.ai_client:
                # Fallback zu OpenAI
                response = await self.ai_client.chat.completions.create(
                    model=ModelTier.MINI.value,
                    messages=[{
                        "role": "user",
                        "content": self.INTENT_CLASSIFICATION_PROMPT.format(message=message)
                    }],
                    max_tokens=10,
                    temperature=0.1
                )
                intent = response.choices[0].message.content.strip().upper()
            else:
                return "CHAT"  # Safe default

            # Validate intent
            if intent not in ["QUERY", "ACTION", "CONTENT", "CHAT"]:
                logger.warning(f"Invalid intent detected: {intent}, defaulting to CHAT")
                intent = "CHAT"

            logger.debug(f"Detected intent: {intent} for message: {message[:50]}...")
            return intent

        except Exception as e:
            logger.error(f"Intent detection failed: {e}")
            return "CHAT"  # Safe default

    def get_model_for_intent(self, intent: str) -> ModelTier:
        """
        Get the appropriate model tier for a detected intent.
        """
        return self.INTENT_TO_MODEL.get(intent.upper(), ModelTier.MINI)

    async def classify_with_fallback(self, message: str) -> tuple[str, ModelTier]:
        """
        Detect intent and return both intent and recommended model.
        Includes fallback logic for edge cases.
        """
        # Quick keyword-based pre-classification (ultra-cheap)
        quick_intent = self._quick_classify(message)
        if quick_intent:
            model = self.get_model_for_intent(quick_intent)
            logger.debug(f"Quick classified: {quick_intent} -> {model.value}")
            return quick_intent, model

        # Full AI classification
        intent = await self.detect_intent(message)
        model = self.get_model_for_intent(intent)

        return intent, model

    def _quick_classify(self, message: str) -> Optional[str]:
        """
        Ultra-fast keyword-based classification for obvious cases.
        Returns None if needs full AI classification.
        """
        message_lower = message.lower()

        # Clear action indicators
        action_keywords = ["erstelle", "erstell", "create", "update", "ändere", "lösche", "delete", "markiere", "mark"]
        if any(keyword in message_lower for keyword in action_keywords):
            return "ACTION"

        # Clear content generation
        content_keywords = ["schreib", "schreiben", "formulier", "generier", "erstelle", "create", "nachricht", "message", "script", "text"]
        if any(keyword in message_lower for keyword in content_keywords):
            return "CONTENT"

        # Clear queries
        query_keywords = ["zeig", "zeige", "show", "liste", "list", "finde", "find", "suche", "search", "wie viele", "how many"]
        if any(keyword in message_lower for keyword in query_keywords):
            return "QUERY"

        return None  # Needs full classification
