"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT LIBRARY SERVICE                                                     ║
║  50+ bewährte Scripts für Network Marketing & Sales                         ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Dynamische Script-Auswahl basierend auf Kontext
    - DISG-Persönlichkeitstyp-Anpassung
    - Beziehungslevel-Berücksichtigung (warm/kalt)
    - A/B Testing & Performance Tracking
"""

from .models import (
    ScriptCategory,
    ScriptContext,
    RelationshipLevel,
    DISGType,
    Script,
    ScriptVariant,
    ScriptPerformance,
)
from .service import ScriptLibraryService
from .disg_adapter import DISGScriptAdapter

__all__ = [
    # Models
    "ScriptCategory",
    "ScriptContext",
    "RelationshipLevel",
    "DISGType",
    "Script",
    "ScriptVariant",
    "ScriptPerformance",
    # Services
    "ScriptLibraryService",
    "DISGScriptAdapter",
]

