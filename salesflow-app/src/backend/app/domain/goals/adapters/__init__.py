"""
Vertical Adapters - Konkrete Implementierungen pro Branche.
"""

from .network_marketing import NetworkMarketingAdapter
from .real_estate import RealEstateAdapter
from .coaching import CoachingAdapter

__all__ = [
    "NetworkMarketingAdapter",
    "RealEstateAdapter",
    "CoachingAdapter",
]

