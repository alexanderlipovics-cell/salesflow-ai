"""
Vector Store

pgvector Wrapper für Supabase.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class VectorSearchResult:
    """Suchergebnis aus dem Vector Store."""
    id: str
    content: str
    metadata: Dict[str, Any]
    similarity_score: float


class VectorStore:
    """
    pgvector-basierter Vector Store.
    """
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    async def upsert(
        self,
        table: str,
        id: str,
        embedding: List[float],
        content: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Speichert oder aktualisiert einen Vector.
        """
        try:
            data = {
                "id": id,
                "embedding": embedding,
                "content": content,
                **metadata
            }
            
            await self.supabase.from_(table).upsert(data).execute()
            return True
            
        except Exception as e:
            logger.error(f"Vector upsert failed: {e}")
            return False
    
    async def search(
        self,
        table: str,
        query_embedding: List[float],
        match_count: int = 5,
        match_threshold: float = 0.7,
        filter_conditions: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """
        Semantic Search via pgvector.
        """
        try:
            # RPC Call für Vector Search
            params = {
                "query_embedding": query_embedding,
                "match_count": match_count,
                "match_threshold": match_threshold,
            }
            
            if filter_conditions:
                params.update(filter_conditions)
            
            response = await self.supabase.rpc(
                f"match_{table}",
                params
            ).execute()
            
            return [
                VectorSearchResult(
                    id=row["id"],
                    content=row["content"],
                    metadata={k: v for k, v in row.items() if k not in ["id", "content", "similarity"]},
                    similarity_score=row["similarity"]
                )
                for row in response.data
            ]
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    async def delete(self, table: str, id: str) -> bool:
        """
        Löscht einen Vector.
        """
        try:
            await self.supabase.from_(table).delete().eq("id", id).execute()
            return True
        except Exception as e:
            logger.error(f"Vector delete failed: {e}")
            return False

