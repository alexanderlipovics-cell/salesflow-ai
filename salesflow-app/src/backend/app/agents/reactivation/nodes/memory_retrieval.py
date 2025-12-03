"""
Reactivation Agent - Memory Retrieval Node

RAG-basierte Kontextsuche aus der Interaktionshistorie.
Verwendet pgvector für Semantic Search.
"""

import logging
from typing import List, Optional

from ..state import ReactivationState, RetrievedInteraction

logger = logging.getLogger(__name__)


async def run(state: ReactivationState) -> dict:
    """
    Memory Retrieval Node: Holt relevante Interaktionen via RAG.
    
    Aufgaben:
    1. Erstelle Query basierend auf Lead-Kontext
    2. Semantic Search in Vector Store
    3. Aggregiere zu Kontext-Summary
    
    Input State:
    - lead_id: UUID des Leads
    - lead_context: Basisdaten aus Perception
    
    Output:
    - retrieved_interactions: Liste relevanter Interaktionen
    - memory_summary: Aggregierte Zusammenfassung
    """
    lead_id = state.get("lead_id")
    lead_context = state.get("lead_context")
    run_id = state.get("run_id", "unknown")
    
    logger.info(f"[{run_id}] Memory Retrieval: Searching interactions for {lead_id}")
    
    if not lead_context:
        logger.warning(f"[{run_id}] No lead context available, skipping memory retrieval")
        return {
            "retrieved_interactions": [],
            "memory_summary": "Kein Kontext verfügbar.",
        }
    
    try:
        # 1. Query erstellen
        search_query = _create_search_query(lead_context)
        
        # 2. Semantic Search
        interactions = await _semantic_search(
            lead_id=lead_id,
            query=search_query,
            top_k=5
        )
        
        # 3. Zusammenfassung erstellen
        memory_summary = _create_summary(interactions, lead_context)
        
        logger.info(
            f"[{run_id}] Memory Retrieval complete: "
            f"Found {len(interactions)} relevant interactions"
        )
        
        return {
            "retrieved_interactions": interactions,
            "memory_summary": memory_summary,
        }
        
    except Exception as e:
        logger.exception(f"[{run_id}] Memory Retrieval failed: {e}")
        return {
            "retrieved_interactions": [],
            "memory_summary": "Fehler beim Abrufen der Historie.",
            "error": str(e),
        }


def _create_search_query(lead_context: dict) -> str:
    """
    Erstellt eine optimierte Query für Semantic Search.
    
    Fokus auf:
    - Pain Points des Leads
    - Frühere Einwände
    - Produktinteresse
    """
    parts = []
    
    # Pain Points
    pain_points = lead_context.get("top_pain_points", [])
    if pain_points:
        parts.append(f"Probleme: {', '.join(pain_points)}")
    
    # Einwände
    objections = lead_context.get("previous_objections", [])
    if objections:
        parts.append(f"Einwände: {', '.join(objections)}")
    
    # Company Context
    company = lead_context.get("company")
    if company:
        parts.append(f"Unternehmen: {company}")
    
    # Fallback
    if not parts:
        return "Letzte Gespräche und wichtige Themen"
    
    return " | ".join(parts)


async def _semantic_search(
    lead_id: str,
    query: str,
    top_k: int = 5,
    min_similarity: float = 0.6
) -> List[RetrievedInteraction]:
    """
    Führt Semantic Search via pgvector durch.
    
    Verwendet die RPC Function 'match_lead_interactions'.
    """
    # TODO: Echte pgvector-Suche implementieren
    # Placeholder für Struktur:
    
    from ....db.supabase import get_supabase
    from ....services.memory.embeddings import get_embedding
    
    supabase = get_supabase()
    
    # 1. Query embedden
    query_embedding = await get_embedding(query)
    
    # 2. pgvector Search via RPC
    response = await supabase.rpc(
        "match_lead_interactions",
        {
            "query_embedding": query_embedding,
            "match_lead_id": lead_id,
            "match_count": top_k,
            "match_threshold": min_similarity
        }
    ).execute()
    
    if not response.data:
        return []
    
    # 3. Zu RetrievedInteraction konvertieren
    return [
        RetrievedInteraction(
            id=row["id"],
            content=row["content"],
            summary=row.get("summary", row["content"][:100]),
            interaction_type=row["interaction_type"],
            interaction_date=row["interaction_date"],
            similarity_score=row["similarity"],
            sentiment=row.get("sentiment"),
            topics=row.get("topics", [])
        )
        for row in response.data
    ]


def _create_summary(
    interactions: List[RetrievedInteraction],
    lead_context: dict
) -> str:
    """
    Erstellt eine Zusammenfassung der Interaktionshistorie.
    
    Wird als Kontext für die Message Generation verwendet.
    """
    if not interactions:
        return "Keine relevanten vorherigen Interaktionen gefunden."
    
    # Header
    summary_parts = [
        f"## Kontakthistorie mit {lead_context.get('name', 'dem Lead')}\n",
        f"**Unternehmen:** {lead_context.get('company', 'Unbekannt')}",
        f"**Letzer Kontakt:** vor {lead_context.get('days_dormant', '?')} Tagen",
        f"**Anzahl Interaktionen:** {lead_context.get('interaction_count', 0)}\n",
        "### Relevante Gespräche:\n"
    ]
    
    # Interaktionen
    for i, interaction in enumerate(interactions, 1):
        date = interaction.get("interaction_date", "")[:10]
        itype = interaction.get("interaction_type", "").upper()
        summary = interaction.get("summary", "")[:150]
        sentiment = interaction.get("sentiment", "neutral")
        
        sentiment_emoji = {
            "positive": "🟢",
            "negative": "🔴",
            "neutral": "🟡"
        }.get(sentiment, "⚪")
        
        summary_parts.append(
            f"{i}. [{date}] {itype} {sentiment_emoji}: {summary}"
        )
    
    # Pain Points
    pain_points = lead_context.get("top_pain_points", [])
    if pain_points:
        summary_parts.append(f"\n### Identifizierte Pain Points:\n")
        for pp in pain_points:
            summary_parts.append(f"- {pp}")
    
    # Einwände
    objections = lead_context.get("previous_objections", [])
    if objections:
        summary_parts.append(f"\n### Frühere Einwände:\n")
        for obj in objections:
            summary_parts.append(f"- {obj}")
    
    return "\n".join(summary_parts)

