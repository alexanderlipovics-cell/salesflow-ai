"""
User-Adaptive Chat Prompts - Personalisierung basierend auf User-Learning-Profile

Dieses Modul erweitert die Standard-Prompts um User-spezifische Anpassungen:
- Kommunikationsstil (Tone, Formality, Emoji-Usage)
- Sales-Style (aggressiv, balanced, consultative)
- Präferenzen aus vergangenen Interaktionen
- Erfolgreiche Patterns des Users
"""

from __future__ import annotations

import logging
from typing import Dict, Optional, Any
from dataclasses import dataclass

from app.core.ai_prompts import SALES_COACH_PROMPT, get_chief_system_prompt

logger = logging.getLogger(__name__)


@dataclass
class UserLearningContext:
    """User-spezifischer Kontext für Prompt-Anpassung"""
    user_id: str
    preferred_tone: str = "professional"  # professional, friendly, casual, formal
    avg_message_length: int = 150
    emoji_usage_level: int = 2  # 0-5 (0=keine, 5=viele)
    formality_score: float = 0.5  # 0.0-1.0 (0=sehr informell, 1=sehr formal)
    sales_style: str = "balanced"  # aggressive, balanced, consultative
    objection_handling_strength: float = 0.5
    closing_aggressiveness: float = 0.5
    top_script_ids: list[str] = None
    successful_patterns: list[str] = None
    user_name: Optional[str] = None
    business_name: Optional[str] = None
    vertical: Optional[str] = None  # network_marketing, real_estate, finance, etc.
    
    def __post_init__(self):
        if self.top_script_ids is None:
            self.top_script_ids = []
        if self.successful_patterns is None:
            self.successful_patterns = []


