"""
MLM Parser Module
=================
Spezialisierte Parser für verschiedene MLM-Unternehmen
"""

from .doterra_parser import (
    DoterraRank,
    DoterraContact,
    DoterraParser,
    DOTERRA_FIELD_MAPPING,
    RANK_REQUIREMENTS as DOTERRA_RANK_REQUIREMENTS,
    UNILEVEL_PERCENTAGES,
    POWER_OF_3_BONUS,
)

from .herbalife_parser import (
    HerbalifeLevel,
    HerbalifeContact,
    HerbalifeParser,
    HERBALIFE_FIELD_MAPPING,
    SUPERVISOR_QUALIFICATION,
    REQUALIFICATION_REQUIREMENTS,
    ROYALTY_OVERRIDES,
    TAB_TEAM_REQUIREMENTS,
    COMPLIANCE_RULES,
)

__all__ = [
    # doTERRA
    "DoterraRank",
    "DoterraContact",
    "DoterraParser",
    "DOTERRA_FIELD_MAPPING",
    "DOTERRA_RANK_REQUIREMENTS",
    "UNILEVEL_PERCENTAGES",
    "POWER_OF_3_BONUS",
    
    # Herbalife
    "HerbalifeLevel",
    "HerbalifeContact",
    "HerbalifeParser",
    "HERBALIFE_FIELD_MAPPING",
    "SUPERVISOR_QUALIFICATION",
    "REQUALIFICATION_REQUIREMENTS",
    "ROYALTY_OVERRIDES",
    "TAB_TEAM_REQUIREMENTS",
    "COMPLIANCE_RULES",
]

