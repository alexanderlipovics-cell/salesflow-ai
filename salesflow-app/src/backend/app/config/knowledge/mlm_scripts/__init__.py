"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MLM SCRIPTS LIBRARY                                                       ║
║  Zentrale Script-Sammlung für alle MLM-Unternehmen                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from .base_scripts import BASE_SCRIPTS
from .zinzino_scripts import ZINZINO_SCRIPTS, ZINZINO_COMPLIANCE
from .herbalife_scripts import HERBALIFE_SCRIPTS, HERBALIFE_COMPLIANCE
from .compliance_rules import (
    get_compliance_rules,
    check_compliance,
    MLM_COMPLIANCE_RULES,
)

__all__ = [
    "BASE_SCRIPTS",
    "ZINZINO_SCRIPTS",
    "ZINZINO_COMPLIANCE",
    "HERBALIFE_SCRIPTS",
    "HERBALIFE_COMPLIANCE",
    "get_compliance_rules",
    "check_compliance",
    "MLM_COMPLIANCE_RULES",
]

