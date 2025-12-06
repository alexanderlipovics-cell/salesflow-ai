# backend/app/services/conversation_service.py

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.ai_client import get_embedding
from app.models.conversation_memory import ConversationMemory

class ConversationMemoryService:
    """
    Persistent Memory für Kunden-Interaktionen.
    Speichert relevante Snippets als Embeddings und holt sie via Semantik.
    """
    def __init__(self, db: Session) -> None:
        self.db = db

    async def store_interaction(
        self,
        user_id: str,
        lead_id: Optional[str],
        interaction: Dict[str, Any],
        conversation_id: Optional[str] = None,
    ) -> ConversationMemory:
        """
        interaction: {
          "role": "user|assistant",
          "content": "...",
          "type": "follow_up|objection|discovery|...",
          "channel": "whatsapp|email|call",
          ...
        }
        """
        content = interaction.get("content") or ""
        if not content.strip():
            raise ValueError("Interaction content is empty")

        embedding = await get_embedding(content)

        memory = ConversationMemory(
            user_id=user_id,
            lead_id=lead_id,
            conversation_id=conversation_id,
            content=content,
            metadata={k: v for k, v in interaction.items() if k != "content"},
            embedding=embedding,
        )
        self.db.add(memory)
        self.db.commit()
        self.db.refresh(memory)
        return memory

    async def retrieve_context(
        self,
        user_id: str,
        lead_id: Optional[str],
        query: Optional[str] = None,
        top_k: int = 10,
    ) -> List[ConversationMemory]:
        """
        Hole relevante Historie für nächste Interaktion.
        - Wenn query übergeben → semantische Suche
        - Sonst → letzte N Memory-Einträge
        """
        if query:
            query_embedding = await get_embedding(query)
            # pgvector: ORDER BY embedding <-> :query_embedding
            stmt = (
                select(ConversationMemory)
                .where(
                    ConversationMemory.user_id == user_id,
                    ConversationMemory.lead_id == lead_id,
                )
                .order_by(ConversationMemory.embedding.l2_distance(query_embedding))
                .limit(top_k)
            )
        else:
            stmt = (
                select(ConversationMemory)
                .where(
                    ConversationMemory.user_id == user_id,
                    ConversationMemory.lead_id == lead_id,
                )
                .order_by(ConversationMemory.created_at.desc())
                .limit(top_k)
            )

        results = self.db.execute(stmt).scalars().all()
        return list(results)

    async def get_context_as_messages(
        self,
        user_id: str,
        lead_id: Optional[str],
        query: Optional[str] = None,
        top_k: int = 10,
    ) -> List[Dict[str, str]]:
        """
        Helfer: Memory in ChatMessages (role/content) transformieren,
        die du direkt in die AI-Konversation einbauen kannst.
        """
        memories = await self.retrieve_context(
            user_id=user_id,
            lead_id=lead_id,
            query=query,
            top_k=top_k,
        )
        messages: List[Dict[str, str]] = []
        for m in memories:
            role = m.metadata.get("role", "user") if m.metadata else "user"
            messages.append(
                {
                    "role": role,
                    "content": f"[Memory Snippet] {m.content}",
                }
            )
        return messages
