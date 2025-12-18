"""
============================================
⚙️ SALESFLOW AI - APPLICATION CONFIGURATION
============================================
Central configuration with validation for:
- Database settings
- Redis/Cache settings
- Security settings
- Performance tuning
- External services
"""

from typing import Optional, List

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Uses Pydantic for validation and type coercion.
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    # ==================== APPLICATION ====================

    app_name: str = "SalesFlow AI"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = Field(default="production", pattern="^(development|staging|production)$")
    secret_key: str = Field(..., min_length=32)

    # Default values for user context
    default_org_id: str = "00000000-0000-0000-0000-000000000000"
    default_user_id: str = "00000000-0000-0000-0000-000000000001"
    default_user_name: str = "Default User"
    
    # API
    api_prefix: str = "/api/v1"
    docs_enabled: bool = False
    
    # ==================== DATABASE ====================
    
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str = ""
    
    # Direct database connection (for SQLAlchemy)
    database_url: Optional[str] = None
    
    # Pool settings
    db_pool_size: int = Field(default=20, ge=5, le=100)
    db_max_overflow: int = Field(default=30, ge=0, le=100)
    db_pool_timeout: int = Field(default=30, ge=5, le=120)
    db_pool_recycle: int = Field(default=3600, ge=300, le=7200)
    db_echo: bool = False
    
    @model_validator(mode="after")
    def build_database_url(self):
        """Build database URL from Supabase if not provided."""
        if not self.database_url and self.supabase_url:
            import re
            match = re.search(r"https?://([^.]+)\.supabase\.co", self.supabase_url)
            if match:
                project_ref = match.group(1)
                # Use service role key as password fallback (override with DATABASE_PASSWORD if set)
                db_password = getattr(self, "database_password", None) or self.supabase_service_role_key or ""
                if db_password:
                    self.database_url = (
                        f"postgresql://postgres.{project_ref}:"
                        f"{db_password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
                    )
        return self
    
    # ==================== REDIS / CACHE ====================
    
    redis_url: str = Field(default="redis://localhost:6379/0")
    redis_max_connections: int = Field(default=50, ge=10, le=200)
    
    # Cache TTLs (seconds)
    cache_ttl_short: int = Field(default=60, ge=10, le=300)
    cache_ttl_medium: int = Field(default=600, ge=60, le=3600)
    cache_ttl_long: int = Field(default=3600, ge=300, le=86400)
    
    # Enable/disable caching
    cache_enabled: bool = True
    
    # ==================== RATE LIMITING ====================
    
    rate_limit_enabled: bool = True
    rate_limit_default_rpm: int = Field(default=100, ge=10, le=1000)  # requests per minute
    rate_limit_auth_rpm: int = Field(default=5, ge=1, le=20)
    rate_limit_api_read_rpm: int = Field(default=200, ge=50, le=1000)
    rate_limit_api_write_rpm: int = Field(default=50, ge=10, le=200)
    
    # ==================== SECURITY ====================
    
    # JWT
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = Field(default=30, ge=5, le=1440)
    jwt_refresh_token_expire_days: int = Field(default=7, ge=1, le=30)
    
    # CORS
    cors_origins: str = "https://aura-os-topaz.vercel.app,https://aura-os-git-main-sales-flow-ais-projects.vercel.app,https://salesflow-system.com,https://www.salesflow-system.com,https://salesflow.ai,https://www.salesflow.ai,https://alsales.ai,https://www.alsales.ai,http://localhost:3000,http://localhost:5173"
    cors_allow_credentials: bool = True
    cors_allow_methods: str = "*"
    cors_allow_headers: str = "*"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    # ==================== SOCIAL MEDIA ====================
    
    # Facebook
    facebook_app_id: str = ""
    facebook_app_secret: str = ""
    facebook_verify_token: str = ""
    
    # LinkedIn
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    
    # Instagram
    instagram_app_id: str = ""
    instagram_app_secret: str = ""
    
    # ==================== AI / ML ====================
    
    openai_api_key: str = ""
    openai_model: str = "gpt-4-turbo-preview"
    openai_max_tokens: int = Field(default=2000, ge=100, le=8000)
    openai_temperature: float = Field(default=0.7, ge=0, le=2)
    
    # ==================== MONITORING ====================
    
    # Sentry
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = Field(default=0.1, ge=0, le=1)
    sentry_profiles_sample_rate: float = Field(default=0.1, ge=0, le=1)
    
    # Logging
    log_level: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    log_format: str = "json"  # json or text
    
    # ==================== EMAIL ====================
    
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@salesflow.ai"
    smtp_from_name: str = "SalesFlow AI"
    
    # ==================== BACKGROUND TASKS ====================
    
    # Celery
    celery_broker_url: str = ""
    celery_result_backend: str = ""
    
    # Task settings
    task_default_queue: str = "default"
    task_high_priority_queue: str = "high"
    
    # ==================== STRIPE ====================
    
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    
    # Price IDs (set in Stripe Dashboard)
    stripe_price_starter_monthly: str = ""
    stripe_price_starter_yearly: str = ""
    stripe_price_pro_monthly: str = ""
    stripe_price_pro_yearly: str = ""
    stripe_price_enterprise_monthly: str = ""
    stripe_price_enterprise_yearly: str = ""
    
    # ==================== FEATURE FLAGS ====================
    
    feature_ai_chat: bool = True
    feature_voice_input: bool = True
    feature_offline_mode: bool = True
    feature_team_sharing: bool = True
    feature_blueprints: bool = True

    # ==================== GDPR & COMPLIANCE ====================
    privacy_policy_version: str = Field(default="1.0", description="Current privacy policy version for consent tracking")
    
    # ==================== VALIDATORS ====================
    
    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Ensure environment is valid."""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of: {allowed}")
        return v
    
    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Ensure log level is valid."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v = v.upper()
        if v not in allowed:
            raise ValueError(f"Log level must be one of: {allowed}")
        return v
    
    # ==================== COMPUTED PROPERTIES ====================
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.environment == "development"
    
    @property
    def sentry_enabled(self) -> bool:
        """Check if Sentry is configured."""
        return bool(self.sentry_dsn)
    
    @property
    def redis_enabled(self) -> bool:
        """Check if Redis is configured."""
        return bool(self.redis_url) and self.cache_enabled
    
    @property
    def celery_enabled(self) -> bool:
        """Check if Celery is configured."""
        return bool(self.celery_broker_url)


_settings_instance: Optional[Settings] = None

def get_settings() -> Settings:
    """
    Get settings instance with lazy initialization.
    """
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance


# Export singleton for backward compatibility (uses lazy initialization)
settings = get_settings()


# ==================== CONFIGURATION HELPERS ====================

def get_database_config() -> dict:
    """Get database configuration dictionary."""
    return {
        "url": settings.database_url,
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_timeout": settings.db_pool_timeout,
        "pool_recycle": settings.db_pool_recycle,
        "echo": settings.db_echo,
    }


def get_redis_config() -> dict:
    """Get Redis configuration dictionary."""
    return {
        "url": settings.redis_url,
        "max_connections": settings.redis_max_connections,
        "enabled": settings.redis_enabled,
    }


def get_rate_limit_config() -> dict:
    """Get rate limiting configuration."""
    return {
        "enabled": settings.rate_limit_enabled,
        "default_rpm": settings.rate_limit_default_rpm,
        "auth_rpm": settings.rate_limit_auth_rpm,
        "api_read_rpm": settings.rate_limit_api_read_rpm,
        "api_write_rpm": settings.rate_limit_api_write_rpm,
    }


def get_sentry_config() -> dict:
    """Get Sentry configuration."""
    return {
        "dsn": settings.sentry_dsn,
        "environment": settings.environment,
        "release": settings.app_version,
        "traces_sample_rate": settings.sentry_traces_sample_rate,
        "profiles_sample_rate": settings.sentry_profiles_sample_rate,
    }


def print_config():
    """Print current configuration (for debugging)."""
    import json
    
    # Safe config (no secrets)
    safe_config = {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "environment": settings.environment,
        "debug": settings.debug,
        "database": {
            "pool_size": settings.db_pool_size,
            "max_overflow": settings.db_max_overflow,
        },
        "redis": {
            "enabled": settings.redis_enabled,
            "max_connections": settings.redis_max_connections,
        },
        "rate_limiting": {
            "enabled": settings.rate_limit_enabled,
            "default_rpm": settings.rate_limit_default_rpm,
        },
        "sentry": {
            "enabled": settings.sentry_enabled,
            "traces_sample_rate": settings.sentry_traces_sample_rate,
        },
        "features": {
            "ai_chat": settings.feature_ai_chat,
            "voice_input": settings.feature_voice_input,
            "offline_mode": settings.feature_offline_mode,
        }
    }
    
    print(json.dumps(safe_config, indent=2))
