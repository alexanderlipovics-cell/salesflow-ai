"""
Seeds Module
Enthält alle Seed-Daten für Companies, Products, Stories, etc.
"""

from .zinzino_seed import get_zinzino_seed_data
from .pm_international_seed import get_pm_international_seed_data
from .lr_health_seed import get_lr_health_seed_data
from .doterra_seed import get_doterra_seed_data
from .seed_companies import run_seeding

__all__ = [
    "get_zinzino_seed_data",
    "get_pm_international_seed_data",
    "get_lr_health_seed_data",
    "get_doterra_seed_data",
    "run_seeding",
]
