import hashlib
import json
from typing import Any, Optional

import redis.asyncio as redis

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class CacheService:
    """Redis-gestützter Cache mit Fallback, falls Redis nicht erreichbar ist."""

    def __init__(self) -> None:
        self.redis: Optional[redis.Redis] = None
        self.enabled = settings.CACHE_ENABLED
        self.ttl = settings.CACHE_TTL

    async def connect(self) -> None:
        """Stellt die Verbindung zu Redis her."""

        if not self.enabled:
            logger.info("Cache deaktiviert (CACHE_ENABLED=false)")
            return

        try:
            self.redis = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            await self.redis.ping()
            logger.info("Redis erfolgreich verbunden")
        except Exception as exc:
            logger.warning(
                "Redis Verbindung fehlgeschlagen, Cache wird deaktiviert",
                extra={"error": str(exc)},
            )
            self.enabled = False
            self.redis = None

    async def disconnect(self) -> None:
        """Beendet die Redis-Verbindung."""

        if self.redis:
            await self.redis.close()
            self.redis = None

    def _generate_key(self, prefix: str, data: Any) -> str:
        """Erzeugt einen stabilen Cache-Key basierend auf den Eingabedaten."""

        data_str = json.dumps(data, sort_keys=True, default=str)
        hash_obj = hashlib.sha256(data_str.encode("utf-8"))
        return f"{prefix}:{hash_obj.hexdigest()}"

    def generate_key(self, prefix: str, data: Any) -> str:
        """Öffentliche Helper-Methode, um Keys zu erzeugen."""

        return self._generate_key(prefix, data)

    async def get(self, key: str) -> Optional[dict]:
        """Liest einen Wert aus dem Cache."""

        if not self.enabled or not self.redis:
            return None

        try:
            value = await self.redis.get(key)
            if value:
                logger.debug("Cache-Hit", extra={"cache_key": key})
                return json.loads(value)
            logger.debug("Cache-Miss", extra={"cache_key": key})
            return None
        except Exception as exc:
            logger.warning(
                "Cache-Leseproblem",
                extra={"error": str(exc), "cache_key": key},
            )
            return None

    async def set(self, key: str, value: dict, ttl: Optional[int] = None) -> None:
        """Schreibt einen Wert in den Cache."""

        if not self.enabled or not self.redis:
            return

        try:
            payload = json.dumps(value, default=str)
            await self.redis.setex(key, ttl or self.ttl, payload)
            logger.debug("Cache-Write", extra={"cache_key": key})
        except Exception as exc:
            logger.warning(
                "Cache-Schreibproblem",
                extra={"error": str(exc), "cache_key": key},
            )

    async def delete(self, key: str) -> None:
        """Löscht einen Cache-Eintrag."""

        if not self.enabled or not self.redis:
            return

        try:
            await self.redis.delete(key)
            logger.debug("Cache-Delete", extra={"cache_key": key})
        except Exception as exc:
            logger.warning(
                "Cache-Löschproblem",
                extra={"error": str(exc), "cache_key": key},
            )


cache_service = CacheService()


