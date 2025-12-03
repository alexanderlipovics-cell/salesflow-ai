"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVE ASSIST CACHE SERVICE                                                 ║
║  In-Memory & Redis Cache für <200ms Response Times                         ║
╚════════════════════════════════════════════════════════════════════════════╝

Performance-Ziele:
    - Cache-Hit (Objection/Fact gefunden):     < 50ms  ✅
    - Cache-Hit + Formatting:                  < 100ms ✅
    - Cache-Miss + LLM (Claude Haiku):         < 500ms ⚠️
    - Ziel: 90% aller Queries < 200ms
"""

from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import json
import os
import time

from supabase import Client

# Optional Redis Support
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class LiveAssistCache:
    """
    Cache für Live Assist Sessions - hält Knowledge im RAM.
    
    Dual-Layer Caching:
    1. Local In-Memory Cache (schnellster Zugriff)
    2. Redis Cache (für Multi-Instance Deployments)
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialisiert den Cache.
        
        Args:
            redis_url: Optional Redis URL für verteiltes Caching
        """
        self._local_cache: Dict[str, Dict] = {}
        self._cache_timestamps: Dict[str, datetime] = {}
        self.redis: Optional[Any] = None
        
        # Redis initialisieren wenn verfügbar
        if redis_url and REDIS_AVAILABLE:
            try:
                self.redis = redis.from_url(redis_url)
                self.redis.ping()
                print("✅ Redis Cache connected")
            except Exception as e:
                print(f"⚠️ Redis nicht verfügbar: {e}")
                self.redis = None
        
        # Default TTL: 30 Minuten
        self.default_ttl_minutes = 30
    
    def get_session_cache(self, session_id: str) -> Optional[Dict]:
        """
        Holt gecachte Session-Daten.
        
        Lookup-Reihenfolge:
        1. Local Cache (< 1ms)
        2. Redis Cache (< 5ms)
        3. None (Cache-Miss)
        
        Args:
            session_id: ID der Live Assist Session
            
        Returns:
            Gecachte Daten oder None
        """
        # 1. Local Cache prüfen
        if session_id in self._local_cache:
            cached = self._local_cache[session_id]
            timestamp = self._cache_timestamps.get(session_id)
            
            # TTL prüfen
            if timestamp and datetime.utcnow() - timestamp < timedelta(minutes=self.default_ttl_minutes):
                return cached
            else:
                # Abgelaufen - entfernen
                del self._local_cache[session_id]
                if session_id in self._cache_timestamps:
                    del self._cache_timestamps[session_id]
        
        # 2. Redis prüfen
        if self.redis:
            try:
                data = self.redis.get(f"live_assist:{session_id}")
                if data:
                    cached = json.loads(data)
                    # In Local Cache speichern für nächsten Zugriff
                    self._local_cache[session_id] = cached
                    self._cache_timestamps[session_id] = datetime.utcnow()
                    return cached
            except Exception as e:
                print(f"Redis read error: {e}")
        
        return None
    
    def set_session_cache(
        self, 
        session_id: str, 
        company_id: str,
        data: Dict,
        ttl_minutes: Optional[int] = None
    ):
        """
        Cached Session-Daten.
        
        Args:
            session_id: Session ID
            company_id: Company ID für Tenant-Isolation
            data: Zu cachende Daten
            ttl_minutes: Optional TTL (default: 30 min)
        """
        ttl = ttl_minutes or self.default_ttl_minutes
        
        cache_data = {
            "session_id": session_id,
            "company_id": company_id,
            "la_quick_facts": data.get("la_quick_facts", []),
            "usp_facts": data.get("usp_facts", []),
            "la_objection_responses": data.get("la_objection_responses", []),
            "products": data.get("products", []),
            "la_vertical_knowledge": data.get("la_vertical_knowledge", []),
            "message_history": data.get("message_history", []),  # DISC Akkumulation
            "disc_accumulated": data.get("disc_accumulated", None),  # Kumulatives DISC-Profil
            "cached_at": datetime.utcnow().isoformat()
        }
        
        # Local Cache
        self._local_cache[session_id] = cache_data
        self._cache_timestamps[session_id] = datetime.utcnow()
        
        # Redis Cache
        if self.redis:
            try:
                self.redis.setex(
                    f"live_assist:{session_id}",
                    timedelta(minutes=ttl),
                    json.dumps(cache_data)
                )
            except Exception as e:
                print(f"Redis write error: {e}")
    
    def preload_session(
        self, 
        session_id: str, 
        company_id: str, 
        vertical: Optional[str],
        db: Client
    ) -> Dict:
        """
        Lädt alle relevanten Daten beim Session-Start.
        
        Macht ALLE DB-Calls JETZT, nicht bei jeder Query.
        
        Args:
            session_id: Session ID
            company_id: Company ID
            vertical: Optional Vertical für branchenspezifisches Wissen
            db: Supabase Client
            
        Returns:
            Preloaded Daten
        """
        start_time = time.time()
        
        # 1. Quick Facts
        quick_facts_query = db.table("la_quick_facts").select(
            "id, fact_type, fact_key, fact_value, fact_short, source, importance, is_key_fact"
        ).eq("is_active", True).order("is_key_fact", desc=True).order("importance", desc=True).limit(50)
        
        if company_id:
            quick_facts_query = quick_facts_query.or_(f"company_id.eq.{company_id},company_id.is.null")
        
        quick_facts_result = quick_facts_query.execute()
        quick_facts = quick_facts_result.data or []
        
        # 2. USP Facts (Differentiators)
        usp_facts = [f for f in quick_facts if f.get("fact_type") in ("differentiator", "usp")]
        
        # 3. Objection Responses
        objection_query = db.table("la_objection_responses").select(
            "id, objection_type, objection_keywords, response_short, response_full, "
            "response_technique, follow_up_question, success_rate"
        ).eq("is_active", True).order("success_rate", desc=True)
        
        if company_id:
            objection_query = objection_query.or_(f"company_id.eq.{company_id},company_id.is.null")
        
        objection_result = objection_query.execute()
        objection_responses = objection_result.data or []
        
        # 4. Products
        products = []
        if company_id:
            products_result = db.table("la_company_products").select(
                "id, name, tagline, description, key_benefits, category"
            ).eq("company_id", company_id).eq("is_active", True).order("sort_order").limit(10).execute()
            products = products_result.data or []
        
        # 5. Vertical Knowledge
        vertical_knowledge = []
        if vertical:
            vk_query = db.table("la_vertical_knowledge").select(
                "id, knowledge_type, topic, answer_short, answer_full, keywords"
            ).eq("vertical", vertical).eq("is_active", True).limit(20)
            
            if company_id:
                vk_query = vk_query.or_(f"company_id.eq.{company_id},company_id.is.null")
            
            vk_result = vk_query.execute()
            vertical_knowledge = vk_result.data or []
        
        preload_time_ms = int((time.time() - start_time) * 1000)
        
        # Cache setzen
        cache_data = {
            "la_quick_facts": quick_facts,
            "usp_facts": usp_facts,
            "la_objection_responses": objection_responses,
            "products": products,
            "la_vertical_knowledge": vertical_knowledge,
        }
        
        self.set_session_cache(session_id, company_id, cache_data)
        
        # Session mit Cache-Stats updaten
        try:
            db.table("la_sessions").update({
                "cache_preloaded_at": datetime.utcnow().isoformat(),
                "cache_facts_count": len(quick_facts),
                "cache_objections_count": len(objection_responses),
                "cache_products_count": len(products),
            }).eq("id", session_id).execute()
        except Exception as e:
            print(f"Session update error: {e}")
        
        print(f"✅ Session {session_id[:8]}... preloaded in {preload_time_ms}ms")
        print(f"   - {len(quick_facts)} Facts, {len(objection_responses)} Objections, {len(products)} Products")
        
        return cache_data
    
    def invalidate_session(self, session_id: str):
        """
        Invalidiert den Cache für eine Session.
        
        Args:
            session_id: Session ID
        """
        if session_id in self._local_cache:
            del self._local_cache[session_id]
        if session_id in self._cache_timestamps:
            del self._cache_timestamps[session_id]
        
        if self.redis:
            try:
                self.redis.delete(f"live_assist:{session_id}")
            except Exception as e:
                print(f"Redis delete error: {e}")
    
    def invalidate_company(self, company_id: str):
        """
        Invalidiert alle Session-Caches einer Company.
        
        Nützlich wenn Knowledge aktualisiert wird.
        
        Args:
            company_id: Company ID
        """
        sessions_to_remove = []
        
        for session_id, data in self._local_cache.items():
            if data.get("company_id") == company_id:
                sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            self.invalidate_session(session_id)
        
        print(f"🗑️ Invalidated {len(sessions_to_remove)} sessions for company {company_id[:8]}...")
    
    def add_message_to_history(
        self, 
        session_id: str, 
        message: str,
        role: str = "user"
    ):
        """
        Fügt eine Nachricht zur Session-Historie hinzu (für DISC-Akkumulation).
        
        Args:
            session_id: Session ID
            message: Die Nachricht
            role: "user" oder "assistant"
        """
        if session_id not in self._local_cache:
            return
        
        if "message_history" not in self._local_cache[session_id]:
            self._local_cache[session_id]["message_history"] = []
        
        # Maximal 20 Nachrichten speichern
        history = self._local_cache[session_id]["message_history"]
        history.append({
            "role": role,
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Auf 20 Nachrichten begrenzen
        if len(history) > 20:
            self._local_cache[session_id]["message_history"] = history[-20:]
    
    def get_user_messages(self, session_id: str) -> List[str]:
        """
        Gibt alle User-Nachrichten der Session zurück (für DISC-Akkumulation).
        
        Args:
            session_id: Session ID
            
        Returns:
            Liste der User-Nachrichten
        """
        if session_id not in self._local_cache:
            return []
        
        history = self._local_cache[session_id].get("message_history", [])
        return [msg["content"] for msg in history if msg.get("role") == "user"]
    
    def update_disc_profile(
        self, 
        session_id: str, 
        disc_data: Dict
    ):
        """
        Aktualisiert das akkumulierte DISC-Profil einer Session.
        
        Args:
            session_id: Session ID
            disc_data: DISC-Profil Daten
        """
        if session_id not in self._local_cache:
            return
        
        self._local_cache[session_id]["disc_accumulated"] = disc_data
    
    def get_disc_profile(self, session_id: str) -> Optional[Dict]:
        """
        Gibt das akkumulierte DISC-Profil einer Session zurück.
        
        Args:
            session_id: Session ID
            
        Returns:
            DISC-Profil oder None
        """
        if session_id not in self._local_cache:
            return None
        
        return self._local_cache[session_id].get("disc_accumulated")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Gibt Cache-Statistiken zurück.
        
        Returns:
            Stats Dictionary
        """
        now = datetime.utcnow()
        active_sessions = 0
        expired_sessions = 0
        
        for session_id, timestamp in self._cache_timestamps.items():
            if now - timestamp < timedelta(minutes=self.default_ttl_minutes):
                active_sessions += 1
            else:
                expired_sessions += 1
        
        return {
            "local_cache_entries": len(self._local_cache),
            "active_sessions": active_sessions,
            "expired_sessions": expired_sessions,
            "redis_connected": self.redis is not None,
            "default_ttl_minutes": self.default_ttl_minutes
        }
    
    def cleanup_expired(self):
        """
        Bereinigt abgelaufene Cache-Einträge.
        
        Sollte periodisch aufgerufen werden.
        """
        now = datetime.utcnow()
        expired_sessions = []
        
        for session_id, timestamp in self._cache_timestamps.items():
            if now - timestamp >= timedelta(minutes=self.default_ttl_minutes):
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            self.invalidate_session(session_id)
        
        if expired_sessions:
            print(f"🧹 Cleaned up {len(expired_sessions)} expired sessions")


# Singleton Cache Instance
_cache_instance: Optional[LiveAssistCache] = None


def get_cache() -> LiveAssistCache:
    """
    Gibt die Singleton Cache-Instanz zurück.
    
    Returns:
        LiveAssistCache Instanz
    """
    global _cache_instance
    
    if _cache_instance is None:
        redis_url = os.getenv("REDIS_URL")
        _cache_instance = LiveAssistCache(redis_url=redis_url)
    
    return _cache_instance


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "LiveAssistCache",
    "get_cache",
]

