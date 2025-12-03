# backend/app/services/learning/__init__.py
"""
Learning System Services.

Modules:
- service: Haupt-Learning-Service für Template-Lernen
- events: Event-basiertes Lernen für AI-Entscheidungen
- top_templates: Template-Analyse und -Ranking
"""

from .service import LearningService, get_learning_service
from .top_templates import get_top_templates_for_context, format_top_templates_for_prompt
from .events import (
    LearningEventsService,
    get_learning_events_service,
    EventType,
    ContextType,
    AIDecisionLog,
    UserActionLog,
    OutcomeLog,
    LearningSignals,
)

__all__ = [
    # Learning Service
    "LearningService",
    "get_learning_service",
    
    # Top Templates
    "get_top_templates_for_context",
    "format_top_templates_for_prompt",
    
    # Learning Events
    "LearningEventsService",
    "get_learning_events_service",
    "EventType",
    "ContextType",
    "AIDecisionLog",
    "UserActionLog",
    "OutcomeLog",
    "LearningSignals",
]
