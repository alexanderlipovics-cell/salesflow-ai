# backend/app/services/knowledge/embedding_service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  EMBEDDING SERVICE                                                         ║
║  Generiert Embeddings für Knowledge Items via OpenAI oder Claude           ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Optional
import os
import httpx
from supabase import Client


class EmbeddingService:
    """Service zum Generieren und Speichern von Embeddings."""
    
    def __init__(self, db: Client = None):
        self.db = db
        self.model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.dimension = 1536
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generiert ein Embedding für einen Text.
        
        Args:
            text: Der Text für das Embedding
            
        Returns:
            Liste von Floats (1536 Dimensionen) oder None bei Fehler
        """
        if not self.api_key:
            print("Warning: No OPENAI_API_KEY set, skipping embedding generation")
            return None
        
        try:
            # Truncate text to ~8000 tokens (ca. 32000 chars)
            text = text[:32000] if len(text) > 32000 else text
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "input": text,
                    },
                    timeout=30.0,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["data"][0]["embedding"]
                else:
                    print(f"Embedding API error: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None
    
    def generate_embedding_sync(self, text: str) -> Optional[List[float]]:
        """
        Synchrone Version von generate_embedding.
        """
        if not self.api_key:
            print("Warning: No OPENAI_API_KEY set, skipping embedding generation")
            return None
        
        try:
            text = text[:32000] if len(text) > 32000 else text
            
            with httpx.Client() as client:
                response = client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "input": text,
                    },
                    timeout=30.0,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["data"][0]["embedding"]
                else:
                    print(f"Embedding API error: {response.status_code}")
                    return None
                    
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None
    
    async def store_embedding(
        self,
        knowledge_item_id: str,
        embedding: List[float],
        chunk_text: str = None,
        chunk_index: int = 0,
    ) -> bool:
        """
        Speichert ein Embedding in der Datenbank.
        
        Args:
            knowledge_item_id: ID des Knowledge Items
            embedding: Das Embedding (1536 floats)
            chunk_text: Optional, der Text-Chunk
            chunk_index: Index des Chunks (wenn Content gesplittet)
            
        Returns:
            True bei Erfolg
        """
        if not self.db:
            print("Warning: No database client, skipping embedding storage")
            return False
        
        try:
            result = self.db.table("knowledge_embeddings").insert({
                "knowledge_item_id": knowledge_item_id,
                "embedding": embedding,
                "embedding_model": self.model,
                "chunk_index": chunk_index,
                "chunk_text": chunk_text[:1000] if chunk_text else None,
            }).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error storing embedding: {e}")
            return False
    
    async def generate_and_store(
        self,
        knowledge_item_id: str,
        content: str,
    ) -> bool:
        """
        Generiert und speichert ein Embedding in einem Schritt.
        
        Args:
            knowledge_item_id: ID des Knowledge Items
            content: Der Content für das Embedding
            
        Returns:
            True bei Erfolg
        """
        embedding = await self.generate_embedding(content)
        if embedding:
            return await self.store_embedding(
                knowledge_item_id=knowledge_item_id,
                embedding=embedding,
                chunk_text=content,
            )
        return False
    
    def has_embedding(self, knowledge_item_id: str) -> bool:
        """Prüft ob ein Item bereits ein Embedding hat."""
        if not self.db:
            return False
        
        try:
            result = self.db.table("knowledge_embeddings").select("id").eq(
                "knowledge_item_id", knowledge_item_id
            ).limit(1).execute()
            
            return len(result.data) > 0
            
        except Exception:
            return False

