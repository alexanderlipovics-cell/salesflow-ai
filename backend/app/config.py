from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Globale Anwendungseinstellungen mit .env-Unterstützung."""

    # Application
    APP_NAME: str = "Sales Flow AI - CHIEF Coaching"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""  # Alias for compatibility
    SUPABASE_SERVICE_KEY: str = ""
    DATABASE_URL: str = ""  # Optional - for SQLAlchemy ORM

    # API
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8083,http://localhost:19000,http://localhost:19001,http://localhost:19002,http://localhost:19006,http://localhost:19008,http://localhost:19011,https://app.salesflow.ai"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4-1106-preview"
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 2000
    OPENAI_TIMEOUT: int = 30

    # WhatsApp
    WHATSAPP_PROVIDER: str = "ultramsg"
    ULTRAMSG_INSTANCE_ID: str = ""
    ULTRAMSG_TOKEN: str = ""

    # Email
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@salesflow.ai"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 10
    RATE_LIMIT_PER_HOUR: int = 100

    # Caching
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 3600
    CACHE_ENABLED: bool = True

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-must-be-at-least-32-chars"
    
    # Redis (alternative naming)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )
    
    def get_allowed_origins(self) -> list[str]:
        """Convert ALLOWED_ORIGINS string to list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Singleton-Zugriff auf Settings."""
    return Settings()


# Für Rückwärtskompatibilität - viele Router importieren settings direkt
settings = get_settings()