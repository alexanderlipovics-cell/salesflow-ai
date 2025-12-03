"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AI SERVICE MODULE                                                         ║
║  Unified AI Client with Logging, Skills & Analytics                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    from app.services.ai import AIService, Skill
    
    # Simple usage
    ai = AIService(user_id="...", company_id="...")
    response = await ai.generate(
        skill=Skill.ANALYZE_OBJECTION,
        prompt="Ich muss noch überlegen...",
        lead_id="..."
    )
    
    # Mark outcome
    await ai.update_outcome(interaction_id, "sent_to_lead")
"""

from .ai_service import AIService, Skill, AIInteraction
from .ai_logger import AILogger, log_ai_interaction

__all__ = [
    "AIService",
    "Skill",
    "AIInteraction",
    "AILogger",
    "log_ai_interaction",
]

