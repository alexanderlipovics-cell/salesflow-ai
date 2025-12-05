"""
Services-Modul für Sales Flow AI.

Enthält Business-Logik und Engine-Services.
"""

from .autopilot_engine import (
    process_pending_autopilot_events_for_user,
    detect_action_for_message,
)

from .predictive_scoring import (
    calculate_p_score_for_lead,
    recalc_p_scores_for_user,
    get_hot_leads,
    SCORE_CONFIG,
)

from .next_best_action import (
    NBAActionKey,
    ACTION_DESCRIPTIONS,
    compute_next_best_action_for_lead,
    get_nba_batch_for_user,
)

from .idps_engine import (
    analyze_message_content,
    calculate_priority_score,
    get_unified_inbox,
    create_conversation,
    add_message_to_conversation,
    update_conversation_status,
    start_sequence_for_conversation,
    process_pending_sequence_actions,
    get_idps_analytics,
)

__all__ = [
    # Autopilot Engine
    "process_pending_autopilot_events_for_user",
    "detect_action_for_message",
    # Predictive Scoring (P-Score)
    "calculate_p_score_for_lead",
    "recalc_p_scores_for_user",
    "get_hot_leads",
    "SCORE_CONFIG",
    # Next Best Action (NBA)
    "NBAActionKey",
    "ACTION_DESCRIPTIONS",
    "compute_next_best_action_for_lead",
    "get_nba_batch_for_user",
    # IDPS Engine
    "analyze_message_content",
    "calculate_priority_score",
    "get_unified_inbox",
    "create_conversation",
    "add_message_to_conversation",
    "update_conversation_status",
    "start_sequence_for_conversation",
    "process_pending_sequence_actions",
    "get_idps_analytics",
]

