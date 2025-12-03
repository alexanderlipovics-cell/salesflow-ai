"""
Signal Aggregator

Kombiniert Signale aus verschiedenen Quellen.
"""

import logging
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timedelta

from .google_news import GoogleNewsService

logger = logging.getLogger(__name__)


class SignalAggregator:
    """
    Aggregiert Signale aus allen Quellen.
    """
    
    def __init__(self):
        self.google_news = GoogleNewsService()
    
    async def collect_signals(
        self,
        company_name: str,
        person_name: str = None,
        lookback_days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Sammelt alle Signale für ein Unternehmen.
        """
        signals = []
        
        # Parallele Sammlung
        results = await asyncio.gather(
            self._collect_news_signals(company_name),
            return_exceptions=True
        )
        
        for result in results:
            if isinstance(result, Exception):
                logger.warning(f"Signal collection failed: {result}")
                continue
            signals.extend(result)
        
        # Scoring
        return self._score_signals(signals, company_name, person_name)
    
    async def _collect_news_signals(
        self,
        company_name: str
    ) -> List[Dict[str, Any]]:
        """
        Sammelt News-Signale.
        """
        signals = []
        
        # Funding
        funding_news = await self.google_news.search_funding(company_name)
        for article in funding_news:
            signals.append({
                "type": "funding",
                "source": "google_news",
                "title": article.get("title", ""),
                "summary": article.get("snippet", ""),
                "url": article.get("url"),
                "relevance_score": 0.0,
                "detected_at": datetime.utcnow().isoformat()
            })
        
        return signals
    
    def _score_signals(
        self,
        signals: List[Dict],
        company_name: str,
        person_name: str = None
    ) -> List[Dict]:
        """
        Berechnet Relevanz-Scores.
        """
        type_weights = {
            "intent": 1.0,
            "funding": 0.9,
            "job_change": 0.85,
            "news": 0.6
        }
        
        for signal in signals:
            base = type_weights.get(signal["type"], 0.5)
            signal["relevance_score"] = base
        
        return sorted(signals, key=lambda s: s["relevance_score"], reverse=True)

