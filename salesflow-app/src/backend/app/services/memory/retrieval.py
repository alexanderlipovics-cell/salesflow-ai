"""
Memory Retriever

Semantic Search für Lead-Interaktionen.
"""

import logging
from typing import List
from dataclasses import dataclass

from .embeddings import get_embedding
from .vector_store import VectorStore

logger = logging.getLogger(__name__)


@dataclass
class RetrievedInteraction:
    """Abgerufene Interaktion aus dem Memory."""
    id: str
    content: str
    summary: str
    interaction_type: str
    interaction_date: str
    similarity_score: float
    sentiment: str
    topics: List[str]


class MemoryRetriever:
    """
    Retrieval für Lead-Interaktionen via RAG.
    """
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.vector_store = VectorStore(supabase_client)
    
    async def retrieve(
        self,
        lead_id: str,
        query: str,
        top_k: int = 5,
        min_similarity: float = 0.6
    ) -> List[RetrievedInteraction]:
        """
        Holt relevante Interaktionen für einen Lead.
        """
        # Query embedden
        query_embedding = await get_embedding(query)
        
        # Search
        results = await self.vector_store.search(
            table="lead_interactions_embeddings",
            query_embedding=query_embedding,
            match_count=top_k,
            match_threshold=min_similarity,
            filter_conditions={"match_lead_id": lead_id}
        )
        
        return [
            RetrievedInteraction(
                id=r.id,
                content=r.content,
                summary=r.metadata.get("summary", ""),
                interaction_type=r.metadata.get("interaction_type", ""),
                interaction_date=r.metadata.get("interaction_date", ""),
                similarity_score=r.similarity_score,
                sentiment=r.metadata.get("sentiment", "neutral"),
                topics=r.metadata.get("topics", [])
            )
            for r in results
        ]

