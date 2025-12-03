"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MENTOR AI SERVICE - NetworkerOS                                          ║
║  CHIEF = Coach + Helper + Intelligence + Expert + Friend                   ║
╚════════════════════════════════════════════════════════════════════════════╝

Der MENTOR ist der persönliche AI Sales-Coach für Network Marketing.

Features:
- Datengetriebene Insights aus Daily Flow, Leads, Aktivitäten
- Persönlichkeits-Anpassung via DISC-Profil
- Vertriebsexpertise für Einwandbehandlung, Scripting
- Motivations-Coaching bei Durchhängern
- Compliance-Sicherheit durch Locked Blocks
"""

from .service import MentorService, get_mentor_service
from .action_parser import ActionParser, ActionTag, extract_action_tags, strip_action_tags
from .prompts import MENTOR_SYSTEM_PROMPT, MENTOR_CONTEXT_TEMPLATE
from .context_builder import MentorContextBuilder

__all__ = [
    "MentorService",
    "get_mentor_service",
    "ActionParser",
    "ActionTag",
    "extract_action_tags",
    "strip_action_tags",
    "MENTOR_SYSTEM_PROMPT",
    "MENTOR_CONTEXT_TEMPLATE",
    "MentorContextBuilder",
]

