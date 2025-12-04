"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MLM SCRIPTS LIBRARY                                                       ║
║  Zentrale Script-Sammlung für alle MLM-Unternehmen                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from .base_scripts import BASE_SCRIPTS
from .zinzino_scripts import (
    ZINZINO_SCRIPTS,
    ZINZINO_COMPLIANCE,
    get_scripts_for_category as zinzino_get_scripts_for_category,
    get_script as zinzino_get_script,
    get_all_categories as zinzino_get_all_categories,
    check_compliance as zinzino_check_compliance,
)
from .herbalife_scripts import HERBALIFE_SCRIPTS, HERBALIFE_COMPLIANCE
from .compliance_rules import (
    get_compliance_rules,
    check_compliance,
    MLM_COMPLIANCE_RULES,
    get_allowed_health_claims,
    suggest_compliant_text,
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
    "get_allowed_health_claims",
    "suggest_compliant_text",
    # Zinzino Helper
    "zinzino_get_scripts_for_category",
    "zinzino_get_script",
    "zinzino_get_all_categories",
    "zinzino_check_compliance",
]

