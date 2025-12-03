"""
Vertical Adapters - Konkrete Implementierungen für jede Branche.
"""

from .mlm_adapter import MLMAdapter
from .real_estate_adapter import RealEstateAdapter
from .finance_adapter import FinanceAdapter
from .coaching_adapter import CoachingAdapter

__all__ = [
    "MLMAdapter",
    "RealEstateAdapter", 
    "FinanceAdapter",
    "CoachingAdapter",
]

