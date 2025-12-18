# backend/app/events/types.py

from __future__ import annotations

from enum import Enum


class EventType(str, Enum):
    LEAD_CREATED = "lead.created"
    MESSAGE_SENT = "message.sent"
    SEQUENCE_STEP_EXECUTED = "sequence.step_executed"
    AUTOPILOT_ACTION_EXECUTED = "autopilot.action_executed"

