# backend/app/services/sales_brain/__init__.py
"""
🧠 SALES BRAIN SERVICE
Teach-UI & Rule Learning System

Features:
- Regeln aus User-Overrides lernen
- Semantische Text-Analyse
- Auto-Use-Case Detection
- Team-weite Regeln
"""

from .service import SalesBrainService, get_sales_brain_service
from .semantic import SemanticAnalyzer, AutoTagGenerator, UseCase, Sentiment

__all__ = [
    "SalesBrainService",
    "get_sales_brain_service",
    "SemanticAnalyzer",
    "AutoTagGenerator",
    "UseCase",
    "Sentiment",
]

