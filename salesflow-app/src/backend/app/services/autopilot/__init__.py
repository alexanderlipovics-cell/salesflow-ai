"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF AUTOPILOT SERVICE                                                   ║
║  Self-Driving Sales System - v3.2                                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Components:
- AutopilotEngine: Hauptlogik für Nachrichtenverarbeitung
- ConfidenceEngine: Trust Score Berechnung
- IntentDetector: Intent-Erkennung aus Nachrichten
- AutopilotOrchestrator: Koordination aller Auto-Aktionen
"""

from .engine import AutopilotEngine
from .confidence import ConfidenceEngine
from .intent_detector import IntentDetector
from .orchestrator import AutopilotOrchestrator

__all__ = [
    "AutopilotEngine",
    "ConfidenceEngine", 
    "IntentDetector",
    "AutopilotOrchestrator"
]

