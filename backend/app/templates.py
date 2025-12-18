"""
Textbausteine für Follow-ups und Direktnachrichten.
"""

from typing import Dict

FOLLOWUP_TEMPLATES: Dict[str, str] = {
    "follow_up": (
        "Hey [NAME]! 👋\n"
        "Wollte mich kurz melden – ist das Thema noch aktuell?\n"
        "LG [USER]"
    ),
    "check_in": (
        "Hey [NAME]! 👋\n"
        "Schönen [DAY]! Wie läuft's bei dir?\n"
        "LG [USER]"
    ),
    "value": (
        "Hey [NAME]! 👋\n"
        "Hab gerade was gesehen, das perfekt zu dir passt.\n"
        "Hast du kurz Zeit?\n"
        "LG [USER]"
    ),
    "urgency": (
        "Hey [NAME]! 👋\n"
        "Kurze Sache: Wir haben gerade ein Zeitfenster frei und ich wollte dich zuerst fragen.\n"
        "Soll ich dir was reservieren?\n"
        "LG [USER]"
    ),
    "referral": (
        "Hey [NAME]! 👋\n"
        "Wem aus deinem Umfeld würde das auch helfen?\n"
        "Fallen dir 2–3 Leute ein, die offen wären?\n"
        "LG [USER]"
    ),
    "referral_question": (
        "Hey [NAME]! 👋\n"
        "Wer achtet bei euch noch auf [TOPIC]?\n"
        "Wenn dir 2–3 Leute einfallen, connecte mich gerne.\n"
        "LG [USER]"
    ),
}


__all__ = ["FOLLOWUP_TEMPLATES"]
