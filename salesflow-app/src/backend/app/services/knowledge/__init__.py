# backend/app/services/knowledge/__init__.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  KNOWLEDGE SERVICE                                                         ║
║  Evidence Hub & Company Knowledge Management                               ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from .service import KnowledgeService
from .embedding_service import EmbeddingService
from .import_service import (
    KnowledgeImportService,
    import_evidence_hub,
    import_marketing_intelligence,
)

__all__ = [
    "KnowledgeService",
    "EmbeddingService",
    "KnowledgeImportService",
    "import_evidence_hub",
    "import_marketing_intelligence",
]

