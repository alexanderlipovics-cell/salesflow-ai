# backend/app/services/__init__.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SERVICES PACKAGE                                                          ║
║  Business Logic und externe API-Integrationen                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Services:
- llm_client: Unified LLM Client (OpenAI, Anthropic)
- chief_context: Context Builder für CHIEF
- chat_import_service: Chat-Analyse und Lead-Import
- voice_service: Whisper STT + TTS
- storage_service: Supabase Storage
- learning: Learning Event Tracking
- analytics: Performance Analytics
- knowledge: Evidence Hub & Company Knowledge
- brain: Self-Learning Rules Engine
- push: Morning Briefing & Evening Recap
- live_assist: Live Sales Assistant Mode
"""

from .llm_client import LLMClient, get_llm_client, call_llm
from .chief_context import build_chief_context, format_context_for_llm, build_system_prompt
from .chat_import_service import ChatImportService, get_chat_import_service
from .voice_service import VoiceService, get_voice_service
from .storage_service import StorageService, get_storage_service
from .learning import LearningService, get_top_templates_for_context
from .analytics import AnalyticsService
from .knowledge import KnowledgeService, EmbeddingService
from .brain import SalesBrainService
from .push import PushService
from .live_assist import LiveAssistService

__all__ = [
    # LLM
    "LLMClient",
    "get_llm_client",
    "call_llm",
    # Chief Context
    "build_chief_context",
    "format_context_for_llm",
    "build_system_prompt",
    # Chat Import
    "ChatImportService",
    "get_chat_import_service",
    # Voice
    "VoiceService",
    "get_voice_service",
    # Storage
    "StorageService",
    "get_storage_service",
    # Learning
    "LearningService",
    "get_top_templates_for_context",
    # Analytics
    "AnalyticsService",
    # Knowledge
    "KnowledgeService",
    "EmbeddingService",
    # Brain
    "SalesBrainService",
    # Push
    "PushService",
    # Live Assist
    "LiveAssistService",
]
