"""
Follow-up Engine für Sales Flow AI.

Dieses Modul bündelt alle Standard-Follow-ups
(FOLLOW_UP, CHECK_IN, VALUE, URGENCY, REFERRAL, EMPFEHLUNG).
Es ist so geschrieben, dass Cursor- oder ChatGPT-Agenten den Code
leicht lesen und erweitern können.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Literal


class FollowupType(str, Enum):
    FOLLOW_UP = "follow_up"
    CHECK_IN = "check_in"
    VALUE = "value"
    URGENCY = "urgency"
    REFERRAL = "referral"
    REFERRAL_QUESTION = "referral_question"


@dataclass
class FollowupContext:
    name: str  # [NAME]
    user: str  # [USER]
    day: str | None = None  # [DAY]
    topic: str | None = None  # [THEMA]


TEMPLATES: Dict[FollowupType, str] = {
    FollowupType.FOLLOW_UP: (
        "Hey {name}! 👋\n"
        "Wollte mich kurz melden – ist das Thema noch aktuell?\n"
        "LG {user}"
    ),
    FollowupType.CHECK_IN: (
        "Hey {name}! 👋\n"
        "Schönen {day}! Wie läuft's bei dir?\n"
        "LG {user}"
    ),
    FollowupType.VALUE: (
        "Hey {name}! 👋\n"
        "Hab gerade was gesehen, das perfekt zu dir passt.\n"
        "Hast du kurz Zeit?\n"
        "LG {user}"
    ),
    FollowupType.URGENCY: (
        "Hey {name}! 👋\n"
        "Kurze Frage: Wir haben gerade ein Zeitfenster frei.\n"
        "Interesse?\n"
        "LG {user}"
    ),
    FollowupType.REFERRAL: (
        "Hey {name}! 👋\n"
        "Wer in deinem Umfeld könnte das auch gebrauchen?\n"
        "Fallen dir 2–3 Leute ein?\n"
        "LG {user}"
    ),
    FollowupType.REFERRAL_QUESTION: (
        "Hey {name}! 👋\n\n"
        "Kurze Frage: Wer in deinem Umfeld achtet auch auf {topic}?\n\n"
        "Fallen dir 2–3 Leute ein?"
    ),
}


def render_followup(ftype: FollowupType, ctx: FollowupContext) -> str:
    """Rendert eine Follow-up-Nachricht für einen bestimmten Typ."""
    template = TEMPLATES[ftype]
    return template.format(
        name=ctx.name,
        user=ctx.user,
        day=ctx.day or "Tag",
        topic=ctx.topic or "das Thema",
    )


def choose_followup_type(
    last_status: Literal[
        "neu",
        "interessiert",
        "offen",
        "funkstille",
        "abschlussnah",
    ],
    wants_referrals: bool = False,
) -> FollowupType:
    """
    Einfache Heuristik, welcher Follow-up-Typ genutzt werden sollte.
    Diese Logik kann später von dir oder dem Agenten ausgebaut werden.
    """
    if wants_referrals:
        return FollowupType.REFERRAL

    if last_status == "neu":
        return FollowupType.CHECK_IN
    if last_status == "interessiert":
        return FollowupType.VALUE
    if last_status == "offen":
        return FollowupType.FOLLOW_UP
    if last_status == "abschlussnah":
        return FollowupType.URGENCY

    # Default: Person ist funkstille / lange nicht aktiv
    return FollowupType.FOLLOW_UP

