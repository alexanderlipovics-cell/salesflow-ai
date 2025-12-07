"""
Vertical Service - Lädt und cached Vertical-Configs aus Supabase
"""

from __future__ import annotations

import logging
from typing import Optional
from functools import lru_cache

from supabase import Client

from ..schemas.vertical import VerticalConfig, Vertical, DEFAULT_MLM_CONFIG
from ..supabase_client import get_supabase_client, SupabaseNotConfiguredError

logger = logging.getLogger(__name__)

# In-Memory Cache für Vertical-Configs
_vertical_cache: dict[str, tuple[VerticalConfig, float]] = {}
CACHE_TTL_SECONDS = 300  # 5 Minuten


def _get_vertical_config_from_db(
    db: Client, vertical_id: str
) -> Optional[VerticalConfig]:
    """Lädt Vertical-Config direkt aus der Datenbank."""
    try:
        result = db.table("verticals").select("*").eq("id", vertical_id).single().execute()

        if not result.data:
            logger.warning(f"Vertical {vertical_id} not found in database")
            return None

        vertical_data = result.data
        config_data = vertical_data.get("config")

        if not config_data:
            logger.warning(f"Vertical {vertical_id} has no config")
            return None

        # Parse JSONB config zu Pydantic Model
        try:
            config = VerticalConfig(**config_data)
            return config
        except Exception as e:
            logger.error(f"Error parsing vertical config: {e}")
            return None

    except Exception as e:
        logger.error(f"Error loading vertical from database: {e}")
        return None


def get_vertical_config(vertical_id: Optional[str] = None) -> VerticalConfig:
    """
    Lädt die Vertical-Config für eine gegebene vertical_id.
    Nutzt Caching für Performance.
    
    Args:
        vertical_id: Die ID des Verticals. Wenn None, wird DEFAULT_MLM_CONFIG zurückgegeben.
    
    Returns:
        VerticalConfig: Die geladene oder default Config
    """
    if not vertical_id:
        logger.debug("No vertical_id provided, returning default MLM config")
        return DEFAULT_MLM_CONFIG

    # Cache-Check
    import time
    current_time = time.time()
    
    if vertical_id in _vertical_cache:
        cached_config, cached_time = _vertical_cache[vertical_id]
        if current_time - cached_time < CACHE_TTL_SECONDS:
            logger.debug(f"Returning cached config for vertical {vertical_id}")
            return cached_config
        else:
            # Cache expired
            del _vertical_cache[vertical_id]

    # Load from database
    try:
        db = get_supabase_client()
        config = _get_vertical_config_from_db(db, vertical_id)

        if config:
            # Cache it
            _vertical_cache[vertical_id] = (config, current_time)
            logger.debug(f"Cached config for vertical {vertical_id}")
            return config
        else:
            logger.warning(
                f"Could not load config for vertical {vertical_id}, using default"
            )
            return DEFAULT_MLM_CONFIG

    except SupabaseNotConfiguredError:
        logger.warning("Supabase not configured, using default MLM config")
        return DEFAULT_MLM_CONFIG
    except Exception as e:
        logger.error(f"Unexpected error loading vertical config: {e}")
        return DEFAULT_MLM_CONFIG


def get_user_vertical_id(user_id: str) -> Optional[str]:
    """
    Lädt die vertical_id für einen User.
    
    Args:
        user_id: Die ID des Users
    
    Returns:
        Optional[str]: Die vertical_id oder None
    """
    try:
        db = get_supabase_client()
        result = (
            db.table("users")
            .select("vertical_id")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if result.data:
            return result.data.get("vertical_id")
        return None

    except SupabaseNotConfiguredError:
        logger.warning("Supabase not configured, cannot load user vertical_id")
        return None
    except Exception as e:
        logger.error(f"Error loading user vertical_id: {e}")
        return None


def clear_vertical_cache(vertical_id: Optional[str] = None) -> None:
    """
    Löscht den Cache für eine bestimmte vertical_id oder alle.
    
    Args:
        vertical_id: Die ID des Verticals. Wenn None, wird der gesamte Cache gelöscht.
    """
    if vertical_id:
        _vertical_cache.pop(vertical_id, None)
        logger.debug(f"Cleared cache for vertical {vertical_id}")
    else:
        _vertical_cache.clear()
        logger.debug("Cleared all vertical caches")


__all__ = [
    "get_vertical_config",
    "get_user_vertical_id",
    "clear_vertical_cache",
]

