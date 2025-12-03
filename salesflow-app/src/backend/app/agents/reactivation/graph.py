"""
Reactivation Agent - LangGraph Definition

Der Haupt-Graph für den Reactivation Agent.
Orchestriert alle Nodes in der korrekten Reihenfolge.
"""

import logging
from typing import Optional

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver

from .state import ReactivationState
from .nodes import (
    perception,
    memory_retrieval,
    signal_detection,
    reasoning,
    message_generation,
    compliance_check,
    human_handoff,
)
from .edges import (
    should_continue_after_signals,
    route_after_reasoning,
    route_after_compliance,
)

logger = logging.getLogger(__name__)


def create_reactivation_graph(
    db_connection_string: Optional[str] = None,
    enable_checkpointing: bool = True
) -> StateGraph:
    """
    Erstellt den LangGraph für den Reactivation Agent.
    
    Args:
        db_connection_string: PostgreSQL Connection String für Checkpointing.
                             Format: postgresql://user:pass@host:port/db
        enable_checkpointing: Ob State Persistence aktiviert werden soll.
    
    Returns:
        Kompilierter StateGraph ready for execution.
    
    Flow:
    ┌─────────────────┐
    │   PERCEPTION    │ ← Lead-Basisdaten laden
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │ MEMORY RETRIEVAL│ ← RAG: Interaktionshistorie
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │ SIGNAL DETECTION│ ← Externe Signale prüfen
    └────────┬────────┘
             │
             ▼ (Conditional)
        ┌────┴────┐
        │ Signals?│
        └────┬────┘
             │
    ┌────────┴────────┐     ┌───────┐
    │ Yes: REASONING  │     │ No:   │
    └────────┬────────┘     │ END   │
             │              └───────┘
             ▼ (Conditional)
        ┌────┴────┐
        │Activate?│
        └────┬────┘
             │
    ┌────────┴────────────┐  ┌───────┐
    │ Yes: MSG_GENERATION │  │ No:   │
    └────────┬────────────┘  │ END   │
             │               └───────┘
             ▼
    ┌─────────────────┐
    │ COMPLIANCE_CHECK│ ← DSGVO/Liability
    └────────┬────────┘
             │
             ▼ (Conditional)
        ┌────┴────┐
        │ Passed? │
        └────┬────┘
             │
    ┌────────┴────────────┐  ┌───────────┐  ┌───────┐
    │ Review:             │  │ Auto-Send │  │Reject │
    │ HUMAN_HANDOFF       │  │ END       │  │ END   │
    └────────┬────────────┘  └───────────┘  └───────┘
             │
             ▼
           END
    """
    
    logger.info("Creating Reactivation Agent Graph...")
    
    # ═══════════════════════════════════════════════════════════════
    # CHECKPOINTER (Optional)
    # ═══════════════════════════════════════════════════════════════
    
    checkpointer = None
    if enable_checkpointing and db_connection_string:
        try:
            checkpointer = PostgresSaver.from_conn_string(db_connection_string)
            logger.info("PostgreSQL Checkpointer initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Checkpointer: {e}")
            checkpointer = None
    
    # ═══════════════════════════════════════════════════════════════
    # GRAPH DEFINITION
    # ═══════════════════════════════════════════════════════════════
    
    workflow = StateGraph(ReactivationState)
    
    # ─────────────────────────────────────────────────────────────────
    # NODES
    # ─────────────────────────────────────────────────────────────────
    
    workflow.add_node("perception", perception.run)
    workflow.add_node("memory_retrieval", memory_retrieval.run)
    workflow.add_node("signal_detection", signal_detection.run)
    workflow.add_node("reasoning", reasoning.run)
    workflow.add_node("message_generation", message_generation.run)
    workflow.add_node("compliance_check", compliance_check.run)
    workflow.add_node("human_handoff", human_handoff.run)
    
    # ─────────────────────────────────────────────────────────────────
    # EDGES
    # ─────────────────────────────────────────────────────────────────
    
    # Entry Point
    workflow.set_entry_point("perception")
    
    # Linear: perception → memory_retrieval → signal_detection
    workflow.add_edge("perception", "memory_retrieval")
    workflow.add_edge("memory_retrieval", "signal_detection")
    
    # Conditional: Nach Signal Detection
    # - Wenn Signale gefunden → reasoning
    # - Wenn keine Signale → END (skip)
    workflow.add_conditional_edges(
        "signal_detection",
        should_continue_after_signals,
        {
            "continue": "reasoning",
            "skip": END,
        }
    )
    
    # Conditional: Nach Reasoning
    # - Wenn Reaktivierung empfohlen → message_generation
    # - Wenn nicht → END (skip)
    workflow.add_conditional_edges(
        "reasoning",
        route_after_reasoning,
        {
            "generate_message": "message_generation",
            "skip": END,
        }
    )
    
    # Linear: message_generation → compliance_check
    workflow.add_edge("message_generation", "compliance_check")
    
    # Conditional: Nach Compliance Check
    # - Compliance passed + High Confidence → auto_send (END)
    # - Compliance passed + Low Confidence → human_review
    # - Compliance failed → reject (END)
    workflow.add_conditional_edges(
        "compliance_check",
        route_after_compliance,
        {
            "human_review": "human_handoff",
            "auto_send": END,
            "reject": END,
        }
    )
    
    # Final: human_handoff → END
    workflow.add_edge("human_handoff", END)
    
    # ═══════════════════════════════════════════════════════════════
    # COMPILE
    # ═══════════════════════════════════════════════════════════════
    
    logger.info("Compiling Reactivation Agent Graph...")
    
    if checkpointer:
        compiled = workflow.compile(checkpointer=checkpointer)
    else:
        compiled = workflow.compile()
    
    logger.info("Reactivation Agent Graph ready!")
    
    return compiled


