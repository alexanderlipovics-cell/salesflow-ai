# backend/app/conversations/memory/manager.py

import json
import redis.asyncio as redis
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Dict, Optional
from datetime import datetime

from app.core.config import get_settings
from app.models.conversation_extended import ConversationSummary, ChannelIdentity

settings = get_settings()


class HybridMemoryManager:
    """
    Verwaltet Hot (Redis), Warm (SQL) und Cold (Vector) Memory.
    Ziel: <50ms Context Loading.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.redis_url = getattr(settings, 'redis_url', 'redis://localhost:6379/0')
        self.redis = None  # Wird lazy initialisiert
        self.HOT_MEMORY_TTL = 3600  # 1 Stunde Cache
        self.HOT_WINDOW_SIZE = 10   # Letzte 10 Nachrichten im schnellen Zugriff

    async def _get_redis(self):
        """Lazy initialization von Redis Connection"""
        if self.redis is None:
            self.redis = await redis.from_url(self.redis_url, decode_responses=True)
        return self.redis

    async def get_smart_context(self, lead_id: str) -> str:
        """
        Baut den Context für das LLM zusammen.
        Strategie: Redis First -> DB Fallback -> Summary Injection
        """
        # 1. HOT MEMORY: Versuch aus Redis zu lesen ( < 10ms )
        redis_client = await self._get_redis()
        redis_key = f"chat_history:{lead_id}"
        cached_history = await redis_client.lrange(redis_key, 0, -1)
        
        history_text = ""
        
        if cached_history:
            # Cache Hit
            history_messages = [json.loads(msg) for msg in cached_history]
            # Umkehren, da lpush genutzt wird (neueste zuerst)
            history_messages.reverse() 
        else:
            # Cache Miss: Aus DB laden und Hydrieren (Warm-up)
            history_messages = await self._hydrate_hot_memory(lead_id)

        # Formatiere Chatverlauf
        for msg in history_messages:
            role = "User" if msg.get('direction') == 'inbound' else "AI"
            channel = msg.get('channel', 'unknown')
            history_text += f"[{channel}] {role}: {msg.get('content', '')}\n"

        # 2. WARM MEMORY: Letzte Summary holen
        summary = self.db.query(ConversationSummary)\
            .filter(ConversationSummary.lead_id == lead_id)\
            .order_by(desc(ConversationSummary.created_at))\
            .first()
            
        summary_text = f"ZUSAMMENFASSUNG: {summary.summary_text}\nFAKTEN: {summary.key_facts}" if summary else "ZUSAMMENFASSUNG: Neu"

        # 3. Context Stitching
        full_context = f"""
        {summary_text}
        
        AKTUELLER VERLAUF:
        {history_text}
        """
        return full_context

    async def add_message(self, lead_id: str, content: str, direction: str, channel: str):
        """
        Fügt Nachricht hinzu und aktualisiert Hot Memory.
        """
        msg_obj = {
            "content": content,
            "direction": direction,
            "channel": channel,
            "timestamp": str(datetime.utcnow())
        }
        
        # 1. Redis Push (Links rein)
        redis_client = await self._get_redis()
        redis_key = f"chat_history:{lead_id}"
        await redis_client.lpush(redis_key, json.dumps(msg_obj))
        await redis_client.ltrim(redis_key, 0, self.HOT_WINDOW_SIZE - 1)  # Nur N behalten
        await redis_client.expire(redis_key, self.HOT_MEMORY_TTL)

        # 2. Asynchrone Tasks (Summary Check, Sentiment Analysis) könnten hier getriggert werden
        # await self._check_for_consolidation(lead_id)

    async def _hydrate_hot_memory(self, lead_id: str) -> List[Dict]:
        """Lädt letzte Nachrichten aus DB in Redis"""
        # Annahme: Es gibt ein Message Model
        # Falls nicht vorhanden, verwenden wir conversation_messages oder ähnliches
        try:
            from app.models.message import Message
            MessageModel = Message
        except ImportError:
            # Fallback: Verwende conversation_messages falls vorhanden
            try:
                from app.models.conversation_memory import ConversationMessage as MessageModel
            except ImportError:
                # Kein Message Model gefunden, return empty
                return []
        
        msgs = self.db.query(MessageModel)\
            .filter(MessageModel.lead_id == lead_id)\
            .order_by(desc(MessageModel.created_at))\
            .limit(self.HOT_WINDOW_SIZE)\
            .all()
            
        serialized = []
        redis_client = await self._get_redis()
        redis_key = f"chat_history:{lead_id}"
        
        # Pipeline für Bulk-Operation
        pipe = redis_client.pipeline()
        
        for m in reversed(msgs):  # Umkehren, da lpush neueste zuerst will
            obj = {
                "content": getattr(m, 'content', ''),
                "direction": getattr(m, 'direction', 'inbound'),
                "channel": getattr(m, 'channel_type', 'unknown')
            }
            serialized.append(obj)
            pipe.lpush(redis_key, json.dumps(obj))
        
        if serialized:
            pipe.expire(redis_key, self.HOT_MEMORY_TTL)
            await pipe.execute()
             
        return serialized

    async def gdpr_wipe(self, lead_id: str):
        """Löscht alles spurlos."""
        redis_client = await self._get_redis()
        await redis_client.delete(f"chat_history:{lead_id}")
        self.db.query(ConversationSummary).filter_by(lead_id=lead_id).delete()
        # Messages werden über Cascade Delete im DB Model gelöscht
        self.db.commit()

