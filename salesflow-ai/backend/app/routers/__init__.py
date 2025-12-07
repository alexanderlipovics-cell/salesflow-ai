"""
Router-Modul für Sales Flow AI (App-Paket).
"""
from . import (
    analytics,
    # autopilot,  # Temporär deaktiviert - TODO: autopilot_engine.py vervollständigen
    channel_webhooks,
    chat,
    contacts,
    copilot,
    deals,
    delay_master,
    followups,
    idps,
    import_customers,
    leads,
    objection_brain,
    phoenix,
    tasks,
)

__all__ = [
    "analytics",
    # "autopilot",
    "channel_webhooks",
    "chat",
    "contacts",
    "copilot",
    "deals",
    "delay_master",
    "followups",
    "idps",
    "import_customers",
    "leads",
    "objection_brain",
    "phoenix",
    "tasks",
]