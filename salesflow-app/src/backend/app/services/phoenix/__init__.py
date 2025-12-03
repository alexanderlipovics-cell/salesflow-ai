# backend/app/services/phoenix/__init__.py
"""
🔥 PHOENIX MODULE - Außendienst-Reaktivierungs-System

Features:
- GPS-basierte Lead-Suche ("Bin zu früh, was kann ich machen?")
- Proximity Alerts (Kunden in der Nähe vom Termin)
- Territory Intelligence (Leads im Gebiet)
- Smart Reactivation (Alte Leads reaktivieren)
- Field Activity Tracking
- Route Optimization
- Analytics & Insights
"""

from .service import PhoenixService, get_phoenix_service
from .optimizer import RouteOptimizer, ClusterDetector, SmartSuggestionEngine
from .analytics import PhoenixAnalytics, get_phoenix_analytics

__all__ = [
    "PhoenixService",
    "get_phoenix_service",
    "RouteOptimizer",
    "ClusterDetector", 
    "SmartSuggestionEngine",
    "PhoenixAnalytics",
    "get_phoenix_analytics",
]

