"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AURA OS - PRODUCTION-READY SETTINGS                                      ║
║  Zentrale Konfiguration aus Environment Variables                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Unterstützt 3 Environments: development, staging, production             ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    from app.core.config import settings
    
    print(settings.ENVIRONMENT)
    print(settings.is_production)
    print(settings.CORS_ORIGINS)
"""

from typing import Optional, Literal, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache
import os


class Settings(BaseSettings):
    """
    Application Settings - Production Ready.
    
    Lädt Werte aus Environment Variables oder .env Datei.
    """
    
    # ═══════════════════════════════════════════════════════════════════════
    # ENVIRONMENT
    # ═══════════════════════════════════════════════════════════════════════
    
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    
    APP_NAME: str = "AURA OS"
    APP_VERSION: str = "1.0.0"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4  # Für Production mit Gunicorn/Uvicorn
    
    # ═══════════════════════════════════════════════════════════════════════
    # SECURITY
    # ═══════════════════════════════════════════════════════════════════════
    
    # CORS - Comma-separated list of allowed origins
    # Development URLs
    # Production URLs (Expo Web, React Native, Web App)
    CORS_ORIGINS: str = (
        "http://localhost:19006,http://localhost:19008,http://localhost:3000,"
        "http://localhost:8082,http://localhost:8081,http://127.0.0.1:8082,"
        "http://127.0.0.1:8081,http://10.0.0.24:8082,http://10.0.0.24:8081,"
        "https://salesflow-app.onrender.com,https://salesflow-app.vercel.app,"
        "https://salesflow-app.netlify.app,exp://localhost:8081,exp://192.168.*"
    )
    
    # Secret Key für JWT und Sessions (MUSS in Production gesetzt werden!)
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-base64-32"
    
    # JWT Settings
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_BURST: int = 100
    
    # Security Headers
    ENABLE_SECURITY_HEADERS: bool = True
    
    # Trusted Proxies (für Load Balancer)
    TRUSTED_PROXIES: str = ""
    
    # ═══════════════════════════════════════════════════════════════════════
    # SUPABASE
    # ═══════════════════════════════════════════════════════════════════════
    
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_DB_PASSWORD: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    # LLM PROVIDERS
    # ═══════════════════════════════════════════════════════════════════════
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_FALLBACK_MODEL: str = "gpt-4o-mini"
    
    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    
    # LLM Settings
    LLM_PROVIDER: Literal["openai", "anthropic", "supabase_edge"] = "anthropic"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2000
    
    # Supabase Edge Function URL
    SUPABASE_EDGE_FUNCTION_URL: Optional[str] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    # VOICE / AUDIO
    # ═══════════════════════════════════════════════════════════════════════
    
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_DEFAULT_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"
    ELEVENLABS_MODEL_ID: str = "eleven_multilingual_v2"
    
    WHISPER_MODEL: str = "whisper-1"
    OPENAI_TTS_MODEL: str = "tts-1"
    OPENAI_TTS_VOICE: str = "nova"
    TTS_PROVIDER: Literal["elevenlabs", "openai"] = "openai"
    
    # ═══════════════════════════════════════════════════════════════════════
    # STORAGE
    # ═══════════════════════════════════════════════════════════════════════
    
    SUPABASE_STORAGE_BUCKET: str = "audio-files"
    AUDIO_URL_EXPIRY_SECONDS: int = 3600
    
    # ═══════════════════════════════════════════════════════════════════════
    # FEATURES
    # ═══════════════════════════════════════════════════════════════════════
    
    ENABLE_CHIEF_CONTEXT: bool = True
    MAX_CONVERSATION_HISTORY: int = 10
    MAX_SUGGESTED_LEADS: int = 5
    
    # Feature Flags
    ENABLE_AUTONOMOUS_BRAIN: bool = True
    ENABLE_PUSH_NOTIFICATIONS: bool = True
    ENABLE_VOICE_FEATURES: bool = True
    ENABLE_ANALYTICS: bool = True
    
    # ═══════════════════════════════════════════════════════════════════════
    # LOGGING & MONITORING
    # ═══════════════════════════════════════════════════════════════════════
    
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    LOG_FORMAT: str = "json"  # "json" für Production, "text" für Development
    
    # Sentry (Error Tracking)
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1  # 10% der Requests tracken
    
    # ═══════════════════════════════════════════════════════════════════════
    # CACHING (Redis)
    # ═══════════════════════════════════════════════════════════════════════
    
    REDIS_URL: Optional[str] = None  # z.B. redis://localhost:6379/0
    CACHE_TTL_SECONDS: int = 3600
    
    # ═══════════════════════════════════════════════════════════════════════
    # COMPUTED PROPERTIES
    # ═══════════════════════════════════════════════════════════════════════
    
    @property
    def is_production(self) -> bool:
        """True wenn Production Environment"""
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        """True wenn Development Environment"""
        return self.ENVIRONMENT == "development"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parsed CORS Origins als Liste"""
        if self.ENVIRONMENT == "development":
            # In Development: Alle localhost-Ports erlauben
            origins = [
                "http://localhost:19006",
                "http://localhost:19007",
                "http://localhost:19008",
                "http://localhost:19009",
                "http://localhost:19010",
                "http://localhost:19011",
                "http://localhost:19020",
                "http://localhost:19012",
                "http://localhost:19015",
                "http://localhost:19016",
                "http://localhost:19017",
                "http://localhost:19018",
                "http://localhost:19019",
                "http://localhost:19020",
                "http://localhost:19021",
                "http://localhost:19022",
                "http://localhost:19023",
                "http://localhost:19024",
                "http://localhost:19025",
                "http://localhost:8081",
                "http://localhost:8082",
                "http://localhost:3000",
                "http://127.0.0.1:19006",
                "http://127.0.0.1:19008",
                "http://127.0.0.1:19010",
                "http://127.0.0.1:19011",
                "http://127.0.0.1:19015",
                "http://127.0.0.1:19020",
                "http://127.0.0.1:8081",
                "http://127.0.0.1:8082",
            ]
            # Füge auch Production URLs hinzu für Testing
            origins.extend([
                "https://salesflow-app.onrender.com",
                "https://salesflow-app.vercel.app",
                "https://salesflow-app.netlify.app",
            ])
            return origins
        # Production: Nur explizit erlaubte Origins
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    @property
    def trusted_proxies_list(self) -> List[str]:
        """Parsed Trusted Proxies als Liste"""
        return [p.strip() for p in self.TRUSTED_PROXIES.split(",") if p.strip()]
    
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Warnt wenn Secret Key nicht geändert wurde in Production"""
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production" and v == "change-me-in-production-use-openssl-rand-base64-32":
            raise ValueError("SECRET_KEY muss in Production gesetzt werden!")
        return v
    
    # Pydantic v2 model_config (ersetzt alte Config Klasse)
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,  # Erlaube lowercase env vars
        extra="ignore",  # Ignoriere unbekannte Env Vars aus .env
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Cached Settings Instance.
    
    Nutzt lru_cache damit Settings nur einmal geladen werden.
    """
    return Settings()


# Singleton Instance für einfachen Import
settings = get_settings()


# ═══════════════════════════════════════════════════════════════════════════
# LOGGING CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

def configure_logging():
    """
    Konfiguriert Logging basierend auf Environment.
    
    Production: JSON-Format für Log-Aggregation (ELK, CloudWatch, etc.)
    Development: Human-readable Format
    """
    import logging
    import sys
    
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    if settings.LOG_FORMAT == "json" and settings.is_production:
        try:
            import json_logging
            json_logging.init_fastapi(enable_json=True)
        except ImportError:
            pass  # json_logging nicht installiert
    
    # Root Logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s" 
               if settings.is_development else 
               '{"time": "%(asctime)s", "name": "%(name)s", "level": "%(levelname)s", "message": "%(message)s"}',
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    
    # Suppress noisy loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING if settings.is_production else logging.INFO)
    
    return logging.getLogger("salesflow")
