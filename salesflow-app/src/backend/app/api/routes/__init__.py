# backend/app/api/routes/__init__.py
"""API Routes Package."""

from . import chat_import
from . import voice
from . import learning
from . import analytics
from . import brain
from . import finance
from . import pending_actions
from . import storybook
from . import pulse_tracker
from . import live_assist
from . import sales_intelligence  # v3.0
from . import sequences  # Sequencer Engine
from . import email_accounts  # Email Accounts
from . import autonomous  # KI-Autonomie System
from . import scripts  # Script Library

# NetworkerOS v2 API
from . import mentor  # MENTOR AI Chat
from . import contacts  # Kontaktverwaltung
from . import dmo  # Daily Method of Operation
from . import team  # Team Management
from . import alerts  # Predictive Alerts
from . import referral  # Referral/Empfehlungs-System

__all__ = [
    "chat_import",
    "voice",
    "learning",
    "analytics",
    "brain",
    "finance",
    "pending_actions",
    "storybook",
    "pulse_tracker",
    "live_assist",
    "sales_intelligence",  # v3.0
    "sequences",  # Sequencer Engine
    "email_accounts",  # Email Accounts
    "autonomous",  # KI-Autonomie System
    "scripts",  # Script Library
    # NetworkerOS v2
    "mentor",
    "contacts",
    "dmo",
    "team",
    "alerts",
    "referral",
]

