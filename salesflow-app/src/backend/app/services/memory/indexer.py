"""
Interaction Indexer

Pipeline für das Indexieren von Lead-Interaktionen.
"""

import logging
from typing import Dict, Any
from datetime import datetime

from .embeddings import get_embedding

logger = logging.getLogger(__name__)


class InteractionIndexer:
    """
    Indexiert neue Interaktionen in den Vector Store.
    """
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    async def index_interaction(
        self,
        lead_id: str,
        user_id: str,
        interaction_type: str,
        content: str,
        interaction_date: datetime,
        metadata: Dict[str, Any] = None
    ) -> str:
        """
        Indexiert eine neue Interaktion.
        """
        # 1. Embedding erstellen
        embedding = await get_embedding(content)
        
        # 2. Summary generieren (optional)
        summary = await self._generate_summary(content)
        
        # 3. In DB speichern
        data = {
            "lead_id": lead_id,
            "user_id": user_id,
            "interaction_type": interaction_type,
            "content": content,
            "summary": summary,
            "embedding": embedding,
            "interaction_date": interaction_date.isoformat(),
            "indexed_at": datetime.utcnow().isoformat(),
            **(metadata or {})
        }
        
        response = await self.supabase.from_("lead_interactions_embeddings")\
            .insert(data)\
            .execute()
        
        return response.data[0]["id"] if response.data else None
    
    async def _generate_summary(self, content: str, max_length: int = 200) -> str:
        """
        Generiert eine kurze Zusammenfassung.
        """
        if len(content) <= max_length:
            return content
        
        # Einfaches Truncation (LLM-Summary optional)
        return content[:max_length] + "..."

