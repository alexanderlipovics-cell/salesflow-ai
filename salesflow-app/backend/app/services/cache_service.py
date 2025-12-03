"""
Sales Flow AI - Cache Service
Redis-basiertes Caching mit Fallback bei Verbindungsfehler.
"""

import json
from typing import Optional, Any, Union
from functools import wraps
import hashlib

from app.config import settings


class CacheService:
    """
    Redis Cache Service mit automatischem Fallback.
    Wenn Redis nicht verfügbar ist, werden Operationen übersprungen.
    """
    
    def __init__(self):
        self.enabled = settings.CACHE_ENABLED
        self.client = None
        self.default_ttl = settings.CACHE_TTL
        
        if self.enabled:
            self._connect()
    
    def _connect(self) -> bool:
        """Verbindung zu Redis herstellen."""
        try:
            import redis
            self.client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=0,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.client.ping()
            print(f"✅ Redis verbunden: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
            return True
        except ImportError:
            print("⚠️ Redis-Paket nicht installiert - Cache deaktiviert")
            self.enabled = False
            return False
        except Exception as e:
            print(f"⚠️ Redis nicht erreichbar ({e}) - Cache deaktiviert")
            self.enabled = False
            return False
    
    def get(self, key: str) -> Optional[str]:
        """
        Wert aus Cache holen.
        
        Args:
            key: Cache-Schlüssel
            
        Returns:
            Cached value oder None
        """
        if not self.enabled or not self.client:
            return None
        
        try:
            return self.client.get(key)
        except Exception:
            return None
    
    def get_json(self, key: str) -> Optional[Any]:
        """
        JSON-Wert aus Cache holen.
        
        Args:
            key: Cache-Schlüssel
            
        Returns:
            Parsed JSON oder None
        """
        value = self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return None
        return None
    
    def set(self, key: str, value: Union[str, dict, list], ttl: Optional[int] = None) -> bool:
        """
        Wert im Cache speichern.
        
        Args:
            key: Cache-Schlüssel
            value: Zu speichernder Wert (String oder JSON-serialisierbar)
            ttl: Time-to-live in Sekunden (default: CACHE_TTL)
            
        Returns:
            True bei Erfolg
        """
        if not self.enabled or not self.client:
            return False
        
        try:
            # Serialize if needed
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False)
            
            self.client.setex(
                key,
                ttl or self.default_ttl,
                value
            )
            return True
        except Exception:
            return False
    
    def delete(self, key: str) -> bool:
        """Schlüssel aus Cache löschen."""
        if not self.enabled or not self.client:
            return False
        
        try:
            self.client.delete(key)
            return True
        except Exception:
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Alle Schlüssel mit Pattern löschen.
        
        Args:
            pattern: Redis Pattern (z.B. "user:*")
            
        Returns:
            Anzahl gelöschter Schlüssel
        """
        if not self.enabled or not self.client:
            return 0
        
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception:
            return 0
    
    def exists(self, key: str) -> bool:
        """Prüft ob Schlüssel existiert."""
        if not self.enabled or not self.client:
            return False
        
        try:
            return bool(self.client.exists(key))
        except Exception:
            return False
    
    def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Wert inkrementieren (für Rate Limiting, Counter).
        
        Returns:
            Neuer Wert oder None
        """
        if not self.enabled or not self.client:
            return None
        
        try:
            return self.client.incr(key, amount)
        except Exception:
            return None
    
    def flush(self) -> bool:
        """Gesamten Cache leeren (Vorsicht!)."""
        if not self.enabled or not self.client:
            return False
        
        try:
            self.client.flushdb()
            return True
        except Exception:
            return False


# ===========================================
# CACHE KEY GENERATORS
# ===========================================

def make_cache_key(*args, prefix: str = "cache") -> str:
    """
    Generiert konsistenten Cache-Key aus Argumenten.
    
    Usage:
        key = make_cache_key("user", user_id, "leads", prefix="leads")
        # -> "leads:user:abc123:leads"
    """
    parts = [str(arg) for arg in args]
    return f"{prefix}:{':'.join(parts)}"


def hash_key(value: str) -> str:
    """Erstellt MD5-Hash für lange Keys."""
    return hashlib.md5(value.encode()).hexdigest()


# ===========================================
# DECORATOR FÜR CACHING
# ===========================================

def cached(ttl: int = 3600, prefix: str = "fn"):
    """
    Decorator für Funktions-Caching.
    
    Usage:
        @cached(ttl=600, prefix="ai")
        async def get_ai_response(prompt: str) -> str:
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            
            cache_key = make_cache_key(*key_parts, prefix=prefix)
            
            # Try to get from cache
            cached_result = cache_service.get_json(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            if result is not None:
                cache_service.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator


# Global instance
cache_service = CacheService()

