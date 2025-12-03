"""
Embeddings Service

OpenAI Embeddings für Vector Search.
"""

import logging
from typing import List, Optional

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# Default Model
DEFAULT_MODEL = "text-embedding-ada-002"
EMBEDDING_DIMENSION = 1536


async def get_embedding(
    text: str,
    model: str = DEFAULT_MODEL
) -> List[float]:
    """
    Erstellt ein Embedding für einen Text.
    
    Args:
        text: Der zu embedende Text
        model: OpenAI Embedding Model
    
    Returns:
        Embedding als Liste von Floats (1536 Dimensionen)
    """
    from ....core.config import settings
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Text kürzen wenn nötig (8191 Tokens Max)
    if len(text) > 30000:
        text = text[:30000]
    
    response = await client.embeddings.create(
        model=model,
        input=text
    )
    
    return response.data[0].embedding


class EmbeddingsService:
    """
    Service für Batch-Embeddings.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL
    ):
        from ....core.config import settings
        self.client = AsyncOpenAI(api_key=api_key or settings.OPENAI_API_KEY)
        self.model = model
    
    async def embed_texts(
        self,
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """
        Erstellt Embeddings für mehrere Texte.
        """
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            # Texte kürzen
            batch = [t[:30000] if len(t) > 30000 else t for t in batch]
            
            response = await self.client.embeddings.create(
                model=self.model,
                input=batch
            )
            
            batch_embeddings = [item.embedding for item in response.data]
            embeddings.extend(batch_embeddings)
        
        return embeddings