def build_user_adaptive_prompt(
    base_prompt: str,
    user_context: Optional[UserLearningContext] = None,
    lead_context: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Baut einen personalisierten System-Prompt basierend auf User-Learning-Profile.
    
    Args:
        base_prompt: Basis-System-Prompt (z.B. SALES_COACH_PROMPT)
        user_context: User-spezifischer Kontext aus Learning Profile
        lead_context: Optionaler Lead-Kontext
        
    Returns:
        Personalisierter System-Prompt
    """
    if not user_context:
        # Fallback: Standard-Prompt ohne Anpassungen
        return base_prompt
    
    # Baue personalisierte Anweisungen
    personalization_parts = []
    
    # 1. USER-IDENTITÄT
    if user_context.user_name:
        personalization_parts.append(
            f"Du kommunizierst mit {user_context.user_name}."
        )
    if user_context.business_name:
        personalization_parts.append(
            f"Der User arbeitet bei/in: {user_context.business_name}."
        )
    if user_context.vertical:
        personalization_parts.append(
            f"Branche: {user_context.vertical}."
        )
    
    # 2. KOMMUNIKATIONSSTIL
    tone_instructions = _build_tone_instructions(user_context)
    if tone_instructions:
        personalization_parts.append(tone_instructions)
    
    # 3. SALES-STYLE
    sales_style_instructions = _build_sales_style_instructions(user_context)
    if sales_style_instructions:
        personalization_parts.append(sales_style_instructions)
    
    # 4. ERFOLGREICHE PATTERNS
    if user_context.successful_patterns:
        personalization_parts.append(
            f"Erfolgreiche Ansätze dieses Users (nutze ähnliche Strategien):\n"
            f"{chr(10).join('- ' + p for p in user_context.successful_patterns[:5])}"
        )
    
    # 5. LEAD-KONTEXT (falls vorhanden)
    if lead_context:
        lead_info = _format_lead_context(lead_context)
        if lead_info:
            personalization_parts.append(f"Lead-Kontext:\n{lead_info}")
    
    # Kombiniere alles
    if personalization_parts:
        personalized_section = "\n\n".join([
            "═══════════════════════════════════════",
            "PERSONALISIERTE ANPASSUNGEN:",
            "═══════════════════════════════════════",
            *personalization_parts
        ])
        return f"{base_prompt}\n\n{personalized_section}"
    
    return base_prompt


def _build_tone_instructions(context: UserLearningContext) -> str:
    """Baut Anweisungen für Kommunikationsstil"""
    instructions = []
    
    # Tone
    tone_map = {
        "professional": "Professionell, aber freundlich. Nutze 'Sie' oder 'du' je nach Kontext.",
        "friendly": "Sehr freundlich und nahbar. Nutze 'du' und sei warmherzig.",
        "casual": "Locker und ungezwungen. Du-Ansprache, kurze Sätze.",
        "formal": "Sehr formell und respektvoll. Immer 'Sie'-Ansprache."
    }
    if context.preferred_tone in tone_map:
        instructions.append(f"Kommunikationsstil: {tone_map[context.preferred_tone]}")
    
    # Formality
    if context.formality_score < 0.3:
        instructions.append("Sehr informeller Ton - kurze, lockere Sätze.")
    elif context.formality_score > 0.7:
        instructions.append("Formeller Ton - vollständige Sätze, höfliche Formulierungen.")
    
    # Emoji-Usage
    emoji_guidance = {
        0: "Keine Emojis verwenden.",
        1: "Sehr sparsam mit Emojis (max. 1 pro Nachricht).",
        2: "Moderate Emoji-Nutzung (1-2 pro Nachricht).",
        3: "Normale Emoji-Nutzung (2-3 pro Nachricht).",
        4: "Häufige Emoji-Nutzung (3-4 pro Nachricht).",
        5: "Viele Emojis verwenden (4+ pro Nachricht)."
    }
    if context.emoji_usage_level in emoji_guidance:
        instructions.append(f"Emoji-Nutzung: {emoji_guidance[context.emoji_usage_level]}")
    
    # Message Length
    if context.avg_message_length < 100:
        instructions.append("Halte Nachrichten kurz und prägnant (max. 2-3 Sätze).")
    elif context.avg_message_length > 200:
        instructions.append("Ausführliche Nachrichten sind in Ordnung (3-5 Sätze).")
    
    return "\n".join(instructions) if instructions else ""


def _build_sales_style_instructions(context: UserLearningContext) -> str:
    """Baut Anweisungen für Sales-Style"""
    instructions = []
    
    # Sales Style
    style_map = {
        "aggressive": (
            "Aggressiver Sales-Style: Direkte Calls-to-Action, klare Deadlines, "
            "starker Fokus auf Abschluss. Sei proaktiv und dränge sanft."
        ),
        "balanced": (
            "Ausgewogener Sales-Style: Balance zwischen Beziehung und Abschluss. "
            "Biete Wert, aber führe auch zum nächsten Schritt."
        ),
        "consultative": (
            "Beratender Sales-Style: Fokus auf Problemlösung und Beratung. "
            "Baue Vertrauen auf, bevor du zum Abschluss führst."
        )
    }
    if context.sales_style in style_map:
        instructions.append(style_map[context.sales_style])
    
    # Closing Aggressiveness
    if context.closing_aggressiveness > 0.7:
        instructions.append("Sei proaktiv beim Abschluss - führe klar zum nächsten Schritt.")
    elif context.closing_aggressiveness < 0.3:
        instructions.append("Sanfter Abschluss - lass dem Lead Zeit, aber biete klare Optionen.")
    
    # Objection Handling
    if context.objection_handling_strength > 0.7:
        instructions.append("Starke Einwandbehandlung - antizipiere Einwände und biete Lösungen.")
    
    return "\n".join(instructions) if instructions else ""


def _format_lead_context(lead_context: Dict[str, Any]) -> str:
    """Formatiert Lead-Kontext für Prompt"""
    parts = []
    
    if lead_context.get("name"):
        parts.append(f"Lead: {lead_context['name']}")
    if lead_context.get("status"):
        parts.append(f"Status: {lead_context['status']}")
    if lead_context.get("score"):
        parts.append(f"Score: {lead_context['score']}")
    if lead_context.get("last_contact"):
        parts.append(f"Letzter Kontakt: {lead_context['last_contact']}")
    if lead_context.get("notes"):
        parts.append(f"Notizen: {lead_context['notes']}")
    
    return "\n".join(parts) if parts else ""


async def load_user_learning_context(
    user_id: str,
    db_client=None,
) -> Optional[UserLearningContext]:
    """
    Lädt User Learning Context aus der Datenbank.
    
    Args:
        user_id: User ID
        db_client: Supabase Client (optional)
        
    Returns:
        UserLearningContext oder None bei Fehler
    """
    if not db_client:
        try:
            from app.supabase_client import get_supabase_client
            db_client = get_supabase_client()
        except Exception as e:
            logger.warning(f"Could not get Supabase client: {e}")
            return None
    
    try:
        # Lade User Learning Profile
        result = db_client.table("user_learning_profile").select("*").eq("user_id", user_id).maybe_single().execute()
        
        if not result.data:
            # Kein Profil vorhanden - erstelle Default
            logger.info(f"No learning profile found for user {user_id}, using defaults")
            return UserLearningContext(user_id=user_id)
        
        data = result.data
        
        # Lade zusätzliche User-Infos (optional)
        user_info = None
        try:
            user_result = db_client.table("users").select("name, email, company_name").eq("id", user_id).maybe_single().execute()
            if user_result.data:
                user_info = user_result.data
        except Exception:
            pass  # Optional - nicht kritisch
        
        # Baue Context
        context = UserLearningContext(
            user_id=user_id,
            preferred_tone=data.get("preferred_tone", "professional"),
            avg_message_length=int(data.get("avg_message_length", 150)),
            emoji_usage_level=int(data.get("emoji_usage_level", 2)),
            formality_score=float(data.get("formality_score", 0.5)),
            sales_style=data.get("sales_style", "balanced"),
            objection_handling_strength=float(data.get("objection_handling_strength", 0.5)),
            closing_aggressiveness=float(data.get("closing_aggressiveness", 0.5)),
            top_script_ids=data.get("top_script_ids", []) or [],
            successful_patterns=data.get("successful_patterns", []) or [],
            user_name=user_info.get("name") if user_info else None,
            business_name=user_info.get("company_name") if user_info else None,
        )
        
        return context
        
    except Exception as e:
        logger.warning(f"Could not load user learning context: {e}")
        return None


def get_adaptive_chat_prompt(
    user_id: str,
    base_prompt: Optional[str] = None,
    lead_context: Optional[Dict[str, Any]] = None,
    db_client=None,
) -> str:
    """
    Hauptfunktion: Holt personalisierten Chat-Prompt für User.
    
    Args:
        user_id: User ID
        base_prompt: Basis-Prompt (default: SALES_COACH_PROMPT)
        lead_context: Optionaler Lead-Kontext
        db_client: Supabase Client (optional)
        
    Returns:
        Personalisierter System-Prompt
    """
    if base_prompt is None:
        base_prompt = SALES_COACH_PROMPT
    
    # Lade User Context (async - hier synchronisiert)
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    user_context = loop.run_until_complete(
        load_user_learning_context(user_id, db_client)
    )
    
    # Baue personalisierten Prompt
    return build_user_adaptive_prompt(
        base_prompt=base_prompt,
        user_context=user_context,
        lead_context=lead_context,
    )

