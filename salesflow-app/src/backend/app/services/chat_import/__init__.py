# backend/app/services/chat_import/__init__.py
"""
Chat Import Service Module
Erweiterte Lead-Extraktion aus Chat-Verläufen mit Conversation Intelligence

Features:
- KI-gestützte Chat-Analyse mit Claude
- Lead-Extraktion mit Status & Deal-State
- Template Extraction
- Objection Detection
- Contact Plan Automation
- Learning Case Integration
"""

from .service import ChatImportService, get_chat_import_service_v2
from .pending_actions import PendingActionsService, get_pending_actions_service

# Alias für Kompatibilität
ChatImportServiceV2 = ChatImportService

__all__ = [
    "ChatImportService",
    "ChatImportServiceV2",
    "get_chat_import_service_v2",
    "PendingActionsService",
    "get_pending_actions_service",
]
