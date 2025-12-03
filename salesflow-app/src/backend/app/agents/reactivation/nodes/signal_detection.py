"""
Reactivation Agent - Signal Detection Node

Erkennt externe Reaktivierungssignale aus verschiedenen Quellen.
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional

from ..state import ReactivationState, ReactivationSignal

logger = logging.getLogger(__name__)


async def run(state: ReactivationState) -> dict:
    """
    Signal Detection Node: Sammelt externe Signale für Reaktivierung.
    
    Signalquellen:
    1. Google News - Unternehmensnachrichten (Funding, Expansion)
    2. LinkedIn - Job Changes des Ansprechpartners
    3. Website Monitor - Änderungen auf der Unternehmenswebsite
    4. Intent Tracker - Pricing Page Visits
    
    Input State:
    - lead_context: Lead-Daten mit Company, Name, URLs
    
    Output:
    - signals: Liste aller gefundenen Signale
    - primary_signal: Das relevanteste Signal
    - signal_summary: Zusammenfassung für Message Gen
    """
    lead_context = state.get("lead_context")
    run_id = state.get("run_id", "unknown")
    lead_id = state.get("lead_id")
    
    if not lead_context:
        logger.warning(f"[{run_id}] No lead context for signal detection")
        return {
            "signals": [],
            "primary_signal": None,
            "signal_summary": None,
        }
    
    company = lead_context.get("company", "")
    name = lead_context.get("name", "")
    linkedin_url = lead_context.get("linkedin_url")
    
    logger.info(
        f"[{run_id}] Signal Detection: Scanning for {name} @ {company}"
    )
    
    try:
        # Parallele Signal-Sammlung
        signals = await _collect_all_signals(
            lead_id=lead_id,
            company_name=company,
            person_name=name,
            linkedin_url=linkedin_url,
            lookback_days=30
        )
        
        # Signale scoren und sortieren
        scored_signals = _score_signals(signals, company, name)
        
        # Primary Signal bestimmen
        primary_signal = scored_signals[0] if scored_signals else None
        
        # Summary erstellen
        signal_summary = _create_signal_summary(scored_signals, lead_context)
        
        logger.info(
            f"[{run_id}] Signal Detection complete: "
            f"Found {len(scored_signals)} signals"
            f"{f', primary: {primary_signal.get(\"type\")}' if primary_signal else ''}"
        )
        
        return {
            "signals": scored_signals,
            "primary_signal": primary_signal,
            "signal_summary": signal_summary,
        }
        
    except Exception as e:
        logger.exception(f"[{run_id}] Signal Detection failed: {e}")
        return {
            "signals": [],
            "primary_signal": None,
            "signal_summary": None,
            "error": str(e),
        }


async def _collect_all_signals(
    lead_id: str,
    company_name: str,
    person_name: str,
    linkedin_url: Optional[str],
    lookback_days: int = 30
) -> List[ReactivationSignal]:
    """
    Sammelt Signale aus allen Quellen parallel.
    """
    since = datetime.utcnow() - timedelta(days=lookback_days)
    
    # Parallele API-Calls
    results = await asyncio.gather(
        _check_google_news(company_name, since),
        _check_linkedin(linkedin_url) if linkedin_url else _empty_result(),
        _check_intent_signals(lead_id, since),
        return_exceptions=True
    )
    
    # Ergebnisse aggregieren (Fehler ignorieren, aber loggen)
    signals = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.warning(f"Signal source {i} failed: {result}")
            continue
        signals.extend(result)
    
    return signals


async def _check_google_news(
    company_name: str,
    since: datetime
) -> List[ReactivationSignal]:
    """
    Prüft Google News auf relevante Unternehmensnachrichten.
    
    Sucht nach:
    - Funding/Investment
    - Expansion/Wachstum
    - Neue Produkte
    - Management Changes
    """
    # TODO: Implementiere Google News API Integration
    # Placeholder für Struktur:
    
    from ....services.signals.google_news import GoogleNewsService
    
    news_service = GoogleNewsService()
    
    signals = []
    
    # Search Queries
    queries = [
        (f'"{company_name}" Finanzierung OR Investment', "funding"),
        (f'"{company_name}" Expansion OR Wachstum', "news"),
        (f'"{company_name}" neuer Geschäftsführer OR CEO', "job_change"),
    ]
    
    for query, signal_type in queries:
        try:
            articles = await news_service.search(
                query=query,
                since=since,
                max_results=3
            )
            
            for article in articles:
                signals.append(ReactivationSignal(
                    type=signal_type,
                    source="google_news",
                    title=article.get("title", ""),
                    summary=article.get("snippet", ""),
                    url=article.get("url"),
                    relevance_score=0.0,  # Wird später berechnet
                    detected_at=article.get("published_at", datetime.utcnow().isoformat())
                ))
        except Exception as e:
            logger.warning(f"Google News query failed: {query}: {e}")
    
    return signals


async def _check_linkedin(
    linkedin_url: str
) -> List[ReactivationSignal]:
    """
    Prüft LinkedIn auf Job Changes.
    
    ⚠️ Benötigt LinkedIn API oder Scraping Service.
    """
    # TODO: Implementiere LinkedIn Integration
    # Placeholder:
    
    # Hier würde die LinkedIn API Integration stehen
    # Z.B. via Proxycurl, Apollo, oder eigene LinkedIn App
    
    return []


async def _check_intent_signals(
    lead_id: str,
    since: datetime
) -> List[ReactivationSignal]:
    """
    Prüft Intent-Signale (z.B. Website Visits).
    
    Quellen:
    - Tracking Pixel Events
    - Demo/Pricing Page Visits
    - Ressourcen-Downloads
    """
    # TODO: Implementiere Intent Tracking Integration
    
    from ....db.supabase import get_supabase
    
    supabase = get_supabase()
    
    # Intent Events aus DB laden
    response = await supabase.from_("intent_events")\
        .select("*")\
        .eq("lead_id", lead_id)\
        .gte("created_at", since.isoformat())\
        .execute()
    
    signals = []
    for event in response.data or []:
        signals.append(ReactivationSignal(
            type="intent",
            source="tracking_pixel",
            title=f"Website Visit: {event.get('page_type', 'unknown')}",
            summary=f"Lead hat {event.get('page_url', '')} besucht",
            url=event.get("page_url"),
            relevance_score=0.9,  # Intent ist immer hoch relevant
            detected_at=event.get("created_at", datetime.utcnow().isoformat())
        ))
    
    return signals


async def _empty_result() -> List[ReactivationSignal]:
    """Leere Liste für optionale Signal-Quellen."""
    return []


def _score_signals(
    signals: List[ReactivationSignal],
    company_name: str,
    person_name: str
) -> List[ReactivationSignal]:
    """
    Berechnet Relevanz-Scores für alle Signale.
    
    Faktoren:
    - Signal-Typ (Intent > Funding > Job Change > News)
    - Aktualität (Decay über Zeit)
    - Keyword Match
    """
    type_weights = {
        "intent": 1.0,      # Höchste Priorität
        "funding": 0.9,     # Sehr relevant
        "job_change": 0.85, # Wichtig
        "website_change": 0.7,
        "news": 0.6
    }
    
    scored = []
    for signal in signals:
        base_score = type_weights.get(signal.get("type", ""), 0.5)
        
        # Aktualitäts-Decay
        try:
            detected_at = datetime.fromisoformat(
                signal.get("detected_at", "").replace("Z", "+00:00")
            )
            days_old = (datetime.now(detected_at.tzinfo) - detected_at).days
            recency_factor = max(0.3, 1 - (days_old / 30))
        except Exception:
            recency_factor = 0.5
        
        # Keyword Match
        text = f"{signal.get('title', '')} {signal.get('summary', '')}".lower()
        keyword_boost = 0
        if company_name.lower() in text:
            keyword_boost += 0.1
        if person_name.lower() in text:
            keyword_boost += 0.15
        
        # Final Score
        final_score = min(1.0, base_score * recency_factor + keyword_boost)
        
        scored_signal = dict(signal)
        scored_signal["relevance_score"] = round(final_score, 3)
        scored.append(scored_signal)
    
    # Nach Score sortieren
    return sorted(scored, key=lambda s: s["relevance_score"], reverse=True)


def _create_signal_summary(
    signals: List[ReactivationSignal],
    lead_context: dict
) -> Optional[str]:
    """
    Erstellt eine Zusammenfassung der gefundenen Signale.
    """
    if not signals:
        return None
    
    parts = [
        f"## Reaktivierungssignale für {lead_context.get('name', 'Lead')}\n"
    ]
    
    for i, signal in enumerate(signals[:3], 1):
        emoji = {
            "intent": "🎯",
            "funding": "💰",
            "job_change": "👔",
            "website_change": "🌐",
            "news": "📰"
        }.get(signal.get("type", ""), "📌")
        
        score = signal.get("relevance_score", 0) * 100
        
        parts.append(
            f"{i}. {emoji} **{signal.get('type', '').replace('_', ' ').title()}** "
            f"(Relevanz: {score:.0f}%)\n"
            f"   {signal.get('title', '')}\n"
            f"   _{signal.get('summary', '')[:100]}_"
        )
    
    return "\n".join(parts)

