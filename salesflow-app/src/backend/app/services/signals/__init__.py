"""
Signal Detection Services

Externe Signalquellen für Lead-Reaktivierung.
"""

from .google_news import GoogleNewsService
from .signal_aggregator import SignalAggregator

__all__ = [
    "GoogleNewsService",
    "SignalAggregator",
]

