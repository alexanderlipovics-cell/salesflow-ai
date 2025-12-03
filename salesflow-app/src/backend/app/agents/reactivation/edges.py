"""
Reactivation Agent - Conditional Edge Functions

Definiert die Routing-Logik zwischen den Graph Nodes.
Diese Funktionen entscheiden, welcher Pfad im Graph genommen wird.
"""

from typing import Literal
import logging

from .state import ReactivationState

logger = logging.getLogger(__name__)


def should_continue_after_signals(
    state: ReactivationState
) -> Literal["continue", "skip"]:
    """
    Entscheidet nach Signal Detection, ob fortgefahren werden soll.
    
    Routing:
    - "continue": Mindestens ein relevantes Signal gefunden → reasoning
    - "skip": Keine Signale → END (Lead nicht reaktivierungswürdig)
    
    Logik:
    - Mindestens 1 Signal mit relevance_score > 0.5
    - ODER Intent-Signal (immer relevant)
    """
    signals = state.get("signals", [])
    
    if not signals:
        logger.info(
            f"[{state.get('run_id', 'unknown')}] "
            f"No signals found for lead {state.get('lead_id')} → skipping"
        )
        return "skip"
    
    # Prüfe auf relevante Signale
    relevant_signals = [
        s for s in signals 
        if s.get("relevance_score", 0) > 0.5 or s.get("type") == "intent"
    ]
    
    if not relevant_signals:
        logger.info(
            f"[{state.get('run_id', 'unknown')}] "
            f"Found {len(signals)} signals but none relevant enough → skipping"
        )
        return "skip"
    
    logger.info(
        f"[{state.get('run_id', 'unknown')}] "
        f"Found {len(relevant_signals)} relevant signals → continuing to reasoning"
    )
    
    return "continue"


def route_after_reasoning(
    state: ReactivationState
) -> Literal["generate_message", "skip"]:
    """
    Entscheidet nach Reasoning, ob eine Nachricht generiert werden soll.
    
    Routing:
    - "generate_message": Reaktivierung empfohlen → message_generation
    - "skip": Keine Reaktivierung → END
    
    Logik:
    - should_reactivate == True
    - confidence_score >= 0.5 (Minimum Threshold)
    """
    should_reactivate = state.get("should_reactivate", False)
    confidence = state.get("confidence_score", 0.0)
    strategy = state.get("reactivation_strategy")
    
    if not should_reactivate:
        logger.info(
            f"[{state.get('run_id', 'unknown')}] "
            f"Reasoning decided NOT to reactivate → skipping"
        )
        return "skip"
    
    if confidence < 0.5:
        logger.info(
            f"[{state.get('run_id', 'unknown')}] "
            f"Confidence too low ({confidence:.2f}) → skipping"
        )
        return "skip"
    
    logger.info(
        f"[{state.get('run_id', 'unknown')}] "
        f"Reactivation approved (confidence: {confidence:.2f}, strategy: {strategy}) "
        f"→ generating message"
    )
    
    return "generate_message"


def route_after_compliance(
    state: ReactivationState
) -> Literal["human_review", "auto_send", "reject"]:
    """
    Entscheidet nach Compliance Check, wie die Nachricht behandelt wird.
    
    Routing:
    - "human_review": Compliance passed, aber Review erforderlich → human_handoff
    - "auto_send": Compliance passed + hohe Confidence → automatisch senden
    - "reject": Compliance failed → Nachricht verwerfen
    
    Auto-Send Kriterien (alle müssen erfüllt sein):
    - compliance_passed == True
    - confidence_score >= 0.9
    - Kein High-Value Lead (> 10.000€)
    - Kanal ist LinkedIn (Email erfordert immer Review für DSGVO)
    """
    compliance_passed = state.get("compliance_passed", False)
    compliance_issues = state.get("compliance_issues", [])
    confidence = state.get("confidence_score", 0.0)
    channel = state.get("suggested_channel", "email")
    lead_context = state.get("lead_context", {})
    
    # 1. Compliance Failed → Reject
    if not compliance_passed:
        logger.warning(
            f"[{state.get('run_id', 'unknown')}] "
            f"Compliance FAILED: {compliance_issues} → rejecting message"
        )
        return "reject"
    
    # 2. Prüfe Auto-Send Kriterien
    can_auto_send = True
    review_reasons = []
    
    # Confidence Check
    if confidence < 0.9:
        can_auto_send = False
        review_reasons.append(f"Confidence unter 90% ({confidence:.0%})")
    
    # High-Value Lead Check
    deal_value = lead_context.get("deal_value_estimate", 0) or 0
    if deal_value > 10000:
        can_auto_send = False
        review_reasons.append(f"High-Value Lead (€{deal_value:,.0f})")
    
    # Email immer Review (DSGVO Double Opt-In Awareness)
    if channel == "email":
        can_auto_send = False
        review_reasons.append("Email erfordert DSGVO-Review")
    
    # Kein LinkedIn-Connection
    if channel == "linkedin" and not lead_context.get("has_linkedin_connection"):
        can_auto_send = False
        review_reasons.append("Keine LinkedIn-Verbindung")
    
    # 3. Routing Decision
    if can_auto_send:
        logger.info(
            f"[{state.get('run_id', 'unknown')}] "
            f"All auto-send criteria met → auto sending"
        )
        return "auto_send"
    else:
        # Set review reason in state for UI
        review_reason = "; ".join(review_reasons)
        logger.info(
            f"[{state.get('run_id', 'unknown')}] "
            f"Requires human review: {review_reason}"
        )
        return "human_review"


def get_routing_summary(state: ReactivationState) -> dict:
    """
    Gibt eine Zusammenfassung der Routing-Entscheidungen zurück.
    Nützlich für Debugging und Logging.
    """
    return {
        "run_id": state.get("run_id"),
        "lead_id": state.get("lead_id"),
        "signals_found": len(state.get("signals", [])),
        "primary_signal": state.get("primary_signal", {}).get("type"),
        "should_reactivate": state.get("should_reactivate"),
        "confidence_score": state.get("confidence_score"),
        "compliance_passed": state.get("compliance_passed"),
        "compliance_issues": state.get("compliance_issues", []),
        "requires_review": state.get("requires_review"),
        "suggested_channel": state.get("suggested_channel"),
    }

