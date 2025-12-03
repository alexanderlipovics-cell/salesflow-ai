"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVE ASSIST SERVICES - v3.3 PRODUCTION READY                              ║
║  Echtzeit-Verkaufsassistenz mit Emotion Engine & Performance Caching       ║
╚════════════════════════════════════════════════════════════════════════════╝

Features v3.3:
    - Session-Cache für <200ms Response
    - Emotion Engine (Mood, Engagement, Decision)
    - Multi-Language Intent Detection
    - Learning from User Feedback
    - Coach Analytics
    - Vertical-spezifische Konfiguration
"""

from .service import LiveAssistService
from .service_v3 import LiveAssistServiceV3
from .cache import LiveAssistCache, get_cache
from .emotion import (
    EmotionAnalysis, 
    analyze_emotion, 
    get_tone_instruction,
    summarize_emotions_for_coach,
    MOOD_SIGNALS,
    DECISION_SIGNALS,
    TONE_INSTRUCTIONS,
)
from .intent_detection import (
    IntentResult,
    detect_intent,
    detect_language,
    record_intent_correction,
    record_objection_correction,
    OBJECTION_KEYWORDS,
    INTENT_KEYWORDS,
)
from .coach_analytics import (
    CoachTip,
    CoachInsights,
    CoachAnalyticsService,
)


__all__ = [
    # Main Service
    "LiveAssistService",
    "LiveAssistServiceV3",
    
    # Cache
    "LiveAssistCache",
    "get_cache",
    
    # Emotion Engine
    "EmotionAnalysis",
    "analyze_emotion",
    "get_tone_instruction",
    "summarize_emotions_for_coach",
    "MOOD_SIGNALS",
    "DECISION_SIGNALS", 
    "TONE_INSTRUCTIONS",
    
    # Intent Detection
    "IntentResult",
    "detect_intent",
    "detect_language",
    "record_intent_correction",
    "record_objection_correction",
    "OBJECTION_KEYWORDS",
    "INTENT_KEYWORDS",
    
    # Coach Analytics
    "CoachTip",
    "CoachInsights",
    "CoachAnalyticsService",
]