# Convenience function for quick testing
def get_graph_visualization() -> str:
    """
    Gibt eine ASCII-Visualisierung des Graphen zurück.
    Nützlich für Debugging und Dokumentation.
    """
    return """
    ┌─────────────────────────────────────────────────────────────┐
    │              REACTIVATION AGENT GRAPH                       │
    ├─────────────────────────────────────────────────────────────┤
    │                                                             │
    │  ┌──────────────┐                                           │
    │  │  perception  │ ← Load lead data from CRM                 │
    │  └──────┬───────┘                                           │
    │         │                                                   │
    │         ▼                                                   │
    │  ┌──────────────────┐                                       │
    │  │ memory_retrieval │ ← RAG: Get interaction history        │
    │  └──────┬───────────┘                                       │
    │         │                                                   │
    │         ▼                                                   │
    │  ┌──────────────────┐                                       │
    │  │ signal_detection │ ← Check external signals              │
    │  └──────┬───────────┘                                       │
    │         │                                                   │
    │    ┌────┴────┐                                              │
    │    │Signals? │                                              │
    │    └────┬────┘                                              │
    │    Yes  │  No                                               │
    │    ┌────┘  └───────────────────────┐                        │
    │    │                               │                        │
    │    ▼                               ▼                        │
    │  ┌───────────┐                 ┌───────┐                    │
    │  │ reasoning │                 │  END  │                    │
    │  └─────┬─────┘                 └───────┘                    │
    │        │                                                    │
    │   ┌────┴────┐                                               │
    │   │Activate?│                                               │
    │   └────┬────┘                                               │
    │   Yes  │  No                                                │
    │   ┌────┘  └───────────────────────┐                         │
    │   │                               │                         │
    │   ▼                               ▼                         │
    │  ┌────────────────────┐       ┌───────┐                     │
    │  │ message_generation │       │  END  │                     │
    │  └────────┬───────────┘       └───────┘                     │
    │           │                                                 │
    │           ▼                                                 │
    │  ┌──────────────────┐                                       │
    │  │ compliance_check │ ← DSGVO/Liability check               │
    │  └────────┬─────────┘                                       │
    │           │                                                 │
    │      ┌────┴────┐                                            │
    │      │ Route?  │                                            │
    │      └────┬────┘                                            │
    │   Review  │  Auto  │  Reject                                │
    │   ┌───────┼────────┼───────┐                                │
    │   │       │        │       │                                │
    │   ▼       ▼        ▼       ▼                                │
    │ ┌──────────────┐ ┌─────┐ ┌───────┐                          │
    │ │ human_handoff│ │ END │ │  END  │                          │
    │ └──────┬───────┘ └─────┘ └───────┘                          │
    │        │                                                    │
    │        ▼                                                    │
    │     ┌─────┐                                                 │
    │     │ END │                                                 │
    │     └─────┘                                                 │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
    """

