"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVING OS - SELF-EVOLVING SALES INTELLIGENCE                             ║
║  Das selbstlernende Betriebssystem für Sales Flow AI                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Module:
- OverrideService: Erkennt User-Korrekturen → Pattern-Erkennung
- CommandService: Natürlichsprachliche Befehle → Strukturierte Regeln
- BroadcastService: Team Best Practices teilen
- CasesService: Gespräche importieren → Trainingsmaterial
- CollectiveIntelligenceService: Lernen von anderen (anonymisiert)
"""

from .override_service import OverrideService, OverrideAnalysis
from .command_service import CommandService
from .broadcast_service import BroadcastService
from .cases_service import LearningCasesService
from .collective_service import CollectiveIntelligenceService

__all__ = [
    "OverrideService",
    "OverrideAnalysis",
    "CommandService",
    "BroadcastService",
    "LearningCasesService",
    "CollectiveIntelligenceService",
]

