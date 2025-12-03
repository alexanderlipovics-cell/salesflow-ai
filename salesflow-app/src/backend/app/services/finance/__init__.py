# backend/app/services/finance/__init__.py
"""
Finance & Tax Prep Service Module
Steuer-Vorbereitung für Networker (DACH-konform)

WICHTIG: Dieses Modul bietet KEINE Steuerberatung!
"""

from .service import FinanceService, get_finance_service
from .tax_prep_service import TaxPrepService, get_tax_prep_service
from .mileage_service import MileageService, get_mileage_service

__all__ = [
    "FinanceService",
    "get_finance_service",
    "TaxPrepService",
    "get_tax_prep_service",
    "MileageService",
    "get_mileage_service",
]

