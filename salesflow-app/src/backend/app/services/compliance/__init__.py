"""
Compliance Sentinel Module
"""

from .compliance_sentinel import (
    ComplianceSentinel,
    ComplianceResult,
    Violation,
    ViolationType,
    check_message,
    is_compliant,
    get_violations_summary,
    COMPLIANCE_RULES,
    COMPANY_SPECIFIC_RULES,
    COMPLIANT_ALTERNATIVES,
)

__all__ = [
    "ComplianceSentinel",
    "ComplianceResult",
    "Violation",
    "ViolationType",
    "check_message",
    "is_compliant",
    "get_violations_summary",
    "COMPLIANCE_RULES",
    "COMPANY_SPECIFIC_RULES",
    "COMPLIANT_ALTERNATIVES",
]

