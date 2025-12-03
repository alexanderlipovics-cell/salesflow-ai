"""
╔════════════════════════════════════════════════════════════════════════════╗
║  REACTIVATION AGENT                                                        ║
║  Autonomer LangGraph Agent für Lead-Reaktivierung                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Features:                                                                 ║
║  ✅ Signal-basierte Reaktivierung (News, LinkedIn, Intent)                 ║
║  ✅ RAG Memory Engine für kontextuelle Personalisierung                    ║
║  ✅ DSGVO/Liability Compliance Checks                                      ║
║  ✅ Human-in-the-Loop Review Queue                                         ║
║  ✅ Few-Shot Learning aus User-Feedback                                    ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from .graph import create_reactivation_graph
from .state import ReactivationState, LeadContext, ReactivationSignal

__all__ = [
    "create_reactivation_graph",
    "ReactivationState",
    "LeadContext", 
    "ReactivationSignal",
]

